import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { Errors } from '../../lib/errors.js'
import { h, ok } from '../../lib/respond.js'
import { optionalUser } from '../../middleware/auth.js'
import { cached } from '../../lib/cache.js'
import { parseId, parsePage } from '../../lib/util.js'
import { nearbySpots } from '../../lib/geo.js'
import { todayOpenStatus } from '../../lib/openHours.js'

export const exploreRouter = Router()

const courseListInclude = {
  region: { select: { name: true } },
  themes: { include: { theme: { select: { id: true, name: true } } } },
  _count: { select: { items: true } },
} satisfies Prisma.CourseInclude

type CourseForList = Prisma.CourseGetPayload<{ include: typeof courseListInclude }>

function toCourseCard(c: CourseForList) {
  return {
    id: c.id,
    title: c.title,
    summary: c.summary,
    cover: c.coverImageUrl,
    region: c.region.name,
    durationDays: c.durationDays,
    spotCount: c._count.items,
    estCost: c.estCost,
    themes: c.themes.map((t) => t.theme.name),
    saveCount: c.saveCount,
  }
}

exploreRouter.get(
  '/home',
  optionalUser,
  h(async (req, res) => {
    const build = async (userId: bigint | null) => {
      const now = new Date()
      const [banners, recommended, regions] = await Promise.all([
        prisma.banner.findMany({
          where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, title: true, imageUrl: true, linkType: true, linkTarget: true },
        }),
        prisma.course.findMany({
          where: { status: 'PUBLISHED' },
          orderBy: [{ saveCount: 'desc' }, { id: 'desc' }],
          take: 10,
          include: courseListInclude,
        }),
        prisma.region.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, thumbnailUrl: true, _count: { select: { courses: { where: { status: 'PUBLISHED' } } } } },
        }),
      ])

      const interestThemeIds = userId
        ? (await prisma.userInterest.findMany({ where: { userId }, select: { themeId: true } })).map((i) => i.themeId)
        : []
      const themeArgs: Prisma.ThemeFindManyArgs = interestThemeIds.length
        ? { where: { id: { in: interestThemeIds } }, take: 3 }
        : { take: 3 }
      const themes = await prisma.theme.findMany(themeArgs)
      const themeSections = (
        await Promise.all(
          themes.map(async (theme) => ({
            theme: { id: theme.id, name: theme.name },
            courses: (
              await prisma.course.findMany({
                where: { status: 'PUBLISHED', themes: { some: { themeId: theme.id } } },
                orderBy: { saveCount: 'desc' },
                take: 4,
                include: courseListInclude,
              })
            ).map(toCourseCard),
          })),
        )
      ).filter((s) => s.courses.length > 0)

      return {
        banners,
        recommendedCourses: recommended.map(toCourseCard),
        popularRegions: regions
          .sort((a, b) => b._count.courses - a._count.courses)
          .slice(0, 8)
          .map((r) => ({ id: r.id, name: r.name, thumbnail: r.thumbnailUrl, courseCount: r._count.courses })),
        themeSections,
      }
    }
    // 개인화(관심 테마)가 들어가는 로그인 홈은 캐시하지 않는다
    const data = req.userId ? await build(req.userId) : await cached('home', () => build(null))
    ok(res, data)
  }),
)

exploreRouter.get(
  '/regions',
  h(async (_req, res) => {
    const regions = await prisma.region.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, thumbnailUrl: true },
    })
    ok(res, { regions })
  }),
)

exploreRouter.get(
  '/themes',
  h(async (_req, res) => {
    ok(res, { themes: await prisma.theme.findMany({ select: { id: true, name: true, icon: true } }) })
  }),
)

