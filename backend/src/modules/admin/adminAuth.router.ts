import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { authenticator } from 'otplib'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'
import { Errors } from '../../lib/errors.js'
import { h, ok } from '../../lib/respond.js'
import { validateBody } from '../../middleware/validate.js'
import { issueSession, rotateSession } from '../auth/session.js'

const privateKey = readFileSync(env.JWT_PRIVATE_KEY_PATH, 'utf8')
const publicKey = readFileSync(env.JWT_PUBLIC_KEY_PATH, 'utf8')

export const adminAuthRouter = Router()

adminAuthRouter.post(
  '/auth/login',
  validateBody(z.object({ email: z.string().email(), password: z.string().min(1) })),
  h(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string }
    const admin = await prisma.adminUser.findUnique({ where: { email } })
    if (!admin || !admin.isActive || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw Errors.invalidCredentials()
    }

    // TOTP 미설정 계정(개발 시드)은 바로 로그인 — 운영 배포 전 2FA 강제 (6.1 체크리스트)
    if (!admin.totpSecret) {
      await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } })
      const tokens = await issueSession(admin.id, 'admin', admin.role)
      ok(res, { mfaRequired: false, ...tokens, role: admin.role })
      return
    }

    const tempToken = jwt.sign({ sub: admin.id.toString(), typ: 'mfa' }, privateKey, { algorithm: 'RS256', expiresIn: 300 })
    ok(res, { mfaRequired: true, tempToken })
  }),
)

adminAuthRouter.post(
  '/auth/mfa',
  validateBody(z.object({ tempToken: z.string().min(1), otpCode: z.string().length(6) })),
  h(async (req, res) => {
    const { tempToken, otpCode } = req.body as { tempToken: string; otpCode: string }
    let sub: string
    try {
      const payload = jwt.verify(tempToken, publicKey, { algorithms: ['RS256'] }) as { sub: string; typ: string }
      if (payload.typ !== 'mfa') throw new Error('wrong typ')
      sub = payload.sub
    } catch {
      throw Errors.unauthorized('유효하지 않은 임시 토큰입니다')
    }

    const admin = await prisma.adminUser.findUniqueOrThrow({ where: { id: BigInt(sub) } })
    if (!admin.isActive || !admin.totpSecret) throw Errors.unauthorized()
    if (!authenticator.verify({ token: otpCode, secret: admin.totpSecret })) {
      throw Errors.unauthorized('인증 코드가 올바르지 않습니다')
    }

    await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } })
    const tokens = await issueSession(admin.id, 'admin', admin.role)
    ok(res, { ...tokens, role: admin.role })
  }),
)

adminAuthRouter.post(
  '/auth/refresh',
  validateBody(z.object({ refreshToken: z.string().min(1) })),
  h(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken: string }
    const { accessToken, refreshToken: next, kind } = await rotateSession(refreshToken)
    if (kind !== 'admin') throw Errors.unauthorized()
    ok(res, { accessToken, refreshToken: next })
  }),
)
