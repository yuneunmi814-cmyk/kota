import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { setPageMeta } from '../seo'
import RegionBanner, { type RegionSel } from '../components/RegionBanner'
import PromoBanner from '../components/PromoBanner'
import NearbyBanner from '../components/NearbyBanner'
import { useT } from '../i18n'
import { FEATURES } from '../features'

// 메인 페이지 — 디자인 시안2: 타이틀 + 통합 검색 + 권역 배너 + 티켓형 프로모 배너.
// (A-2 2026-08-06: 상단 '내 위치' 버튼 삭제 — 거리순은 목록 페이지 정렬 칩이 담당)
export default function HomePage() {
  useEffect(() => {
    setPageMeta('KOTA — Korea Festa', '내 위치 기반 한국 지역축제 여행팩 — 축제·교통·주변 관광지를 한 번에. Discover Korean local festivals near you with dates, directions and nearby spots, in English, 日本語, ไทย.')
  }, [])
  const t = useT()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  const onRegion = (s: RegionSel) => {
    if (s.type === 'sido') navigate(`/festivals?sido=${encodeURIComponent(s.name)}`)
    else if (s.type === 'group') navigate(`/festivals?group=${s.key}`)
    else navigate('/festivals')
  }

  return (
    <div className="min-h-screen bg-white text-green flex flex-col pb-20">
      <Header />

      <main className="w-full max-w-5xl mx-auto pt-16 pb-4 px-4 text-center">
        <h1 className="text-[34px] md:text-[46px] font-black mb-8 text-green tracking-tighter">{t('home.title')}</h1>

        {/* 통합 검색 — 축제명·지역 (검색 진입점은 이 한 곳으로 통일, QA A-1/B-1) */}
        {FEATURES.search && (
          <form onSubmit={onSubmit} className="relative w-full max-w-xl mx-auto shadow-sm rounded-full border border-gray-300 mb-2 focus-within:border-green transition-colors">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('home.searchPlaceholder')}
              className="w-full pl-6 pr-28 py-4 focus:outline-none text-[16px] bg-transparent text-green placeholder-gray-400 rounded-full"
            />
            <button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5 bg-green text-white px-7 rounded-full font-bold hover:opacity-90 transition">
              {t('home.searchButton')}
            </button>
          </form>
        )}

        {/* 검색 바로 아래 — '지역을 정하고 오는' 사용자보다 '지금 여기'인 사용자가 먼저다 */}
        <div className="mt-6 px-0">
          <NearbyBanner />
        </div>
      </main>

      <div className="mt-2">
        <RegionBanner selected={{ type: 'all' }} onChange={onRegion} />
      </div>
      {FEATURES.promoBanner && (
        <div className="mt-4">
          <PromoBanner />
        </div>
      )}
    </div>
  )
}
