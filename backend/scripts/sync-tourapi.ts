import { prisma } from '../src/lib/prisma.js'
import { syncRegionSpots, syncRegionCourses, DEFAULT_CONTENT_TYPES } from '../src/modules/tourapi/sync.js'
import { REGION_AREA } from '../src/modules/tourapi/regions.js'
import { env } from '../src/config/env.js'

// 사용법:
//   npm run sync:tourapi -- --region=jeju [--types=12,39] [--max=100] [--overview] [--dry-run]
//   npm run sync:tourapi -- --region=jeju --courses [--max=10] [--dry-run]   # 여행코스 import
//   npm run sync:tourapi -- --all --max=50
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

  const types = arg('types')?.split(',').map(Number).filter((n) => Number.isFinite(n))
  const max = arg('max') ? Number(arg('max')) : undefined
  const withOverview = flag('overview')
  const dryRun = flag('dry-run')
  const courses = flag('courses')
  const regions = all ? Object.keys(REGION_AREA) : [region!]

  if (courses) {
    console.log(`▶ TourAPI 여행코스 import — 지역: ${regions.join(', ')}${dryRun ? ' / DRY-RUN' : ''}`)
    for (const slug of regions) {
      try {
        const s = await syncRegionCourses({ regionSlug: slug, maxCourses: max, dryRun, onProgress: (m) => console.log(`  ${slug} ${m}`) })
        console.log(`✔ ${s.region}: 코스 생성 ${s.coursesCreated} · 스킵 ${s.coursesSkipped} · 스팟(신규 ${s.spotsCreated}/연결 ${s.spotsLinked})${s.dryRun ? ' (dry-run)' : ''}`)
      } catch (e) {
        console.error(`✖ ${slug} 실패:`, e instanceof Error ? e.message : e)
      }
    }
    await prisma.$disconnect()
    return
  }

  console.log(`▶ TourAPI 관광지 동기화 — 지역: ${regions.join(', ')} / 타입: ${(types ?? DEFAULT_CONTENT_TYPES).join(',')}${dryRun ? ' / DRY-RUN' : ''}`)
  for (const slug of regions) {
    try {
      const s = await syncRegionSpots({
        regionSlug: slug, contentTypeIds: types, maxPerType: max, withOverview, dryRun,
        onProgress: (m) => console.log(`  ${slug} ${m}`),
      })
      console.log(`✔ ${s.region}: 가져옴 ${s.fetched} · 생성 ${s.created} · 갱신 ${s.updated} · 스킵 ${s.skipped}${s.dryRun ? ' (dry-run)' : ''}`)
    } catch (e) {
      console.error(`✖ ${slug} 실패:`, e instanceof Error ? e.message : e)
    }
  }

  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
