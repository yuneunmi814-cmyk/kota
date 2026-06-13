import { Platform } from 'react-native'
import { getKeyHashAndroid } from '@react-native-kakao/core'

// 개발 편의: dev build에서 안드로이드 키 해시를 콘솔에 출력 → 카카오 콘솔 [플랫폼 > Android > 키 해시]에 등록.
// (Expo Go에서는 네이티브 모듈이 없어 조용히 무시됨)
export function logAndroidKeyHash(): void {
  if (!__DEV__ || Platform.OS !== 'android') return
  getKeyHashAndroid()
    .then((hash) => hash && console.log('[Kakao] Android 키 해시 — 카카오 콘솔에 등록하세요:', hash))
    .catch(() => {})
}
