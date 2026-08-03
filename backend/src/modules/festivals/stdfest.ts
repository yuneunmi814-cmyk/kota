import { env } from '../../config/env.js'
import { Errors } from '../../lib/errors.js'
import { prisma } from '../../lib/prisma.js'
import { sanitizeText } from '../../lib/util.js'
import { curatedSlugFor, normalizeFestivalName, parseSidoSigungu } from './regionMap.js'
import { upsertFestival, type FestivalMapResult, type FestivalSyncSummary } from './sync.js'

// 전국문화축제표준데이터 (공공데이터포털 tn_pubr_public_cltur_fstvl_api).
// TourAPI가 놓치는 소도시 축제(예: 영월동강뗏목축제)까지 커버. 이미지 없음(좌표·설명·전화·홈페이지 제공).
// data.go.kr 키는 TOURAPI_SERVICE_KEY 재사용(계정 단위 발급).
const BASE = 'https://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api'
const MAX_ROWS = 1000 // API 상한

export interface StdFestItem {
  fstvlNm?: string
  fstvlStartDate?: string // YYYY-MM-DD
  fstvlEndDate?: string
  fstvlCo?: string
  opar?: string
  rdnmadr?: string
  lnmadr?: string
  latitude?: string
  longitude?: string
  phoneNumber?: string
  homepageUrl?: string
  insttCode?: string
}

// 테스트 주입 지점
export type StdFestTransport = (url: string) => Promise<unknown>
let transport: StdFestTransport = async (url) => {
  const res = await fetch(url)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) throw Errors.conflict('STDFEST_ERROR', '표준데이터 오류 응답(XML) — serviceKey/쿼터 확인')
  return JSON.parse(text)
}
export function setStdFestTransportForTest(fn: StdFestTransport): void { transport = fn }

function serviceKey(): string {
  if (!env.TOURAPI_SERVICE_KEY) throw Errors.notConfigured('표준데이터 serviceKey(TOURAPI_SERVICE_KEY)')
  return env.TOURAPI_SERVICE_KEY
}

interface StdEnvelope {
  header?: { resultCode?: string; resultMsg?: string }
  body?: { totalCount?: number; items?: { item?: StdFestItem[] } | StdFestItem[] }
}

async function fetchStdFestivals(pageNo: number, numOfRows: number): Promise<{ items: StdFestItem[]; totalCount: number }> {
  const sp = new URLSearchParams()
  sp.set('serviceKey', serviceKey())
  sp.set('pageNo', String(pageNo))
  sp.set('numOfRows', String(numOfRows))
  sp.set('type', 'json')
  const json = (await transport(`${BASE}?${sp.toString()}`)) as StdEnvelope
  const code = json.header?.resultCode
  if (code && code !== '00') throw Errors.conflict('STDFEST_ERROR', `표준데이터: ${json.header?.resultMsg ?? code}`)
  const rawItems = json.body?.items
  const items = Array.isArray(rawItems) ? rawItems : (rawItems?.item ?? [])
  return { items, totalCount: json.body?.totalCount ?? items.length }
}

// YYYY-MM-DD → UTC Date
function parseDash(s: string | undefined): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

export function toStdFestInput(item: StdFestItem, regionIdBySlug: Map<string, bigint>): FestivalMapResult {
  if (!item.fstvlNm?.trim()) return { ok: false, reason: '축제명 없음' }
  const startDate = parseDash(item.fstvlStartDate)
  const endDate = parseDash(item.fstvlEndDate) ?? startDate
  if (!startDate || !endDate) return { ok: false, reason: '개최 기간 없음' }
  const address = (item.rdnmadr || item.lnmadr || '').trim() || null
  const { sido, sigungu } = parseSidoSigungu(address)
  const slug = curatedSlugFor(sido, sigungu)
  const lat = item.latitude ? Number(item.latitude) : NaN
  const lng = item.longitude ? Number(item.longitude) : NaN
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
  const name = sanitizeText(item.fstvlNm).trim()
  // 안정적 고유키 — 기관코드 + 정규화 이름 + 시작일 (재실행 멱등)
  const externalId = `stdfest:${item.insttCode ?? 'x'}-${normalizeFestivalName(name)}-${ymd(startDate)}`
  return {
    ok: true,
    value: {
      externalId,
      source: 'STDFEST',
      regionId: slug ? regionIdBySlug.get(slug) ?? null : null,
      sido,
      sigungu,
      name,
      summary: item.fstvlCo ? sanitizeText(item.fstvlCo).slice(0, 500) : null,
      address,
      lat: hasCoords ? lat : null,
      lng: hasCoords ? lng : null,
      startDate,
      endDate,
      imageUrl: null,
      tel: item.phoneNumber?.trim() || null,
      homepage: item.homepageUrl?.trim() || null,
    },
  }
}

export interface StdFestSyncOptions {
  /** 이 날짜(YYYYMMDD) 이후 종료되는 축제만 적재(기본: 오늘 — 진행중/예정만). 전체는 '00000000' */
  from?: string
  dryRun?: boolean
  onProgress?: (msg: string) => void
}

export async function syncStdFestivals(opts: StdFestSyncOptions = {}): Promise<FestivalSyncSummary> {
  const from = opts.from ?? undefined
  if (from && !/^\d{8}$/.test(from)) throw Errors.validation(`--from 은 YYYYMMDD 형식이어야 합니다: ${from}`)
  const log = opts.onProgress ?? (() => {})
  const regions = await prisma.region.findMany({ select: { id: true, slug: true } })
  const regionIdBySlug = new Map(regions.map((r) => [r.slug, r.id]))
  const summary: FestivalSyncSummary = { region: '전국(표준데이터)', fetched: 0, created: 0, updated: 0, skipped: 0, dryRun: Boolean(opts.dryRun) }

  const first = await fetchStdFestivals(1, MAX_ROWS)
  const totalPages = Math.max(1, Math.ceil(first.totalCount / MAX_ROWS))
  for (let page = 1; page <= totalPages; page += 1) {
    const { items } = page === 1 ? first : await fetchStdFestivals(page, MAX_ROWS)
    for (const raw of items) {
      summary.fetched += 1
      const mapped = toStdFestInput(raw, regionIdBySlug)
      if (!mapped.ok) { summary.skipped += 1; continue }
      // 진행중/예정만 — 종료일이 from 이전이면 스킵(과거 이력 제외)
      if (from && ymd(mapped.value.endDate) < from) { summary.skipped += 1; continue }
      if (opts.dryRun) { summary.created += 1; continue }
      const mode = await upsertFestival(mapped.value, true) // 소스 간 중복 제거
      summary[mode] += 1
    }
    log(`page ${page}/${totalPages} — 누적 생성 ${summary.created} / 갱신 ${summary.updated} / 스킵 ${summary.skipped}`)
  }
  return summary
}
