import { prisma } from '../src/lib/prisma.js'
import { env } from '../src/config/env.js'
import { parseSidoSigungu, curatedSlugFor, normalizeFestivalName } from '../src/modules/festivals/regionMap.js'

// 공사 '대한민국 구석구석' 축제 큐레이션(kfes) 동기화 — 5번째 소스 (2026-08-12 탐사).
// 같은 공사 CMS인데 searchFestival2가 놓치는 축제가 있다(실측: 진행·예정 126건 중 11건이
// 우리 4개 소스 어디에도 없음 — 서천국가유산야행·보은대추축제 등. 유구수국축제 추적이 계기).
//
// 핵심: kfes의 cmsCntntsId == TourAPI contentid → externalId 'tourapi:{id}'로 기존 행과
// 정확히 병합된다(이름 퍼지매칭 불필요). source도 TOURAPI로 넣어 주간 prune 체계에 편입.
// 이미지·주소는 같은 콘텐츠의 공식 라이선스 경로인 TourAPI detailCommon2에서 가져온다
// (kfes CDN 핫링크 회피 — KOGL 미표시 콘텐츠 정책).
//
// 요청 함정(실측): locationx/locationy는 빈 값이면 404 — 문자열 "null"을 보내야 한다.
// UA·Referer 필수. 12건/페이지(startIdx). searchDate: A=개최중, B=개최예정.
// 사용: npm run sync:kfes [-- --dry-run]

const LIST = 'https://korean.visitkorea.or.kr/kfes/list/selectWntyFstvlList.do'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const dryRun = process.argv.includes('--dry-run')

interface KfesItem {
  cntntsNm?: string
  cmsCntntsId?: string | number
  fstvlBgngDe?: string // 2026.08.12
  fstvlEndDe?: string
  areaNm?: string
  fstvlUsagePlcNm?: string
  xcrdVal?: string
  ycrdVal?: string
  hmpgAddr?: string
}

async function fetchKfes(searchDate: 'A' | 'B', startIdx: number): Promise<{ total: number; list: KfesItem[] }> {
  const body = new URLSearchParams({
    startIdx: String(startIdx), searchType: 'A', searchDate, searchArea: '', searchCate: '',
    locationx: 'null', locationy: 'null', filterExcluded: 'true',
  })
  const res = await fetch(LIST, {
    method: 'POST',
    headers: { 'User-Agent': UA, Referer: 'https://korean.visitkorea.or.kr/kfes/list/wntyFstvlList.do', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) throw new Error(`kfes HTTP ${res.status}`)
  const j = (await res.json()) as { totalCnt?: number; resultList?: KfesItem[] }
  return { total: j.totalCnt ?? 0, list: j.resultList ?? [] }
}

// 신규 축제의 이미지·주소 — 공식 경로(TourAPI detailCommon2)
async function fetchCommon(contentId: string): Promise<{ image?: string; addr?: string; tel?: string } | null> {
  try {
    const url = `https://apis.data.go.kr/B551011/KorService2/detailCommon2?serviceKey=${env.TOURAPI_SERVICE_KEY}&MobileOS=ETC&MobileApp=KOTA&_type=json&contentId=${contentId}`
    const j = (await (await fetch(url)).json()) as { response?: { body?: { items?: '' | { item?: { firstimage?: string; addr1?: string; tel?: string }[] } } } }
    const raw = j.response?.body?.items
    const it = raw && typeof raw !== 'string' ? (Array.isArray(raw.item) ? raw.item[0] : raw.item) : undefined
    return it ? { image: it.firstimage || undefined, addr: it.addr1 || undefined, tel: it.tel || undefined } : null
  } catch { return null }
}

const parseDe = (v?: string) => (v && /^\d{4}\.\d{2}\.\d{2}$/.test(v) ? new Date(v.replace(/\./g, '-')) : null)

async function main() {
  const all: KfesItem[] = []
  for (const mode of ['A', 'B'] as const) {
    let idx = 0
    for (;;) {
      const { total, list } = await fetchKfes(mode, idx)
      all.push(...list)
      idx += 12
      if (idx >= total || list.length === 0) break
      await new Promise((r) => setTimeout(r, 150))
    }
  }
  console.log(`▶ kfes 개최중·예정 ${all.length}건${dryRun ? ' (DRY-RUN)' : ''}`)

  const regions = await prisma.region.findMany({ select: { id: true, slug: true } })
  const bySlug = new Map(regions.map((r) => [r.slug, r.id]))
  // 소스 간 이름 중복 방지 — 문체부·표준데이터가 같은 축제를 다른 externalId로 이미 가진 경우
  const takenNames = new Set((await prisma.festival.findMany({ select: { name: true } })).map((f) => normalizeFestivalName(f.name)))
  let created = 0
  let updated = 0
  let skipped = 0

  for (const it of all) {
    const cid = String(it.cmsCntntsId ?? '').trim()
    const start = parseDe(it.fstvlBgngDe)
    const end = parseDe(it.fstvlEndDe)
    if (!cid || !it.cntntsNm || !start || !end) { skipped += 1; continue }
    const externalId = `tourapi:${cid}` // kfes cmsCntntsId == TourAPI contentid (같은 CMS)
    const exists = await prisma.festival.findUnique({ where: { externalId }, select: { id: true, imageUrl: true } })
    if (!exists && takenNames.has(normalizeFestivalName(it.cntntsNm))) { skipped += 1; continue } // 타소스 중복

    const parsed = parseSidoSigungu(it.areaNm ?? '')
    const sido = parsed.sido
    const sigungu = parsed.sigungu
    const lat = it.ycrdVal ? Number(it.ycrdVal) : null
    const lng = it.xcrdVal ? Number(it.xcrdVal) : null
    const base = {
      source: 'TOURAPI',
      regionId: curatedSlugFor(sido, sigungu) ? bySlug.get(curatedSlugFor(sido, sigungu)!) ?? null : null,
      sido, sigungu,
      name: it.cntntsNm.trim(),
      startDate: start, endDate: end,
      lat: lat && lat > 33 && lat < 39 ? lat : null,
      lng: lng && lng > 124 && lng < 132 ? lng : null,
      homepage: it.hmpgAddr?.trim() || null,
    }

    if (dryRun) { exists ? (updated += 1) : (created += 1, console.log(`  신규: ${base.name} (${sido} ${sigungu ?? ''}) ${it.fstvlBgngDe}~${it.fstvlEndDe}`)); continue }

    if (exists) {
      // 기존 행: 기간·좌표만 갱신(kfes가 최신 노출본) — 이름·이미지 등은 기존 유지
      await prisma.festival.update({ where: { id: exists.id }, data: { startDate: start, endDate: end, ...(base.lat != null && { lat: base.lat, lng: base.lng }) } })
      updated += 1
    } else {
      const common = await fetchCommon(cid) // 신규만 상세 1회 — 이미지·정식 주소
      await prisma.festival.create({
        data: {
          ...base, externalId,
          address: common?.addr ?? [sido, sigungu, it.fstvlUsagePlcNm].filter(Boolean).join(' '),
          summary: it.fstvlUsagePlcNm?.trim() || null,
          imageUrl: common?.image ?? null,
          tel: common?.tel?.trim() || null,
        },
      })
      created += 1
      console.log(`  ✚ ${base.name} (${sido} ${sigungu ?? ''}) ${it.fstvlBgngDe}~${it.fstvlEndDe}`)
      await new Promise((r) => setTimeout(r, 150))
    }
  }
  console.log(`✔ 신규 ${created} · 갱신 ${updated} · 스킵 ${skipped}`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
