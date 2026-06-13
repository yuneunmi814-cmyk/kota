import { initializeKakaoSDK } from '@react-native-kakao/core'
import { login as kakaoNativeLogin } from '@react-native-kakao/user'

// 소셜 로그인 — 네이티브 SDK로 providerAccessToken 획득 후 백엔드 /auth/social로 전달.
// 카카오 네이티브 키(dev build) 필요. 키 없으면 KAKAO_ENABLED=false → 버튼 비활성.
const KAKAO_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY ?? ''
export const KAKAO_ENABLED = Boolean(KAKAO_KEY)
export const GOOGLE_ENABLED = false // 구글 로그인은 별도 자격증명·설정 필요(추후)

let kakaoInit: Promise<void> | null = null
function ensureKakao(): Promise<void> {
  if (!kakaoInit) kakaoInit = initializeKakaoSDK(KAKAO_KEY)
  return kakaoInit
}

// 카카오 로그인 → providerAccessToken 반환
export async function getKakaoAccessToken(): Promise<string> {
  await ensureKakao()
  const token = await kakaoNativeLogin()
  return token.accessToken
}
