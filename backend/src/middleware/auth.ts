import type { NextFunction, Request, Response } from 'express'
import type { AdminRole } from '@prisma/client'
import { verifyToken, type AccessPayload } from '../lib/jwt.js'
import { Errors } from '../lib/errors.js'

declare module 'express-serve-static-core' {
  interface Request {
    userId?: bigint
    adminId?: bigint
    adminRole?: AdminRole
  }
}

function readBearer(req: Request): AccessPayload | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  const payload = verifyToken<AccessPayload>(header.slice(7))
  if (!payload || payload.typ !== 'access') return null
  return payload
}

export function requireUser(req: Request, _res: Response, next: NextFunction): void {
  const payload = readBearer(req)
  if (!payload || payload.kind !== 'user') throw Errors.unauthorized()
  req.userId = BigInt(payload.sub)
  next()
}

/** 토큰이 있으면 개인화 필드 포함(선택 인증) — 기획설계서 3.3절 */
export function optionalUser(req: Request, _res: Response, next: NextFunction): void {
  const payload = readBearer(req)
  if (payload?.kind === 'user') req.userId = BigInt(payload.sub)
  next()
}

/** roles 미지정 시 활성 관리자 전원 허용 */
export function requireAdmin(...roles: AdminRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const payload = readBearer(req)
    if (!payload || payload.kind !== 'admin' || !payload.role) throw Errors.unauthorized()
    const role = payload.role as AdminRole
    if (roles.length > 0 && role !== 'SUPER_ADMIN' && !roles.includes(role)) {
      throw Errors.forbidden('해당 작업 권한이 없는 역할입니다')
    }
    req.adminId = BigInt(payload.sub)
    req.adminRole = role
    next()
  }
}
