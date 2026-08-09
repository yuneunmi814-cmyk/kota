import { prisma } from '../src/lib/prisma.js'
import { env } from '../src/config/env.js'
import { normalizeFestivalName, parseSidoSigungu } from '../src/modules/festivals/regionMap.js'

// 이미지 없는 축제 보강 2단 파이프라인 (QA E-1 — 문체부·표준데이터·수기 소스는 원천에 이미지가 없어
// 예정 축제의 72%가 플레이스홀더였다):
//   ① KCISA 한눈에보는문화정보(B553457) — 공연·전시 위주라 축제 적중은 소수(실측 2건)지만 무료 선반영
//   ② TourAPI searchKeyword2(ctype=15) — **같은 축제의 과거 회차 등록분 포스터**. 공사 DB에는 지난 회차가
//      이미지와 함께 남아 있는데 기간이 지나 우리 수집에서 걸러졌다(실측 5/8 적중). MCST가 2026 일정을,
//      과거 회차가 포스터를 제공하는 상호보완.
//
// 매칭 정책(오매칭 방지 — 틀린 포스터가 없는 것보다 나쁘다):
//   정규화 이름 일치 AND 지역(시군구→시도) 일치일 때만 채택. 이름만 같고 지역이 다르면 버린다.
// 이미지와 함께 좌표도 비어 있으면 보강한다(거리순 커버리지 확대).
// 페이지 파라미터는 PageNo(대문자)·Rows — cPage/rows는 조용히 무시된다(2026-08-09 실측).
// 사용: npm run sync:kcisa [-- --dry-run]

const BASE = 'https://apis.data.go.kr/B553457/cultureinfo/period2'
const dryRun = process.argv.includes('--dry-run')

interface KcisaItem {
  title: string
  startDate?: string
  endDate?: string
  place?: string
  area?: string
  sigungu?: string
  thumbnail?: string
  gpsX?: string
  gpsY?: string
}

function tag(block: string, name: string): string | undefined {
  const m = new RegExp(`<${name}>([^<]*)</${name}>`).exec(block)
  return m?.[1]?.trim() || undefined
}

async function fetchPage(from: string, to: string, page: number): Promise<{ items: KcisaItem[]; total: number }> {
  const url = `${BASE}?serviceKey=${env.TOURAPI_SERVICE_KEY}&from=${from}&to=${to}&PageNo=${page}`
  const text = await (await fetch(url)).text()
  if (text.includes('returnReasonCode')) throw new Error(`KCISA 게이트 오류: ${text.slice(0, 200)}`)
  const total = Number(/<totalCount>(\d+)<\/totalCount>/.exec(text)?.[1] ?? 0)
  const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const b = m[1]!
    return {
      title: tag(b, 'title') ?? '',
      startDate: tag(b, 'startDate'),
      endDate: tag(b, 'endDate'),
      place: tag(b, 'place'),
      area: tag(b, 'area'),
      sigungu: tag(b, 'sigungu'),
      thumbnail: tag(b, 'thumbnail'),
      gpsX: tag(b, 'gpsX'),
      gpsY: tag(b, 'gpsY'),
    }
  })
  return { items, total }
}

function overlaps(aStart: Date, aEnd: Date, bStart?: string, bEnd?: string): boolean {
  if (!bStart) return false
  const bs = new Date(`${bStart.slice(0, 4)}-${bStart.slice(4, 6)}-${bStart.slice(6, 8)}`)
  const be = bEnd ? new Date(`${bEnd.slice(0, 4)}-${bEnd.slice(4, 6)}-${bEnd.slice(6, 8)}`) : bs
  return bs <= aEnd && be >= aStart
}

