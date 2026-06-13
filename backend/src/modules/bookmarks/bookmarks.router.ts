import { Router } from 'express'
import { z } from 'zod'
import { BookmarkTarget, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { Errors } from '../../lib/errors.js'
import { created, h, noContent, ok } from '../../lib/respond.js'
import { validateBody } from '../../middleware/validate.js'
import { requireUser } from '../../middleware/auth.js'
import { nextCursorOf, parsePage } from '../../lib/util.js'

export const bookmarksRouter = Router()

async function assertTargetExists(targetType: BookmarkTarget, targetId: bigint): Promise<void> {
  const found =
    targetType === 'COURSE'
      ? await prisma.course.findFirst({ where: { id: targetId, status: 'PUBLISHED' }, select: { id: true } })
      : await prisma.spot.findFirst({ where: { id: targetId, status: 'ACTIVE' }, select: { id: true } })
  if (!found) throw Errors.notFound(targetType === 'COURSE' ? '코스' : '관광지')
}

async function adjustSaveCount(targetType: BookmarkTarget, targetId: bigint, delta: 1 | -1): Promise<void> {
  if (targetType !== 'COURSE') return
  await prisma.course.update({ where: { id: targetId }, data: { saveCount: { increment: delta } } }).catch(() => {})
}

bookmarksRouter.post(
  '/bookmarks',
  requireUser,
  validateBody(z.object({ targetType: z.nativeEnum(BookmarkTarget), targetId: z.coerce.bigint() })),
  h(async (req, res) => {
    const { targetType, targetId } = req.body as { targetType: BookmarkTarget; targetId: bigint }
    await assertTargetExists(targetType, targetId)
    try {
      const bookmark = await prisma.bookmark.create({ data: { userId: req.userId!, targetType, targetId } })
      await adjustSaveCount(targetType, targetId, 1)
      created(res, { bookmarkId: bookmark.id })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const existing = await prisma.bookmark.findUniqueOrThrow({
          where: { userId_targetType_targetId: { userId: req.userId!, targetType, targetId } },
        })
        ok(res, { bookmarkId: existing.id })
        return
      }
      throw e
    }
  }),
)

bookmarksRouter.delete(
  '/bookmarks',
  requireUser,
  h(async (req, res) => {
    const targetType = req.query.targetType
    const targetId = req.query.targetId
    if ((targetType !== 'COURSE' && targetType !== 'SPOT') || typeof targetId !== 'string' || !/^\d+$/.test(targetId)) {
      throw Errors.validation('targetType, targetId 쿼리가 필요합니다')
    }
    const { count } = await prisma.bookmark.deleteMany({
      where: { userId: req.userId!, targetType, targetId: BigInt(targetId) },
    })
    if (count > 0) await adjustSaveCount(targetType, BigInt(targetId), -1)
    noContent(res)
  }),
)

bookmarksRouter.get(
  '/users/me/bookmarks',
  requireUser,
  h(async (req, res) => {
    const { cursor, limit } = parsePage(req.query as Record<string, unknown>)
    const type = req.query.type === 'COURSE' || req.query.type === 'SPOT' ? (req.query.type as BookmarkTarget) : undefined

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: req.userId!, ...(type ? { targetType: type } : {}), ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { id: 'desc' },
      take: limit,
    })

    const courseIds = bookmarks.filter((b) => b.targetType === 'COURSE').map((b) => b.targetId)
    const spotIds = bookmarks.filter((b) => b.targetType === 'SPOT').map((b) => b.targetId)
    const [courses, spots] = await Promise.all([
      courseIds.length
        ? prisma.course.findMany({
            where: { id: { in: courseIds } },
            include: { region: { select: { name: true } }, _count: { select: { items: true } } },
          })
        : [],
      spotIds.length
        ? prisma.spot.findMany({ where: { id: { in: spotIds } }, select: { id: true, name: true, category: true, address: true } })
        : [],
    ])
    const courseMap = new Map(courses.map((c) => [c.id.toString(), c]))
    const spotMap = new Map(spots.map((s) => [s.id.toString(), s]))

    const items = bookmarks.map((b) => {
      if (b.targetType === 'COURSE') {
        const c = courseMap.get(b.targetId.toString())
        return c
          ? {
              bookmarkId: b.id,
              targetType: b.targetType,
              target: {
                id: c.id, title: c.title, cover: c.coverImageUrl, region: c.region.name,
                durationDays: c.durationDays, spotCount: c._count.items, estCost: c.estCost, saveCount: c.saveCount,
                available: c.status === 'PUBLISHED',
              },
            }
          : null
      }
      const s = spotMap.get(b.targetId.toString())
      return s ? { bookmarkId: b.id, targetType: b.targetType, target: s } : null
    }).filter(Boolean)

    ok(res, { items, nextCursor: nextCursorOf(bookmarks, limit) })
  }),
)
