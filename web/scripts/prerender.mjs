// 빌드 후 정적 프리렌더 — 축제 상세 724건 + 목록·홈에 크롤러용 본문 주입.
//
// 왜: ① 네이버·다음 크롤러는 JS 실행이 제한적이라 CSR 사이트를 '빈 문서'로 본다
//        (여기울산 실측: 본문 25~33자 → 브랜드명조차 미노출. yw8837/ulsan_store 참고)
//     ② GitHub Pages의 SPA 폴백(404.html)은 상세 URL을 HTTP 404로 응답 — 검색엔진은
//        404를 색인하지 않는다. 실파일을 만들면 200이 된다.
//     ③ 카톡·라인 공유 카드가 축제별 제목·포스터로 정확해진다(OG는 JS 렌더 안 봄).
//
// 원칙: <noscript> 본문은 화면이 실제로 보여주는 정보(이름·기간·장소·요약)만 담는다 —
//       화면에 없는 키워드를 넣으면 스팸 처리된다(네이버 웹마스터 가이드).
//
// 사용: node scripts/prerender.mjs --site=https://yuneunmi814-cmyk.github.io/kota
//       (dist/ 빌드와 public/data/festivals.json 이 있어야 한다)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const siteArg = process.argv.find((a) => a.startsWith('--site='))
const SITE = (siteArg ? siteArg.slice(7) : 'https://yuneunmi814-cmyk.github.io/kota').replace(/\/$/, '')
// 2026-08-15 — 제출 URL이 kota2로 옮겨갔다. 이 사이트는 당분간 유지하되 모든 페이지가
// 새 사이트의 같은 페이지로 넘긴다(meta refresh + canonical). 사람은 3초 뒤 이동하고,
// 크롤러는 canonical로 새 사이트를 정본으로 본다. GitHub Pages는 서버 리다이렉트가 없다.
const NEW_SITE = 'https://yuneunmi814-cmyk.github.io/kota2'

const shell = readFileSync(resolve(root, 'dist/index.html'), 'utf-8')
const { items } = JSON.parse(readFileSync(resolve(root, 'public/data/festivals.json'), 'utf-8'))

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 셸의 기본 title·og를 페이지별 값으로 치환하고 head 끝에 메타·본문 주입
function renderPage({ title, description, url, image, jsonLd, noscriptHtml, redirectTo }) {
  let html = shell
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`)
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
  if (image) html = html.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(image)}$2`)
  const extra = [
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '',
  ].join('\n    ')
  const target = redirectTo ?? `${NEW_SITE}/ko/`
  const redirect = [
    `<meta http-equiv="refresh" content="3;url=${target}">`,
    `<link rel="canonical" href="${target}">`,
    `<script>setTimeout(function(){location.replace(${JSON.stringify(target)})},2500)</script>`,
  ].join('\n    ')
  html = html.replace('</head>', `    ${extra}\n    ${redirect}\n  </head>`)
  if (noscriptHtml) {
    html = html.replace('<div id="root"></div>', `<div id="root"></div>\n    <noscript>\n${noscriptHtml}\n    </noscript>`)
  }
  return html
}

const fmtDate = (d) => d // YYYY-MM-DD 그대로 (크롤러 가독)
let written = 0