async function main() {
  const today = new Date(new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10))
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')
  const to = new Date(today)
  to.setMonth(to.getMonth() + 7) // 예정 축제 대부분을 덮는 창

  console.log(`▶ KCISA 문화정보 수집 ${ymd(today)}~${ymd(to)}${dryRun ? ' (DRY-RUN)' : ''}`)
  const first = await fetchPage(ymd(today), ymd(to), 1)
  const pages = Math.ceil(first.total / 10)
  console.log(`  총 ${first.total}건 · ${pages}페이지`)
  const all: KcisaItem[] = [...first.items]
  for (let p = 2; p <= pages; p += 1) {
    const { items } = await fetchPage(ymd(today), ymd(to), p)
    all.push(...items)
    if (p % 20 === 0) console.log(`  …${p}/${pages} 페이지 (${all.length}건)`)
    await new Promise((r) => setTimeout(r, 120))
  }

  // 이름 → 후보 (썸네일 있는 것만)
  const byName = new Map<string, KcisaItem[]>()
  for (const it of all) {
    if (!it.thumbnail || !it.title) continue
    const k = normalizeFestivalName(it.title)
    if (!byName.has(k)) byName.set(k, [])
    byName.get(k)!.push(it)
  }
  console.log(`  썸네일 보유 ${all.filter((i) => i.thumbnail).length}건 · 고유 이름 ${byName.size}건`)

  const targets = await prisma.festival.findMany({
    where: { endDate: { gte: today }, imageUrl: null },
    select: { id: true, name: true, sido: true, sigungu: true, startDate: true, endDate: true, lat: true, lng: true },
  })
  console.log(`▶ 이미지 없는 예정 축제 ${targets.length}건 매칭 시도`)

  let img = 0
  let geo = 0
  for (const f of targets) {
    const cands = byName.get(normalizeFestivalName(f.name))
    if (!cands) continue
    const hit = cands.find((c) => {
      // 오매칭 방지: 시군구가 있으면 시군구 일치, 없으면 시도 일치 + 기간 겹침
      const candSido = c.area ? parseSidoSigungu(c.area).sido ?? c.area : null
      if (f.sigungu && c.sigungu) return c.sigungu.includes(f.sigungu.replace(/(시|군|구)$/, '')) || f.sigungu.includes(c.sigungu)
      if (f.sido && candSido) return f.sido.includes(candSido) || candSido.includes(f.sido.slice(0, 2))
      return overlaps(f.startDate, f.endDate, c.startDate, c.endDate)
    })
    if (!hit) continue
    const data: { imageUrl: string; lat?: number; lng?: number } = { imageUrl: hit.thumbnail! }
    if (f.lat == null && hit.gpsY && hit.gpsX) {
      const lat = Number(hit.gpsY)
      const lng = Number(hit.gpsX)
      if (lat > 33 && lat < 39 && lng > 124 && lng < 132) { // 한반도 범위 밖 좌표는 버림
        data.lat = lat
        data.lng = lng
        geo += 1
      }
    }
    img += 1
    if (img <= 12 || img % 25 === 0) console.log(`  ✓ [${img}] ${f.name} (${f.sigungu ?? f.sido}) ← ${hit.title} / ${hit.sigungu ?? hit.area}`)
    if (!dryRun) await prisma.festival.update({ where: { id: f.id }, data })
  }

  console.log(`① KCISA: 이미지 ${img}건 · 좌표 ${geo}건`)

  // ── ② TourAPI 과거 회차 포스터 ──────────────────────────────
  const remain = await prisma.festival.findMany({
    where: { endDate: { gte: today }, imageUrl: null },
    select: { id: true, name: true, sido: true, sigungu: true, lat: true },
  })
  console.log(`▶ ② TourAPI 과거 회차 검색 — 잔여 ${remain.length}건`)
  const core = (v: string) => v.replace(/(특별자치도|특별자치시|특별시|광역시|도|시|군|구)$/, '')

  // 쿼터 소진 시 '정상 모양 빈 응답'이 오므로 감시 쿼리로 생존 확인
  const alive = async () => {
    try {
      const r = await fetch(`https://apis.data.go.kr/B551011/KorService2/searchKeyword2?serviceKey=${env.TOURAPI_SERVICE_KEY}&MobileOS=ETC&MobileApp=KOTA&_type=json&keyword=${encodeURIComponent('경복궁')}&numOfRows=1`)
      const j = (await r.json()) as { response?: { body?: { totalCount?: number } } }
      return (j.response?.body?.totalCount ?? 0) > 0
    } catch { return false }
  }
  if (!(await alive())) {
    console.log('✖ TourAPI 일일 한도 소진 — ②단계는 다음 실행에서 이어서(멱등)')
  } else {
    let img2 = 0
    let geo2 = 0
    let miss2 = 0
    let streak = 0
    for (const f of remain) {
      const kw = normalizeFestivalName(f.name)
      if (kw.length < 3) { miss2 += 1; continue }
      let items: { title?: string; addr1?: string; firstimage?: string; mapx?: string; mapy?: string }[] = []
      try {
        const r = await fetch(`https://apis.data.go.kr/B551011/KorService2/searchKeyword2?serviceKey=${env.TOURAPI_SERVICE_KEY}&MobileOS=ETC&MobileApp=KOTA&_type=json&keyword=${encodeURIComponent(kw)}&contentTypeId=15&numOfRows=3&arrange=A`)
        const j = (await r.json()) as { response?: { body?: { items?: '' | { item?: typeof items } } } }
        const raw = j.response?.body?.items
        items = raw && typeof raw !== 'string' ? (Array.isArray(raw.item) ? raw.item : raw.item ? [raw.item] : []) : []
      } catch { /* 개별 실패는 스킵 */ }

      const hit = items.find((it) => {
        if (!it.firstimage || !it.title) return false
        if (normalizeFestivalName(it.title) !== kw) return false // 다른 축제 방지
        const region = f.sigungu ? core(f.sigungu) : f.sido ? core(f.sido) : null
        return region ? Boolean(it.addr1?.includes(region)) : false // 지역 불일치 방지
      })
      if (hit) {
        streak = 0
        img2 += 1
        const data: { imageUrl: string; lat?: number; lng?: number } = { imageUrl: hit.firstimage! }
        if (f.lat == null && hit.mapy && hit.mapx) { data.lat = Number(hit.mapy); data.lng = Number(hit.mapx); geo2 += 1 }
        if (img2 <= 12 || img2 % 25 === 0) console.log(`  ✓ [${img2}] ${f.name} ← ${hit.title}`)
        if (!dryRun) await prisma.festival.update({ where: { id: f.id }, data })
      } else {
        miss2 += 1
        streak += 1
        if (streak >= 40) { // 연속 40건 미스 → 쿼터 사망 재확인
          if (!(await alive())) { console.log(`⚠ 한도 소진 감지 — ${img2}건 반영 후 중단(재실행 시 이어서)`); break }
          streak = 0
        }
      }
      await new Promise((r) => setTimeout(r, 120))
    }
    console.log(`② TourAPI: 이미지 ${img2}건 · 좌표 ${geo2}건 · 미적중 ${miss2}건`)
  }
  console.log(`✔ 완료${dryRun ? ' (dry-run)' : ''}`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
