import type { NextFunction, Request, RequestHandler, Response } from 'express'

// Express 4는 async 핸들러의 reject를 잡지 못하므로 모든 비동기 핸들러를 이 래퍼로 감싼다
export function h(fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// 표준 응답 규약 (기획설계서 3장): { success: true, data } / { success: false, error }
export function ok(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ success: true, data })
}

export function created(res: Response, data: unknown): void {
  ok(res, data, 201)
}

export function noContent(res: Response): void {
  res.status(204).end()
}
