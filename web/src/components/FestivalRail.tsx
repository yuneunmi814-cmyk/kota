import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, type Festival } from '../api'
import { staticFestivals } from '../staticData'
import { useLang, useT } from '../i18n'

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

// 축제 카드 그리드 — 디자인 시안2(화이트+딥그린). sort: 시작일순(기본)·거리순(coords 필요)·인기순(지역 방문자수)
export default function FestivalRail({
  coords,
  sido,
  hideTitle,
  sort = 'date',
}: {
  coords: Coords | null
  /** 시·도 이름(예: '충청남도'). null이면 전국 */
  sido: string | null
  hideTitle?: boolean
  sort?: FestivalSort
}) {
  const t = useT()
  const { lang } = useLang()
  const [festivals, setFestivals] = useState<(Festival & { distanceKm?: number | null })[]>([])

  useEffect(() => {
    const q = sido ? `&sido=${encodeURIComponent(sido)}` : ''
    apiGet<{ items: Festival[] }>(`/festivals?limit=24${q}`, lang)
      .then((d) => setFestivals(d.items))
      .catch(() =>
        staticFestivals(500, lang) // API 없으면 베이크된 정적 데이터에서 필터
          .then((all) => setFestivals((sido ? all.filter((f) => f.sido === sido) : all).slice(0, 24)))
          .catch(() => setFestivals([])),
      )
  }, [sido, lang])

  const withDistance = coords ? festivals.map((f) => ({ ...f, distanceKm: distanceKm(coords, f) })) : festivals
  const list =
    sort === 'distance' && coords
      ? [...withDistance].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      : sort === 'popularity'
        ? [...withDistance].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
        : withDistance // 시작일순 (API·베이크 기본 정렬)

  if (list.length === 0) return null

  return (
    <section className="max-w-5xl mx-auto mb-16 px-4 text-left">
      {!hideTitle && (
        <h2 className="text-[22px] font-black mb-6 text-green flex items-center gap-2">
          {t('home.festivals')}
          {coords && <span className="text-[12px] font-bold bg-green text-white px-2.5 py-1 rounded-full">{t('home.nearMe')}</span>}
        </h2>
      )}
      {hideTitle && coords && (
        <div className="mb-5 -mt-2 text-center">
          <span className="text-[12px] font-bold bg-green text-white px-3 py-1.5 rounded-full">{t('home.nearMe')}</span>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {list.slice(0, 12).map((f) => (
          <Link
            key={f.id}
            to={`/festivals/${f.id}`}
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-green/30 transition-all group block focus:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2"
          >
            {/* 포스터가 없는 축제(주로 표준데이터)는 랜덤 사진 대신 브랜드 플레이스홀더 —
                지역과 무관한 사진이 실제 축제처럼 보이면 신뢰를 해친다 */}
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
                <span className="text-[12px] font-semibold text-gray-500">{f.placeName ?? f.region.name}</span>
                {f.distanceKm != null && (
                  <span className="text-[12px] font-bold text-pin">{f.distanceKm < 10 ? f.distanceKm.toFixed(1) : Math.round(f.distanceKm)}km</span>
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
    </section>
  )
}
