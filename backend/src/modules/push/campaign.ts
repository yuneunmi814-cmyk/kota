import { prisma } from '../../lib/prisma.js'
import { sendPush, type PushResult } from './fcm.js'

const KST_OFFSET_MIN = 9 * 60

// 야간(KST 21~08시) 마케팅 푸시 차단 판정
export function isNightKST(at: Date): boolean {
  const minutes = Math.floor(at.getTime() / 60000) + KST_OFFSET_MIN
  const kstHour = Math.floor(((minutes % 1440) + 1440) % 1440 / 60)
  return kstHour >= 21 || kstHour < 8
}

// 최신 MARKETING 동의가 true인 user_id (동의 이력은 append-only이므로 최신 행 기준)
export async function resolveMarketingUserIds(): Promise<bigint[]> {
  const rows = await prisma.$queryRaw<{ user_id: bigint }[]>`
    SELECT uc.user_id FROM user_consents uc
    JOIN (
      SELECT user_id, MAX(created_at) AS mx
      FROM user_consents WHERE consent_type = 'MARKETING' GROUP BY user_id
    ) last ON uc.user_id = last.user_id AND uc.created_at = last.mx
    WHERE uc.consent_type = 'MARKETING' AND uc.agreed = true`
  return rows.map((r) => r.user_id)
}

export interface CampaignInput { title: string; body: string; target: 'ALL' | 'THEME'; themeId?: bigint }
export interface CampaignResult { recipients: number; tokens: number; push: PushResult }

export async function sendCampaign(input: CampaignInput): Promise<CampaignResult> {
  const marketingIds = await resolveMarketingUserIds()
  if (marketingIds.length === 0) return { recipients: 0, tokens: 0, push: { configured: false, sent: 0, failed: 0 } }

  const tokens = await prisma.userPushToken.findMany({
    where: {
      user: {
        id: { in: marketingIds },
        status: 'ACTIVE',
        ...(input.target === 'THEME' && input.themeId ? { interests: { some: { themeId: input.themeId } } } : {}),
      },
    },
    select: { fcmToken: true, userId: true },
  })

  const recipients = new Set(tokens.map((t) => t.userId.toString())).size
  const push = await sendPush(tokens.map((t) => t.fcmToken), { title: input.title, body: input.body })
  return { recipients, tokens: tokens.length, push }
}
