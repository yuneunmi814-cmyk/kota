import { prisma } from '../../lib/prisma.js'

// 데이터 보유·파기 정책 (기획설계서 2.5절)
export const WITHDRAWN_PURGE_DAYS = 30      // 탈퇴 후 30일 → 완전 파기
export const CHECKIN_COORD_RETAIN_DAYS = 182 // 체크인 좌표 약 6개월 → NULL

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 86400_000)
}

export interface PurgeSummary {
  purgedUsers: number
  clearedCheckins: number
  dryRun: boolean
}

// 탈퇴 30일 경과 회원 완전 파기 — 연관 리뷰/신고를 먼저 정리한 뒤 행 삭제(나머지는 Cascade)
export async function purgeWithdrawnUsers(now: Date, dryRun = false): Promise<number> {
  const cutoff = daysAgo(now, WITHDRAWN_PURGE_DAYS)
  const users = await prisma.user.findMany({
    where: { status: 'WITHDRAWN', deletedAt: { not: null, lte: cutoff } },
    select: { id: true },
  })
  if (dryRun) return users.length

  let purged = 0
  for (const { id } of users) {
    await prisma.$transaction([
      prisma.reviewReport.deleteMany({ where: { reporterId: id } }), // 타인 리뷰 신고(FK restrict 회피)
      prisma.review.deleteMany({ where: { userId: id } }),           // 본인 리뷰(이미지·신고 Cascade)
      prisma.user.delete({ where: { id } }),                         // consents/interests/tokens/bookmarks/trips Cascade
    ])
    purged += 1
  }
  return purged
}

// 체크인 좌표 6개월 경과분 NULL 처리 (위치정보 최소 보관)
export async function purgeOldCheckinLocations(now: Date, dryRun = false): Promise<number> {
  const cutoff = daysAgo(now, CHECKIN_COORD_RETAIN_DAYS)
  if (dryRun) {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM trip_visits
      WHERE checkin_location IS NOT NULL AND checked_in_at IS NOT NULL AND checked_in_at <= ${cutoff}`
    return Number(rows[0]?.count ?? 0)
  }
  return prisma.$executeRaw`
    UPDATE trip_visits SET checkin_location = NULL
    WHERE checkin_location IS NOT NULL AND checked_in_at IS NOT NULL AND checked_in_at <= ${cutoff}`
}

export async function runRetention(now: Date, dryRun = false): Promise<PurgeSummary> {
  return {
    purgedUsers: await purgeWithdrawnUsers(now, dryRun),
    clearedCheckins: await purgeOldCheckinLocations(now, dryRun),
    dryRun,
  }
}