// ── 축제 상세 724건 ─────────────────────────────
for (const f of items) {
  const url = `${SITE}/festivals/${f.id}/`
  const redirectTo = f.externalId ? `${NEW_SITE}/ko/festivals/${encodeURIComponent(f.externalId)}/` : `${NEW_SITE}/ko/festivals/`
  const place = f.address ?? f.summary ?? ''
  const desc = [f.summary, `${fmtDate(f.startDate)} ~ ${fmtDate(f.endDate)}`, f.address].filter(Boolean).join(' · ').slice(0, 160)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Festival',
    name: f.name,
    ...(f.summary ? { description: f.summary } : {}),
    startDate: f.startDate,
    endDate: f.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: place || f.region?.name || '대한민국',
      ...(f.address ? { address: f.address } : {}),
      ...(f.lat != null && f.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: f.lat, longitude: f.lng } } : {}),
    },
    ...(f.imageUrl ? { image: [f.imageUrl] } : {}),
    isAccessibleForFree: true,
    organizer: { '@type': 'Organization', name: 'KOTA', url: SITE },
  }
  const trs = f.translations ?? []
  const noscript = `      <article>
        <h1>${esc(f.name)}</h1>
        ${trs.map((t) => `<p lang="${esc(t.langCode)}">${esc(t.name)}${t.summary ? ` — ${esc(t.summary)}` : ''}</p>`).join('\n        ')}
        <p>기간: ${esc(f.startDate)} ~ ${esc(f.endDate)}</p>
        ${f.address ? `<p>장소: ${esc(f.address)}</p>` : ''}
        ${f.summary ? `<p>${esc(f.summary)}</p>` : ''}
        ${f.tel ? `<p>문의: ${esc(f.tel)}</p>` : ''}
        <p><a href="${SITE}/festivals/">전국 지역축제 목록으로</a></p>
      </article>`
  const html = renderPage({
    title: `${f.name} · KOTA — Korea Festa`,
    description: desc || `${f.name} — 한국 지역축제 정보`,
    url,
    redirectTo,
    image: f.imageUrl || undefined,
    jsonLd,
    noscriptHtml: noscript,
  })
  const dir = resolve(root, `dist/festivals/${f.id}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'index.html'), html)
  written += 1
}

// ── 축제 목록 — 전 축제 실링크(크롤러 진입로) ─────────────────────────────
{
  const links = items
    .map((f) => `        <li><a href="${SITE}/festivals/${f.id}/">${esc(f.name)}</a> — ${esc(f.sido ?? '')} ${esc(f.startDate)}~${esc(f.endDate)}</li>`)
    .join('\n')
  const html = renderPage({
    title: '전국 지역축제 목록 · KOTA — Korea Festa',
    description: `지금 진행 중이거나 예정된 한국 지역축제 ${items.length}건 — 일정·장소·길찾기·주변 관광지를 4개 언어로.`,
    url: `${SITE}/festivals/`,
    redirectTo: `${NEW_SITE}/ko/festivals/`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: '전국 지역축제 목록',
      url: `${SITE}/festivals/`,
    redirectTo: `${NEW_SITE}/ko/festivals/`,
      isPartOf: { '@type': 'WebSite', name: 'KOTA — Korea Festa', url: SITE },
    },
    noscriptHtml: `      <h1>전국 지역축제 ${items.length}건</h1>\n      <ul>\n${links}\n      </ul>`,
  })
  mkdirSync(resolve(root, 'dist/festivals'), { recursive: true })
  writeFileSync(resolve(root, 'dist/festivals/index.html'), html)
  written += 1
}

// ── 목적별 테마 랜딩 6개 ─────────────────────────────
// "가족과 갈 만한 축제"·"먹거리 축제" 같은 검색어의 착지점(SEO) + AI 검색이 목적별로
// 인용할 수 있는 구조(GEO). 8/12 팀 인사이트: 여행은 '목적'에서 시작한다.
const THEME_META = {
  food: { ko: '먹거리', desc: '지역 특산물과 먹거리를 즐기는 축제' },
  nature: { ko: '꽃·자연', desc: '꽃·바다·숲 등 자연을 즐기는 축제' },
  heritage: { ko: '역사·전통', desc: '문화유산과 전통을 만나는 축제' },
  music: { ko: '음악·공연', desc: '음악·공연·예술을 즐기는 축제' },
  family: { ko: '가족·체험', desc: '아이와 함께 체험하기 좋은 축제' },
  night: { ko: '야경·불빛', desc: '밤에 빛나는 야경·불빛 축제' },
}
for (const [key, meta] of Object.entries(THEME_META)) {
  const list = items.filter((f) => (f.themes ?? []).includes(key))
  const links = list
    .slice(0, 60)
    .map((f) => `        <li><a href="${SITE}/festivals/${f.id}/">${esc(f.name)}</a> — ${esc(f.sido ?? '')} ${esc(f.startDate)}~${esc(f.endDate)}</li>`)
    .join('\n')
  const title = `${meta.ko} 축제 ${list.length}건 · KOTA — Korea Festa`
  const html = renderPage({
    title,
    description: `${meta.desc} — 전국 ${list.length}건의 일정·장소·길찾기를 4개 언어로.`,
    url: `${SITE}/themes/${key}/`,
    redirectTo: `${NEW_SITE}/ko/themes/${key}/`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${meta.ko} 축제`,
      description: meta.desc,
      url: `${SITE}/themes/${key}/`,
    redirectTo: `${NEW_SITE}/ko/themes/${key}/`,
      isPartOf: { '@type': 'WebSite', name: 'KOTA — Korea Festa', url: SITE },
    },
    noscriptHtml: `      <h1>${esc(meta.ko)} 축제 ${list.length}건</h1>\n      <p>${esc(meta.desc)}</p>\n      <ul>\n${links}\n      </ul>`,
  })
  mkdirSync(resolve(root, `dist/themes/${key}`), { recursive: true })
  writeFileSync(resolve(root, `dist/themes/${key}/index.html`), html)
  written += 1
}

// ── 홈 — 서비스 소개 + 상위 축제 링크 주입(기존 index.html 덮어쓰기) ─────────
{
  const top = items.slice(0, 30)
  const noscript = `      <h1>KOTA — 내 여행지 주변 축제</h1>
      <p>한국관광공사 OpenAPI와 공공데이터로 전국 지역축제 ${items.length}건의 일정·장소·길찾기·주변 관광지를 한국어·영어·일본어·태국어로 제공합니다.</p>
      <ul>
${top.map((f) => `        <li><a href="${SITE}/festivals/${f.id}/">${esc(f.name)}</a> (${esc(f.startDate)}~${esc(f.endDate)})</li>`).join('\n')}
      </ul>
      <p><a href="${SITE}/festivals/">전체 축제 보기</a></p>
      <h2>목적별로 찾기</h2>
      <ul>
${Object.entries(THEME_META).map(([k, m]) => `        <li><a href="${SITE}/themes/${k}/">${m.ko} 축제</a> — ${m.desc}</li>`).join('\n')}
      </ul>`
  const html = renderPage({
    title: 'KOTA — Korea Festa · 내 여행지 주변 축제',
    description: `내 여행지 주변 한국 지역축제 ${items.length}건 — 일정·장소·길찾기·주변 관광지를 4개 언어로. Discover Korean local festivals near your destination.`,
    url: `${SITE}/`,
    redirectTo: `${NEW_SITE}/ko/`,
    noscriptHtml: noscript,
  })
  writeFileSync(resolve(root, 'dist/index.html'), html)
  written += 1
}

console.log(`✔ 프리렌더 완료 — ${written}개 페이지 (${SITE})`)
