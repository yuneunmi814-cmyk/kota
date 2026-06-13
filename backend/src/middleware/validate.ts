import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'
import { Errors } from '../lib/errors.js'

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      throw Errors.validation('요청 본문이 올바르지 않습니다', result.error.flatten().fieldErrors)
    }
    req.body = result.data
    next()
  }
}
