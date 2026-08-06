import type { Festival } from './api'

// SEO/GEO — SPA라서 페이지별 title·description·JSON-LD를 라우트 진입 시 직접 갱신한다.
// 구글봇은 JS를 렌더하므로 동적 메타도 색인된다(네이버·빙도 동일). JSON-LD Event 스키마는
// 구글 검색의 '이벤트' 리치 결과와 AI 검색(GEO)의 구조화 근거로 쓰인다.

const SITE_NAME = 'KOTA — Korea Festa'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

/** 페이지별 title·description·OG·canonical 갱신 */
export function setPageMeta(title: string, description: string, path?: string) {
  const full = title === SITE_NAME ? title : `${title} · ${SITE_NAME}`
  document.title = full
  upsertMeta('name', 'description', description)
  upsertMeta('property', 'og:title', full)
  upsertMeta('property', 'og:description', description)
  const href = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}${path ?? window.location.pathname}`
  upsertMeta('property', 'og:url', href)
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = href
}

const JSONLD_ID = 'kota-jsonld'

/** 축제 상세의 schema.org Festival(Event) JSON-LD — 리치 결과·AI 검색용 */
export function setFestivalJsonLd(f: Festival) {
  removeJsonLd()
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Festival',
    name: f.name,
    ...(f.nameKo && f.nameKo !== f.name ? { alternateName: f.nameKo } : {}),
    ...(f.summary ? { description: f.summary } : {}),
    startDate: f.startDate,
    endDate: f.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: f.placeName ?? f.address ?? f.region.name,
      ...(f.address ? { address: f.address } : {}),
      ...(f.lat != null && f.lng != null
        ? { geo: { '@type': 'GeoCoordinates', latitude: f.lat, longitude: f.lng } }
        : {}),
    },
    ...(f.imageUrl ? { image: [f.imageUrl] } : {}),
    ...(f.homepage ? { sameAs: f.homepage } : {}),
    isAccessibleForFree: true, // 목록의 지역축제는 입장 무료가 기본 — 유료 확인된 축제가 생기면 데이터로 내려서 분기
    organizer: { '@type': 'Organization', name: 'KOTA', url: window.location.origin },
  }
  const s = document.createElement('script')
  s.type = 'application/ld+json'
  s.id = JSONLD_ID
  s.textContent = JSON.stringify(data)
  document.head.appendChild(s)
}

export function removeJsonLd() {
  document.getElementById(JSONLD_ID)?.remove()
}
