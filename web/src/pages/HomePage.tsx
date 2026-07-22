import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import RegionBanner from '../components/RegionBanner'
import PromoBanner from '../components/PromoBanner'
import { useT } from '../i18n'
import { FEATURES } from '../features'

// 메인 페이지 — 디자인 시안2: 타이틀 + 내 위치 + 지역 배너 + 티켓형 프로모 배너
// 축제 그리드는 /festivals 로 이동 (지역·내 위치 선택 시 그 페이지로 넘어감)
export default function HomePage() {
  const t = useT()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [locating, setLocating] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  const onMyLocation = () => {
    if (!navigator.geolocation || locating) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        navigate(`/festivals?lat=${pos.coords.latitude.toFixed(5)}&lng=${pos.coords.longitude.toFixed(5)}`)
      },
      () => {
        setLocating(false)
        navigate('/festivals') // 거부·실패 시 기본(시작일순) 목록으로
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    )
  }

  return (
    <div className="min-h-screen bg-white text-green flex flex-col pb-20">
      <Header />

      <main className="w-full max-w-5xl mx-auto pt-16 pb-4 px-4 text-center">
        <h1 className="text-[34px] md:text-[46px] font-black mb-8 text-green tracking-tighter">{t('home.title')}</h1>

        {/* 내 위치 알약 버튼 — 클릭 시 위치 허용 → 가까운 순 축제 목록으로 이동 */}
        <div className="flex justify-center mb-10">
          <button
            onClick={onMyLocation}
            className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full border bg-white border-gray-300 hover:border-green text-green shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#D32F2F" stroke="#004027" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" fill="#FFFFFF" stroke="#004027" strokeWidth="2" />
            </svg>
            <span className="text-[17px] font-bold tracking-tight">{locating ? '…' : t('home.myLocation')}</span>
          </button>
        </div>

        {/* 통합 검색 — 알약 형태 (FEATURES.search로 숨김/부활) */}
        {FEATURES.search && <form onSubmit={onSubmit} className="relative w-full max-w-xl mx-auto shadow-sm rounded-full border border-gray-300 mb-4 focus-within:border-green transition-colors">
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
        </form>}
      </main>

      <RegionBanner selected={null} onSelect={(slug) => navigate(slug ? `/festivals?region=${slug}` : '/festivals')} />
      <div className="mt-6">
        <PromoBanner />
      </div>
    </div>
  )
}
