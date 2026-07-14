import { prisma } from '../../lib/prisma.js'
import { Errors } from '../../lib/errors.js'
import { fetchFestivals, type TourApiFestivalItem } from '../tourapi/client.js'
import { resolveArea } from '../tourapi/regions.js'
import { sanitizeText } from '../../lib/util.js'

/* ── 지역축제 동기화 (searchFestival2, contentTypeId=15) ────────────
   코타 웹 핵심 축. 멱등: tourapiContentId upsert — 원본 필드만 갱신.
   기간이 지난 축제도 이력으로 보존(달력·과거 검색), 노출 필터는 API 레이어에서. */

const PAGE_SIZE = 50

export interface FestivalSyncOptions {
  regionSlug: string
  /** 이 날짜(YYYYMMDD) 이후 개최·진행 중인 축제부터. 기본: 오늘 */
  from?: string
  maxItems?: number
  dryRun?: boolean
  onProgress?: (msg: string) => void
}

export interface FestivalSyncSummary {
  region: string
  fetched: number
  created: number
  updated: number
  skipped: number
  dryRun: boolean
}

export interface FestivalUpsertInput {
  tourapiContentId: string
  regionId: bigint
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  startDate: Date
  endDate: Date
  imageUrl: string | null
  tel: string | null
}

// YYYYMMDD → UTC Date (@db.Date 컬럼이라 시각은 버려짐)
function parseYmd(s: string | undefined): Date | null {
  if (!s || !/^\d{8}$/.test(s)) return null
  const d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function todayYmd(now = new Date()): string {
  // KST 기준 오늘 — 축제 개최일은 한국 날짜
  const kst = new Date(now.getTime() + 9 * 3600_000)
  return kst.toISOString().slice(0, 10).replace(/-/g, '')
}

export type FestivalMapResult = { ok: true; value: FestivalUpsertInput } | { ok: false; reason: string }

export function toFestivalInput(item: TourApiFestivalItem, regionId: bigint): FestivalMapResult {
  if (!item.contentid) return { ok: false, reason: 'contentid 없음' }
  if (!item.title?.trim()) return { ok: false, reason: '제목 없음' }
  const startDate = parseYmd(item.eventstartdate)
  const endDate = parseYmd(item.eventenddate) ?? startDate
  if (!startDate || !endDate) return { ok: false, reason: '개최 기간 없음' }
  const lat = item.mapy ? Number(item.mapy) : NaN
  const lng = item.mapx ? Number(item.mapx) : NaN
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
  const address = [item.addr1, item.addr2].filter(Boolean).join(' ').trim() || null
  return {
    ok: true,
    value: {
      tourapiContentId: item.contentid,
      regionId,
      name: sanitizeText(item.title).trim(),
      address,
      lat: hasCoords ? lat : null,
      lng: hasCoords ? lng : null,
      startDate,
      endDate,
      imageUrl: item.firstimage || item.firstimage2 || null,
      tel: item.tel?.trim() || null,
    },
  }
}

export async function syncRegionFestivals(opts: FestivalSyncOptions): Promise<FestivalSyncSummary> {
  const area = resolveArea(opts.regionSlug)
  if (!area) throw Errors.validation(`알 수 없는 지역 slug: ${opts.regionSlug}`)
  const region = await prisma.region.findUnique({ where: { slug: opts.regionSlug }, select: { id: true, name: true } })
  if (!region) throw Errors.notFound(`지역(slug=${opts.regionSlug})`)

  const from = opts.from ?? todayYmd()
  if (!/^\d{8}$/.test(from)) throw Errors.validation(`--from 은 YYYYMMDD 형식이어야 합니다: ${from}`)
  const maxItems = opts.maxItems ?? 200
  const log = opts.onProgress ?? (() => {})

  const summary: FestivalSyncSummary = { region: region.name, fetched: 0, created: 0, updated: 0, skipped: 0, dryRun: Boolean(opts.dryRun) }

  let pageNo = 1
  while (summary.fetched < maxItems) {
    const res = await fetchFestivals({
      eventStartDate: from,
      areaCode: area.areaCode,
      sigunguCode: area.sigunguCode,
      pageNo,
      numOfRows: Math.min(PAGE_SIZE, maxItems - summary.fetched),
    })
    if (res.items.length === 0) break

    for (const raw of res.items) {
      summary.fetched += 1
      const mapped = toFestivalInput(raw, region.id)
      if (!mapped.ok) { summary.skipped += 1; continue }
      if (opts.dryRun) { summary.created += 1; continue }

      const { tourapiContentId, ...data } = mapped.value
      const existing = await prisma.festival.findUnique({ where: { tourapiContentId }, select: { id: true } })
      if (existing) {
        await prisma.festival.update({ where: { id: existing.id }, data })
        summary.updated += 1
      } else {
        await prisma.festival.create({ data: { ...data, tourapiContentId } })
        summary.created += 1
      }
    }

    log(`${summary.fetched}건 처리 (생성 ${summary.created} / 갱신 ${summary.updated} / 스킵 ${summary.skipped})`)
    if (res.items.length < PAGE_SIZE || summary.fetched >= res.totalCount) break
    pageNo += 1
  }

  return summary
}
