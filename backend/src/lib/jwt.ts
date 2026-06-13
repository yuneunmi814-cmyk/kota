import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { ensureKeys } from '../../scripts/generate-keys.js'

ensureKeys(env.JWT_PRIVATE_KEY_PATH, env.JWT_PUBLIC_KEY_PATH)
const privateKey = readFileSync(env.JWT_PRIVATE_KEY_PATH, 'utf8')
const publicKey = readFileSync(env.JWT_PUBLIC_KEY_PATH, 'utf8')

export type TokenKind = 'user' | 'admin'

export interface AccessPayload {
  sub: string
  kind: TokenKind
  role?: string
  typ: 'access'
}

export interface RefreshPayload {
  sub: string
  kind: TokenKind
  typ: 'refresh'
  jti: string
  fam: string
}

export function signAccessToken(subject: bigint, kind: TokenKind, role?: string): string {
  const payload: AccessPayload = { sub: subject.toString(), kind, typ: 'access', ...(role ? { role } : {}) }
  return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: env.ACCESS_TOKEN_TTL_SEC })
}

export function signRefreshToken(subject: bigint, kind: TokenKind, family?: string): { token: string; jti: string; fam: string } {
  const jti = randomUUID()
  const fam = family ?? randomUUID()
  const payload: RefreshPayload = { sub: subject.toString(), kind, typ: 'refresh', jti, fam }
  return {
    token: jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` }),
    jti,
    fam,
  }
}

export function verifyToken<T extends AccessPayload | RefreshPayload>(token: string): T | null {
  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as T
  } catch {
    return null
  }
}

export const refreshTtlSec = env.REFRESH_TOKEN_TTL_DAYS * 86400
