import { prisma } from '../src/lib/prisma.js'
import { env } from '../src/config/env.js'
import { REGION_AREA } from '../src/modules/tourapi/regions.js'
import { syncPhotosForRegion } from '../src/modules/photos/sync.js'
import { syncEnglishForRegion } from '../src/modules/i18n/sync.js'
import { syncRegionVisitors } from '../src/modules/visitors/sync.js'

// 공공데이터 부가정보 동기화 (동일 TOURAPI_SERVICE_KEY):
//   npm run sync:photos    -- --region=jeju [--all] [--dry-run]
//   npm run sync:i18n      -- --region=jeju [--all] [--dry-run]
//   npm run sync:visitors  -- [--dry-run]            (지역 무관, 전국 시도 일괄)
function arg(name: string): string | undefined { return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] }
const flag = (n: string) => process.argv.includes(`--${n}`)

async function main() {
  const mode = process.argv[2] // photos | i18n | visitors
  if (!env.TOURAPI_SERVICE_KEY) { console.error('✖ TOURAPI_SERVICE_KEY 필요(부가 API도 동일 키, 각 데이터셋 활용신청 필요).'); process.exit(1) }
  const dryRun = flag('dry-run')

  if (mode === 'visitors') {
    const s = await syncRegionVisitors({ now: new Date(), dryRun })
    console.log(`▶ 지역 방문자 점수(${s.period.startYmd}~${s.period.endYmd})${dryRun ? ' DRY' : ''}`)
    for (const u of s.updated) console.log(`  ${u.name}: ${u.visitorScore.toLocaleString()}`)
    await prisma.$disconnect(); return
  }

  const regions = flag('all') ? Object.keys(REGION_AREA) : [arg('region')].filter(Boolean) as string[]
  if (regions.length === 0) { console.error('✖ --region=<slug> 또는 --all'); process.exit(1) }

  for (const slug of regions) {
    try {
      if (mode === 'photos') {
        const s = await syncPhotosForRegion({ regionSlug: slug, dryRun, onProgress: (m) => console.log(`  ${slug} ${m}`) })
        console.log(`✔ 사진 ${s.region}: 스팟 ${s.spotsMatched}/${s.spotsScanned} · 생성 ${s.created}/갱신 ${s.updated}${dryRun ? ' DRY' : ''}`)
      } else if (mode === 'i18n') {
        const s = await syncEnglishForRegion({ regionSlug: slug, dryRun, onProgress: (m) => console.log(`  ${slug} ${m}`) })
        console.log(`✔ 영문 ${s.region}: 수집 ${s.engCollected} · 번역 ${s.spotsTranslated}(생성 ${s.created}/갱신 ${s.updated})${dryRun ? ' DRY' : ''}`)
      } else { console.error('✖ mode는 photos | i18n | visitors'); process.exit(1) }
    } catch (e) { console.error(`✖ ${slug} 실패:`, e instanceof Error ? e.message : e) }
  }
  await prisma.$disconnect()
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
