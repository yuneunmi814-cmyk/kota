import { env } from '../../config/env.js'

export const FCM_ENABLED = Boolean(env.FCM_PROJECT_ID)

export interface PushPayload { title: string; body: string }
export interface PushResult { configured: boolean; sent: number; failed: number }

// 실제 발송은 FCM HTTP v1(서비스 계정 OAuth) 필요 — 미설정 시 no-op으로 집계만 한다.
export async function sendPush(tokens: string[], _payload: PushPayload): Promise<PushResult> {
  if (!FCM_ENABLED || tokens.length === 0) return { configured: FCM_ENABLED, sent: 0, failed: 0 }
  // TODO: FCM HTTP v1 multicast (서비스 계정 자격증명 연결 시 구현)
  return { configured: true, sent: tokens.length, failed: 0 }
}
