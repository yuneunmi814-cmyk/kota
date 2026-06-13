import { Router } from 'express'
import { z } from 'zod'
import { BookmarkTarget, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { Errors } from '../../lib/errors.js'
import { created, h, noContent, ok } from '../../lib/respond.js'
import { validateBody } from '../../middleware/validate.js'
import { requireUser } from '../../middleware/auth.js'
import { nextCursorOf, parseId, parsePage, sanitizeText } from '../../lib/util.js'

export const reviewsRouter = Router()

const reviewBodySchema = z.object({
  targetType: z.nativeEnum(BookmarkTarget),
  targetId: z.coerce.bigint(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(1).max(1000),
  imageUrls: z.array(z.string().url()).max(5).optional(),
  tripId: z.coerce.bigint().optional(),
})

const reviewInclude = {
  user: { select: { id: true, nickname: true, profileImageUrl: true } },
  images: true,
} satisfies Prisma.ReviewInclude

function serializeReview(r: Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>) {
  return {
    id: r.id,
    rating: r.rating,
    content: r.content,
    createdAt: r.createdAt,
    user: { id: r.user.id, nickname: r.user.nickname, profileImageUrl: r.user.profileImageUrl },
    images: r.images.map((i) => i.url),
  }
}

async function listReviews(targetType: BookmarkTarget, targetId: bigint, query: Record<string, unknown>) {
  const { cursor, limit } = parsePage(query)
  const [items, agg] = await Promise.all([
    prisma.review.findMany({
      where: { targetType, targetId, status: 'VISIBLE', ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { id: 'desc' },
      take: limit,
      include: reviewInclude,
    }),
    prisma.review.aggregate({ where: { targetType, targetId, status: 'VISIBLE' }, _avg: { rating: true }, _count: true }),
  ])
  return {
    items: items.map(serializeReview),
    summary: { avg: agg._avg.rating ? Number(agg._avg.rating.toFixed(1)) : null, count: agg._count },
    nextCursor: nextCursorOf(items, limit),
  }
}

reviewsRouter.post(
  '/reviews',
  requireUser,
  validateBody(reviewBodySchema),
  h(async (req, res) => {
    const body = req.body as z.infer<typeof reviewBodySchema>
    const target =
      body.targetType === 'COURSE'
        ? await prisma.course.findFirst({ where: { id: body.targetId, status: 'PUBLISHED' }, select: { id: true } })
        : await prisma.spot.findFirst({ where: { id: body.targetId, status: 'ACTIVE' }, select: { id: true } })
    if (!target) throw Errors.notFound(body.targetType === 'COURSE' ? '코스' : '관광지')

    if (body.tripId) {
      const trip = await prisma.trip.findFirst({ where: { id: body.tripId, userId: req.userId! }, select: { id: true } })
      if (!trip) throw Errors.notFound('여행')
    }

    const review = await prisma.review.create({
      data: {
        userId: req.userId!,
        targetType: body.targetType,
        targetId: body.targetId,
        tripId: body.tripId,
        rating: body.rating,
        content: sanitizeText(body.content),
        images: body.imageUrls?.length ? { create: body.imageUrls.map((url) => ({ url })) } : undefined,
      },
    })
    created(res, { reviewId: review.id })
  }),
)

reviewsRouter.get(
  '/courses/:id/reviews',
  h(async (req, res) => {
    ok(res, await listReviews('COURSE', parseId(req.params.id, 'courseId'), req.query as Record<string, unknown>))
  }),
)

reviewsRouter.get(
  '/spots/:id/reviews',
  h(async (req, res) => {
    ok(res, await listReviews('SPOT', parseId(req.params.id, 'spotId'), req.query as Record<string, unknown>))
  }),
)

reviewsRouter.get(
  '/users/me/reviews',
  requireUser,
  h(async (req, res) => {
    const { cursor, limit } = parsePage(req.query as Record<string, unknown>)
    const items = await prisma.review.findMany({
      where: { userId: req.userId!, status: { not: 'DELETED' }, ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { id: 'desc' },
      take: limit,
      include: reviewInclude,
    })
    ok(res, { items: items.map((r) => ({ ...serializeReview(r), targetType: r.targetType, targetId: r.targetId, status: r.status })), nextCursor: nextCursorOf(items, limit) })
  }),
)

reviewsRouter.patch(
  '/reviews/:reviewId',
  requireUser,
  validateBody(z.object({ rating: z.number().int().min(1).max(5).optional(), content: z.string().min(1).max(1000).optional(), imageUrls: z.array(z.string().url()).max(5).optional() })),
  h(async (req, res) => {
    const id = parseId(req.params.reviewId, 'reviewId')
    const body = req.body as { rating?: number; content?: string; imageUrls?: string[] }
    const review = await prisma.review.findFirst({ where: { id, userId: req.userId!, status: { not: 'DELETED' } } })
    if (!review) throw Errors.notFound('리뷰')

    const updated = await prisma.review.update({
      where: { id },
      data: {
        rating: body.rating,
        content: body.content ? sanitizeText(body.content) : undefined,
        ...(body.imageUrls
          ? { images: { deleteMany: {}, create: body.imageUrls.map((url) => ({ url })) } }
          : {}),
      },
      include: reviewInclude,
    })
    ok(res, serializeReview(updated))
  }),
)

reviewsRouter.delete(
  '/reviews/:reviewId',
  requireUser,
  h(async (req, res) => {
    const id = parseId(req.params.reviewId, 'reviewId')
    const review = await prisma.review.findFirst({ where: { id, userId: req.userId!, status: { not: 'DELETED' } } })
    if (!review) throw Errors.notFound('리뷰')
    await prisma.review.update({ where: { id }, data: { status: 'DELETED' } })
    noContent(res)
  }),
)

reviewsRouter.post(
  '/reviews/:reviewId/reports',
  requireUser,
  validateBody(z.object({ reasonCode: z.string().min(1).max(50), detail: z.string().max(500).optional() })),
  h(async (req, res) => {
    const id = parseId(req.params.reviewId, 'reviewId')
    const { reasonCode, detail } = req.body as { reasonCode: string; detail?: string }
    const review = await prisma.review.findFirst({ where: { id, status: 'VISIBLE' } })
    if (!review) throw Errors.notFound('리뷰')
    if (review.userId === req.userId) throw Errors.validation('본인 리뷰는 신고할 수 없습니다')

    try {
      const report = await prisma.reviewReport.create({
        data: { reviewId: id, reporterId: req.userId!, reasonCode, detail },
      })
      // 신고 3회 누적 시 자동 임시 숨김 → 운영자 확정 (기획설계서 2.2절)
      const count = await prisma.reviewReport.count({ where: { reviewId: id, status: { in: ['PENDING', 'ACCEPTED'] } } })
      if (count >= 3) await prisma.review.update({ where: { id }, data: { status: 'HIDDEN' } })
      created(res, { reportId: report.id })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw Errors.conflict('REPORT_DUPLICATE', '이미 신고한 리뷰입니다')
      }
      throw e
    }
  }),
)
