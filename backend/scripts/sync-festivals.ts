import { prisma } from '../src/lib/prisma.js'
import { syncRegionFestivals } from '../src/modules/festivals/sync.js'
import { REGION_AREA } from '../src/modules/tourapi/regions.js'
import { env } from '../src/config/env.js'

// 사용법:
//   npm run sync:festivals -- --region=gongju [--from=20260801] [--max=200] [--dry-run]
//   npm run sync:festivals -- --all [--from=20260801]
function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit?.split('=')[1]
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

async function main() {
  if (!env.TOURAPI_SERVICE_KEY) {
    console.error('✖ TOURAPI_SERVICE_KEY 가 설정되지 않았습니다. backend/.env 에 공공데이터포털 키를 넣어주세요.')
    process.exit(1)
  }

  const region = arg('region')
  const all = flag('all')
  if (!region && !all) {
    console.error('✖ --region=<slug> 또는 --all 을 지정하세요. 가능한 지역:', Object.keys(REGION_AREA).join(', '))
    process.exit(1)
  }

  const from = arg('from')
  const max = arg('max') ? Number(arg('max')) : undefined
  const dryRun = flag('dry-run')
  const regions = all ? Object.keys(REGION_AREA) : [region!]

  console.log(`▶ TourAPI 축제 동기화 — 지역: ${regions.join(', ')}${from ? ` / from=${from}` : ''}${dryRun ? ' / DRY-RUN' : ''}`)
  for (const slug of regions) {
    try {
      const s = await syncRegionFestivals({ regionSlug: slug, from, maxItems: max, dryRun, onProgress: (m) => console.log(`  ${slug} ${m}`) })
      console.log(`✔ ${s.region}: 가져옴 ${s.fetched} · 생성 ${s.created} · 갱신 ${s.updated} · 스킵 ${s.skipped}${s.dryRun ? ' (dry-run)' : ''}`)
    } catch (e) {
      console.error(`✖ ${slug} 실패:`, e instanceof Error ? e.message : e)
    }
  }

  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
