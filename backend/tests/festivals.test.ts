import { beforeAll, describe, expect, it } from 'vitest'
import { api, prisma, seedAll } from './helpers.js'
import { setTourApiTransportForTest } from '../src/modules/tourapi/client.js'
import { syncRegionFestivals, todayYmd, toFestivalInput } from '../src/modules/festivals/sync.js'

// data.go.kr searchFestival2 응답 형태를 흉내낸 가짜 트랜스포트
function envelope(items: unknown[], totalCount = items.length) {
  return {
    response: {
      header: { resultCode: '0000', resultMsg: 'OK' },
      body: { totalCount, pageNo: 1, numOfRows: items.length, items: items.length ? { item: items } : '' },
    },
  }
}

// 오늘 기준 상대 날짜(YYYYMMDD) — 테스트가 날짜에 고정되지 않도록
function ymdOffset(days: number): string {
  const d = new Date(Date.now() + 9 * 3600_000 + days * 86400_000)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}
function isoOffset(days: number): string {
  const d = new Date(Date.now() + 9 * 3600_000 + days * 86400_000)
  return d.toISOString().slice(0, 10)
}

const FEST = (over: Record<string, string> = {}) => ({
  contentid: '9001', contenttypeid: '15', title: '탐라 문화제',
  addr1: '제주특별자치도 제주시', mapx: '126.5219', mapy: '33.4996',
  eventstartdate: ymdOffset(-1), eventenddate: ymdOffset(3),
  firstimage: 'https://tong.visitkorea.or.kr/festival.jpg', tel: '064-000-0000', ...over,
})

describe('지역축제 (코타 웹 핵심 축)', () => {
  beforeAll(async () => {
    await seedAll()
    await prisma.festival.deleteMany()
    setTourApiTransportForTest(async (url) =>
      url.includes('searchFestival2')
        ? envelope([
            FEST(), // 진행중 (어제~+3일)
            FEST({ contentid: '9002', title: '한라 등불 축제', eventstartdate: ymdOffset(10), eventenddate: ymdOffset(14), mapx: '', mapy: '' }), // 예정·좌표없음
            FEST({ contentid: '9003', title: '지난 축제', eventstartdate: ymdOffset(-30), eventenddate: ymdOffset(-20) }), // 종료
            FEST({ contentid: '9004', title: '기간 없는 축제', eventstartdate: '', eventenddate: '' }), // 스킵 대상
          ])
        : envelope([]),
    )
    const s = await syncRegionFestivals({ regionSlug: 'jeju', from: ymdOffset(-40) })
    expect(s.created).toBe(3)
    expect(s.skipped).toBe(1) // 기간 없는 축제
  })

  it('동기화: 기간·좌표·이미지가 저장되고 멱등(재실행 시 갱신)', async () => {
    const f = await prisma.festival.findUniqueOrThrow({ where: { tourapiContentId: '9001' }, include: { region: true } })
    expect(f.name).toBe('탐라 문화제')
    expect(f.region.slug).toBe('jeju')
    expect(f.lat).toBeCloseTo(33.4996, 3)
    expect(f.imageUrl).toContain('festival.jpg')

    const again = await syncRegionFestivals({ regionSlug: 'jeju', from: ymdOffset(-40) })
    expect(again.created).toBe(0)
    expect(again.updated).toBe(3)
  })

  it('GET /festivals — 기본은 진행중+예정만, 시작일 오름차순 + status 계산', async () => {
    const res = await api.get('/api/v1/festivals')
    expect(res.status).toBe(200)
    const items = res.body.data.items as { name: string; status: string }[]
    expect(items.map((i) => i.name)).toEqual(['탐라 문화제', '한라 등불 축제'])
    expect(items[0]?.status).toBe('ongoing')
    expect(items[1]?.status).toBe('upcoming')
  })

  it('GET /festivals?includeEnded=1 — 종료 축제 포함, ?region= 필터', async () => {
    const all = await api.get('/api/v1/festivals?includeEnded=1')
    expect(all.body.data.items).toHaveLength(3)
    expect((all.body.data.items as { status: string }[])[0]?.status).toBe('ended') // 가장 이른 시작일

    const other = await api.get('/api/v1/festivals?region=busan')
    expect(other.body.data.items).toHaveLength(0)
  })

  it('GET /festivals?from=&to= — 기간 겹침 검색', async () => {
    const res = await api.get(`/api/v1/festivals?from=${isoOffset(11)}&to=${isoOffset(12)}`)
    const items = res.body.data.items as { name: string }[]
    expect(items.map((i) => i.name)).toEqual(['한라 등불 축제'])

    const bad = await api.get('/api/v1/festivals?from=2026-13-99')
    expect(bad.status).toBe(422)
  })

  it('GET /festivals — 복합 커서 페이지네이션(startDate,id)', async () => {
    const p1 = await api.get('/api/v1/festivals?includeEnded=1&limit=2')
    expect(p1.body.data.items).toHaveLength(2)
    expect(p1.body.data.nextCursor).toMatch(/^\d{4}-\d{2}-\d{2}_\d+$/)

    const p2 = await api.get(`/api/v1/festivals?includeEnded=1&limit=2&cursor=${p1.body.data.nextCursor}`)
    const names1 = (p1.body.data.items as { name: string }[]).map((i) => i.name)
    const names2 = (p2.body.data.items as { name: string }[]).map((i) => i.name)
    expect(names2).toHaveLength(1)
    expect(names1).not.toContain(names2[0]) // 중복·누락 없음
  })

  it('GET /festivals/calendar — 날짜별 진행 축제 수 (축제 많은 날 선정용)', async () => {
    const target = new Date(`${isoOffset(1)}T00:00:00Z`) // 진행중 축제 기간 내 날짜
    const res = await api.get(`/api/v1/festivals/calendar?year=${target.getUTCFullYear()}&month=${target.getUTCMonth() + 1}`)
    expect(res.status).toBe(200)
    const days = res.body.data.days as { date: string; count: number }[]
    const day = days.find((d) => d.date === isoOffset(1))
    expect(day?.count).toBeGreaterThanOrEqual(1)

    const bad = await api.get('/api/v1/festivals/calendar?year=2026&month=13')
    expect(bad.status).toBe(422)
  })

  it('GET /festivals/:id — 상세 + 좌표 기반 주변 관광지(반경 3km)', async () => {
    const f = await prisma.festival.findUniqueOrThrow({ where: { tourapiContentId: '9001' } })
    const res = await api.get(`/api/v1/festivals/${f.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('탐라 문화제')
    expect(Array.isArray(res.body.data.nearbySpots)).toBe(true)

    const missing = await api.get('/api/v1/festivals/999999')
    expect(missing.status).toBe(404)
  })

  it('좌표 없는 축제도 목록에 노출되고 상세의 주변 관광지는 빈 배열', async () => {
    const f = await prisma.festival.findUniqueOrThrow({ where: { tourapiContentId: '9002' } })
    expect(f.lat).toBeNull()
    const res = await api.get(`/api/v1/festivals/${f.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.nearbySpots).toEqual([])
  })

  it('매퍼: 잘못된 좌표(0,0)는 null 처리, todayYmd는 KST 8자리', () => {
    const r = toFestivalInput(
      { contentid: '1', contenttypeid: '15', title: 'X', eventstartdate: '20260801', eventenddate: '20260803', mapx: '0', mapy: '0' },
      1n,
    )
    expect(r.ok && r.value.lat === null && r.value.lng === null).toBe(true)
    expect(todayYmd()).toMatch(/^\d{8}$/)
  })
})
