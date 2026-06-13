import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { ConsentType, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'
import { Errors } from '../../lib/errors.js'
import { created, h, noContent, ok } from '../../lib/respond.js'
import { validateBody } from '../../middleware/validate.js'
import { requireUser } from '../../middleware/auth.js'
import { issueSession, revokeSession, rotateSession } from './session.js'
import { verifySocialToken } from './social.js'

const consentSchema = z.object({
  type: z.nativeEnum(ConsentType),
  agreed: z.boolean(),
  version: z.string().min(1).max(20),
})

const REQUIRED_CONSENTS: ConsentType[] = [ConsentType.TERMS, ConsentType.PRIVACY, ConsentType.AGE14]

function assertRequiredConsents(consents: { type: ConsentType; agreed: boolean }[]): void {
  for (const required of REQUIRED_CONSENTS) {
    if (!consents.find((c) => c.type === required && c.agreed)) {
      throw Errors.validation(`필수 약관(${required})에 동의해야 가입할 수 있습니다`)
    }
  }
}

const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(72).regex(/^(?=.*[A-Za-z])(?=.*\d)/, '영문과 숫자를 포함해야 합니다'),
  nickname: z.string().min(2).max(20),
  consents: z.array(consentSchema).min(1),
})

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })

const socialSchema = z.object({
  provider: z.enum(['kakao', 'google']),
  providerAccessToken: z.string().min(1),
  consents: z.array(consentSchema).optional(),
})

const refreshSchema = z.object({ refreshToken: z.string().min(1) })

export const authRouter = Router()

authRouter.post(
  '/signup',
  validateBody(signupSchema),
  h(async (req, res) => {
    const body = req.body as z.infer<typeof signupSchema>
    assertRequiredConsents(body.consents)

    const passwordHash = await bcrypt.hash(body.password, env.BCRYPT_ROUNDS)
    try {
      const user = await prisma.user.create({
        data: {
          email: body.email,
          passwordHash,
          nickname: body.nickname,
          provider: 'local',
          lastLoginAt: new Date(),
          consents: { create: body.consents.map((c) => ({ consentType: c.type, agreed: c.agreed, version: c.version })) },
        },
      })
      const tokens = await issueSession(user.id, 'user')
      created(res, { userId: user.id, ...tokens })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw Errors.conflict('AUTH_DUPLICATE', '이미 사용 중인 이메일 또는 닉네임입니다')
      }
      throw e
    }
  }),
)

authRouter.post(
  '/login',
  validateBody(loginSchema),
  h(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash || user.status === 'WITHDRAWN') throw Errors.invalidCredentials()
    if (user.status === 'SUSPENDED') throw Errors.forbidden('이용이 정지된 계정입니다')
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw Errors.invalidCredentials()

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const tokens = await issueSession(user.id, 'user')
    ok(res, { ...tokens, user: { id: user.id, nickname: user.nickname } })
  }),
)

authRouter.post(
  '/social',
  validateBody(socialSchema),
  h(async (req, res) => {
    const body = req.body as z.infer<typeof socialSchema>
    const profile = await verifySocialToken(body.provider, body.providerAccessToken)

    let user = await prisma.user.findUnique({
      where: { provider_providerId: { provider: body.provider, providerId: profile.providerId } },
    })
    let isNewUser = false

    if (!user) {
      if (!body.consents?.length) throw Errors.validation('신규 가입에는 약관 동의(consents)가 필요합니다')
      assertRequiredConsents(body.consents)
      const base = (profile.nickname ?? `여행자`).slice(0, 14)
      const nickname = `${base}_${Math.random().toString(36).slice(2, 6)}`
      user = await prisma.user.create({
        data: {
          email: profile.email,
          nickname,
          provider: body.provider,
          providerId: profile.providerId,
          lastLoginAt: new Date(),
          consents: { create: body.consents.map((c) => ({ consentType: c.type, agreed: c.agreed, version: c.version })) },
        },
      })
      isNewUser = true
    } else {
      if (user.status === 'SUSPENDED') throw Errors.forbidden('이용이 정지된 계정입니다')
      if (user.status === 'WITHDRAWN') throw Errors.forbidden('탈퇴 처리 중인 계정입니다')
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    }

    const tokens = await issueSession(user.id, 'user')
    ok(res, { ...tokens, isNewUser })
  }),
)

authRouter.post(
  '/refresh',
  validateBody(refreshSchema),
  h(async (req, res) => {
    const { refreshToken } = req.body as z.infer<typeof refreshSchema>
    const { accessToken, refreshToken: next } = await rotateSession(refreshToken)
    ok(res, { accessToken, refreshToken: next })
  }),
)

authRouter.post(
  '/logout',
  requireUser,
  validateBody(refreshSchema),
  h(async (req, res) => {
    await revokeSession((req.body as z.infer<typeof refreshSchema>).refreshToken)
    noContent(res)
  }),
)

authRouter.get(
  '/nickname-check',
  h(async (req, res) => {
    const value = typeof req.query.value === 'string' ? req.query.value.trim() : ''
    if (value.length < 2 || value.length > 20) throw Errors.validation('닉네임은 2~20자여야 합니다')
    const exists = await prisma.user.findUnique({ where: { nickname: value }, select: { id: true } })
    ok(res, { available: !exists })
  }),
)
