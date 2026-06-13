import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { api, prisma, seedAll } from './helpers.js'
import type { SeedResult } from '../prisma/seed-core.js'
import { setOdiiTransportForTest } from '../src/modules/audioguide/client.js'
import { syncAudioGuidesForRegion } from '../src/modules/audioguide/sync.js'

let seed: SeedResult

function envelope(items: unknown[], totalCount = items.length) {
  return { response: { header: { resultCode: '0000', resultMsg: 'OK' }, body: { totalCount, items: items.length ? { item: items } : '' } } }
}

const STORY = (over: Record<string, unknown> = {}) => ({
  tid: '100', stid: '1000', title: '성산일출봉', mapX: '126.9425', mapY: '33.4587',
  audioTitle: '유네스코 세계자연유산', script: '성산일출봉은 약 5천 년 전...', playTime: '135',
  audioUrl: 'https://cdn.example/audio/1000.mp3', langCode: 'ko', ...over,
})

describe('오디오 가이드(오디) 동기화', () => {
  beforeAll(async () => { seed = await seedAll() })
  beforeEach(async () => { await prisma.audioGuide.deleteMany() })

  it('스팟 좌표 근접 스토리를 audio_guides로 매칭 생성', async () => {
    setOdiiTransportForTest(async (url) => (url.includes('storyLocationBasedList') ? envelope([STORY()]) : envelope([])))
    const s = await syncAudioGuidesForRegion({ regionSlug: 'jeju' })
    expect(s.created).toBeGreaterThanOrEqual(1)
    expect(s.withAudio).toBeGreaterThanOrEqual(1)

    const sungsan = await prisma.spot.findFirstOrThrow({ where: { name: '성산일출봉' } })
    const g = await prisma.audioGuide.findFirstOrThrow({ where: { spotId: sungsan.id } })
    expect(g.title).toBe('성산일출봉')
    expect(g.audioUrl).toContain('.mp3')
    expect(g.playTime).toBe(135)
    expect(g.langCode).toBe('ko')
  })

  it('재실행 멱등 — 같은 스토리는 갱신만', async () => {
    setOdiiTransportForTest(async (url) => (url.includes('storyLocationBasedList') ? envelope([STORY({ audioTitle: '수정본' })]) : envelope([])))
    await syncAudioGuidesForRegion({ regionSlug: 'jeju' })
    const before = await prisma.audioGuide.count()
    const s2 = await syncAudioGuidesForRegion({ regionSlug: 'jeju' })
    expect(s2.created).toBe(0)
    expect(s2.updated).toBeGreaterThanOrEqual(1)
    expect(await prisma.audioGuide.count()).toBe(before)
  })

  it('대본·오디오 모두 없는 스토리는 스킵', async () => {
    setOdiiTransportForTest(async (url) => (url.includes('storyLocationBasedList')
      ? envelope([STORY({ stid: '2000', audioUrl: '', script: '' })]) : envelope([])))
    const s = await syncAudioGuidesForRegion({ regionSlug: 'jeju' })
    expect(await prisma.audioGuide.findFirst({ where: { odiiStoryId: '2000' } })).toBeNull()
    expect(s.created).toBe(0)
  })

  it('스팟 상세 API가 audioGuides를 오디오 우선으로 반환', async () => {
    setOdiiTransportForTest(async (url) => (url.includes('storyLocationBasedList')
      ? envelope([STORY({ stid: '3001', audioUrl: '', script: '대본만 있음' }), STORY({ stid: '3002' })]) : envelope([])))
    await syncAudioGuidesForRegion({ regionSlug: 'jeju' })

    const sungsan = await prisma.spot.findFirstOrThrow({ where: { name: '성산일출봉' } })
    const res = await api.get(`/api/v1/spots/${sungsan.id}?lang=ko`)
    expect(res.status).toBe(200)
    expect(res.body.data.audioGuides.length).toBeGreaterThanOrEqual(2)
    expect(res.body.data.audioGuides[0].audioUrl).toBeTruthy() // 오디오 보유가 먼저
  })
})
