import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { AdminRole, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'
import { ApiError, Errors } from '../../lib/errors.js'
import { isNightKST, sendCampaign } from '../push/campaign.js'
import { created, h, noContent, ok } from '../../lib/respond.js'
import { validateBody } from '../../middleware/validate.js'
import { requireAdmin } from '../../middleware/auth.js'
import { maskEmail, nextCursorOf, parseId, parsePage } from '../../lib/util.js'
import { logAudit } from './audit.js'

export const adminOpsRouter = Router()

// ── 대시보드 ────────────────────────────────────────────

adminOpsRouter.get(
  '/stats/dashboard',
  requireAdmin(),
  h(async (req, res) => {
    const to = typeof req.query.to === 'string' ? new Date(`${req.query.to}T23:59:59Z`) : new Date()
    const from = typeof req.query.from === 'string' ? new Date(`${req.query.from}T00:00:00Z`) : new Date(to.getTime() - 7 * 86400_000)

    const [signups, tripStarts, checkIns, activeUsers, topCourses] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.trip.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.tripVisit.count({ where: { checkedInAt: { gte: from, lte: to } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: from, lte: to }, status: 'ACTIVE' } }),
      prisma.course.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { saveCount: 'desc' },
        take: 10,
        select: { id: true, title: true, saveCount: true, viewCount: true },
      }),
    ])
    ok(res, { from, to, signups, tripStarts, checkIns, activeUsers, topCourses })
  }),
)

// ── 회원 관리 (OPS) ─────────────────────────────────────

adminOpsRouter.get(
  '/users',
  requireAdmin('OPERATION_MANAGER'),
  h(async (req, res) => {
    const { cursor, limit } = parsePage(req.query as Record<string, unknown>)
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    const status = typeof req.query.status === 'string' && ['ACTIVE', 'SUSPENDED', 'WITHDRAWN'].includes(req.query.status) ? req.query.status : undefined
    const users = await prisma.user.findMany({
      where: {
        ...(q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { nickname: { contains: q, mode: 'insensitive' } }] } : {}),
        ...(status ? { status: status as never } : {}),
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { id: 'desc' },
      take: limit,
    })
    ok(res, {
      items: users.map((u) => ({
        id: u.id, email: maskEmail(u.email), nickname: u.nickname, provider: u.provider,
        status: u.status, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
      })),
      nextCursor: nextCursorOf(users, limit),
    })
  }),
)

adminOpsRouter.get(
  '/users/:id',
  requireAdmin('OPERATION_MANAGER'),
  h(async (req, res) => {
    const reason = typeof req.query.reason === 'string' ? req.query.reason.trim() : ''
    if (!reason) throw Errors.validation('개인정보 열람 사유(reason)를 입력해야 합니다')
    const id = parseId(req.params.id)
    const user = await prisma.user.findUnique({
      where: { id },
      include: { consents: { orderBy: { createdAt: 'desc' }, take: 20 }, _count: { select: { trips: true, reviews: true, bookmarks: true } } },
    })
    if (!user) throw Errors.notFound('회원')
    await logAudit(req, `USER_VIEW:${reason.slice(0, 100)}`, 'user', id)
    ok(res, {
      id: user.id, email: user.email, nickname: user.nickname, provider: user.provider, status: user.status,
      createdAt: user.createdAt, lastLoginAt: user.lastLoginAt, deletedAt: user.deletedAt,
      counts: user._count,
      consents: user.consents.map((c) => ({ type: c.consentType, agreed: c.agreed, version: c.version, at: c.createdAt })),
    })
  }),
)

