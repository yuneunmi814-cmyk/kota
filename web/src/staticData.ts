import type { Festival, Region } from './api'

// API 서버가 없을 때(GitHub Pages 데모 등)의 정적 데이터 폴백.
// backend `npm run export:web`이 public/data/*.json 을 생성한다.
const BASE = import.meta.env.BASE_URL

async function loadJson<T>(file: string): Promise<T> {
  const res = await fetch(`${BASE}data/${file}`)
  if (!res.ok) throw new Error(`static data ${file} ${res.status}`)
  return (await res.json()) as T
}

export async function staticRegions(): Promise<Region[]> {
  const d = await loadJson<{ regions: Region[] }>('regions.json')
  return d.regions
}

type StaticFestival = Omit<Festival, 'status'>

// API의 GET /festivals 기본 동작 재현: 진행중+예정만, 시작일순, status 계산
export async function staticFestivals(limit: number): Promise<Festival[]> {
  const d = await loadJson<{ items: StaticFestival[] }>('festivals.json')
  const today = new Date().toISOString().slice(0, 10)
  return d.items
    .filter((f) => f.endDate >= today)
    .slice(0, limit)
    .map((f) => ({ ...f, status: f.startDate <= today ? 'ongoing' : 'upcoming' }))
}
