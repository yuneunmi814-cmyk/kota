import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma, seedAll } from './helpers.js'
import { setTourApiTransportForTest } from '../src/modules/tourapi/client.js'
import { syncRegionCourses, syncRegionSpots } from '../src/modules/tourapi/sync.js'

// data.go.kr areaBasedList2 응답 형태를 흉내낸 가짜 트랜스포트
function envelope(items: unknown[], totalCount = items.length) {
  return {
    response: {
      header: { resultCode: '0000', resultMsg: 'OK' },
      body: { totalCount, pageNo: 1, numOfRows: items.length, items: items.length ? { item: items } : '' },
    },
  }
}

const JEJU_SPOT = (over: Record<string, string> = {}) => ({
  contentid: '1000', contenttypeid: '12', title: '협재해수욕장',
  addr1: '제주특별자치도 제주시 한림읍', mapx: '126.2396', mapy: '33.3938',
  firstimage: 'https://tong.visitkorea.or.kr/sample.jpg', tel: '064-728-3394', ...over,
})

describe('TourAPI 동기화 (결정 1)', () => {
  beforeAll(async () => {
    await seedAll()
  })

  beforeEach(async () => {
    // 이전 테스트가 만든 TourAPI 스팟 정리
    await prisma.spotImage.deleteMany({ where: { spot: { source: 'TOURAPI' } } })
    await prisma.spot.deleteMany({ where: { source: 'TOURAPI' } })
  })

  it('areaBasedList 결과를 spots로 생성한다 (source=TOURAPI, 이미지 출처 표기)', async () => {
    setTourApiTransportForTest(async (url) =>
      url.includes('areaBasedList2') ? envelope([JEJU_SPOT()]) : envelope([]),
    )
    const s = await syncRegionSpots({ regionSlug: 'jeju', contentTypeIds: [12], maxPerType: 50 })
    expect(s.created).toBe(1)

    const spot = await prisma.spot.findUniqueOrThrow({
      where: { tourapiContentId: '1000' }, include: { images: true, region: true },
    })
    expect(spot.name).toBe('협재해수욕장')
    expect(spot.source).toBe('TOURAPI')
    expect(spot.category).toBe('관광지')
    expect(spot.region.slug).toBe('jeju')
    expect(Number(spot.lat)).toBeCloseTo(33.3938, 3)
    expect(spot.images[0]?.sourceCredit).toBe('한국관광공사 TourAPI')
  })

  it('PostGIS location이 트리거로 동기화된다', async () => {
    setTourApiTransportForTest(async (url) => (url.includes('areaBasedList2') ? envelope([JEJU_SPOT()]) : envelope([])))
    await syncRegionSpots({ regionSlug: 'jeju', contentTypeIds: [12], maxPerType: 50 })
    const rows = await prisma.$queryRaw<{ has: boolean }[]>`
      SELECT location IS NOT NULL AS has FROM spots WHERE tourapi_content_id = '1000'`
    expect(rows[0]?.has).toBe(true)
  })

  it('재실행은 멱등 — 중복 생성 없이 갱신', async () => {
    setTourApiTransportForTest(async (url) =>
      url.includes('areaBasedList2') ? envelope([JEJU_SPOT({ title: '협재해수욕장(수정)' })]) : envelope([]))
    await syncRegionSpots({ regionSlug: 'jeju', contentTypeIds: [12], maxPerType: 50 })
    const second = await syncRegionSpots({ regionSlug: 'jeju', contentTypeIds: [12], maxPerType: 50 })
    expect(second.created).toBe(0)
    expect(second.updated).toBe(1)
    const count = await prisma.spot.count({ where: { tourapiContentId: '1000' } })
    expect(count).toBe(1)
    const spot = await prisma.spot.findUniqueOrThrow({ where: { tourapiContentId: '1000' } })
    expect(spot.name).toBe('협재해수욕장(수정)')
  })

  it('에디터 가공 필드(tips·체류시간)는 재동기화에도 보존된다', async () => {
    setTourApiTransportForTest(async (url) => (url.includes('areaBasedList2') ? envelope([JEJU_SPOT()]) : envelope([])))
    await syncRegionSpots({ regionSlug: 'jeju', contentTypeIds: [12], maxPerType: 50 })
    await prisma.spot.update({
      where: { tourapiContentId: '1000' },
      data: { tips: '에디터 꿀팁', avgStayMinutes: 60, checkinRadiusM: 500 },
    })
    await syncRegionSpots({ regionSlug: 'jeju', contentTypeIds: [12], maxPerType: 50 })
    const spot = await prisma.spot.findUniqueOrThrow({ where: { tourapiContentId: '1000' } })
    expect(spot.tips).toBe('에디터 꿀팁')
    expect(spot.avgStayMinutes).toBe(60)
    expect(spot.checkinRadiusM).toBe(500)
  })

  it('좌표 없는 항목은 스킵', async () => {
    setTourApiTransportForTest(async (url) =>
      url.includes('areaBasedList2')
        ? envelope([JEJU_SPOT(), JEJU_SPOT({ contentid: '1001', title: '좌표없음', mapx: '', mapy: '' })])
        : envelope([]))
    const s = await syncRegionSpots({ regionSlug: 'jeju', contentTypeIds: [12], maxPerType: 50 })
    expect(s.created).toBe(1)
    expect(s.skipped).toBe(1)
  })

  it('dry-run은 DB에 쓰지 않는다', async () => {
    setTourApiTransportForTest(async (url) => (url.includes('areaBasedList2') ? envelope([JEJU_SPOT()]) : envelope([])))
    const s = await syncRegionSpots({ regionSlug: 'jeju', contentTypeIds: [12], maxPerType: 50, dryRun: true })
    expect(s.created).toBe(1)
    expect(await prisma.spot.count({ where: { tourapiContentId: '1000' } })).toBe(0)
  })
})

