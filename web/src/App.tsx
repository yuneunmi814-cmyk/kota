import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { initAnalytics, trackPageView } from './analytics'
import { LangProvider } from './i18n'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import FestivalsPage from './pages/FestivalsPage'
import FestivalDetailPage from './pages/FestivalDetailPage'
import LegalPage from './pages/LegalPage'
import ThemePage from './pages/ThemePage'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'

initAnalytics()

// SPA 라우트 변경마다 GA4 page_view — 어디로 들어와 어디를 보는지 유입·행동 분석의 기본 데이터
function PageTracker() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    trackPageView(pathname + search)
  }, [pathname, search])
  return null
}

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <PageTracker />
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/festivals" element={<FestivalsPage />} />
          <Route path="/festivals/:id" element={<FestivalDetailPage />} />
          <Route path="/themes/:key" element={<ThemePage />} />
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route path="/disclaimer" element={<LegalPage kind="disclaimer" />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </LangProvider>
  )
}
