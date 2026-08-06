import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import { setPageMeta } from '../seo'
import RegionBanner from '../components/RegionBanner'
import FestivalRail, { type FestivalSort } from '../components/FestivalRail'
import { useT } from '../i18n'

// 축제 목록 — 상단은 홈과 같은 '내 위치' 버튼(기본값처럼 재클릭 가능), 아래 정렬 필터(거리순·인기순)
// ?sido=충청남도 & lat/lng & sort=date|distance|popularity & geo=denied(권한 안내)
export default function FestivalsPage() {
  useEffect(() => {
    setPageMeta('전국 지역축제', '지금 진행 중이거나 곧 열리는 한국 지역축제를 시·도별로 찾아보세요. Find local festivals across Korea by region and date.')
  }, [])
  const t = useT()
  const [params, setParams] = useSearchParams()
  const sido = params.get('sido')
  const [locating, setLocating] = useState(false)
  const [geoDenied, setGeoDenied] = useState(params.get('geo') === 'denied')

  const coords = useMemo(() => {
    const lat = Number(params.get('lat'))
    const lng = Number(params.get('lng'))
    return params.get('lat') !== null && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  }, [params])

  const rawSort = params.get('sort')
  const sort: FestivalSort = rawSort === 'distance' && coords ? 'distance' : rawSort === 'popularity' ? 'popularity' : 'date'

  const update = (fn: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params)
    next.delete('geo')
    fn(next)
    setParams(next, { replace: true })
  }

  // 내 위치 — 성공 시 좌표 저장 + 거리순 자동. 차단 상태면 브라우저가 묻지 않고 즉시 실패 → 안내 표시
  const onMyLocation = () => {
    if (!navigator.geolocation || locating) return
    setLocating(true)
    setGeoDenied(false)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        update((next) => {
          next.set('lat', pos.coords.latitude.toFixed(5))
          next.set('lng', pos.coords.longitude.toFixed(5))
          next.set('sort', 'distance')
        })
      },
      () => {
        setLocating(false)
        setGeoDenied(true)
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    )
  }

  const onSort = (s: FestivalSort) => {
    if (s === 'distance' && !coords) {
      onMyLocation() // 좌표가 없으면 먼저 위치부터 (성공 시 거리순 자동)
      return
    }
    update((next) => next.set('sort', s))
  }

  const chip = (s: FestivalSort, label: string) => (
    <button
      key={s}
      onClick={() => onSort(s)}
      className={`px-5 py-2 rounded-full text-[14px] font-bold border transition ${
        sort === s ? 'bg-green border-green text-white' : 'bg-white border-gray-300 text-green hover:border-green'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-white text-green pb-20">
      <Header />
      <main className="w-full max-w-5xl mx-auto pt-12 px-4 text-center">
        {/* B-1: 페이지 제목 일관성 — 홈 밖에서도 어느 화면인지 보이게 */}
        <h1 className="text-[26px] md:text-[30px] font-black mb-6">{t('festivals.title')}</h1>

        {geoDenied && (
          <p className="mb-5 text-[13px] font-medium text-pin bg-red-50 border border-red-100 rounded-xl px-4 py-3 max-w-xl mx-auto">
            {t('geo.denied')}
          </p>
        )}

        {/* 정렬 필터 — 내 위치를 누르면 거리순 자동, 필터는 독립 동작 */}
        <div className="flex justify-center gap-2.5 mb-8">
          {chip('date', t('filter.date'))}
          {chip('distance', locating ? '…' : coords ? `📍 ${t('filter.distance')}` : t('filter.distance'))}
          {chip('popularity', t('filter.popularity'))}
        </div>
      </main>
      <RegionBanner selected={sido} onSelect={(name) => update((next) => { if (name) next.set('sido', name); else next.delete('sido') })} />
      <FestivalRail coords={coords} sido={sido} sort={sort} hideTitle />
    </div>
  )
}
