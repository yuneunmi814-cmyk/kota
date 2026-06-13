import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, seedAll, signupUser } from './helpers.js'
import { purgeOldCheckinLocations, purgeWithdrawnUsers, WITHDRAWN_PURGE_DAYS } from '../src/modules/retention/purge.js'

const NOW = new Date('2026-06-13T00:00:00Z')
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400_000)

describe('데이터 파기 배치 (2.5)', () => {
  beforeEach(async () => {
    await seedAll()
  })

  it('탈퇴 30일 경과 회원은 완전 파기, 최근 탈퇴 회원은 보존', async () => {
    const old = await signupUser()
    const recent = await signupUser()
    const oldId = BigInt(old.userId)
    const recentId = BigInt(recent.userId)

    await prisma.user.update({ where: { id: oldId }, data: { status: 'WITHDRAWN', deletedAt: daysAgo(WITHDRAWN_PURGE_DAYS + 1) } })
    await prisma.user.update({ where: { id: recentId }, data: { status: 'WITHDRAWN', deletedAt: daysAgo(5) } })

    const purged = await purgeWithdrawnUsers(NOW)
    expect(purged).toBe(1)
    expect(await prisma.user.findUnique({ where: { id: oldId } })).toBeNull()
    expect(await prisma.user.findUnique({ where: { id: recentId } })).not.toBeNull()
    // 연관 동의 이력도 함께 파기됨
    expect(await prisma.userConsent.count({ where: { userId: oldId } })).toBe(0)
  })

  it('리뷰·신고가 있는 탈퇴 회원도 파기된다', async () => {
    const seed = await seedAll()
    const author = await signupUser()
    const reporter = await signupUser()
    const authorId = BigInt(author.userId)

    const review = await prisma.review.create({
      data: { userId: authorId, targetType: 'COURSE', targetId: seed.publishedCourseId, rating: 5, content: '좋아요' },
    })
    await prisma.reviewReport.create({ data: { reviewId: review.id, reporterId: BigInt(reporter.userId), reasonCode: 'SPAM' } })

    await prisma.user.update({ where: { id: authorId }, data: { status: 'WITHDRAWN', deletedAt: daysAgo(40) } })
    const purged = await purgeWithdrawnUsers(NOW)
    expect(purged).toBeGreaterThanOrEqual(1)
    expect(await prisma.user.findUnique({ where: { id: authorId } })).toBeNull()
    expect(await prisma.review.findUnique({ where: { id: review.id } })).toBeNull()
  })

  it('체크인 좌표 6개월 경과분만 NULL 처리', async () => {
    const seed = await seedAll()
    const user = await signupUser()
    const trip = await prisma.trip.create({
      data: {
        userId: BigInt(user.userId), courseId: seed.publishedCourseId,
        startDate: daysAgo(200), endDate: daysAgo(199), status: 'COMPLETED',
      },
    })
    const item = await prisma.courseItem.findFirstOrThrow({ where: { courseId: seed.publishedCourseId } })
    const oldVisit = await prisma.tripVisit.create({
      data: { tripId: trip.id, courseItemId: item.id, status: 'DONE', checkedInAt: daysAgo(200), checkinType: 'VERIFIED' },
    })
    const item2 = await prisma.courseItem.findFirstOrThrow({ where: { courseId: seed.publishedCourseId, id: { not: item.id } } })
    const recentVisit = await prisma.tripVisit.create({
      data: { tripId: trip.id, courseItemId: item2.id, status: 'DONE', checkedInAt: daysAgo(10), checkinType: 'VERIFIED' },
    })
    await prisma.$executeRaw`UPDATE trip_visits SET checkin_location = ST_SetSRID(ST_MakePoint(126.5, 33.4),4326)::geography WHERE id IN (${oldVisit.id}, ${recentVisit.id})`

    const cleared = await purgeOldCheckinLocations(NOW)
    expect(cleared).toBe(1)
    const rows = await prisma.$queryRaw<{ id: bigint; has: boolean }[]>`
      SELECT id, checkin_location IS NOT NULL AS has FROM trip_visits WHERE id IN (${oldVisit.id}, ${recentVisit.id}) ORDER BY id`
    const map = new Map(rows.map((r) => [r.id.toString(), r.has]))
    expect(map.get(oldVisit.id.toString())).toBe(false)
    expect(map.get(recentVisit.id.toString())).toBe(true)
  })
})
