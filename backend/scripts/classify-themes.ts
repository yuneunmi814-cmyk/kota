import { prisma } from '../src/lib/prisma.js'
import { classifyThemes, THEMES } from '../src/modules/festivals/themes.js'

// 축제 테마(여행 목적) 일괄 분류 — 이름 + 문체부 유형으로 판정해 festivals.themes 갱신.
// 멱등이라 수집 후 언제든 재실행(주간 워크플로에 편입). 사용: npm run classify:themes [-- --dry-run]

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const all = await prisma.festival.findMany({ select: { id: true, name: true, summary: true, themes: true } })
  console.log(`▶ 축제 ${all.length}건 테마 분류${dryRun ? ' (DRY-RUN)' : ''}`)
  const counts = new Map<string, number>()
  let changed = 0
  let none = 0

  for (const f of all) {
    const themes = classifyThemes(f.name, f.summary)
    themes.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1))
    if (themes.length === 0) none += 1
    const same = themes.length === f.themes.length && themes.every((t, i) => t === f.themes[i])
    if (same) continue
    changed += 1
    if (!dryRun) await prisma.festival.update({ where: { id: f.id }, data: { themes } })
  }

  console.log(`✔ 갱신 ${changed}건 · 미분류 ${none}건`)
  for (const t of THEMES) console.log(`   ${t}: ${counts.get(t) ?? 0}`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
