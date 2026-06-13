import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { api } from '../api/client'

// 로그인 사용자의 FCM 토큰 등록 (POST /users/me/push-tokens).
// 실제 토큰은 네이티브 dev build + FCM(google-services.json) 필요 — 권한/빌드 없으면 조용히 스킵.
export async function registerPushToken(): Promise<void> {
  try {
    let { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status
    if (status !== 'granted') return

    const token = await Notifications.getDevicePushTokenAsync() // Android: FCM 토큰(data: string)
    const fcmToken = typeof token.data === 'string' ? token.data : null
    if (!fcmToken) return

    await api('/users/me/push-tokens', {
      method: 'POST', auth: true,
      body: { fcmToken, osVersion: `${Platform.OS} ${Platform.Version}` },
    })
  } catch {
    /* Expo Go·권한 거부·FCM 미설정 시 무시 */
  }
}
