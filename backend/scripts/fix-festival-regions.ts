import { PrismaClient } from '@prisma/client'
import { normalizeFestivalName, parseSidoSigungu } from '../src/modules/festivals/regionMap.js'

// 이미 적재된 축제의 sido/sigungu를 최신 파싱 규칙으로 다시 매기고, 소스 간 중복을 정리한다.
// 파싱 규칙이 바뀔 때(통합 시·도 분해, 축약형 보정 등) 재동기화 없이 교정하기 위한 일회성 유지보수 스크립트.
// 사용: npm run fix:festival-regions [-- --dry-run]

const prisma = new PrismaClient()
const dryRun = process.argv.includes('--dry-run')

async function main() {
  const all = await prisma.festival.findMany({
    select: { id: true, name: true, address: true, sido: true, sigungu: true, startDate: true, source: true, imageUrl: true },
  })
  console.log(`▶ 대상 ${all.length}건${dryRun ? ' (DRY-RUN)' : ''}`)

  // 1) 시·도/시·군·구 재파싱
  let fixed = 0
  for (const f of all) {
    const { sido, sigungu } = parseSidoSigungu(f.address)
    if (sido === f.sido && sigungu === f.sigungu) continue
    console.log(`  [지역] ${f.name}: ${f.sido ?? '(없음)'} → ${sido ?? '(없음)'}`)
    if (!dryRun) await prisma.festival.update({ where: { id: f.id }, data: { sido, sigungu } })
    fixed += 1
  }
  console.log(`✔ 지역 재분류 ${fixed}건`)

  // 2) 소스 간 중복 정리 — 같은 시작일 + 같은 정규화 이름.
  //    이미지가 있는 쪽(주로 TourAPI)을 남겨 카드 품질을 지킨다.
  const byKey = new Map<string, typeof all>()
  for (const f of all) {
    const key = `${f.startDate.toISOString().slice(0, 10)}|${normalizeFestivalName(f.name)}`
    const arr = byKey.get(key) ?? []
    arr.push(f)
    byKey.set(key, arr)
  }
  let removed = 0
  for (const [key, group] of byKey) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => {
      if (Boolean(b.imageUrl) !== Boolean(a.imageUrl)) return b.imageUrl ? 1 : -1 // 이미지 있는 쪽 우선
      return Number(a.id - b.id) // 그 다음은 먼저 들어온 쪽
    })
    const [keep, ...drop] = sorted
    console.log(`  [중복] ${key.split('|')[0]} — 유지: ${keep!.name}(${keep!.source}) / 삭제: ${drop.map((d) => `${d.name}(${d.source})`).join(', ')}`)
    if (!dryRun) await prisma.festival.deleteMany({ where: { id: { in: drop.map((d) => d.id) } } })
    removed += drop.length
  }
  console.log(`✔ 중복 제거 ${removed}건`)

  const total = await prisma.festival.count()
  console.log(`▶ 최종 ${total}건`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
