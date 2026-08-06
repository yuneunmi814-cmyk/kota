import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prisma } from '../src/lib/prisma.js'
import { curatedSlugFor, normalizeFestivalName, parseSidoSigungu } from '../src/modules/festivals/regionMap.js'

// 문화체육관광부 "2026년 지역축제 개최계획"(연 1회 공개 엑셀, 전체 1,266건) → festivals (source=MCST).
// 전국 시군구 조사 기반이라 TourAPI·표준데이터에 없는 소규모 축제까지 담는 국내 최광역 목록.
// 원본: prisma/mcst-festivals-2026.json (mcst.go.kr 2026_festival.zip에서 추출, 예정분만)
//
// 중복 제거가 관건 — 대형 축제는 이미 다른 소스에 있고 시작일이 하루씩 어긋나기도 한다.
// 그래서 여기서는 시작일 무시, **정규화 이름만으로** 다른 소스와 대조한다(연 1회 자료라 안전).
// 같은 이름을 못 만나면 신규 생성. externalId는 이름+시작일 해시(자료에 고유 ID가 없음).
// 사용: npm run sync:mcst [-- --dry-run]

interface McstRow {
  name: string
  sido: string
  sigungu?: string
  place?: string
  startDate: string
  endDate: string
  note?: string
}

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const file = resolve(import.meta.dirname, '../prisma/mcst-festivals-2026.json')
  const rows = JSON.parse(readFileSync(file, 'utf-8')) as McstRow[]
  console.log(`▶ 문체부 개최계획 ${rows.length}건${dryRun ? ' (DRY-RUN)' : ''}`)

  const regions = await prisma.region.findMany({ select: { id: true, slug: true } })
  const bySlug = new Map(regions.map((r) => [r.slug, r.id]))
  // 다른 소스 전체와 이름 대조 (연도 접두·회차 접두는 normalize가 제거)
  const others = await prisma.festival.findMany({
    where: { source: { not: 'MCST' } },
    select: { name: true },
  })
  const takenNames = new Set(others.map((f) => normalizeFestivalName(f.name)))

  let created = 0
  let updated = 0
  let dedup = 0
  let invalid = 0

  for (const r of rows) {
    const name = r.name.replace(/\s+/g, ' ').trim() // 자료에 개행·이중 공백 섞임
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(r.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(r.endDate)) {
      invalid += 1
      continue
    }
    const externalId = `mcst:${createHash('md5').update(`${name}|${r.startDate}`).digest('hex').slice(0, 12)}`
    const exists = await prisma.festival.findUnique({ where: { externalId }, select: { id: true } })
    if (!exists && takenNames.has(normalizeFestivalName(name))) {
      dedup += 1
      continue
    }

    // 자료의 시도 표기(축약형 포함)를 주소 파서로 정식 명칭화 — "충북 청주시" → 충청북도/청주시
    const parsed = parseSidoSigungu(`${r.sido} ${r.sigungu ?? ''}`.trim())
    const sido = parsed.sido ?? r.sido
    const sigungu = parsed.sigungu ?? (r.sigungu?.trim() || null)
    const place = r.place?.replace(/\s+/g, ' ').trim()
    const data = {
      source: 'MCST',
      regionId: curatedSlugFor(sido, sigungu) ? bySlug.get(curatedSlugFor(sido, sigungu)!) ?? null : null,
      sido,
      sigungu,
      name,
      summary: [place && place !== '미정' ? place : null, r.note?.split('/')[0]?.trim() || null].filter(Boolean).join(' · ') || null,
      address: [sido, sigungu, place && place !== '미정' ? place : null].filter(Boolean).join(' '),
      lat: null,
      lng: null,
      startDate: new Date(r.startDate),
      endDate: new Date(r.endDate),
      imageUrl: null,
      tel: null,
      homepage: null,
    }
    if (dryRun) { exists ? (updated += 1) : (created += 1); continue }
    if (exists) {
      await prisma.festival.update({ where: { id: exists.id }, data })
      updated += 1
    } else {
      await prisma.festival.create({ data: { ...data, externalId } })
      created += 1
    }
  }

  console.log(`✔ 신규 ${created} · 갱신 ${updated} · 타소스 중복 스킵 ${dedup} · 형식 오류 ${invalid}`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
