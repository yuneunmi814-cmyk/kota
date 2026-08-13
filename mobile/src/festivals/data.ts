import AsyncStorage from '@react-native-async-storage/async-storage'

// 축제 데이터 — 웹이 쓰는 정적 JSON을 그대로 받아 쓴다.
//
// 왜 백엔드를 안 거치나: ① 웹과 앱이 같은 파일을 보므로 내용이 어긋날 수 없다
// ② 축제 정보는 주 1회만 갱신돼 실시간이 필요 없다 ③ 서버가 죽어도 앱은 동작한다
// ④ 지오펜스는 오프라인에서도 걸려야 하는데, 캐시가 있으면 비행기모드에서도 알림이 뜬다.

const DATA_URL = 'https://yuneunmi814-cmyk.github.io/kota/data/festivals.json'
const CACHE_KEY = 'kota.festivals.v1'
const CACHE_AT_KEY = 'kota.festivals.at'
const MAX_AGE_MS = 12 * 60 * 60 * 1000 // 12시간 — 주간 갱신 데이터라 이 정도면 충분

export interface Festival {
  id: number
  externalId: string
  name: string
  summary?: string | null
  startDate: string
  endDate: string
  status: 'ongoing' | 'upcoming' | 'ended'
  sido?: string | null
  sigungu?: string | null
  address?: string | null
  placeName?: string | null
  imageUrl?: string | null
  tel?: string | null
  lat?: number | null
  lng?: number | null
  themes?: string[]
  translations?: { langCode: string; name: string; summary?: string | null; placeName?: string | null }[]
}

let memory: Festival[] | null = null

async function readCache(): Promise<Festival[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Festival[]) : null
  } catch {
    return null
  }
}

async function isStale(): Promise<boolean> {
  const at = await AsyncStorage.getItem(CACHE_AT_KEY)
  if (!at) return true
  return Date.now() - Number(at) > MAX_AGE_MS
}

async function fetchFresh(): Promise<Festival[]> {
  const res = await fetch(DATA_URL)
  if (!res.ok) throw new Error(`festivals fetch ${res.status}`)
  const { items } = (await res.json()) as { items: Festival[] }
  await AsyncStorage.multiSet([
    [CACHE_KEY, JSON.stringify(items)],
    [CACHE_AT_KEY, String(Date.now())],
  ])
  return items
}

/**
 * 축제 전체. 캐시를 먼저 돌려주고 오래됐으면 뒤에서 갱신한다(stale-while-revalidate).
 * 네트워크가 없으면 캐시로 계속 동작한다.
 */
export async function getFestivals(): Promise<Festival[]> {
  if (memory) {
    if (await isStale()) fetchFresh().then((f) => (memory = f)).catch(() => {})
    return memory
  }
  const cached = await readCache()
  if (cached) {
    memory = cached
    if (await isStale()) fetchFresh().then((f) => (memory = f)).catch(() => {})
    return cached
  }
  memory = await fetchFresh()
  return memory
}

/** 좌표가 있는 축제만 — 지오펜스는 좌표가 있어야 걸 수 있다 */
export const hasCoords = (f: Festival): f is Festival & { lat: number; lng: number } =>
  f.lat != null && f.lng != null

const DAY = 86_400_000
/** 1년 이상 이어지는 상시 행사인가 — 알림 대상에서 빼는 기준 */
export const isAlwaysOn = (f: Festival) =>
  new Date(f.endDate).getTime() - new Date(f.startDate).getTime() >= 365 * DAY

/** 두 지점 사이 거리(km) */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/** 축제가 지금 열려 있거나 곧 열리는가 — 끝난 축제에 알림이 가면 안 된다 */
export function isLive(f: Festival, now = new Date()): boolean {
  const start = new Date(f.startDate).getTime()
  const end = new Date(f.endDate).getTime() + DAY // 종료일 당일까지 유효
  const t = now.getTime()
  return t >= start - DAY && t <= end
}
