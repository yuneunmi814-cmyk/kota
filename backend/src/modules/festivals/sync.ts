import { prisma } from '../../lib/prisma.js'
import { Errors } from '../../lib/errors.js'
import { fetchFestivals, type TourApiFestivalItem } from '../tourapi/client.js'
import { resolveLdong } from '../tourapi/regions.js'
import { sanitizeText } from '../../lib/util.js'
import { curatedSlugFor, normalizeFestivalName, parseSidoSigungu, SIDO_REGN_CDS } from './regionMap.js'

/* ── 지역축제 동기화 ─────────────────────────────────────────────
   전국(모든 시군구) 커버. 소스: TourAPI searchFestival2(이 파일) + 전국문화축제표준데이터(stdfest.ts).
   멱등: externalId(`tourapi:<contentid>`) upsert. regionId는 큐레이션 23개 지역과 매칭될 때만 채움. */

const PAGE_SIZE = 50

export interface FestivalSyncSummary {
  region: string
  fetched: number
  created: number
  updated: number
  skipped: number
  dryRun: boolean
}

export interface FestivalInput {
  externalId: string
  source: string
  regionId: bigint | null
  sido: string | null
  sigungu: string | null
  name: string
  summary: string | null
  address: string | null
  lat: number | null
  lng: number | null
  startDate: Date
  endDate: Date
  imageUrl: string | null
  tel: string | null
  homepage: string | null
}

export type FestivalMapResult = { ok: true; value: FestivalInput } | { ok: false; reason: string }

