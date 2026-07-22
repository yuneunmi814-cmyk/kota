// 백엔드 응답 규약: { success: true, data } / { success: false, error: { code, message } }
const BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  const body = (await res.json()) as { success: boolean; data?: T; error?: { code: string; message: string } }
  if (!body.success || body.data === undefined) throw new Error(body.error?.message ?? `API 오류 (${res.status})`)
  return body.data
}

export type Region = { id: string; name: string; slug: string; thumbnailUrl: string | null }

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
  region: { id: string; name: string; slug: string }
  popularity: number // 지역 방문자수(관광 빅데이터) 기반 인기 프록시
  status: 'ongoing' | 'upcoming' | 'ended'
}

export type SearchResult = {
  courses: { id: string; title: string; summary?: string | null; region?: { name: string } | null }[]
  spots: { id: string; name: string; category: string; address: string | null; region: string }[]
  regions: { id: string; name: string; slug: string }[]
}
