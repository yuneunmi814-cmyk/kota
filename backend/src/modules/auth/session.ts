import { kv } from '../../lib/kv.js'
import { Errors } from '../../lib/errors.js'
import {
  refreshTtlSec,
  signAccessToken,
  signRefreshToken,
  verifyToken,
  type RefreshPayload,
  type TokenKind,
} from '../../lib/jwt.js'

// Refresh Token Rotation(RTR) + 재사용 감지 (기획설계서 2.4절)
// rt:{jti} → 세션 메타 / rtfam:{fam} → 패밀리 내 jti 집합 / rtsub:{kind}:{sub} → 사용자의 패밀리 집합

interface SessionMeta {
  sub: string
  kind: TokenKind
  fam: string
  role?: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export async function issueSession(subject: bigint, kind: TokenKind, role?: string, family?: string): Promise<TokenPair> {
  const { token, jti, fam } = signRefreshToken(subject, kind, family)
  const meta: SessionMeta = { sub: subject.toString(), kind, fam, ...(role ? { role } : {}) }
  await kv.set(`rt:${jti}`, JSON.stringify(meta), refreshTtlSec)
  await kv.sAdd(`rtfam:${fam}`, jti, refreshTtlSec)
  await kv.sAdd(`rtsub:${kind}:${subject}`, fam, refreshTtlSec)
  return { accessToken: signAccessToken(subject, kind, role), refreshToken: token }
}

export async function rotateSession(refreshToken: string): Promise<TokenPair & { kind: TokenKind }> {
  const payload = verifyToken<RefreshPayload>(refreshToken)
  if (!payload || payload.typ !== 'refresh') throw Errors.unauthorized('유효하지 않은 토큰입니다')

  const metaRaw = await kv.get(`rt:${payload.jti}`)
  if (!metaRaw) {
    // 이미 회전된 토큰의 재사용 → 탈취 의심, 패밀리 전체 무효화
    await revokeFamily(payload.fam)
    throw Errors.sessionRevoked()
  }
  const meta = JSON.parse(metaRaw) as SessionMeta
  await kv.del(`rt:${payload.jti}`)
  const pair = await issueSession(BigInt(meta.sub), meta.kind, meta.role, meta.fam)
  return { ...pair, kind: meta.kind }
}

export async function revokeSession(refreshToken: string): Promise<void> {
  const payload = verifyToken<RefreshPayload>(refreshToken)
  if (!payload || payload.typ !== 'refresh') return
  await kv.del(`rt:${payload.jti}`)
}

async function revokeFamily(fam: string): Promise<void> {
  const jtis = await kv.sMembers(`rtfam:${fam}`)
  await kv.del(...jtis.map((j) => `rt:${j}`), `rtfam:${fam}`)
}

export async function revokeAllSessions(subject: bigint, kind: TokenKind): Promise<void> {
  const fams = await kv.sMembers(`rtsub:${kind}:${subject}`)
  for (const fam of fams) await revokeFamily(fam)
  await kv.del(`rtsub:${kind}:${subject}`)
}
