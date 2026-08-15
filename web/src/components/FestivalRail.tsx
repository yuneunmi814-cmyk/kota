import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, type Festival } from '../api'
import { staticFestivals } from '../staticData'
import Poster from './Poster'
import Icon from './Icon'
import { useLang, useT } from '../i18n'
import { sidoLabel } from '../sidoI18n'
import { isWished, onWishChange, toggleWish, wishKey, wishedKeys } from '../wishlist'

type Coords = { lat: number; lng: number }

function distanceKm(a: Coords, f: Festival & { lat?: number | null; lng?: number | null }): number | null {
  if (f.lat == null || f.lng == null) return null
  const R = 6371
  const dLat = ((f.lat - a.lat) * Math.PI) / 180
  const dLng = ((f.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((f.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

export type FestivalSort = 'date' | 'distance' | 'popularity'

export const PAGE_SIZE = 12 // 페이지당 카드 수

// 축제 카드 그리드 — 정적 데이터(전국 전체)를 클라이언트에서 필터·정렬.
// 8/9 회의: '더 보기'는 상세 다녀오면 리셋돼 피로 — **번호 페이지네이션**으로 교체,
// 페이지 번호는 부모가 URL(?page=)로 관리해 뒤로가기 시 그대로 유지된다.
export default function FestivalRail({
  coords,
  filterSidos,
  sort = 'date',
  hideTitle,
  page = 1,
  onPageChange,
  wishOnly = false,
  theme,
}: {
  coords: Coords | null
  /** 필터할 시·도명 배열(권역=여러 개, 단일 시·도=1개). null이면 전국 전체 */
  filterSidos: string[] | null
  sort?: FestivalSort
  hideTitle?: boolean
  page?: number
  onPageChange?: (p: number) => void
  /** 찜한 축제만 (8/12 팀 결정 — 찜 1단계) */
  wishOnly?: boolean
  /** 여행 목적 테마 필터 (food·nature…) */
  theme?: string | null
}) {
  const t = useT()
  const { lang } = useLang()
  const [all, setAll] = useState<Festival[]>([])
  const [wishVer, setWishVer] = useState(0) // 찜 변경 시 리렌더
  useEffect(() => onWishChange(() => setWishVer((v) => v + 1)), [])

  // 목록 데이터는 정적 베이크(전국 전체)를 사용 — 거리순 전국 정렬을 위해 전체가 필요하고,
  // 주간 자동 동기화로 최신이며 API 콜드 스타트에 영향받지 않는다.
  useEffect(() => {
    let alive = true
    staticFestivals(9999, lang)
      .then((items) => { if (alive) setAll(items) })
      // 정적 데이터가 없는 극단 상황에서만 API로 폴백(최대 50건)
      .catch(() =>
        apiGet<{ items: Festival[] }>(`/festivals?limit=50`, lang)
          .then((d) => { if (alive) setAll(d.items) })
          .catch(() => { if (alive) setAll([]) }),
      )
    return () => { alive = false }
  }, [lang])

  // 상시축제(기간 1년 이상) 판정 — F-4(8/10): 시작일순 첫 화면을 상시축제가 점령하는 문제
  const DAY = 86_400_000
  const isAlwaysOn = (f: Festival) => new Date(f.endDate).getTime() - new Date(f.startDate).getTime() >= 300 * DAY /* 1/1~12/31은 364일이라 365로 두면 빠진다 */

  const list = useMemo(() => {
    let filtered = filterSidos ? all.filter((f) => f.sido && filterSidos.includes(f.sido)) : all
    if (wishOnly) {
      const keys = wishedKeys()
      filtered = filtered.filter((f) => keys.has(wishKey(f)))
    }
    if (theme) filtered = filtered.filter((f) => f.themes?.includes(theme))
    // BUG-09(8/10): 거리 표시는 거리순일 때만 — 다른 정렬로 돌아오면 최초 화면과 동일해야 한다
    const withDistance =
      sort === 'distance' && coords
        ? filtered.map((f) => ({ ...f, distanceKm: distanceKm(coords, f) }))
        : filtered.map((f) => ({ ...f, distanceKm: null as number | null }))
    if (sort === 'distance' && coords) {
      return [...withDistance].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    }
    if (sort === 'popularity') {
      return [...withDistance].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    }
    // 시작일순: 기간제 축제 먼저(시작일순), 상시축제(1년 이상)는 뒤로 — F-4 가안
    return [...withDistance].sort((a, b) => Number(isAlwaysOn(a)) - Number(isAlwaysOn(b)))
  }, [all, filterSidos, coords, sort, wishOnly, wishVer, theme])

  if (all.length === 0) return null
  if (list.length === 0) {
    return <p className="max-w-5xl mx-auto px-4 text-center text-gray-500 mb-16">{wishOnly ? t('wish.empty') : t('list.empty')}</p>
  }

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const cur = Math.min(Math.max(1, page), totalPages)
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE)
  // 페이지 번호 창(최대 7개) — 1 … n-1 n n+1 … last
  const nums: number[] = []
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - cur) <= 2) nums.push(i)
  }

  return (
    <section className="max-w-5xl mx-auto mb-16 px-4 text-left">
      {!hideTitle && (
        <h2 className="text-[22px] font-black mb-6 text-green flex items-center gap-2">
          {t('home.festivals')}
          {coords && <span className="text-[12px] font-bold bg-green text-white px-2.5 py-1 rounded-full">{t('home.nearMe')}</span>}
        </h2>
      )}
      {/* 총 건수 표시 — 탭 개수와 실제 노출이 어긋나 보이던 문제(BUG-03) 해소 */}
      <p className="text-[13px] text-gray-400 mb-4 tabular-nums">{t('list.total').replace('{n}', String(list.length))}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {shown.map((f) => (
          <Link
            key={f.id}
            to={`/festivals/${f.id}`}
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-green/30 transition-all group block focus:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2"
          >
            <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
              <button
                aria-label={t('wish.label')}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWish(f) }}
                className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center text-[16px] shadow-sm transition ${
                  isWished(f) ? 'bg-pin text-white' : 'bg-white/90 text-gray-400 hover:text-pin'
                }`}
              >
                <Icon name={isWished(f) ? 'heartFilled' : 'heart'} size={17} />
              </button>
              <Poster
                src={f.imageUrl}
                name={f.name}
                imgClassName="group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className={
                    f.status === 'ongoing'
                      ? 'text-[11px] font-black bg-green text-white px-2 py-0.5 rounded-full'
                      : 'text-[11px] font-bold border border-green/40 text-green/80 px-2 py-0.5 rounded-full'
                  }
                >
                  {isAlwaysOn(f) ? t('festival.always') : f.status === 'ongoing' ? t('festival.ongoing') : t('festival.upcoming')}
                </span>
                <span className="text-[12px] font-semibold text-gray-500">
                  {f.placeName ?? (f.region.name === '전국' ? t('region.all') : f.sido ? sidoLabel(f.sido, lang) : f.region.name)}
                </span>
                {(f as { distanceKm?: number | null }).distanceKm != null && (
                  <span className="text-[12px] font-bold text-pin">
                    {(f as { distanceKm: number }).distanceKm < 10 ? (f as { distanceKm: number }).distanceKm.toFixed(1) : Math.round((f as { distanceKm: number }).distanceKm)}km
                  </span>
                )}
              </div>
              <h3 className="font-bold text-[15px] leading-snug mb-1 text-green">{f.name}</h3>
              <p className="text-[12px] text-gray-500">
                {f.startDate.slice(5).replace('-', '.')} ~ {f.endDate.slice(5).replace('-', '.')}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <nav className="flex justify-center items-center gap-1.5 mt-10 flex-wrap" aria-label="pagination">
          <button
            disabled={cur === 1}
            onClick={() => onPageChange?.(cur - 1)}
            className="px-3 py-2 rounded-lg text-[14px] font-bold text-green disabled:opacity-30 hover:bg-green/5 transition"
          >
            ←
          </button>
          {nums.map((n, i) => (
            <span key={n} className="flex items-center gap-1.5">
              {i > 0 && nums[i - 1] !== n - 1 && <span className="text-gray-300 px-1">…</span>}
              <button
                onClick={() => onPageChange?.(n)}
                aria-current={n === cur ? 'page' : undefined}
                className={`min-w-[38px] px-2 py-2 rounded-lg text-[14px] font-bold transition ${
                  n === cur ? 'bg-green text-white' : 'text-green hover:bg-green/5'
                }`}
              >
                {n}
              </button>
            </span>
          ))}
          <button
            disabled={cur === totalPages}
            onClick={() => onPageChange?.(cur + 1)}
            className="px-3 py-2 rounded-lg text-[14px] font-bold text-green disabled:opacity-30 hover:bg-green/5 transition"
          >
            →
          </button>
        </nav>
      )}
    </section>
  )
}
