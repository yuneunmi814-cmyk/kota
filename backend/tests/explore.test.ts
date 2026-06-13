import { beforeAll, describe, expect, it } from 'vitest'
import { api, seedAll } from './helpers.js'
import type { SeedResult } from '../prisma/seed-core.js'

let seed: SeedResult

describe('콘텐츠 탐색 (3.3)', () => {
  beforeAll(async () => {
    seed = await seedAll()
  })

  it('홈 피드: 배너·추천 코스·지역·테마 섹션', async () => {
    const res = await api.get('/api/v1/home')
    expect(res.status).toBe(200)
    expect(res.body.data.banners.length).toBe(1)
    expect(res.body.data.recommendedCourses[0].title).toBe('제주 동부 힐링 2일')
    expect(res.body.data.popularRegions.length).toBeGreaterThan(0)
  })

  it('코스 목록: PUBLISHED만 노출, DRAFT 미노출', async () => {
    const res = await api.get(`/api/v1/courses?regionId=${seed.regionId}`)
    expect(res.status).toBe(200)
    const titles = res.body.data.items.map((i: { title: string }) => i.title)
    expect(titles).toContain('제주 동부 힐링 2일')
    expect(titles).not.toContain('서쪽 노을 미식 코스')
  })

  it('코스 상세: Day별 타임라인 + 스팟 요약', async () => {
    const res = await api.get(`/api/v1/courses/${seed.publishedCourseId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.spotCount).toBe(8)
    expect(res.body.data.days.length).toBe(2)
    const day1 = res.body.data.days[0]
    expect(day1.items[0].spot.name).toBe('성산일출봉')
    expect(day1.items[0].transportToNext).toBe('WALK')
    expect(res.body.data.isBookmarked).toBeNull()
  })

  it('DRAFT 코스 상세 접근 404', async () => {
    const res = await api.get(`/api/v1/courses/${seed.draftCourseId}`)
    expect(res.status).toBe(404)
  })

  it('관광지 상세: 운영시간·주변 추천 포함', async () => {
    const res = await api.get(`/api/v1/spots/${seed.spotIds['성산일출봉']}`)
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('성산일출봉')
    expect(res.body.data.todayHours).toBe('07:00~19:00')
    expect(res.body.data.nearbySpots.length).toBeGreaterThan(0)
    // 가장 가까운 스팟은 광치기 해변(약 2km)
    expect(res.body.data.nearbySpots[0].name).toBe('광치기 해변')
  })

  it('통합 검색', async () => {
    const res = await api.get('/api/v1/search?q=성산')
    expect(res.status).toBe(200)
    expect(res.body.data.spots.some((s: { name: string }) => s.name === '성산일출봉')).toBe(true)
  })
})
