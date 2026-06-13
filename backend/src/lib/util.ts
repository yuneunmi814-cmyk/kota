import { Errors } from './errors.js'

export function parseId(raw: string | undefined, what = 'ID'): bigint {
  if (!raw || !/^\d+$/.test(raw)) throw Errors.validation(`${what} 형식이 올바르지 않습니다`)
  return BigInt(raw)
}

/** 리뷰 본문 등 사용자 입력 정화 — 태그 제거 + 공백 정리 */
export function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

export function maskEmail(email: string | null): string | null {
  if (!email) return null
  const [local = '', domain = ''] = email.split('@')
  const head = local.slice(0, Math.min(2, local.length))
  return `${head}${'*'.repeat(Math.max(1, local.length - head.length))}@${domain}`
}

export interface CursorPage {
  cursor: bigint | null
  limit: number
}

export function parsePage(query: Record<string, unknown>, defaultLimit = 20, maxLimit = 50): CursorPage {
  const rawCursor = typeof query.cursor === 'string' && /^\d+$/.test(query.cursor) ? BigInt(query.cursor) : null
  const rawLimit = typeof query.limit === 'string' ? Number(query.limit) : defaultLimit
  const limit = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : defaultLimit), maxLimit)
  return { cursor: rawCursor, limit }
}

export function nextCursorOf<T extends { id: bigint }>(items: T[], limit: number): string | null {
  return items.length === limit ? items[items.length - 1]!.id.toString() : null
}
