import type { Festival, Region, Sido } from './api'

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

type StaticTranslation = { langCode: string; name: string; summary: string | null; placeName: string | null }
type StaticFestival = Omit<Festival, 'status'> & { translations?: StaticTranslation[] }

// 정적 데이터에도 번역을 적용한다 — 콜드 스타트(약 50초) 동안 보이는 게 이 화면이라
// 여기서 한국어만 나오면 외국인에게는 API가 살아나기 전까지 못 읽는 목록이 된다.
function applyLang(f: StaticFestival, lang?: string): StaticFestival {
  if (!lang || lang === 'ko') return f
  const tr = f.translations?.find((t) => t.langCode === lang)
  if (!tr) return f
  return { ...f, name: tr.name, nameKo: f.name, lang, summary: tr.summary ?? f.summary, placeName: tr.placeName }
}

// API의 GET /festivals 기본 동작 재현: 진행중+예정만, 시작일순, status 계산
export async function staticFestivals(limit: number, lang?: string): Promise<Festival[]> {
  const d = await loadJson<{ items: StaticFestival[] }>('festivals.json')
  const today = new Date().toISOString().slice(0, 10)
  return d.items
    .filter((f) => f.endDate >= today)
    .slice(0, limit)
    .map((f) => applyLang(f, lang))
    .map((f) => ({ ...f, status: f.startDate <= today ? 'ongoing' : 'upcoming' }))
}

// GET /festivals/sidos 재현 — 베이크 데이터에서 시·도별 축제 수 집계(축제 많은 순)
export async function staticSidos(): Promise<Sido[]> {
  const d = await loadJson<{ items: StaticFestival[] }>('festivals.json')
  const today = new Date().toISOString().slice(0, 10)
  const counts = new Map<string, number>()
  for (const f of d.items) {
    if (f.endDate < today || !f.sido) continue
    counts.set(f.sido, (counts.get(f.sido) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}
