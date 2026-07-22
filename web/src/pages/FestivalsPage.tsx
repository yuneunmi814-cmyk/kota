import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import RegionBanner from '../components/RegionBanner'
import FestivalRail from '../components/FestivalRail'
import { useT } from '../i18n'

// 축제 목록 — 홈 배너 CTA·지역 선택·내 위치의 도착 페이지. ?region=slug&lat=&lng=
export default function FestivalsPage() {
  const t = useT()
  const [params, setParams] = useSearchParams()
  const region = params.get('region')

  const coords = useMemo(() => {
    const lat = Number(params.get('lat'))
    const lng = Number(params.get('lng'))
    return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0) && params.get('lat') !== null
      ? { lat, lng }
      : null
  }, [params])

  const onSelect = (slug: string | null) => {
    const next = new URLSearchParams(params)
    if (slug) next.set('region', slug)
    else next.delete('region')
    setParams(next, { replace: true })
  }

  return (
    <div className="min-h-screen bg-white text-green pb-20">
      <Header />
      <main className="w-full max-w-5xl mx-auto pt-10 px-4 text-center">
        <h1 className="text-[28px] md:text-[36px] font-black mb-6 text-green tracking-tighter">{t('home.festivals')}</h1>
      </main>
      <RegionBanner selected={region} onSelect={onSelect} />
      <FestivalRail coords={coords} regionSlug={region} hideTitle />
    </div>
  )
}
