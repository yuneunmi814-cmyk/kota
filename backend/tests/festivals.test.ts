import { beforeAll, describe, expect, it } from 'vitest'
import { api, prisma, seedAll } from './helpers.js'
import { setTourApiTransportForTest } from '../src/modules/tourapi/client.js'
import { syncRegionFestivals, todayYmd, toTourApiInput } from '../src/modules/festivals/sync.js'
import { setStdFestTransportForTest, syncStdFestivals } from '../src/modules/festivals/stdfest.js'
import { normalizeFestivalName, parseSidoSigungu } from '../src/modules/festivals/regionMap.js'

// data.go.kr searchFestival2 응답 형태를 흉내낸 가짜 트랜스포트
function envelope(items: unknown[], totalCount = items.length) {
  return {
    response: {
      header: { resultCode: '0000', resultMsg: 'OK' },
      body: { totalCount, pageNo: 1, numOfRows: items.length, items: items.length ? { item: items } : '' },
    },
  }
}

// 오늘 기준 상대 날짜 — 테스트가 날짜에 고정되지 않도록
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

  it('동기화: 기간·좌표·이미지가 저장되고 멱등(재실행 시 갱신), externalId 소스 접두', async () => {
    const f = await prisma.festival.findUniqueOrThrow({ where: { externalId: 'tourapi:9001' }, include: { region: true } })
    expect(f.name).toBe('탐라 문화제')
    expect(f.region?.slug).toBe('jeju') // 주소(제주특별자치도)로 큐레이션 지역 매칭
    expect(f.sido).toBe('제주특별자치도')
    expect(f.sigungu).toBe('제주시')
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

  it('GET /festivals/calendar — 날짜별 진행 축제 수', async () => {
    const target = new Date(`${isoOffset(1)}T00:00:00Z`)
    const res = await api.get(`/api/v1/festivals/calendar?year=${target.getUTCFullYear()}&month=${target.getUTCMonth() + 1}`)
    expect(res.status).toBe(200)
    const days = res.body.data.days as { date: string; count: number }[]
    const day = days.find((d) => d.date === isoOffset(1))
    expect(day?.count).toBeGreaterThanOrEqual(1)

    const bad = await api.get('/api/v1/festivals/calendar?year=2026&month=13')
    expect(bad.status).toBe(422)
  })

  it('GET /festivals/:id — 상세 + 좌표 기반 주변 관광지(반경 3km)', async () => {
    const f = await prisma.festival.findUniqueOrThrow({ where: { externalId: 'tourapi:9001' } })
    const res = await api.get(`/api/v1/festivals/${f.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('탐라 문화제')
    expect(Array.isArray(res.body.data.nearbySpots)).toBe(true)

    const missing = await api.get('/api/v1/festivals/999999')
    expect(missing.status).toBe(404)
  })

  it('좌표 없는 축제도 목록에 노출되고 상세의 주변 관광지는 빈 배열', async () => {
    const f = await prisma.festival.findUniqueOrThrow({ where: { externalId: 'tourapi:9002' } })
    expect(f.lat).toBeNull()
    const res = await api.get(`/api/v1/festivals/${f.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.nearbySpots).toEqual([])
  })

  it('매퍼: 주소로 시·도/시·군·구·큐레이션 매핑 — 비큐레이션(영월)은 regionId null', () => {
    const jeju = toTourApiInput(
      { contentid: '1', contenttypeid: '15', title: 'X', addr1: '제주특별자치도 제주시', eventstartdate: '20260801', eventenddate: '20260803', mapx: '0', mapy: '0' },
      new Map([['jeju', 7n]]),
    )
    expect(jeju.ok && jeju.value.regionId).toBe(7n) // 제주 매칭
    expect(jeju.ok && jeju.value.lat).toBeNull() // (0,0) → null
    expect(jeju.ok && jeju.value.externalId).toBe('tourapi:1')

    const yeongwol = toTourApiInput(
      { contentid: '2', contenttypeid: '15', title: '영월동강뗏목축제', addr1: '강원특별자치도 영월군 영월읍', eventstartdate: '20260801', eventenddate: '20260803' },
      new Map([['jeju', 7n]]),
    )
    expect(yeongwol.ok && yeongwol.value.regionId).toBeNull() // 큐레이션 미매칭
    expect(yeongwol.ok && yeongwol.value.sido).toBe('강원특별자치도')
    expect(yeongwol.ok && yeongwol.value.sigungu).toBe('영월군')
    expect(todayYmd()).toMatch(/^\d{8}$/)
  })

  it('시·도 정규화: 통합 표기·축약형을 정식 명칭으로 (2026-08 QA 지적)', () => {
    // TourAPI '전남광주통합특별시' — 구(區)면 광주, 시·군이면 전남으로 되돌린다
    expect(parseSidoSigungu('전남광주통합특별시 여수시 박람회길 1')).toEqual({ sido: '전라남도', sigungu: '여수시' })
    expect(parseSidoSigungu('전남광주통합특별시 서구 상무대로')).toEqual({ sido: '광주광역시', sigungu: '서구' })
    // 축약형도 시·도로 인식 (이전엔 sido=null로 '(없음)' 분류됐음)
    expect(parseSidoSigungu('강원 춘천시 온의동 586')).toEqual({ sido: '강원특별자치도', sigungu: '춘천시' })
    expect(parseSidoSigungu('충청남도 공주시 금벽로')).toEqual({ sido: '충청남도', sigungu: '공주시' })
  })

  it('중복 판정: 연도 접두가 붙어도 같은 축제로 본다 (2026-08 QA 지적)', () => {
    expect(normalizeFestivalName('2026 고양호수예술축제')).toBe(normalizeFestivalName('고양호수예술축제'))
    expect(normalizeFestivalName('2026 제14회 군산시간여행축제')).toBe(normalizeFestivalName('군산시간여행축제'))
    // 서로 다른 축제까지 같다고 보면 안 됨
    expect(normalizeFestivalName('진안홍삼축제')).not.toBe(normalizeFestivalName('금산인삼축제'))
  })

  it('GET /festivals/sidos + ?sido= — 시·도 목록과 필터 (지역 하드코딩 제거)', async () => {
    const list = await api.get('/api/v1/festivals/sidos')
    expect(list.status).toBe(200)
    const sidos = list.body.data.sidos as { name: string; count: number }[]
    expect(sidos.length).toBeGreaterThan(0)
    expect(sidos[0]?.count).toBeGreaterThan(0)

    const jeju = sidos.find((s) => s.name === '제주특별자치도')
    expect(jeju).toBeDefined()

    // 시·도로 필터하면 그 지역 축제만
    const filtered = await api.get('/api/v1/festivals?sido=제주특별자치도&limit=50')
    const items = filtered.body.data.items as { sido: string }[]
    expect(items.length).toBe(jeju!.count)
    expect(items.every((i) => i.sido === '제주특별자치도')).toBe(true)

    // 없는 시·도는 빈 결과(에러 아님)
    const none = await api.get('/api/v1/festivals?sido=없는도')
    expect(none.status).toBe(200)
    expect(none.body.data.items).toHaveLength(0)
  })

  it('GET /search — 축제가 검색된다 (축제명·지역명 모두)', async () => {
    const byName = await api.get('/api/v1/search?q=탐라')
    expect(byName.status).toBe(200)
    const names = (byName.body.data.festivals as { name: string }[]).map((f) => f.name)
    expect(names).toContain('탐라 문화제')

    // 지역명으로도 찾힌다 — "내가 가려는 지역 축제를 못 찾는다"던 문제(2026-08-03 회의)
    const byRegion = await api.get('/api/v1/search?q=제주')
    expect((byRegion.body.data.festivals as unknown[]).length).toBeGreaterThan(0)

    // 종료된 축제는 검색에 안 나온다
    const ended = await api.get('/api/v1/search?q=지난 축제')
    expect((ended.body.data.festivals as { name: string }[]).some((f) => f.name === '지난 축제')).toBe(false)
  })

  it('표준데이터: 소도시 축제(영월동강뗏목) 보강 + TourAPI 중복은 스킵', async () => {
    setStdFestTransportForTest(async () => ({
      header: { resultCode: '00', resultMsg: 'NORMAL SERVICE.' },
      body: {
        totalCount: 2,
        items: {
          item: [
            // TourAPI '탐라 문화제'와 같은 시작일·이름 → 중복 스킵
            { fstvlNm: '탐라문화제', fstvlStartDate: isoOffset(-1), fstvlEndDate: isoOffset(3), rdnmadr: '제주특별자치도 제주시 동문로', insttCode: 'A' },
            // TourAPI에 없는 소도시 축제 → 신규(regionId null, 전국)
            { fstvlNm: '영월동강뗏목축제', fstvlStartDate: isoOffset(2), fstvlEndDate: isoOffset(4), rdnmadr: '강원특별자치도 영월군 영월읍 하송리', latitude: '37.1836', longitude: '128.4617', phoneNumber: '033-370-2622', insttCode: 'B' },
          ],
        },
      },
    }))
    const s = await syncStdFestivals({ from: ymdOffset(-40) })
    expect(s.created).toBe(1) // 영월만 신규
    expect(s.skipped).toBeGreaterThanOrEqual(1) // 탐라문화제 중복

    const f = await prisma.festival.findFirstOrThrow({ where: { name: '영월동강뗏목축제' }, include: { region: true } })
    expect(f.source).toBe('STDFEST')
    expect(f.region).toBeNull() // 큐레이션 미매칭 → 전국
    expect(f.sido).toBe('강원특별자치도')
    expect(f.sigungu).toBe('영월군')
    expect(f.lat).toBeCloseTo(37.1836, 3)

    // 목록(전국)에 노출되고, region.name은 시·군·구로 표시
    const list = await api.get('/api/v1/festivals?limit=50')
    const yeongwol = (list.body.data.items as { name: string; region: { name: string; slug: string | null } }[]).find((i) => i.name === '영월동강뗏목축제')
    expect(yeongwol?.region.name).toBe('영월군')
    expect(yeongwol?.region.slug).toBeNull()
  })
})
