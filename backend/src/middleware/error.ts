import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../lib/errors.js'
import { isProd } from '../config/env.js'

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '요청한 경로를 찾을 수 없습니다' } })
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    })
    return
  }
  if (!isProd) console.error(err)
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } })
}
