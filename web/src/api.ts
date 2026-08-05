// 백엔드 응답 규약: { success: true, data } / { success: false, error: { code, message } }
const BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

// Render 무료 인스턴스는 유휴 시 스핀다운(콜드 스타트 50초+). 타임아웃을 두고
// 초과하면 throw → 호출부의 정적 베이크 데이터 폴백으로 즉시 전환(사용자 대기 방지).
const TIMEOUT_MS = 6000

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  const body = (await res.json()) as { success: boolean; data?: T; error?: { code: string; message: string } }
  if (!body.success || body.data === undefined) throw new Error(body.error?.message ?? `API 오류 (${res.status})`)
  return body.data
}

export type Region = { id: string; name: string; slug: string; thumbnailUrl: string | null }

/** 시·도 필터 항목 — 축제 데이터에서 집계(하드코딩 없음) */
export type Sido = { name: string; count: number }

export type Festival = {
  id: string
  name: string
  summary: string | null
  address: string | null
  lat: number | null
  lng: number | null
  startDate: string // YYYY-MM-DD
  endDate: string
  imageUrl: string | null
  tel?: string | null
  homepage?: string | null
  sido?: string | null
  sigungu?: string | null
  // 큐레이션 지역 매칭 시 id·slug 존재, 미매칭(전국) 축제는 null (name은 시·군·구 표시)
  region: { id: string | null; name: string; slug: string | null }
  popularity: number // 지역 방문자수(관광 빅데이터) 기반 인기 프록시
  status: 'ongoing' | 'upcoming' | 'ended'
}

export type SearchResult = {
  festivals: Festival[]
  courses: { id: string; title: string; summary?: string | null; region?: { name: string } | null }[]
  spots: { id: string; name: string; category: string; address: string | null; region: string }[]
  regions: { id: string; name: string; slug: string }[]
}
