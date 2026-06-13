import { env } from '../../config/env.js'
import { Errors } from '../../lib/errors.js'

export interface SocialProfile {
  providerId: string
  email: string | null
  nickname: string | null
}

export type SocialVerifier = (provider: 'kakao' | 'google', providerAccessToken: string) => Promise<SocialProfile>

async function verifyKakao(token: string): Promise<SocialProfile> {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw Errors.unauthorized('카카오 토큰 검증에 실패했습니다')
  const body = (await res.json()) as { id: number; kakao_account?: { email?: string; profile?: { nickname?: string } } }
  return {
    providerId: String(body.id),
    email: body.kakao_account?.email ?? null,
    nickname: body.kakao_account?.profile?.nickname ?? null,
  }
}

async function verifyGoogle(idToken: string): Promise<SocialProfile> {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`)
  if (!res.ok) throw Errors.unauthorized('구글 토큰 검증에 실패했습니다')
  const body = (await res.json()) as { sub: string; aud: string; email?: string; name?: string }
  if (env.GOOGLE_CLIENT_ID && body.aud !== env.GOOGLE_CLIENT_ID) {
    throw Errors.unauthorized('구글 토큰의 대상(aud)이 일치하지 않습니다')
  }
  return { providerId: body.sub, email: body.email ?? null, nickname: body.name ?? null }
}

let verifier: SocialVerifier = async (provider, token) => {
  if (provider === 'kakao') {
    if (!env.KAKAO_ENABLED) throw Errors.notConfigured('카카오 로그인')
    return verifyKakao(token)
  }
  return verifyGoogle(token)
}

export function verifySocialToken(provider: 'kakao' | 'google', token: string): Promise<SocialProfile> {
  return verifier(provider, token)
}

/** 테스트에서 외부 호출을 대체하기 위한 주입 지점 */
export function setSocialVerifierForTest(fn: SocialVerifier): void {
  verifier = fn
}
