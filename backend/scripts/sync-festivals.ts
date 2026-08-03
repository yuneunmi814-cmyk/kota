import { prisma } from '../src/lib/prisma.js'
import { syncFestivalsTourApiAll, syncRegionFestivals } from '../src/modules/festivals/sync.js'
import { syncStdFestivals } from '../src/modules/festivals/stdfest.js'
import { REGION_LDONG } from '../src/modules/tourapi/regions.js'
import { env } from '../src/config/env.js'

// 사용법:
//   npm run sync:festivals -- --region=gongju [--from=20260801] [--max=200] [--dry-run]   # 단일 큐레이션 지역
//   npm run sync:festivals -- --all [--from=20260801]                                     # TourAPI 전국(16개 시·도)
//   npm run sync:festivals -- --std [--from=20260801]                                     # 전국문화축제표준데이터
//   npm run sync:festivals -- --all --std                                                 # 둘 다(권장: TourAPI 먼저 → 표준데이터 중복제거)
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
  const std = flag('std')
  if (!region && !all && !std) {
    console.error('✖ --region=<slug> / --all / --std 중 하나 이상을 지정하세요. 지역:', Object.keys(REGION_LDONG).join(', '))
    process.exit(1)
  }

  const from = arg('from')
  const max = arg('max') ? Number(arg('max')) : undefined
  const dryRun = flag('dry-run')

  // 1) TourAPI — 전국 또는 단일 지역
  if (all) {
    console.log(`▶ TourAPI 전국 축제 동기화${from ? ` / from=${from}` : ''}${dryRun ? ' / DRY-RUN' : ''}`)
    try {
      const s = await syncFestivalsTourApiAll({ from, dryRun, onProgress: (m) => console.log(`  ${m}`) })
      console.log(`✔ ${s.region}: 가져옴 ${s.fetched} · 생성 ${s.created} · 갱신 ${s.updated} · 스킵 ${s.skipped}${s.dryRun ? ' (dry-run)' : ''}`)
    } catch (e) {
      console.error('✖ TourAPI 전국 실패:', e instanceof Error ? e.message : e)
    }
  } else if (region) {
    console.log(`▶ TourAPI 축제 동기화 — 지역: ${region}${from ? ` / from=${from}` : ''}${dryRun ? ' / DRY-RUN' : ''}`)
    try {
      const s = await syncRegionFestivals({ regionSlug: region, from, maxItems: max, dryRun, onProgress: (m) => console.log(`  ${m}`) })
      console.log(`✔ ${s.region}: 가져옴 ${s.fetched} · 생성 ${s.created} · 갱신 ${s.updated} · 스킵 ${s.skipped}${s.dryRun ? ' (dry-run)' : ''}`)
    } catch (e) {
      console.error(`✖ ${region} 실패:`, e instanceof Error ? e.message : e)
    }
  }

  // 2) 전국문화축제표준데이터 (TourAPI와 중복 제거하며 보강)
  if (std) {
    console.log(`▶ 전국문화축제표준데이터 동기화${from ? ` / from=${from}` : ''}${dryRun ? ' / DRY-RUN' : ''}`)
    try {
      const s = await syncStdFestivals({ from: from ?? undefined, dryRun, onProgress: (m) => console.log(`  ${m}`) })
      console.log(`✔ ${s.region}: 가져옴 ${s.fetched} · 생성 ${s.created} · 갱신 ${s.updated} · 스킵(중복/과거) ${s.skipped}${s.dryRun ? ' (dry-run)' : ''}`)
    } catch (e) {
      console.error('✖ 표준데이터 실패:', e instanceof Error ? e.message : e)
    }
  }

  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