adminOpsRouter.patch(
  '/users/:id/status',
  requireAdmin('OPERATION_MANAGER'),
  validateBody(z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']), reason: z.string().min(1).max(200) })),
  h(async (req, res) => {
    const id = parseId(req.params.id)
    const { status, reason } = req.body as { status: 'ACTIVE' | 'SUSPENDED'; reason: string }
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw Errors.notFound('회원')
    if (user.status === 'WITHDRAWN') throw Errors.conflict('USER_WITHDRAWN', '탈퇴한 회원입니다')
    await prisma.user.update({ where: { id }, data: { status } })
    await logAudit(req, `USER_STATUS:${reason.slice(0, 100)}`, 'user', id, { status: user.status }, { status })
    ok(res, { userId: id, status })
  }),
)

// ── 신고 처리 (OPS) ─────────────────────────────────────

adminOpsRouter.get(
  '/reports',
  requireAdmin('OPERATION_MANAGER'),
  h(async (req, res) => {
    const { cursor, limit } = parsePage(req.query as Record<string, unknown>)
    const status = typeof req.query.status === 'string' && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(req.query.status) ? req.query.status : 'PENDING'
    const reports = await prisma.reviewReport.findMany({
      where: { status: status as never, ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { id: 'desc' },
      take: limit,
      include: {
        review: { include: { user: { select: { id: true, nickname: true } } } },
        reporter: { select: { id: true, nickname: true } },
      },
    })
    ok(res, {
      items: reports.map((r) => ({
        id: r.id, reasonCode: r.reasonCode, detail: r.detail, status: r.status, createdAt: r.createdAt,
        reporter: r.reporter,
        review: { id: r.review.id, content: r.review.content.slice(0, 200), status: r.review.status, author: r.review.user },
      })),
      nextCursor: nextCursorOf(reports, limit),
    })
  }),
)

adminOpsRouter.patch(
  '/reports/:id',
  requireAdmin('OPERATION_MANAGER'),
  validateBody(z.object({ action: z.enum(['HIDE', 'REJECT']), note: z.string().max(200).optional() })),
  h(async (req, res) => {
    const id = parseId(req.params.id)
    const { action, note } = req.body as { action: 'HIDE' | 'REJECT'; note?: string }
    const report = await prisma.reviewReport.findUnique({ where: { id }, include: { review: true } })
    if (!report) throw Errors.notFound('신고')
    if (report.status !== 'PENDING') throw Errors.conflict('REPORT_PROCESSED', '이미 처리된 신고입니다')

    await prisma.$transaction([
      prisma.reviewReport.update({
        where: { id },
        data: { status: action === 'HIDE' ? 'ACCEPTED' : 'REJECTED', processedBy: req.adminId!, processedAt: new Date() },
      }),
      ...(action === 'HIDE' ? [prisma.review.update({ where: { id: report.reviewId }, data: { status: 'HIDDEN' } })] : []),
    ])
    await logAudit(req, `REPORT_${action}${note ? `:${note.slice(0, 80)}` : ''}`, 'review_report', id, { status: 'PENDING' }, { status: action })
    ok(res, { reportId: id, action })
  }),
)

// ── 배너 (MARKETER) ─────────────────────────────────────

const bannerSchema = z.object({
  title: z.string().min(1).max(100),
  imageUrl: z.string().url(),
  linkType: z.enum(['COURSE', 'URL']),
  linkTarget: z.string().max(500).optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

adminOpsRouter.get(
  '/banners',
  requireAdmin(),
  h(async (_req, res) => {
    ok(res, { items: await prisma.banner.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }] }) })
  }),
)

adminOpsRouter.post(
  '/banners',
  requireAdmin('MARKETER'),
  validateBody(bannerSchema),
  h(async (req, res) => {
    const banner = await prisma.banner.create({ data: req.body as z.infer<typeof bannerSchema> })
    await logAudit(req, 'BANNER_CREATE', 'banner', banner.id, undefined, req.body)
    created(res, { bannerId: banner.id })
  }),
)

adminOpsRouter.put(
  '/banners/:id',
  requireAdmin('MARKETER'),
  validateBody(bannerSchema),
  h(async (req, res) => {
    const id = parseId(req.params.id)
    const before = await prisma.banner.findUnique({ where: { id } })
    if (!before) throw Errors.notFound('배너')
    await prisma.banner.update({ where: { id }, data: req.body as z.infer<typeof bannerSchema> })
    await logAudit(req, 'BANNER_UPDATE', 'banner', id, before, req.body)
    ok(res, { bannerId: id })
  }),
)

adminOpsRouter.delete(
  '/banners/:id',
  requireAdmin('MARKETER'),
  h(async (req, res) => {
    const id = parseId(req.params.id)
    await prisma.banner.delete({ where: { id } }).catch(() => {
      throw Errors.notFound('배너')
    })
    await logAudit(req, 'BANNER_DELETE', 'banner', id)
    noContent(res)
  }),
)

