// GA4 — 유입 경로·소비자 행동 분석. VITE_GA_ID 없으면 아무것도 로드하지 않는다(로컬/PR 빌드 무추적).
// 측정 ID는 deploy-web.yml이 레포 변수 GA_MEASUREMENT_ID에서 주입 — 코드 수정 없이 교체 가능.
const GA_ID = import.meta.env.VITE_GA_ID as string | undefined

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function initAnalytics() {
  if (!GA_ID) return
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
  window.dataLayer = window.dataLayer ?? []
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args)
  }
  window.gtag('js', new Date())
  // SPA라 라우트 변경마다 직접 page_view를 쏜다(자동 수집은 첫 로드만 잡음)
  window.gtag('config', GA_ID, { send_page_view: false })
}

/** SPA 라우트 변경 시 page_view — App의 라우터 훅에서 호출 */
export function trackPageView(path: string) {
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}

/** 행동 이벤트 — 어떤 축제를 보고, 길찾기를 누르고, 언어를 바꾸는지 */
export function trackEvent(name: string, params?: Record<string, string | number>) {
  window.gtag?.('event', name, params)
}
