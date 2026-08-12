import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prisma } from '../src/lib/prisma.js'
import { placeName } from '../src/modules/festivals/places.js'
import { LANGS, translateFestivalName } from '../src/modules/festivals/translate-name.js'

// 축제 다국어 자동 번역 — 사전+음역 엔진으로 en/ja/th를 채운다.
//
// 왜 자동인가: 축제는 5개 소스에서 매주 새로 들어온다. 사람이 매번 손으로 옮기면
// 유입되는 족족 미번역으로 남는다. 엔진이 전량을 덮고, 손번역은 그 위에 덮어쓴다.
//
// 우선순위: prisma/festival-translations.json(손번역) > 이 엔진.
//   손번역이 있는 축제는 건드리지 않는다 — 이름이 그 파일에 있으면 건너뛴다.
//   따라서 실행 순서는 npm run sync:translations → npm run translate:festivals.
//
// 사용: npm run translate:festivals [-- --dry-run] [-- --refresh]
//   --refresh : 이미 만들어둔 엔진 번역까지 다시 생성(사전을 늘린 뒤 재적용할 때)

const dryRun = process.argv.includes('--dry-run')
const refresh = process.argv.includes('--refresh')

/** 사전이 이만큼도 못 덮으면 사람이 봐야 한다 — 음역만 남은 시적인 이름들 */
const REVIEW_THRESHOLD = 0.5

async function main() {
  const handFile = resolve(import.meta.dirname, '../prisma/festival-translations.json')
  const { items } = JSON.parse(readFileSync(handFile, 'utf-8')) as { items: { festivalName: string }[] }
  const handNames = new Set(items.map((i) => i.festivalName))
  console.log(`▶ 손번역 ${handNames.size}건은 보존${refresh ? ' · 엔진 번역은 재생성' : ''}${dryRun ? ' (DRY-RUN)' : ''}`)

  const today = new Date(new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10))
  const festivals = await prisma.festival.findMany({
    where: { endDate: { gte: today } },
    select: {
      id: true, name: true, sido: true, sigungu: true,
      translations: { select: { langCode: true, placeName: true } },
    },
    orderBy: { startDate: 'asc' },
  })

  let done = 0
  let skippedHand = 0
  let skippedExisting = 0
  let filledPlace = 0
  const review: string[] = []

  for (const f of festivals) {
    // 손번역은 이름만 담고 지명은 비워두는 경우가 많다 — 이름은 그대로 두고 빈 지명만 채운다
    if (handNames.has(f.name)) {
      skippedHand += 1
      for (const t of f.translations) {
        if (t.placeName) continue
        const place = placeName(f.sido, f.sigungu, t.langCode as (typeof LANGS)[number])
        if (!place || dryRun) continue
        await prisma.festivalTranslation.update({
          where: { festivalId_langCode: { festivalId: f.id, langCode: t.langCode } },
          data: { placeName: place },
        })
        filledPlace += 1
      }
      continue
    }
    const have = new Set(f.translations.map((t) => t.langCode))
    const need = LANGS.filter((l) => refresh || !have.has(l))
    if (need.length === 0) {
      skippedExisting += 1
      continue
    }

    const tr = translateFestivalName(f.name)
    if (tr.coverage < REVIEW_THRESHOLD) {
      review.push([f.name, tr.en, tr.ja, tr.th, `${Math.round(tr.coverage * 100)}%`].join('\t'))
    }

    for (const lang of need) {
      const name = tr[lang]
      if (!name) continue
      const place = placeName(f.sido, f.sigungu, lang)
      if (dryRun) continue
      await prisma.festivalTranslation.upsert({
        where: { festivalId_langCode: { festivalId: f.id, langCode: lang } },
        update: { name, placeName: place },
        create: { festivalId: f.id, langCode: lang, name, placeName: place },
      })
    }
    done += 1
  }

  console.log(`✔ 엔진 번역 ${done}건 × ${LANGS.length}개 언어${dryRun ? ' (dry-run)' : ''}`)
  console.log(`   손번역 보존 ${skippedHand}건(빈 지명 ${filledPlace}건 보강) · 이미 번역됨 ${skippedExisting}건`)

  // 사전이 못 덮은 것은 파일로 빼서 손번역 대상으로 넘긴다
  if (review.length) {
    const out = resolve(import.meta.dirname, '../../docs/공모전기획/번역_검수대상.tsv')
    writeFileSync(out, `축제명\ten\tja\tth\t사전커버리지\n${review.join('\n')}\n`, 'utf-8')
    console.log(`⚠ 검수 대상 ${review.length}건 (사전 커버리지 ${REVIEW_THRESHOLD * 100}% 미만) → ${out}`)
  }

  const [total, translated] = await Promise.all([
    prisma.festival.count({ where: { endDate: { gte: today } } }),
    prisma.festival.count({ where: { endDate: { gte: today }, translations: { some: { langCode: 'en' } } } }),
  ])
  console.log(`▶ 커버리지: 예정 축제 ${total}건 중 ${translated}건 번역 (${Math.round((translated / total) * 100)}%)`)

  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