// ── 푸시 캠페인 (MARKETER) ──────────────────────────────

adminOpsRouter.post(
  '/push-campaigns',
  requireAdmin('MARKETER'),
  validateBody(z.object({
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
    target: z.enum(['ALL', 'THEME']),
    themeId: z.coerce.bigint().optional(),
    scheduledAt: z.coerce.date().optional(),
  })),
  h(async (req, res) => {
    const b = req.body as { title: string; body: string; target: 'ALL' | 'THEME'; themeId?: bigint; scheduledAt?: Date }
    if (b.target === 'THEME' && !b.themeId) throw Errors.validation('테마 타깃은 themeId가 필요합니다')

    // 야간(KST 21~08시) 마케팅 발송 차단 (기획설계서 2.2절)
    const at = b.scheduledAt ?? new Date()
    if (isNightKST(at)) throw new ApiError(422, 'NIGHT_BLOCKED', '야간(21~08시)에는 마케팅 푸시를 발송할 수 없습니다')

    // 마케팅 미동의자 자동 제외(sendCampaign 내부에서 최신 동의 기준 필터)
    const result = await sendCampaign({ title: b.title, body: b.body, target: b.target, themeId: b.themeId })
    await logAudit(req, b.scheduledAt ? 'PUSH_SCHEDULE' : 'PUSH_SEND', 'push_campaign', null, undefined, {
      target: b.target, themeId: b.themeId?.toString(), recipients: result.recipients,
    })
    ok(res, { ...result, scheduledAt: b.scheduledAt ?? null, status: b.scheduledAt ? 'SCHEDULED' : 'SENT' })
  }),
)

// ── 감사 로그 / 계정 (SUPER) ────────────────────────────

adminOpsRouter.get(
  '/audit-logs',
  requireAdmin('SUPER_ADMIN'),
  h(async (req, res) => {
    const { cursor, limit } = parsePage(req.query as Record<string, unknown>, 30, 100)
    const entityType = typeof req.query.entityType === 'string' ? req.query.entityType : undefined
    const adminId = typeof req.query.adminId === 'string' && /^\d+$/.test(req.query.adminId) ? BigInt(req.query.adminId) : undefined
    const logs = await prisma.auditLog.findMany({
      where: { ...(entityType ? { entityType } : {}), ...(adminId ? { adminId } : {}), ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { id: 'desc' },
      take: limit,
      include: { admin: { select: { id: true, name: true, email: true } } },
    })
    ok(res, { items: logs, nextCursor: nextCursorOf(logs, limit) })
  }),
)

adminOpsRouter.post(
  '/accounts',
  requireAdmin('SUPER_ADMIN'),
  validateBody(z.object({ email: z.string().email(), name: z.string().min(1).max(50), role: z.nativeEnum(AdminRole) })),
  h(async (req, res) => {
    const body = req.body as { email: string; name: string; role: AdminRole }
    const tempPassword = randomBytes(9).toString('base64url')
    try {
      const admin = await prisma.adminUser.create({
        data: { ...body, passwordHash: await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS) },
      })
      await logAudit(req, 'ADMIN_CREATE', 'admin_user', admin.id, undefined, { email: body.email, role: body.role })
      // 임시 비밀번호는 이 응답에서 단 한 번 노출
      created(res, { adminId: admin.id, tempPassword })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw Errors.conflict('ADMIN_DUPLICATE', '이미 존재하는 관리자 이메일입니다')
      }
      throw e
    }
  }),
)

adminOpsRouter.patch(
  '/accounts/:id',
  requireAdmin('SUPER_ADMIN'),
  validateBody(z.object({ role: z.nativeEnum(AdminRole).optional(), isActive: z.boolean().optional() })),
  h(async (req, res) => {
    const id = parseId(req.params.id)
    const before = await prisma.adminUser.findUnique({ where: { id } })
    if (!before) throw Errors.notFound('관리자')
    const body = req.body as { role?: AdminRole; isActive?: boolean }
    const admin = await prisma.adminUser.update({ where: { id }, data: body })
    await logAudit(req, 'ADMIN_UPDATE', 'admin_user', id, { role: before.role, isActive: before.isActive }, body)
    ok(res, { adminId: admin.id, role: admin.role, isActive: admin.isActive })
  }),
)
