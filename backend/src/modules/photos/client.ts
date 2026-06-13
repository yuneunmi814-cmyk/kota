import { env } from '../../config/env.js'
import { Errors } from '../../lib/errors.js'

// 한국관광공사 관광사진(포토코리아) — 동일 TourAPI serviceKey. gallerySearchList1(keyword) 검색.
const BASE = 'https://apis.data.go.kr/B551011/PhotoGalleryService1'

export interface GalleryPhoto {
  galContentId?: string
  galTitle?: string
  galWebImageUrl?: string
  galPhotographer?: string
  galSearchKeyword?: string
  galPhotographyLocation?: string
}

export type PhotoTransport = (url: string) => Promise<unknown>
let transport: PhotoTransport = async (url) => {
  const res = await fetch(url)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) throw Errors.conflict('PHOTO_ERROR', '관광사진 오류 응답 — serviceKey/활용신청 확인')
  return JSON.parse(text)
}
export function setPhotoTransportForTest(fn: PhotoTransport): void { transport = fn }

function serviceKey(): string {
  if (!env.TOURAPI_SERVICE_KEY) throw Errors.notConfigured('관광사진 serviceKey(TOURAPI_SERVICE_KEY)')
  return env.TOURAPI_SERVICE_KEY
}

interface Envelope { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: '' | { item?: GalleryPhoto | GalleryPhoto[] } } } }
function unwrap(json: unknown): GalleryPhoto[] {
  const e = json as Envelope
  const code = e.response?.header?.resultCode
  if (code && code !== '0000') throw Errors.conflict('PHOTO_ERROR', `관광사진: ${e.response?.header?.resultMsg ?? code}`)
  const raw = e.response?.body?.items
  const item = raw ? raw.item : undefined
  return item ? (Array.isArray(item) ? item : [item]) : []
}

export async function fetchPhotosByKeyword(keyword: string, rows = 10): Promise<GalleryPhoto[]> {
  const sp = new URLSearchParams({
    serviceKey: serviceKey(), MobileOS: 'ETC', MobileApp: 'TravelPack', _type: 'json',
    numOfRows: String(rows), pageNo: '1', arrange: 'A', keyword,
  })
  return unwrap(await transport(`${BASE}/gallerySearchList1?${sp.toString()}`))
}
