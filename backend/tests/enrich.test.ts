import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { api, prisma, seedAll } from './helpers.js'
import type { SeedResult } from '../prisma/seed-core.js'
import { setPhotoTransportForTest } from '../src/modules/photos/client.js'
import { syncPhotosForRegion } from '../src/modules/photos/sync.js'
import { setVisitorTransportForTest } from '../src/modules/visitors/client.js'
import { syncRegionVisitors } from '../src/modules/visitors/sync.js'
import { setEngTransportForTest } from '../src/modules/i18n/client.js'
import { syncEnglishForRegion } from '../src/modules/i18n/sync.js'

let seed: SeedResult
function env(items: unknown[]) {
  return { response: { header: { resultCode: '0000', resultMsg: 'OK' }, body: { totalCount: items.length, items: items.length ? { item: items } : '' } } }
}

describe('관광사진 갤러리 연동', () => {
  beforeAll(async () => { seed = await seedAll() })
  beforeEach(async () => { await prisma.spotImage.deleteMany({ where: { source: 'PHOTO' } }) })

  it('스팟명이 제목/키워드에 포함된 사진만 갤러리로 추가', async () => {
    setPhotoTransportForTest(async () => env([
      { galContentId: 'p1', galTitle: '성산일출봉', galWebImageUrl: 'https://img/1.jpg', galPhotographer: '한국관광공사 김지호', galSearchKeyword: '성산일출봉, 제주' },
      { galContentId: 'p2', galTitle: '엉뚱한 사진', galWebImageUrl: 'https://img/2.jpg', galSearchKeyword: '서울 남산' }, // 무관 → 제외
    ]))
    const s = await syncPhotosForRegion({ regionSlug: 'jeju' })
    expect(s.created).toBeGreaterThanOrEqual(1)
    const sungsan = await prisma.spot.findFirstOrThrow({ where: { name: '성산일출봉' } })
    const imgs = await prisma.spotImage.findMany({ where: { spotId: sungsan.id, source: 'PHOTO' } })
    expect(imgs.length).toBe(1)
    expect(imgs[0]!.url).toBe('https://img/1.jpg')
    expect(imgs[0]!.sourceCredit).toContain('한국관광공사')
  })

  it('재실행 멱등 (sourceId dedupe)', async () => {
    setPhotoTransportForTest(async () => env([{ galContentId: 'p1', galTitle: '성산일출봉', galWebImageUrl: 'https://img/1.jpg', galSearchKeyword: '성산일출봉' }]))
    await syncPhotosForRegion({ regionSlug: 'jeju' })
    const s2 = await syncPhotosForRegion({ regionSlug: 'jeju' })
    expect(s2.created).toBe(0)
    expect(s2.updated).toBeGreaterThanOrEqual(1)
  })
})

describe('지역별 방문자수 → 인기 점수', () => {
  beforeAll(async () => { await seedAll() })

  it('외지인+외국인 합을 시도명 매칭으로 region.visitorScore에 반영', async () => {
    setVisitorTransportForTest(async () => env([
      { areaNm: '제주특별자치도', touDivCd: '2', touNum: '1000', baseYmd: '20250601' },
      { areaNm: '제주특별자치도', touDivCd: '3', touNum: '500', baseYmd: '20250601' },
      { areaNm: '제주특별자치도', touDivCd: '1', touNum: '9999', baseYmd: '20250601' }, // 현지인 제외
      { areaNm: '부산광역시', touDivCd: '2', touNum: '300', baseYmd: '20250601' },
    ]))
    const s = await syncRegionVisitors({ now: new Date('2026-06-13') })
    const jeju = s.updated.find((u) => u.slug === 'jeju')!
    expect(jeju.visitorScore).toBe(1500) // 1000+500, 현지인 제외
    const dbJeju = await prisma.region.findUniqueOrThrow({ where: { slug: 'jeju' } })
    expect(dbJeju.visitorScore).toBe(1500)
  })
})

describe('영문 관광정보 i18n', () => {
  beforeAll(async () => { seed = await seedAll() })

  it('영문 title 괄호 속 한글명으로 매칭 → spot_translations(en) + ?lang=en 반영', async () => {
    // 시드의 성산일출봉(편집자 스팟)에 영문 title의 (한글명)으로 매칭
    setEngTransportForTest(async () => env([
      { contentid: '1009178', title: 'Seongsan Ilchulbong Peak [UNESCO World Heritage] (성산일출봉)', addr1: 'Jeju' },
      { contentid: '999999', title: 'Nowhere Place (없는관광지)', addr1: 'Jeju' },
    ]))
    const s = await syncEnglishForRegion({ regionSlug: 'jeju' })
    expect(s.created).toBeGreaterThanOrEqual(1)

    const sungsan = await prisma.spot.findFirstOrThrow({ where: { name: '성산일출봉' } })
    const tr = await prisma.spotTranslation.findFirstOrThrow({ where: { spotId: sungsan.id, langCode: 'en' } })
    expect(tr.name).toBe('Seongsan Ilchulbong Peak [UNESCO World Heritage]')

    const res = await api.get(`/api/v1/spots/${sungsan.id}?lang=en`)
    expect(res.body.data.name).toBe('Seongsan Ilchulbong Peak [UNESCO World Heritage]')
    expect(res.body.data.lang).toBe('en')
    const ko = await api.get(`/api/v1/spots/${sungsan.id}`)
    expect(ko.body.data.name).toBe('성산일출봉')
  })
})
