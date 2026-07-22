import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prisma } from '../src/lib/prisma.js'

// 코타 웹 정적 데이터 베이크 — API 서버 없이도(GitHub Pages 등) 지역·축제가 보이도록
// DB 현재 상태를 web/public/data/*.json 으로 내보낸다. (유튜브 seed-videos.json 베이크와 같은 패턴)
// 사용법: npm run export:web
async function main() {
  const outDir = resolve(import.meta.dirname, '../../web/public/data')
  mkdirSync(outDir, { recursive: true })

  const regions = await prisma.region.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, slug: true, thumbnailUrl: true },
  })

  const festivals = await prisma.festival.findMany({
    orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
    select: {
      id: true, name: true, summary: true, address: true, lat: true, lng: true,
      startDate: true, endDate: true, imageUrl: true, tel: true,
      region: { select: { id: true, name: true, slug: true, visitorScore: true } },
    },
  })

  const json = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))
  writeFileSync(`${outDir}/regions.json`, json({ regions }))
  writeFileSync(
    `${outDir}/festivals.json`,
    json({
      exportedAt: new Date().toISOString(),
      items: festivals.map((f) => ({
        ...f,
        region: { id: f.region.id, name: f.region.name, slug: f.region.slug },
        popularity: f.region.visitorScore, // 지역 방문자수 기반 인기 프록시
        startDate: f.startDate.toISOString().slice(0, 10),
        endDate: f.endDate.toISOString().slice(0, 10),
      })),
    }),
  )
  console.log(`✔ ${outDir} — 지역 ${regions.length} · 축제 ${festivals.length}건 내보냄`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
