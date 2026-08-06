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

  // 진행중/예정만 내보냄(종료 축제는 정적 데이터에서 제외 — 용량·신선도)
  const today = new Date(new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10))
  const festivals = await prisma.festival.findMany({
    where: { endDate: { gte: today } },
    orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
    select: {
      id: true, name: true, summary: true, address: true, lat: true, lng: true,
      startDate: true, endDate: true, imageUrl: true, tel: true, homepage: true, sido: true, sigungu: true,
      region: { select: { id: true, name: true, slug: true, visitorScore: true } },
      translations: { select: { langCode: true, name: true, summary: true, placeName: true } },
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
        region: f.region
          ? { id: f.region.id, name: f.region.name, slug: f.region.slug }
          : { id: null, name: f.sigungu ?? f.sido ?? '전국', slug: null },
        popularity: f.region?.visitorScore ?? 0, // 지역 방문자수 기반 인기 프록시(미매칭=0)
        startDate: f.startDate.toISOString().slice(0, 10),
        endDate: f.endDate.toISOString().slice(0, 10),
      })),
    }),
  )
  // ===== SEO/GEO 파일 (web/public/) =====
  // 커스텀 도메인 도입 시 SITE_ORIGIN 환경변수만 바꾸면 됨
  const site = process.env.SITE_ORIGIN ?? 'https://yuneunmi814-cmyk.github.io/kota'
  const pubDir = resolve(import.meta.dirname, '../../web/public')

  // sitemap.xml — 축제 상세까지 전부 노출해야 축제명 검색으로 유입된다
  const staticUrls = ['', '/festivals', '/search']
  const urls = [
    ...staticUrls.map((u) => ({ loc: `${site}${u}`, priority: u === '' ? '1.0' : '0.8' })),
    ...festivals.map((f) => ({ loc: `${site}/festivals/${f.id}`, priority: '0.6' })),
  ]
  const lastmod = new Date().toISOString().slice(0, 10)
  writeFileSync(
    `${pubDir}/sitemap.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${lastmod}</lastmod><priority>${u.priority}</priority></url>`)
      .join('\n')}\n</urlset>\n`,
  )

  // robots.txt — 전체 허용 + 사이트맵 위치. AI 크롤러도 명시적으로 허용(GEO: AI 검색에 실리는 게 유입)
  writeFileSync(
    `${pubDir}/robots.txt`,
    `User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`,
  )

  // llms.txt — AI 검색·어시스턴트용 사이트 요약(GEO 표준 제안 형식)
  const sidoCounts = new Map<string, number>()
  for (const f of festivals) if (f.sido) sidoCounts.set(f.sido, (sidoCounts.get(f.sido) ?? 0) + 1)
  const topSidos = [...sidoCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  writeFileSync(
    `${pubDir}/llms.txt`,
    `# KOTA — Korea Festa

> Location-based Korean local festival travel packs for foreign travelers. ${festivals.length} ongoing/upcoming festivals across Korea with dates, venues, directions and nearby attractions, in Korean, English, Japanese and Thai.

## What this site offers
- Festival list with region filter: ${site}/festivals
- Festival detail (dates, venue, phone, directions, nearby spots within 3km): ${site}/festivals/{id}
- Unified search (festival/region/attraction names): ${site}/search?q=...
- UI and festival content localized in ko/en/ja/th (language switch in header)

## Data sources
- Korea Tourism Organization TourAPI (searchFestival2, areaBasedList2)
- Korea nationwide culture festival standard open data (data.go.kr)
- Manually curated local festivals not present in any public API (verified on site)
- Updated weekly via automated sync (${lastmod})

## Current coverage by region (festival count)
${topSidos.map(([n, c]) => `- ${n}: ${c}`).join('\n')}
`,
  )

  console.log(`✔ ${outDir} — 지역 ${regions.length} · 축제 ${festivals.length}건 내보냄`)
  console.log(`✔ ${pubDir} — sitemap.xml(${urls.length} URL) · robots.txt · llms.txt`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
