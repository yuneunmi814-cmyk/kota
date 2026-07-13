import { env } from '../../config/env.js'
import { Errors } from '../../lib/errors.js'

// 한국관광공사 관광빅데이터 — 지역별(광역 시도) 방문자수. metcoRegnVisitrDDList(startYmd~endYmd)
const BASE = 'https://apis.data.go.kr/B551011/DataLabService'

export interface RegionVisitorRow {
  areaCode?: string
  areaNm?: string
  touDivCd?: string  // 1 현지인 / 2 외지인 / 3 외국인
  touDivNm?: string
  touNum?: string
  baseYmd?: string
}

export type VisitorTransport = (url: string) => Promise<unknown>
let transport: VisitorTransport = async (url) => {
  const res = await fetch(url)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) throw Errors.conflict('VISITOR_ERROR', '방문자수 오류 응답 — serviceKey/활용신청 확인')
  return JSON.parse(text)
}
export function setVisitorTransportForTest(fn: VisitorTransport): void { transport = fn }

function serviceKey(): string {
  if (!env.TOURAPI_SERVICE_KEY) throw Errors.notConfigured('관광빅데이터 serviceKey(TOURAPI_SERVICE_KEY)')
  return env.TOURAPI_SERVICE_KEY
}

interface Envelope { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: '' | { item?: RegionVisitorRow | RegionVisitorRow[] } } } }
function unwrap(json: unknown): RegionVisitorRow[] {
  const e = json as Envelope
  const code = e.response?.header?.resultCode
  if (code && code !== '0000') throw Errors.conflict('VISITOR_ERROR', `방문자수: ${e.response?.header?.resultMsg ?? code}`)
  const raw = e.response?.body?.items
  const item = raw ? raw.item : undefined
  return item ? (Array.isArray(item) ? item : [item]) : []
}

// 광역 시도별 방문자수 (기간). 한 응답에 전체 시도가 들어온다.
export async function fetchMetcoVisitors(startYmd: string, endYmd: string): Promise<RegionVisitorRow[]> {
  const sp = new URLSearchParams({
    serviceKey: serviceKey(), MobileOS: 'ETC', MobileApp: 'KOTA', _type: 'json',
    numOfRows: '2000', pageNo: '1', startYmd, endYmd,
  })
  return unwrap(await transport(`${BASE}/metcoRegnVisitrDDList?${sp.toString()}`))
}
