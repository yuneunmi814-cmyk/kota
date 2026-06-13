import { prisma } from '../src/lib/prisma.js'
import { syncAudioGuidesForRegion } from '../src/modules/audioguide/sync.js'
import { REGION_AREA } from '../src/modules/tourapi/regions.js'
import { env } from '../src/config/env.js'
import type { LangCode } from '../src/modules/audioguide/client.js'

// 사용법:
//   npm run sync:audioguide -- --region=jeju [--langs=ko,en] [--radius=1000] [--dry-run]
//   npm run sync:audioguide -- --all
function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
}
const flag = (n: string) => process.argv.includes(`--${n}`)

async function main() {
  if (!env.TOURAPI_SERVICE_KEY) {
    console.error('✖ TOURAPI_SERVICE_KEY 가 필요합니다(오디오가이드도 동일 키 사용, data.go.kr 15101971 활용신청 필요).')
    process.exit(1)
  }
  const region = arg('region')
  const all = flag('all')
  if (!region && !all) { console.error('✖ --region=<slug> 또는 --all. 지역:', Object.keys(REGION_AREA).join(', ')); process.exit(1) }

  const langCodes = (arg('langs')?.split(',') as LangCode[] | undefined)
  const radiusM = arg('radius') ? Number(arg('radius')) : undefined
  const dryRun = flag('dry-run')
  const regions = all ? Object.keys(REGION_AREA) : [region!]

  console.log(`▶ 오디오 가이드(오디) 동기화 — 지역: ${regions.join(', ')}${dryRun ? ' / DRY-RUN' : ''}`)
  for (const slug of regions) {
    try {
      const s = await syncAudioGuidesForRegion({ regionSlug: slug, langCodes, radiusM, dryRun, onProgress: (m) => console.log(`  ${slug} ${m}`) })
      console.log(`✔ ${s.region}: 스팟 ${s.spotsMatched}/${s.spotsScanned} 매칭 · 가이드 생성 ${s.created}/갱신 ${s.updated} (오디오 ${s.withAudio})${s.dryRun ? ' (dry-run)' : ''}`)
    } catch (e) {
      console.error(`✖ ${slug} 실패:`, e instanceof Error ? e.message : e)
    }
  }
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
