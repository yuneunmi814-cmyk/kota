import { prisma } from '../../lib/prisma.js'
import { Errors } from '../../lib/errors.js'
import { fetchAreaBased, fetchCourseLegs, fetchDetailCommon } from './client.js'
import { resolveArea } from './regions.js'
import { IMAGE_CREDIT, poiToSpotInput, toSpotInput, type SpotUpsertInput } from './mapper.js'
import { sanitizeText } from '../../lib/util.js'

// 기본 동기화 대상 contentTypeId (관광지·문화시설·레포츠·쇼핑·음식점)
export const DEFAULT_CONTENT_TYPES = [12, 14, 28, 38, 39]

export interface SyncOptions {
  regionSlug: string
  contentTypeIds?: number[]
  maxPerType?: number
  withOverview?: boolean
  dryRun?: boolean
  onProgress?: (msg: string) => void
}

export interface SyncSummary {
  region: string
  created: number
  updated: number
  skipped: number
  fetched: number
  byType: Record<number, { fetched: number; created: number; updated: number; skipped: number }>
  dryRun: boolean
}

const PAGE_SIZE = 50

async function upsertSpot(input: SpotUpsertInput, overview: string | null): Promise<{ id: bigint; mode: 'created' | 'updated' }> {
  const existing = await prisma.spot.findUnique({
    where: { tourapiContentId: input.tourapiContentId },
    select: { id: true },
  })

  // 원본 동기화 필드만 갱신 — 에디터 가공 필드(tips/avgStayMinutes/checkinRadiusM/openHours)는 보존
  const common = {
    regionId: input.regionId,
    name: input.name,
    category: input.category,
    address: input.address,
    lat: input.lat,
    lng: input.lng,
    phone: input.phone,
    ...(overview ? { description: sanitizeText(overview).slice(0, 5000) } : {}),
  }

  if (existing) {
    await prisma.spot.update({ where: { id: existing.id }, data: common })
    if (input.imageUrl) {
      const hasImg = await prisma.spotImage.findFirst({ where: { spotId: existing.id }, select: { id: true } })
      if (!hasImg) await prisma.spotImage.create({ data: { spotId: existing.id, url: input.imageUrl, sourceCredit: IMAGE_CREDIT, sortOrder: 0 } })
    }
    return { id: existing.id, mode: 'updated' }
  }

  const created = await prisma.spot.create({
    data: {
      ...common,
      source: 'TOURAPI',
      tourapiContentId: input.tourapiContentId,
      summary: input.summary,
      ...(input.imageUrl ? { images: { create: [{ url: input.imageUrl, sourceCredit: IMAGE_CREDIT, sortOrder: 0 }] } } : {}),
    },
    select: { id: true },
  })
  return { id: created.id, mode: 'created' }
}

export async function syncRegionSpots(opts: SyncOptions): Promise<SyncSummary> {
  const area = resolveArea(opts.regionSlug)
  if (!area) throw Errors.validation(`알 수 없는 지역 slug: ${opts.regionSlug}`)
  const region = await prisma.region.findUnique({ where: { slug: opts.regionSlug }, select: { id: true, name: true } })
  if (!region) throw Errors.notFound(`지역(slug=${opts.regionSlug})`)

  const types = opts.contentTypeIds?.length ? opts.contentTypeIds : DEFAULT_CONTENT_TYPES
  const maxPerType = opts.maxPerType ?? 100
  const log = opts.onProgress ?? (() => {})

  const summary: SyncSummary = {
    region: region.name, created: 0, updated: 0, skipped: 0, fetched: 0, byType: {}, dryRun: Boolean(opts.dryRun),
  }

  for (const contentTypeId of types) {
    const bucket = { fetched: 0, created: 0, updated: 0, skipped: 0 }
    let pageNo = 1
    while (bucket.fetched < maxPerType) {
      const res = await fetchAreaBased({
        areaCode: area.areaCode, sigunguCode: area.sigunguCode, contentTypeId,
        pageNo, numOfRows: Math.min(PAGE_SIZE, maxPerType - bucket.fetched),
      })
      if (res.items.length === 0) break

      for (const raw of res.items) {
        bucket.fetched += 1
        const mapped = toSpotInput(raw, region.id)
        if (!mapped.ok) { bucket.skipped += 1; continue }
        if (opts.dryRun) { bucket.created += 1; continue }

        let overview: string | null = null
        if (opts.withOverview) {
          try { overview = (await fetchDetailCommon(mapped.value.tourapiContentId))?.overview ?? null } catch { overview = null }
        }
        const { mode } = await upsertSpot(mapped.value, overview)
        bucket[mode] += 1
      }

      log(`[${contentTypeId}] ${bucket.fetched}건 처리 (생성 ${bucket.created} / 갱신 ${bucket.updated} / 스킵 ${bucket.skipped})`)
      if (res.items.length < PAGE_SIZE || bucket.fetched >= res.totalCount) break
      pageNo += 1
    }

    summary.byType[contentTypeId] = bucket
    summary.fetched += bucket.fetched
    summary.created += bucket.created
    summary.updated += bucket.updated
    summary.skipped += bucket.skipped
  }

  return summary
}