describe('TourAPI 여행코스 import (결정 1 — 공공 코스 + 가이드 좌표)', () => {
  beforeAll(async () => {
    await seedAll()
  })
  beforeEach(async () => {
    await prisma.courseItem.deleteMany({ where: { course: { source: 'TOURAPI' } } })
    await prisma.course.deleteMany({ where: { source: 'TOURAPI' } })
    await prisma.spotImage.deleteMany({ where: { spot: { source: 'TOURAPI' } } })
    await prisma.spot.deleteMany({ where: { source: 'TOURAPI' } })
  })

  // 코스목록(25) → 경유지(detailInfo2) → 좌표 POI(detailCommon2) 3단 체인 모킹
  const POIS: Record<string, Record<string, string>> = {
    '696841': { contentid: '696841', contenttypeid: '14', title: '테디베어하우스 테지움', addr1: '제주시 애월읍', mapx: '126.3935', mapy: '33.4120', firstimage: 'https://img/a.jpg', overview: '봉제인형 박물관' },
    '127492': { contentid: '127492', contenttypeid: '12', title: '중문관광단지', addr1: '서귀포시 중문동', mapx: '126.4194', mapy: '33.2496', firstimage: 'https://img/b.jpg' },
    '126449': { contentid: '126449', contenttypeid: '12', title: '중문·색달 해변', addr1: '서귀포시 색달동', mapx: '126.4096', mapy: '33.2440' },
  }
  function route(url: string) {
    if (url.includes('areaBasedList2')) {
      return envelope([{ contentid: '2372025', contenttypeid: '25', title: '온가족 제주 중문단지여행', firstimage: 'https://img/course.jpg' }])
    }
    if (url.includes('detailInfo2')) {
      return envelope([
        { subnum: '0', subcontentid: '696841', subname: '테디베어' },
        { subnum: '1', subcontentid: '127492', subname: '중문관광단지' },
        { subnum: '2', subcontentid: '126449', subname: '색달해변' },
      ])
    }
    if (url.includes('detailCommon2')) {
      const cid = new URL(url).searchParams.get('contentId')!
      return envelope([POIS[cid]!])
    }
    return envelope([])
  }

  it('코스 + course_items + 좌표 보유 스팟을 생성하고 DRAFT로 둔다', async () => {
    setTourApiTransportForTest(async (url) => route(url))
    const s = await syncRegionCourses({ regionSlug: 'jeju', maxCourses: 5 })
    expect(s.coursesCreated).toBe(1)
    expect(s.spotsCreated).toBe(3)

    const course = await prisma.course.findUniqueOrThrow({
      where: { tourapiContentId: '2372025' },
      include: { items: { include: { spot: true }, orderBy: { sortOrder: 'asc' } } },
    })
    expect(course.status).toBe('DRAFT')
    expect(course.source).toBe('TOURAPI')
    expect(course.items).toHaveLength(3)
    expect(course.items[0]!.spot.name).toBe('테디베어하우스 테지움')
    expect(Number(course.items[0]!.spot.lat)).toBeCloseTo(33.4120, 3)
    expect(course.items[0]!.sortOrder).toBe(1)
  })

  it('재실행은 기존 코스를 보존(스킵) — 에디터 가공 보호', async () => {
    setTourApiTransportForTest(async (url) => route(url))
    await syncRegionCourses({ regionSlug: 'jeju', maxCourses: 5 })
    const second = await syncRegionCourses({ regionSlug: 'jeju', maxCourses: 5 })
    expect(second.coursesCreated).toBe(0)
    expect(second.coursesSkipped).toBe(1)
    expect(await prisma.course.count({ where: { tourapiContentId: '2372025' } })).toBe(1)
  })

  it('유효 경유지가 minLegs 미만이면 코스 스킵', async () => {
    setTourApiTransportForTest(async (url) => {
      if (url.includes('areaBasedList2')) return envelope([{ contentid: '999', contenttypeid: '25', title: '경유지 부족 코스' }])
      if (url.includes('detailInfo2')) return envelope([{ subnum: '0', subcontentid: '696841', subname: 'x' }])
      if (url.includes('detailCommon2')) return envelope([POIS['696841']!])
      return envelope([])
    })
    const s = await syncRegionCourses({ regionSlug: 'jeju', maxCourses: 5, minLegs: 2 })
    expect(s.coursesCreated).toBe(0)
    expect(s.coursesSkipped).toBe(1)
  })
})
