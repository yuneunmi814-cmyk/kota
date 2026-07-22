import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import RegionBanner from '../components/RegionBanner'
import FestivalRail, { type FestivalSort } from '../components/FestivalRail'
import { useT } from '../i18n'

// 축제 목록 — 상단은 홈과 같은 '내 위치' 버튼(기본값처럼 재클릭 가능), 아래 정렬 필터(거리순·인기순)
// ?region=slug & lat/lng & sort=date|distance|popularity & geo=denied(권한 안내)
export default function FestivalsPage() {
  const t = useT()
  const [params, setParams] = useSearchParams()
  const region = params.get('region')
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
        {/* 홈과 동일한 내 위치 알약 버튼 — 좌표 보유 시 딥그린 활성 */}
        <div className="flex justify-center mb-5">
          <button
            onClick={onMyLocation}
            className={`inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full border shadow-sm hover:shadow-md transition-all cursor-pointer ${
              coords ? 'bg-green border-green text-white' : 'bg-white border-gray-300 hover:border-green text-green'
            }`}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#D32F2F" stroke={coords ? '#FFFFFF' : '#004027'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" fill="#FFFFFF" stroke={coords ? '#FFFFFF' : '#004027'} strokeWidth="2" />
            </svg>
            <span className="text-[17px] font-bold tracking-tight">{locating ? '…' : t('home.myLocation')}</span>
          </button>
        </div>

        {geoDenied && (
          <p className="mb-5 text-[13px] font-medium text-pin bg-red-50 border border-red-100 rounded-xl px-4 py-3 max-w-xl mx-auto">
            {t('geo.denied')}
          </p>
        )}

        {/* 정렬 필터 — 내 위치를 누르면 거리순 자동, 필터는 독립 동작 */}
        <div className="flex justify-center gap-2.5 mb-8">
          {chip('date', t('filter.date'))}
          {chip('distance', t('filter.distance'))}
          {chip('popularity', t('filter.popularity'))}
        </div>
      </main>
      <RegionBanner selected={region} onSelect={(slug) => update((next) => { if (slug) next.set('region', slug); else next.delete('region') })} />
      <FestivalRail coords={coords} regionSlug={region} sort={sort} hideTitle />
    </div>
  )
}
