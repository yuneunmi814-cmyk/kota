import type { Request } from 'express'
import { prisma } from '../../lib/prisma.js'

// 관리자 쓰기·개인정보 열람은 모두 감사 로그(WORM)에 남긴다 (기획설계서 2.2·2.4절)
export async function logAudit(
  req: Request,
  action: string,
  entityType: string,
  entityId: bigint | string | null,
  before?: unknown,
  after?: unknown,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      adminId: req.adminId!,
      action,
      entityType,
      entityId: entityId === null ? null : String(entityId),
      before: before === undefined ? undefined : JSON.parse(JSON.stringify(before)),
      after: after === undefined ? undefined : JSON.parse(JSON.stringify(after)),
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 255),
    },
  })
}
