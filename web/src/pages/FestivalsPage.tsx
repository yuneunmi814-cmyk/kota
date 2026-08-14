import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Icon from '../components/Icon'
import { setPageMeta } from '../seo'
import RegionBanner, { type RegionSel } from '../components/RegionBanner'
import FestivalRail, { type FestivalSort } from '../components/FestivalRail'
import { FEATURES } from '../features'
import { THEMES, THEME_META, themeLabel } from '../themes'
import { useLang } from '../i18n'
import { REGION_GROUPS } from '../regionGroups'
import { useT } from '../i18n'

// 축제 목록 — 정렬 필터(시작일·거리·인기) + 권역/시·도 배너.
// ?sido=충청남도(단일) | ?group=chungcheong(권역) & lat/lng & sort= & geo=denied
export default function FestivalsPage() {
  useEffect(() => {
    setPageMeta('전국 지역축제', '지금 진행 중이거나 곧 열리는 한국 지역축제를 권역·시·도별로 찾아보세요. Find local festivals across Korea by region and date.')
  }, [])
  const t = useT()
  const { lang } = useLang()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const sido = params.get('sido')
  const group = params.get('group')
  const destName = params.get('dest')
  const wishOnly = params.get('wish') === '1'
  const theme = params.get('theme')
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [q, setQ] = useState('')
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
      next.delete('page') // 필터 바뀌면 1페이지부터
      if (s.type === 'sido') next.set('sido', s.name)
      else if (s.type === 'group') next.set('group', s.key)
    })
  }

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
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
          next.delete('page')
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
    update((next) => {
      next.set('sort', s)
      next.delete('page') // BUG-10(8/10): 정렬이 바뀌면 새 목록의 1페이지부터
    })
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

        {/* 통합 검색 — 홈과 동일한 위치·모양 (8/9 회의: 화면 넘어가도 검색창이 같은 자리에) */}
        {FEATURES.search && (
          <form onSubmit={onSearch} className="relative w-full max-w-xl mx-auto shadow-sm rounded-full border border-gray-300 mb-6 focus-within:border-green transition-colors">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('home.searchPlaceholder')}
              className="w-full pl-6 pr-28 py-3.5 focus:outline-none text-[15px] bg-transparent text-green placeholder-gray-400 rounded-full"
            />
            <button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5 bg-green text-white px-6 rounded-full font-bold hover:opacity-90 transition">
              {t('home.searchButton')}
            </button>
          </form>
        )}

        {/* 여행지 기준 안내 칩 (헤더 '내 위치→여행지 입력'으로 설정됨) */}
        {destName && coords && (
          <p className="mb-4 text-[13px] font-bold text-green">
            <Icon name="pin" size={13} /> {t('dest.label')}: {destName}
          </p>
        )}

        {geoDenied && (
          <p className="mb-5 text-[13px] font-medium text-pin bg-red-50 border border-red-100 rounded-xl px-4 py-3 max-w-xl mx-auto">
            {t('geo.denied')}
          </p>
        )}

        {/* 정렬 필터 — 거리순을 누르면 위치 요청, 성공 시 거리순 자동 */}
        <div className="flex justify-center gap-2.5 mb-8">
          {chip('date', t('filter.date'))}
          {chip('distance', locating ? '…' : coords ? t('filter.distance') : t('filter.distance'))}
          {chip('popularity', t('filter.popularity'))}
          {/* 찜 필터 (8/12 팀 결정 — 찜한 축제 모아보기) */}
          <button
            onClick={() => update((next) => { if (wishOnly) next.delete('wish'); else next.set('wish', '1'); next.delete('page') })}
            className={`px-5 py-2 rounded-full text-[14px] font-bold border transition ${
              wishOnly ? 'bg-pin border-pin text-white' : 'bg-white border-gray-300 text-pin hover:border-pin'
            }`}
          >
            {t('wish.filter')}
          </button>
        </div>

        {/* 목적(테마) 필터 — 8/12 팀 인사이트: 여행은 '목적'에서 시작한다 */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {THEMES.map((k) => (
            <button
              key={k}
              onClick={() => update((next) => { if (theme === k) next.delete('theme'); else next.set('theme', k); next.delete('page') })}
              className={`px-4 py-1.5 rounded-full border text-[13px] font-bold transition ${
                theme === k ? 'bg-green border-green text-white' : 'bg-white border-gray-300 text-green hover:border-green'
              }`}
            >
              {THEME_META[k].emoji} {themeLabel(k, lang)}
            </button>
          ))}
        </div>

        {/* F-3(8/10): 인기순 산정 기준 안내 — 기준이 화면에 없다는 QA 지적 반영 */}
        {sort === 'popularity' && (
          <p className="-mt-4 mb-6 text-[12px] text-gray-400">{t('sort.popularityHint')}</p>
        )}
      </main>
      <RegionBanner selected={selected} onChange={onRegion} />
      <FestivalRail
        coords={coords}
        filterSidos={filterSidos}
        sort={sort}
        hideTitle
        wishOnly={wishOnly}
        theme={theme}
        page={page}
        onPageChange={(p) => {
          update((next) => next.set('page', String(p)))
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />
    </div>
  )
}
