import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { ConsentType } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { Errors } from '../../lib/errors.js'
import { h, noContent, ok } from '../../lib/respond.js'
import { validateBody } from '../../middleware/validate.js'
import { requireUser } from '../../middleware/auth.js'
import { revokeAllSessions } from '../auth/session.js'

export const usersRouter = Router()
usersRouter.use(requireUser)

usersRouter.get(
  '/me',
  h(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.userId! },
      include: { interests: { include: { theme: true } } },
    })
    ok(res, {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      profileImageUrl: user.profileImageUrl,
      provider: user.provider,
      interests: user.interests.map((i) => ({ id: i.theme.id, name: i.theme.name })),
    })
  }),
)

usersRouter.patch(
  '/me',
  validateBody(z.object({ nickname: z.string().min(2).max(20).optional(), profileImageUrl: z.string().url().nullable().optional() })),
  h(async (req, res) => {
    const body = req.body as { nickname?: string; profileImageUrl?: string | null }
    const user = await prisma.user.update({ where: { id: req.userId! }, data: body })
    ok(res, { id: user.id, nickname: user.nickname, profileImageUrl: user.profileImageUrl })
  }),
)

usersRouter.put(
  '/me/interests',
  validateBody(z.object({ themeIds: z.array(z.coerce.bigint()).max(10) })),
  h(async (req, res) => {
    const { themeIds } = req.body as { themeIds: bigint[] }
    await prisma.$transaction([
      prisma.userInterest.deleteMany({ where: { userId: req.userId! } }),
      prisma.userInterest.createMany({ data: themeIds.map((themeId) => ({ userId: req.userId!, themeId })) }),
    ])
    const interests = await prisma.userInterest.findMany({ where: { userId: req.userId! }, include: { theme: true } })
    ok(res, { interests: interests.map((i) => ({ id: i.theme.id, name: i.theme.name })) })
  }),
)

usersRouter.get(
  '/me/consents',
  h(async (req, res) => {
    // 이력(append-only) 중 항목별 최신 상태만 반환
    const rows = await prisma.userConsent.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: 'desc' } })
    const latest = new Map<ConsentType, (typeof rows)[number]>()
    for (const row of rows) if (!latest.has(row.consentType)) latest.set(row.consentType, row)
    ok(res, { consents: [...latest.values()].map((c) => ({ type: c.consentType, agreed: c.agreed, version: c.version, updatedAt: c.createdAt })) })
  }),
)

usersRouter.put(
  '/me/consents',
  validateBody(z.array(z.object({ type: z.nativeEnum(ConsentType), agreed: z.boolean(), version: z.string().min(1).max(20).default('1.0') })).min(1)),
  h(async (req, res) => {
    const changes = req.body as { type: ConsentType; agreed: boolean; version: string }[]
    if (changes.some((c) => ['TERMS', 'PRIVACY', 'AGE14'].includes(c.type) && !c.agreed)) {
      throw Errors.validation('필수 약관 동의는 철회할 수 없습니다. 회원탈퇴를 이용해 주세요')
    }
    await prisma.userConsent.createMany({
      data: changes.map((c) => ({ userId: req.userId!, consentType: c.type, agreed: c.agreed, version: c.version })),
    })
    ok(res, { consents: changes })
  }),
)

usersRouter.post(
  '/me/push-tokens',
  validateBody(z.object({ fcmToken: z.string().min(10), deviceModel: z.string().max(100).optional(), osVersion: z.string().max(50).optional() })),
  h(async (req, res) => {
    const body = req.body as { fcmToken: string; deviceModel?: string; osVersion?: string }
    await prisma.userPushToken.upsert({
      where: { fcmToken: body.fcmToken },
      create: { userId: req.userId!, ...body },
      update: { userId: req.userId!, deviceModel: body.deviceModel, osVersion: body.osVersion },
    })
    noContent(res)
  }),
)

usersRouter.delete(
  '/me',
  validateBody(z.object({ reasonCode: z.string().max(50).optional(), password: z.string().optional() }).optional().default({})),
  h(async (req, res) => {
    const { password } = req.body as { password?: string }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } })
    if (user.provider === 'local') {
      if (!password || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
        throw Errors.unauthorized('비밀번호 확인에 실패했습니다')
      }
    }
    // soft delete — 30일 후 배치 완전 파기. 이메일·닉네임은 즉시 해제해 재가입 차단을 막는다
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'WITHDRAWN',
        deletedAt: new Date(),
        email: null,
        providerId: user.providerId ? `withdrawn:${user.id}:${user.providerId}` : null,
        nickname: `탈퇴회원_${user.id}`,
      },
    })
    await revokeAllSessions(user.id, 'user')
    noContent(res)
  }),
)
