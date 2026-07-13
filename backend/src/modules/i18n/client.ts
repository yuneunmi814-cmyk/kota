import { env } from '../../config/env.js'
import { Errors } from '../../lib/errors.js'

// 한국관광공사 영문 관광정보(EngService2) — 동일 contentId 체계. areaBasedList2(lDongRegnCd).
const BASE = 'https://apis.data.go.kr/B551011/EngService2'

export interface EngItem {
  contentid?: string
  title?: string
  addr1?: string
}

export type EngTransport = (url: string) => Promise<unknown>
let transport: EngTransport = async (url) => {
  const res = await fetch(url)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) throw Errors.conflict('ENG_ERROR', '영문 관광정보 오류 응답 — serviceKey/활용신청 확인')
  return JSON.parse(text)
}
export function setEngTransportForTest(fn: EngTransport): void { transport = fn }

function serviceKey(): string {
  if (!env.TOURAPI_SERVICE_KEY) throw Errors.notConfigured('영문 관광정보 serviceKey(TOURAPI_SERVICE_KEY)')
  return env.TOURAPI_SERVICE_KEY
}

interface Envelope { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { totalCount?: number; items?: '' | { item?: EngItem | EngItem[] } } } }
function unwrap(json: unknown): { items: EngItem[]; totalCount: number } {
  const e = json as Envelope
  const code = e.response?.header?.resultCode
  if (code && code !== '0000') throw Errors.conflict('ENG_ERROR', `영문: ${e.response?.header?.resultMsg ?? code}`)
  const body = e.response?.body
  const raw = body?.items
  const item = raw ? raw.item : undefined
  return { items: item ? (Array.isArray(item) ? item : [item]) : [], totalCount: body?.totalCount ?? 0 }
}

// 시도(lDongRegnCd)별 영문 콘텐츠 목록 (contentId + 영문 title)
export async function fetchEngByRegion(lDongRegnCd: string, pageNo: number, rows = 100): Promise<{ items: EngItem[]; totalCount: number }> {
  const sp = new URLSearchParams({
    serviceKey: serviceKey(), MobileOS: 'ETC', MobileApp: 'KOTA', _type: 'json',
    numOfRows: String(rows), pageNo: String(pageNo), lDongRegnCd, arrange: 'A',
  })
  return unwrap(await transport(`${BASE}/areaBasedList2?${sp.toString()}`))
}