/* ── 여행코스(contentTypeId=25) import ────────────────────────────
   체인: areaBasedList2(25) → detailInfo2(경유지 subcontentid) → detailCommon2(좌표 POI)
   경유지를 좌표 보유 spot으로 upsert하고, 그 FK로 course_items를 구성해 DRAFT 코스를 만든다.
   에디터가 4-eyes 워크플로로 검수·발행 (기획설계서 결정 1). 멱등: 이미 있는 코스는 보존(에디터 가공 보호). */
export interface CourseSyncOptions {
  regionSlug: string
  maxCourses?: number
  minLegs?: number
  dryRun?: boolean
  onProgress?: (msg: string) => void
}

export interface CourseSyncSummary {
  region: string
  coursesCreated: number
  coursesSkipped: number
  spotsCreated: number
  spotsLinked: number
  dryRun: boolean
}

export async function syncRegionCourses(opts: CourseSyncOptions): Promise<CourseSyncSummary> {
  const area = resolveArea(opts.regionSlug)
  if (!area) throw Errors.validation(`알 수 없는 지역 slug: ${opts.regionSlug}`)
  const region = await prisma.region.findUnique({ where: { slug: opts.regionSlug }, select: { id: true, name: true } })
  if (!region) throw Errors.notFound(`지역(slug=${opts.regionSlug})`)

  // 가져온 코스의 작성자(임포터) — 콘텐츠 매니저(없으면 아무 관리자)
  const importer =
    (await prisma.adminUser.findFirst({ where: { role: 'CONTENT_MANAGER', isActive: true }, select: { id: true } })) ??
    (await prisma.adminUser.findFirst({ where: { isActive: true }, select: { id: true } }))
  if (!importer) throw Errors.conflict('NO_IMPORTER', '코스 작성자로 쓸 관리자 계정이 없습니다 (db:seed 먼저 실행)')

  const maxCourses = opts.maxCourses ?? 10
  const minLegs = opts.minLegs ?? 2
  const log = opts.onProgress ?? (() => {})
  const summary: CourseSyncSummary = {
    region: region.name, coursesCreated: 0, coursesSkipped: 0, spotsCreated: 0, spotsLinked: 0, dryRun: Boolean(opts.dryRun),
  }

  const list = await fetchAreaBased({ areaCode: area.areaCode, sigunguCode: area.sigunguCode, contentTypeId: 25, numOfRows: maxCourses, pageNo: 1 })

  for (const raw of list.items.slice(0, maxCourses)) {
    const existing = await prisma.course.findUnique({ where: { tourapiContentId: raw.contentid }, select: { id: true } })
    if (existing) { summary.coursesSkipped += 1; continue } // 에디터 가공 보호 — 재import하지 않음

    const legs = await fetchCourseLegs(raw.contentid)
    const itemSpotIds: bigint[] = []
    for (const leg of legs) {
      const poi = await fetchDetailCommon(leg.subcontentid!).catch(() => null)
      if (!poi) continue
      const mapped = poiToSpotInput(poi, region.id)
      if (!mapped.ok) continue
      if (opts.dryRun) { itemSpotIds.push(0n); summary.spotsLinked += 1; continue }
      const { id, mode } = await upsertSpot(mapped.value, poi.overview ?? null)
      if (mode === 'created') summary.spotsCreated += 1
      itemSpotIds.push(id)
      summary.spotsLinked += 1
    }

    if (itemSpotIds.length < minLegs) {
      summary.coursesSkipped += 1
      log(`스킵: "${raw.title}" (유효 경유지 ${itemSpotIds.length} < ${minLegs})`)
      continue
    }

    if (opts.dryRun) { summary.coursesCreated += 1; log(`(dry) 코스 "${raw.title}" — 경유지 ${itemSpotIds.length}`); continue }

    await prisma.course.create({
      data: {
        regionId: region.id,
        title: raw.title.trim(),
        summary: null,
        durationDays: 1, // TourAPI 코스는 일자 정보가 없어 1일 기본 → 에디터가 조정
        coverImageUrl: raw.firstimage || raw.firstimage2 || null,
        status: 'DRAFT',
        createdBy: importer.id,
        source: 'TOURAPI',
        tourapiContentId: raw.contentid,
        items: {
          create: itemSpotIds.map((spotId, i) => ({ dayNo: 1, sortOrder: i + 1, spotId })),
        },
      },
    })
    summary.coursesCreated += 1
    log(`코스 "${raw.title}" 생성 — 경유지 ${itemSpotIds.length}`)
  }

  return summary
}
