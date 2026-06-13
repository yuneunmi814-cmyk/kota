import type { NextFunction, Request, Response } from 'express'
import { kv } from '../lib/kv.js'
import { env, isTest } from '../config/env.js'
import { Errors } from '../lib/errors.js'

// 비로그인은 더 엄격한 한도 (기획설계서 6.2 결정 4)
export async function rateLimit(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (isTest) return next()
  const authed = Boolean(req.headers.authorization)
  const id = authed ? `t:${req.headers.authorization!.slice(-24)}` : `ip:${req.ip}`
  const limit = authed ? env.RATE_LIMIT_USER_PER_MIN : env.RATE_LIMIT_GUEST_PER_MIN
  const windowKey = `rl:${id}:${Math.floor(Date.now() / 60000)}`
  const count = await kv.incrWithTtl(windowKey, 90)
  if (count > limit) return next(Errors.rateLimited())
  next()
}
