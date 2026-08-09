import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import { setPageMeta } from '../seo'
import RegionBanner, { type RegionSel } from '../components/RegionBanner'
import FestivalRail, { type FestivalSort } from '../components/FestivalRail'
import { REGION_GROUPS } from '../regionGroups'
import { useT } from '../i18n'

// 축제 목록 — 정렬 필터(시작일·거리·인기) + 권역/시·도 배너.
// ?sido=충청남도(단일) | ?group=chungcheong(권역) & lat/lng & sort= & geo=denied
export default function FestivalsPage() {
  useEffect(() => {
    setPageMeta('전국 지역축제', '지금 진행 중이거나 곧 열리는 한국 지역축제를 권역·시·도별로 찾아보세요. Find local festivals across Korea by region and date.')
  }, [])
  const t = useT()
  const [params, setParams] = useSearchParams()
  const sido = params.get('sido')
  const group = params.get('group')
  const [locating, setLocating] = useState(false)
  const [geoDenied, setGeoDenied] = useState(params.get('geo') === 'denied')

  const coords = useMemo(() => {
    const lat = Number(params.get('lat'))
    const lng = Number(params.get('lng'))
    return params.get('lat') !== null && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  }, [params])

  const selected: RegionSel = sido ? { type: 'sido', name: sido } : group ? { type: 'group', key: group } : { type: 'all' }

  // 선택 → 필터할 시·도 배열 (전국이면 null)
  const filterSidos = useMemo(() => {
    if (sido) return [sido]
    if (group) return REGION_GROUPS.find((g) => g.key === group)?.sidos ?? null
    return null
  }, [sido, group])

  const rawSort = params.get('sort')
  const sort: FestivalSort = rawSort === 'distance' && coords ? 'distance' : rawSort === 'popularity' ? 'popularity' : 'date'

  const update = (fn: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params)
    next.delete('geo')
    fn(next)
    setParams(next, { replace: true })
  }

  const onRegion = (s: RegionSel) => {
    update((next) => {
      next.delete('sido')
      next.delete('group')
      if (s.type === 'sido') next.set('sido', s.name)
      else if (s.type === 'group') next.set('group', s.key)
    })
  }

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
        <h1 className="text-[26px] md:text-[30px] font-black mb-6">{t('festivals.title')}</h1>

        {geoDenied && (
          <p className="mb-5 text-[13px] font-medium text-pin bg-red-50 border border-red-100 rounded-xl px-4 py-3 max-w-xl mx-auto">
            {t('geo.denied')}
          </p>
        )}

        {/* 정렬 필터 — 거리순을 누르면 위치 요청, 성공 시 거리순 자동 */}
        <div className="flex justify-center gap-2.5 mb-8">
          {chip('date', t('filter.date'))}
          {chip('distance', locating ? '…' : coords ? `📍 ${t('filter.distance')}` : t('filter.distance'))}
          {chip('popularity', t('filter.popularity'))}
        </div>
      </main>
      <RegionBanner selected={selected} onChange={onRegion} />
      <FestivalRail coords={coords} filterSidos={filterSidos} sort={sort} hideTitle />
    </div>
  )
}
