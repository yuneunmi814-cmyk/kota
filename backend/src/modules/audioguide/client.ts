import { env } from '../../config/env.js'
import { Errors } from '../../lib/errors.js'

// 한국관광공사 관광지 오디오 가이드(오디·Odii) — TourAPI와 동일 계정 serviceKey 재사용.
// base: https://apis.data.go.kr/B551011/Odii/  (필수 param: langCode)
const BASE = 'https://apis.data.go.kr/B551011/Odii'

export type LangCode = 'ko' | 'en' | 'ja' | 'zh-CN'

export interface OdiiStory {
  tid?: string
  stid?: string
  title?: string
  mapX?: string // 경도
  mapY?: string // 위도
  audioTitle?: string
  script?: string
  playTime?: string | number
  audioUrl?: string
  imageUrl?: string
  langCode?: string
}

export type OdiiTransport = (url: string) => Promise<unknown>
let transport: OdiiTransport = async (url) => {
  const res = await fetch(url)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) throw Errors.conflict('ODII_ERROR', 'Odii 오류 응답 — serviceKey/활용신청을 확인하세요')
  return JSON.parse(text)
}
export function setOdiiTransportForTest(fn: OdiiTransport): void { transport = fn }

function serviceKey(): string {
  if (!env.TOURAPI_SERVICE_KEY) throw Errors.notConfigured('TourAPI/Odii serviceKey(TOURAPI_SERVICE_KEY)')
  return env.TOURAPI_SERVICE_KEY
}

interface Envelope {
  response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { totalCount?: number; items?: '' | { item?: OdiiStory | OdiiStory[] } } }
}

function unwrap(json: unknown): OdiiStory[] {
  const env_ = json as Envelope
  const code = env_.response?.header?.resultCode
  if (code && code !== '0000') throw Errors.conflict('ODII_ERROR', `Odii: ${env_.response?.header?.resultMsg ?? code}`)
  const raw = env_.response?.body?.items
  const item = raw ? raw.item : undefined
  return item ? (Array.isArray(item) ? item : [item]) : []
}

// 스팟 좌표 반경 내 오디오 스토리 조회 (storyLocationBasedList)
export async function fetchStoriesNearby(opts: { lng: number; lat: number; radiusM: number; langCode: LangCode; rows?: number }): Promise<OdiiStory[]> {
  const sp = new URLSearchParams({
    serviceKey: serviceKey(), MobileOS: 'ETC', MobileApp: 'KOTA', _type: 'json',
    numOfRows: String(opts.rows ?? 20), pageNo: '1',
    langCode: opts.langCode, mapX: String(opts.lng), mapY: String(opts.lat), radius: String(opts.radiusM),
  })
  return unwrap(await transport(`${BASE}/storyLocationBasedList?${sp.toString()}`))
}
