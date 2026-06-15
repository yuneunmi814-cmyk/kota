import { Platform } from 'react-native'
import { initializeKakaoSDK } from '@react-native-kakao/core'
import { login as kakaoNativeLogin } from '@react-native-kakao/user'

// 소셜 로그인 — 네이티브 SDK로 providerAccessToken 획득 후 백엔드 /auth/social로 전달.
// 카카오 네이티브 키(dev build) 필요. 키 없으면 KAKAO_ENABLED=false → 버튼 비활성.
const KAKAO_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY ?? ''
export const KAKAO_ENABLED = Boolean(KAKAO_KEY)

// 구글 로그인 — expo-auth-session으로 id_token 획득 → 백엔드 /auth/social.
// 웹 클라이언트 ID(EXPO_PUBLIC_GOOGLE_CLIENT_ID)는 백엔드 GOOGLE_CLIENT_ID(aud 검증)와 동일해야 함.
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? ''
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? ''
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? ''
// useIdTokenAuthRequest는 네이티브에서 플랫폼별 클라이언트ID가 반드시 필요(없으면 렌더 시 throw).
// 해당 플랫폼 ID가 있을 때만 구글 버튼/훅을 활성화한다.
export const GOOGLE_ENABLED =
  Platform.OS === 'android' ? Boolean(GOOGLE_ANDROID_CLIENT_ID)
  : Platform.OS === 'ios' ? Boolean(GOOGLE_IOS_CLIENT_ID)
  : Boolean(GOOGLE_CLIENT_ID)

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
