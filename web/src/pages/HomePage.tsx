import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import RegionBanner from '../components/RegionBanner'
import FestivalRail from '../components/FestivalRail'
import { useT } from '../i18n'

// 메인 페이지 — 전도준 디자인 시안(샘플3) 반영: 검색 히어로 + 50:50 하단 배너
export default function HomePage() {
  const t = useT()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  const [bannerLine1, bannerLine2] = t('home.bannerTitle').split('\n')

  return (
    <div className="min-h-screen bg-paper text-navy pb-20">
      <Header />
      <RegionBanner />

      <main className="max-w-6xl mx-auto pt-16 pb-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-black mb-12 text-navy tracking-tight">{t('home.title')}</h1>

        <form onSubmit={onSubmit} className="relative w-full max-w-2xl mx-auto shadow-xl rounded-sm border-2 border-gold mb-20">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('home.searchPlaceholder')}
            className="w-full pl-6 pr-24 py-5 focus:outline-none text-lg bg-paper text-navy placeholder-navy/50"
          />
          <button type="submit" className="absolute right-2 top-2 bottom-2 bg-navy text-gold px-8 rounded-sm font-bold hover:bg-navy-2 transition-colors">
            {t('home.searchButton')}
          </button>
        </form>

        <FestivalRail />

        <section className="rounded-sm overflow-hidden flex flex-col md:flex-row shadow-2xl border-t-4 border-gold bg-navy max-w-5xl mx-auto">
          <div className="md:w-1/2 h-[240px] md:h-[380px]">
            <img src="https://picsum.photos/seed/kota-hero/600/400" alt="지역축제" className="w-full h-full object-cover" />
          </div>
          <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center items-start text-left text-gold">
            <h2 className="text-2xl md:text-3xl font-black mb-6 leading-tight drop-shadow-md">
              {bannerLine1}
              <br />
              {bannerLine2}
            </h2>
            <p className="mb-10 text-paper opacity-90 text-[15px]">{t('home.bannerBody')}</p>
            <button className="border border-gold text-gold px-8 py-2.5 font-bold hover:bg-gold hover:text-navy transition-colors rounded-sm text-[15px]">
              {t('home.bannerCta')}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
