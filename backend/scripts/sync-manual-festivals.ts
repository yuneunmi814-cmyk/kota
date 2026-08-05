import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prisma } from '../src/lib/prisma.js'
import { curatedSlugFor, parseSidoSigungu } from '../src/modules/festivals/regionMap.js'

// 공공데이터에 없는 축제를 prisma/manual-festivals.json 에서 DB로 넣는다 (source=MANUAL).
// 현수막·보도자료로만 알려지는 지역 행사(예: 제천 의림지 달빛 물맞이 행차)를 담기 위한 통로.
// 멱등: externalId 기준 upsert. 자동 수집분과 달리 seed-prod의 정리(prune) 대상이 아니라 지워지지 않는다.
// 사용: npm run sync:manual [-- --dry-run]

interface ManualFestival {
  externalId: string
  name: string
  summary?: string | null
  address: string
  sido?: string | null
  sigungu?: string | null
  lat?: number | null
  lng?: number | null
  startDate: string
  endDate: string
  tel?: string | null
  homepage?: string | null
  imageUrl?: string | null
  note?: string
}

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const file = resolve(import.meta.dirname, '../prisma/manual-festivals.json')
  const { items } = JSON.parse(readFileSync(file, 'utf-8')) as { items: ManualFestival[] }
  console.log(`▶ 수기 축제 ${items.length}건${dryRun ? ' (DRY-RUN)' : ''}`)

  const regions = await prisma.region.findMany({ select: { id: true, slug: true } })
  const bySlug = new Map(regions.map((r) => [r.slug, r.id]))
  let created = 0
  let updated = 0

  for (const f of items) {
    if (!f.externalId?.startsWith('manual:')) {
      console.error(`  ✖ externalId는 'manual:'로 시작해야 합니다: ${f.externalId}`)
      continue
    }
    if (!f.name || !f.startDate || !f.endDate || !f.address) {
      console.error(`  ✖ 필수값 누락(name·startDate·endDate·address): ${f.externalId}`)
      continue
    }
    // 주소에서 시·도/시·군·구를 뽑되, 파일에 직접 적었으면 그것을 우선한다
    const parsed = parseSidoSigungu(f.address)
    const sido = f.sido ?? parsed.sido
    const sigungu = f.sigungu ?? parsed.sigungu
    const slug = curatedSlugFor(sido, sigungu)

    const data = {
      source: 'MANUAL',
      regionId: slug ? bySlug.get(slug) ?? null : null,
      sido,
      sigungu,
      name: f.name,
      summary: f.summary ?? null,
      address: f.address,
      lat: f.lat ?? null,
      lng: f.lng ?? null,
      startDate: new Date(f.startDate),
      endDate: new Date(f.endDate),
      imageUrl: f.imageUrl ?? null,
      tel: f.tel ?? null,
      homepage: f.homepage ?? null,
    }

    const existing = await prisma.festival.findUnique({ where: { externalId: f.externalId }, select: { id: true } })
    console.log(`  ${existing ? '갱신' : '신규'}: ${f.name} (${sido ?? '?'} ${sigungu ?? ''}) ${f.startDate}~${f.endDate}`)
    if (dryRun) { existing ? (updated += 1) : (created += 1); continue }

    if (existing) {
      await prisma.festival.update({ where: { id: existing.id }, data })
      updated += 1
    } else {
      await prisma.festival.create({ data: { ...data, externalId: f.externalId } })
      created += 1
    }
  }

  console.log(`✔ 신규 ${created} · 갱신 ${updated}${dryRun ? ' (dry-run)' : ''}`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