exploreRouter.get(
  '/courses',
  h(async (req, res) => {
    const { limit } = parsePage(req.query as Record<string, unknown>)
    const sort = req.query.sort === 'latest' ? 'latest' : 'save'
    const regionId = typeof req.query.regionId === 'string' && /^\d+$/.test(req.query.regionId) ? BigInt(req.query.regionId) : undefined
    const durationDays = typeof req.query.durationDays === 'string' ? Number(req.query.durationDays) : undefined
    const themeIds =
      typeof req.query.themeIds === 'string'
        ? req.query.themeIds.split(',').filter((s) => /^\d+$/.test(s)).map(BigInt)
        : undefined

    const where: Prisma.CourseWhereInput = {
      status: 'PUBLISHED',
      ...(regionId ? { regionId } : {}),
      ...(durationDays && Number.isInteger(durationDays) ? { durationDays } : {}),
      ...(themeIds?.length ? { themes: { some: { themeId: { in: themeIds } } } } : {}),
    }

    // save/recommend 정렬은 (saveCount, id) 복합 커서, latest는 id 커서
    const rawCursor = typeof req.query.cursor === 'string' ? req.query.cursor : null
    let cursorWhere: Prisma.CourseWhereInput = {}
    if (rawCursor) {
      if (sort === 'latest' && /^\d+$/.test(rawCursor)) {
        cursorWhere = { id: { lt: BigInt(rawCursor) } }
      } else if (/^\d+_\d+$/.test(rawCursor)) {
        const [saveStr, idStr] = rawCursor.split('_') as [string, string]
        const save = Number(saveStr)
        cursorWhere = { OR: [{ saveCount: { lt: save } }, { saveCount: save, id: { lt: BigInt(idStr) } }] }
      }
    }

    const key = `courses:${sort}:${regionId ?? ''}:${durationDays ?? ''}:${themeIds?.join('.') ?? ''}:${rawCursor ?? ''}:${limit}`
    const data = await cached(key, async () => {
      const items = await prisma.course.findMany({
        where: { AND: [where, cursorWhere] },
        orderBy: sort === 'latest' ? [{ id: 'desc' }] : [{ saveCount: 'desc' }, { id: 'desc' }],
        take: limit,
        include: courseListInclude,
      })
      const last = items[items.length - 1]
      const nextCursor =
        items.length === limit && last ? (sort === 'latest' ? last.id.toString() : `${last.saveCount}_${last.id}`) : null
      return { items: items.map(toCourseCard), nextCursor }
    })
    ok(res, data)
  }),
)

exploreRouter.get(
  '/courses/:courseId',
  optionalUser,
  h(async (req, res) => {
    const id = parseId(req.params.courseId, 'courseId')
    const course = await prisma.course.findFirst({
      where: { id, status: 'PUBLISHED' },
      include: {
        region: { select: { id: true, name: true } },
        themes: { include: { theme: { select: { id: true, name: true } } } },
        items: {
          orderBy: [{ dayNo: 'asc' }, { sortOrder: 'asc' }],
          include: {
            spot: { select: { id: true, name: true, category: true, summary: true, lat: true, lng: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } } },
          },
        },
      },
    })
    if (!course) throw Errors.notFound('코스')

    prisma.course.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

    const [agg, bookmark] = await Promise.all([
      prisma.review.aggregate({ where: { targetType: 'COURSE', targetId: id, status: 'VISIBLE' }, _avg: { rating: true }, _count: true }),
      req.userId
        ? prisma.bookmark.findUnique({ where: { userId_targetType_targetId: { userId: req.userId, targetType: 'COURSE', targetId: id } } })
        : null,
    ])

    const days = [...new Set(course.items.map((i) => i.dayNo))].map((dayNo) => ({
      dayNo,
      items: course.items
        .filter((i) => i.dayNo === dayNo)
        .map((i) => ({
          id: i.id,
          order: i.sortOrder,
          stayMinutes: i.stayMinutes,
          transportToNext: i.transportToNext,
          transportMinutes: i.transportMinutes,
          note: i.note,
          spot: {
            id: i.spot.id,
            name: i.spot.name,
            category: i.spot.category,
            summary: i.spot.summary,
            lat: i.spot.lat,
            lng: i.spot.lng,
            thumbnail: i.spot.images[0]?.url ?? null,
          },
        })),
    }))

    ok(res, {
      id: course.id,
      title: course.title,
      summary: course.summary,
      cover: course.coverImageUrl,
      region: course.region,
      durationDays: course.durationDays,
      estCost: course.estCost,
      themes: course.themes.map((t) => t.theme),
      spotCount: course.items.length,
      saveCount: course.saveCount,
      days,
      reviewSummary: { avg: agg._avg.rating ? Number(agg._avg.rating.toFixed(1)) : null, count: agg._count },
      isBookmarked: req.userId ? Boolean(bookmark) : null,
    })
  }),
)

