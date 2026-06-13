import type { TourApiPoi, TourApiRawItem } from './client.js'

// contentTypeId → 우리 spot.category 라벨
const CONTENT_TYPE_LABEL: Record<string, string> = {
  '12': '관광지',
  '14': '문화시설',
  '15': '축제/공연',
  '25': '여행코스',
  '28': '레포츠',
  '32': '숙박',
  '38': '쇼핑',
  '39': '음식점',
}

export function contentTypeLabel(id: string): string {
  return CONTENT_TYPE_LABEL[id] ?? '기타'
}

// 동기화로 덮어쓰는 원본 필드(에디터 가공 필드 tips/avgStayMinutes/checkinRadiusM/openHours는 제외)
export interface SpotUpsertInput {
  tourapiContentId: string
  regionId: bigint
  name: string
  category: string
  address: string | null
  lat: number
  lng: number
  phone: string | null
  summary: string | null
  imageUrl: string | null
}

export type MapResult =
  | { ok: true; value: SpotUpsertInput }
  | { ok: false; reason: string }

export function toSpotInput(item: TourApiRawItem, regionId: bigint): MapResult {
  const lat = item.mapy ? Number(item.mapy) : NaN
  const lng = item.mapx ? Number(item.mapx) : NaN
  if (!item.contentid) return { ok: false, reason: 'contentid 없음' }
  if (!item.title?.trim()) return { ok: false, reason: '제목 없음' }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return { ok: false, reason: '좌표 없음' }
  }
  const address = [item.addr1, item.addr2].filter(Boolean).join(' ').trim() || null
  return {
    ok: true,
    value: {
      tourapiContentId: item.contentid,
      regionId,
      name: item.title.trim(),
      category: contentTypeLabel(item.contenttypeid),
      address,
      lat,
      lng,
      phone: item.tel?.trim() || null,
      summary: null,
      imageUrl: item.firstimage || item.firstimage2 || null,
    },
  }
}

// detailCommon2 단일 POI(여행코스 경유지) → spot upsert 입력
export function poiToSpotInput(poi: TourApiPoi, regionId: bigint): MapResult {
  const lat = poi.mapy ? Number(poi.mapy) : NaN
  const lng = poi.mapx ? Number(poi.mapx) : NaN
  if (!poi.contentid) return { ok: false, reason: 'contentid 없음' }
  if (!poi.title?.trim()) return { ok: false, reason: '제목 없음' }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return { ok: false, reason: '좌표 없음' }
  }
  const address = [poi.addr1, poi.addr2].filter(Boolean).join(' ').trim() || null
  return {
    ok: true,
    value: {
      tourapiContentId: poi.contentid,
      regionId,
      name: poi.title.trim(),
      category: contentTypeLabel(poi.contenttypeid),
      address,
      lat,
      lng,
      phone: poi.tel?.trim() || null,
      summary: null,
      imageUrl: poi.firstimage || poi.firstimage2 || null,
    },
  }
}

export const IMAGE_CREDIT = '한국관광공사 TourAPI'
