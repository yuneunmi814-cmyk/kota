import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prisma } from '../src/lib/prisma.js'

// prisma/festival-translations.json → festival_translations 테이블 (en/ja/th).
// 축제명(한국어 원문)으로 매칭한다 — 소스가 재동기화되면 축제 id는 바뀔 수 있지만 이름은 유지되기 때문.
// 미매칭(축제명이 바뀌었거나 축제가 사라짐)은 경고로 남겨 번역이 조용히 유실되지 않게 한다.
// 사용: npm run sync:translations [-- --dry-run]

interface Tr { name: string; summary?: string | null; placeName?: string | null }
interface Item { festivalName: string; en?: Tr; ja?: Tr; th?: Tr }

const dryRun = process.argv.includes('--dry-run')
const LANGS = ['en', 'ja', 'th'] as const

async function main() {
  const file = resolve(import.meta.dirname, '../prisma/festival-translations.json')
  const { items } = JSON.parse(readFileSync(file, 'utf-8')) as { items: Item[] }
  console.log(`▶ 번역 ${items.length}개 축제 × 최대 ${LANGS.length}개 언어${dryRun ? ' (DRY-RUN)' : ''}`)

  let applied = 0
  const missing: string[] = []

  for (const item of items) {
    // 같은 이름의 축제가 여러 해에 걸쳐 있을 수 있으므로 전부에 적용한다
    const festivals = await prisma.festival.findMany({ where: { name: item.festivalName }, select: { id: true } })
    if (festivals.length === 0) {
      missing.push(item.festivalName)
      continue
    }
    for (const f of festivals) {
      for (const lang of LANGS) {
        const tr = item[lang]
        if (!tr?.name) continue
        if (dryRun) { applied += 1; continue }
        await prisma.festivalTranslation.upsert({
          where: { festivalId_langCode: { festivalId: f.id, langCode: lang } },
          update: { name: tr.name, summary: tr.summary ?? null, placeName: tr.placeName ?? null },
          create: { festivalId: f.id, langCode: lang, name: tr.name, summary: tr.summary ?? null, placeName: tr.placeName ?? null },
        })
        applied += 1
      }
    }
  }

  console.log(`✔ 번역 ${applied}건 반영${dryRun ? ' (dry-run)' : ''}`)
  if (missing.length) {
    console.warn(`⚠ 매칭 실패 ${missing.length}건 — 축제명이 DB와 다르거나 축제가 사라졌습니다:`)
    for (const n of missing) console.warn(`   · ${n}`)
  }

  // 커버리지 — 진행중·예정 축제 중 몇 %가 번역됐는지
  const today = new Date(new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10))
  const [total, translated] = await Promise.all([
    prisma.festival.count({ where: { endDate: { gte: today } } }),
    prisma.festival.count({ where: { endDate: { gte: today }, translations: { some: { langCode: 'en' } } } }),
  ])
  console.log(`▶ 커버리지: 예정 축제 ${total}건 중 ${translated}건 번역 (${Math.round((translated / total) * 100)}%)`)

  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
