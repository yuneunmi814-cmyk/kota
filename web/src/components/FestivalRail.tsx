import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, type Festival } from '../api'
import { staticFestivals } from '../staticData'
import { useLang, useT } from '../i18n'
import { sidoLabel } from '../sidoI18n'

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

const PAGE = 12 // 한 번에 노출/추가하는 카드 수

// 축제 카드 그리드 — 디자인 시안2(화이트+딥그린).
// BUG-03/04(2026-08-06): 예전엔 API로 24건만 받아 12건만 노출 → 거리순도 그 12건 안에서만 정렬돼
// 전국에서 가까운 축제가 안 나왔다. 이제 정적 데이터(전국 731건 전체)를 받아 필터·정렬·더보기까지
// 클라이언트에서 처리한다(콜드 스타트와 무관해 반응도 빠름). filterSidos=null이면 전국.
export default function FestivalRail({
  coords,
  filterSidos,
  sort = 'date',
  hideTitle,
}: {
  coords: Coords | null
  /** 필터할 시·도명 배열(권역=여러 개, 단일 시·도=1개). null이면 전국 전체 */
  filterSidos: string[] | null
  sort?: FestivalSort
  hideTitle?: boolean
}) {
  const t = useT()
  const { lang } = useLang()
  const [all, setAll] = useState<Festival[]>([])
  const [visible, setVisible] = useState(PAGE)

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

  const key = filterSidos ? filterSidos.join(',') : 'all'
  useEffect(() => { setVisible(PAGE) }, [key, sort, coords]) // 필터·정렬 바뀌면 처음부터

  const list = useMemo(() => {
    const filtered = filterSidos ? all.filter((f) => f.sido && filterSidos.includes(f.sido)) : all
    const withDistance = coords ? filtered.map((f) => ({ ...f, distanceKm: distanceKm(coords, f) })) : filtered.map((f) => ({ ...f, distanceKm: null as number | null }))
    if (sort === 'distance' && coords) {
      return [...withDistance].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    }
    if (sort === 'popularity') {
      return [...withDistance].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    }
    return withDistance // 시작일순 (정적 데이터 기본 정렬)
  }, [all, filterSidos, coords, sort])

  if (all.length === 0) return null
  if (list.length === 0) {
    return <p className="max-w-5xl mx-auto px-4 text-center text-gray-500 mb-16">{t('list.empty')}</p>
  }

  const shown = list.slice(0, visible)
  const remaining = list.length - shown.length

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
            <div className="aspect-[4/3] overflow-hidden bg-gray-100">
              {f.imageUrl ? (
                <img
                  src={f.imageUrl}
                  alt={f.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-green/5 border-b border-green/10">
                  <span className="text-[22px] leading-none" aria-hidden="true">🎪</span>
                  <span className="text-[11px] font-bold text-green/50">{f.sigungu ?? f.sido ?? 'KOTA'}</span>
                </div>
              )}
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
                  {f.status === 'ongoing' ? t('festival.ongoing') : t('festival.upcoming')}
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

      {remaining > 0 && (
        <div className="text-center mt-10">
          <button
            onClick={() => setVisible((v) => v + PAGE)}
            className="px-8 py-3 rounded-full border-2 border-green text-green font-bold text-[15px] hover:bg-green hover:text-white transition"
          >
            {t('list.more').replace('{n}', String(remaining))}
          </button>
        </div>
      )}
    </section>
  )
}