exploreRouter.get(
  '/spots/:spotId',
  optionalUser,
  h(async (req, res) => {
    const id = parseId(req.params.spotId, 'spotId')
    const spot = await prisma.spot.findFirst({
      where: { id, status: 'ACTIVE' },
      include: { region: { select: { id: true, name: true } }, images: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!spot) throw Errors.notFound('관광지')

    const [agg, nearby, bookmark] = await Promise.all([
      prisma.review.aggregate({ where: { targetType: 'SPOT', targetId: id, status: 'VISIBLE' }, _avg: { rating: true }, _count: true }),
      nearbySpots(id),
      req.userId
        ? prisma.bookmark.findUnique({ where: { userId_targetType_targetId: { userId: req.userId, targetType: 'SPOT', targetId: id } } })
        : null,
    ])
    const { open, today } = todayOpenStatus(spot.openHours)

    ok(res, {
      id: spot.id,
      name: spot.name,
      category: spot.category,
      region: spot.region,
      summary: spot.summary,
      description: spot.description,
      tips: spot.tips,
      address: spot.address,
      lat: spot.lat,
      lng: spot.lng,
      phone: spot.phone,
      openHours: spot.openHours,
      todayOpen: open,
      todayHours: today,
      admissionFee: spot.admissionFee,
      avgStayMinutes: spot.avgStayMinutes,
      images: spot.images.map((i) => ({ url: i.url, credit: i.sourceCredit })),
      reviewSummary: { avg: agg._avg.rating ? Number(agg._avg.rating.toFixed(1)) : null, count: agg._count },
      nearbySpots: nearby.map((n) => ({ id: n.id, name: n.name, category: n.category, distanceM: Math.round(n.distance_m) })),
      isBookmarked: req.userId ? Boolean(bookmark) : null,
    })
  }),
)

exploreRouter.get(
  '/search',
  h(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    if (!q) throw Errors.validation('검색어(q)를 입력해 주세요')
    const type = typeof req.query.type === 'string' ? req.query.type : null
    const { cursor, limit } = parsePage(req.query as Record<string, unknown>, 10, 30)

    const wantCourses = !type || type === 'course'
    const wantSpots = !type || type === 'spot'
    const wantRegions = !type || type === 'region'

    const [courses, spots, regions] = await Promise.all([
      wantCourses
        ? prisma.course.findMany({
            where: {
              status: 'PUBLISHED',
              OR: [{ title: { contains: q, mode: 'insensitive' } }, { summary: { contains: q, mode: 'insensitive' } }],
              ...(type === 'course' && cursor ? { id: { lt: cursor } } : {}),
            },
            orderBy: { id: 'desc' },
            take: limit,
            include: courseListInclude,
          })
        : [],
      wantSpots
        ? prisma.spot.findMany({
            where: {
              status: 'ACTIVE',
              name: { contains: q, mode: 'insensitive' },
              ...(type === 'spot' && cursor ? { id: { lt: cursor } } : {}),
            },
            orderBy: { id: 'desc' },
            take: limit,
            select: { id: true, name: true, category: true, address: true, region: { select: { name: true } } },
          })
        : [],
      wantRegions
        ? prisma.region.findMany({
            where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
            take: 5,
            select: { id: true, name: true, slug: true },
          })
        : [],
    ])

    ok(res, {
      courses: courses.map(toCourseCard),
      spots: spots.map((s) => ({ id: s.id, name: s.name, category: s.category, address: s.address, region: s.region.name })),
      regions,
    })
  }),
)