// YYYYMMDD → UTC Date (@db.Date 컬럼이라 시각은 버려짐)
export function parseYmd(s: string | undefined): Date | null {
  if (!s || !/^\d{8}$/.test(s)) return null
  const d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function todayYmd(now = new Date()): string {
  // KST 기준 오늘 — 축제 개최일은 한국 날짜
  const kst = new Date(now.getTime() + 9 * 3600_000)
  return kst.toISOString().slice(0, 10).replace(/-/g, '')
}

// TourAPI 축제 항목 → 일반화 입력 (주소로 시·도/시·군·구·큐레이션 지역 매핑)
export function toTourApiInput(item: TourApiFestivalItem, regionIdBySlug: Map<string, bigint>): FestivalMapResult {
  if (!item.contentid) return { ok: false, reason: 'contentid 없음' }
  if (!item.title?.trim()) return { ok: false, reason: '제목 없음' }
  const startDate = parseYmd(item.eventstartdate)
  const endDate = parseYmd(item.eventenddate) ?? startDate
  if (!startDate || !endDate) return { ok: false, reason: '개최 기간 없음' }
  const lat = item.mapy ? Number(item.mapy) : NaN
  const lng = item.mapx ? Number(item.mapx) : NaN
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
  const address = [item.addr1, item.addr2].filter(Boolean).join(' ').trim() || null
  const { sido, sigungu } = parseSidoSigungu(item.addr1 ?? address)
  const slug = curatedSlugFor(sido, sigungu)
  return {
    ok: true,
    value: {
      externalId: `tourapi:${item.contentid}`,
      source: 'TOURAPI',
      regionId: slug ? regionIdBySlug.get(slug) ?? null : null,
      sido,
      sigungu,
      name: sanitizeText(item.title).trim(),
      summary: null,
      address,
      lat: hasCoords ? lat : null,
      lng: hasCoords ? lng : null,
      startDate,
      endDate,
      imageUrl: item.firstimage || item.firstimage2 || null,
      tel: item.tel?.trim() || null,
      homepage: null,
    },
  }
}

// 공유 upsert — externalId로 멱등. dedupeAcrossSource=true면 같은 시작일의 다른 소스 축제와
// 정규화 이름이 겹칠 때 중복으로 스킵(표준데이터가 TourAPI와 겹치는 축제 중복 등록 방지).
export async function upsertFestival(input: FestivalInput, dedupeAcrossSource = false): Promise<'created' | 'updated' | 'skipped'> {
  const existing = await prisma.festival.findUnique({ where: { externalId: input.externalId }, select: { id: true } })
  const { externalId, ...data } = input
  if (existing) {
    await prisma.festival.update({ where: { id: existing.id }, data })
    return 'updated'
  }
  if (dedupeAcrossSource) {
    const sameStart = await prisma.festival.findMany({ where: { startDate: input.startDate }, select: { name: true, externalId: true } })
    const norm = normalizeFestivalName(input.name)
    if (sameStart.some((f) => f.externalId !== externalId && normalizeFestivalName(f.name) === norm)) return 'skipped'
  }
  await prisma.festival.create({ data: { ...data, externalId } })
  return 'created'
}

interface RegnTarget {
  regnCd: string
  signguCds?: string[]
}

// TourAPI 다중 시·도(또는 시·군) 대상 동기화 엔진
async function syncTourApiTargets(
  regionLabel: string,
  targets: RegnTarget[],
  from: string,
  maxPerTarget: number,
  dryRun: boolean,
  log: (m: string) => void,
): Promise<FestivalSyncSummary> {
  const regions = await prisma.region.findMany({ select: { id: true, slug: true } })
  const regionIdBySlug = new Map(regions.map((r) => [r.slug, r.id]))
  const summary: FestivalSyncSummary = { region: regionLabel, fetched: 0, created: 0, updated: 0, skipped: 0, dryRun }
  const seen = new Set<string>() // 같은 실행 내 contentid 중복 처리 방지

  for (const target of targets) {
    // 구(區) 단위 태깅 누락 방지 — signguCds 있으면 각각, 없으면 시·도 단위 1회
    const signguCds: (string | undefined)[] = target.signguCds?.length ? target.signguCds : [undefined]
    for (const signguCd of signguCds) {
      let pageNo = 1
      let fetchedForTarget = 0
      while (fetchedForTarget < maxPerTarget) {
        const res = await fetchFestivals({
          eventStartDate: from,
          lDongRegnCd: target.regnCd,
          lDongSignguCd: signguCd,
          pageNo,
          numOfRows: PAGE_SIZE,
        })
        if (res.items.length === 0) break

        for (const raw of res.items) {
          if (raw.contentid && seen.has(raw.contentid)) continue
          if (raw.contentid) seen.add(raw.contentid)
          summary.fetched += 1
          fetchedForTarget += 1
          const mapped = toTourApiInput(raw, regionIdBySlug)
          if (!mapped.ok) {
            summary.skipped += 1
            continue
          }
          if (dryRun) {
            summary.created += 1
            continue
          }
          const mode = await upsertFestival(mapped.value)
          summary[mode] += 1
        }

        if (res.items.length < PAGE_SIZE || pageNo * PAGE_SIZE >= res.totalCount) break
        pageNo += 1
      }
    }
    log(`[${target.regnCd}] 누적 ${summary.fetched}건 (생성 ${summary.created} / 갱신 ${summary.updated} / 스킵 ${summary.skipped})`)
  }

  return summary
}

export interface FestivalSyncOptions {
  regionSlug: string
  from?: string
  maxItems?: number
  dryRun?: boolean
  onProgress?: (msg: string) => void
}

// 단일 큐레이션 지역 동기화 (기존 호환)
export async function syncRegionFestivals(opts: FestivalSyncOptions): Promise<FestivalSyncSummary> {
  const ldong = resolveLdong(opts.regionSlug)
  if (!ldong) throw Errors.validation(`알 수 없는 지역 slug: ${opts.regionSlug}`)
  const region = await prisma.region.findUnique({ where: { slug: opts.regionSlug }, select: { name: true } })
  if (!region) throw Errors.notFound(`지역(slug=${opts.regionSlug})`)
  const from = opts.from ?? todayYmd()
  if (!/^\d{8}$/.test(from)) throw Errors.validation(`--from 은 YYYYMMDD 형식이어야 합니다: ${from}`)
  return syncTourApiTargets(
    region.name,
    [{ regnCd: ldong.regnCd, signguCds: ldong.signguCds }],
    from,
    opts.maxItems ?? 200,
    Boolean(opts.dryRun),
    opts.onProgress ?? (() => {}),
  )
}

export interface NationwideSyncOptions {
  from?: string
  maxPerSido?: number
  dryRun?: boolean
  onProgress?: (msg: string) => void
}

// 전국 시·도 전체 동기화 (16개 시·도 법정동 코드 순회)
export async function syncFestivalsTourApiAll(opts: NationwideSyncOptions = {}): Promise<FestivalSyncSummary> {
  const from = opts.from ?? todayYmd()
  if (!/^\d{8}$/.test(from)) throw Errors.validation(`--from 은 YYYYMMDD 형식이어야 합니다: ${from}`)
  return syncTourApiTargets(
    '전국(TourAPI)',
    SIDO_REGN_CDS.map((regnCd) => ({ regnCd })),
    from,
    opts.maxPerSido ?? 500,
    Boolean(opts.dryRun),
    opts.onProgress ?? (() => {}),
  )
}
