import { beforeAll, describe, expect, it } from 'vitest'
import { api, seedAll, signupUser } from './helpers.js'
import type { SeedResult } from '../prisma/seed-core.js'

let seed: SeedResult
let token: string
let tripId: string
let visits: { id: string; spot: { name: string; lat: number; lng: number } }[]

const today = new Date().toISOString().slice(0, 10)

describe('내 여행 + 체크인 (3.5, 결정 3)', () => {
  beforeAll(async () => {
    seed = await seedAll()
    token = (await signupUser()).accessToken
  })

  it('여행 생성: 코스 아이템별 visit 자동 생성', async () => {
    const res = await api
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({ courseId: seed.publishedCourseId.toString(), startDate: today })
    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('UPCOMING')
    expect(res.body.data.visits.length).toBe(8)
    expect(res.body.data.endDate > res.body.data.startDate).toBe(true)
    tripId = res.body.data.id
    visits = res.body.data.visits
  })

  it('비로그인 여행 생성 차단 (결정 4)', async () => {
    const res = await api.post('/api/v1/trips').send({ courseId: seed.publishedCourseId.toString(), startDate: today })
    expect(res.status).toBe(401)
  })

  it('반경 밖 체크인 → 422 + 거리 정보', async () => {
    const first = visits[0]! // 성산일출봉 (반경 300m)
    const res = await api
      .post(`/api/v1/trips/${tripId}/visits/${first.id}/check-in`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lat: 33.499, lng: 126.531 }) // 제주시청 인근 — 약 38km 거리
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CHECKIN_OUT_OF_RANGE')
    expect(res.body.error.details.distanceM).toBeGreaterThan(10000)
    expect(res.body.error.details.radiusM).toBe(300)
  })

  it('반경 내 체크인 → VERIFIED + 자동 여행 시작', async () => {
    const first = visits[0]!
    const res = await api
      .post(`/api/v1/trips/${tripId}/visits/${first.id}/check-in`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lat: first.spot.lat + 0.001, lng: first.spot.lng }) // 약 110m — 반경 300m 이내
    expect(res.status).toBe(200)
    expect(res.body.data.visit.checkinType).toBe('VERIFIED')
    expect(res.body.data.tripStatus).toBe('ONGOING')
    expect(res.body.data.progress.done).toBe(1)
    expect(res.body.data.nextVisit.spot.name).toBe('광치기 해변')
  })

  it('반경 밖 + force → MANUAL 체크인', async () => {
    const second = visits[1]!
    const res = await api
      .post(`/api/v1/trips/${tripId}/visits/${second.id}/check-in`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lat: 33.499, lng: 126.531, force: true })
    expect(res.status).toBe(200)
    expect(res.body.data.visit.checkinType).toBe('MANUAL')
  })

  it('중복 체크인 409', async () => {
    const first = visits[0]!
    const res = await api
      .post(`/api/v1/trips/${tripId}/visits/${first.id}/check-in`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lat: first.spot.lat, lng: first.spot.lng })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('VISIT_ALREADY_DONE')
  })

  it('남은 스팟 모두 건너뛰면 여행 COMPLETED', async () => {
    for (const v of visits.slice(2)) {
      const res = await api
        .post(`/api/v1/trips/${tripId}/visits/${v.id}/skip`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
      expect(res.status).toBe(200)
    }
    const trip = await api.get(`/api/v1/trips/${tripId}`).set('Authorization', `Bearer ${token}`)
    expect(trip.body.data.status).toBe('COMPLETED')
    expect(trip.body.data.progress).toEqual({ done: 2, skipped: 6, total: 8 })
  })

  it('타인 여행 접근 404', async () => {
    const other = await signupUser()
    const res = await api.get(`/api/v1/trips/${tripId}`).set('Authorization', `Bearer ${other.accessToken}`)
    expect(res.status).toBe(404)
  })
})
