import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import { apiGet, type Festival } from '../api'
import { staticFestivals } from '../staticData'
import { useLang, useT } from '../i18n'

type NearbySpot = { id: string; name: string; category: string; distanceM: number }
type FestivalDetail = Festival & { nearbySpots?: NearbySpot[] }

// 축제 상세 — 카드 클릭의 도착지. 주변 관광지(반경 3km)는 백엔드가 PostGIS로 계산해 준다.
// API가 없거나 느리면 베이크 데이터로 기본 정보만 보여준다(주변 관광지는 서버 계산이라 생략).
export default function FestivalDetailPage() {
  const t = useT()
  const { lang } = useLang()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [festival, setFestival] = useState<FestivalDetail | null>(null)
  const [state, setState] = useState<'loading' | 'idle' | 'notfound'>('loading')

  useEffect(() => {
    if (!id) return
    setState('loading')
    apiGet<FestivalDetail>(`/festivals/${id}`, lang)
      .then((d) => {
        setFestival(d)
        setState('idle')
      })
      .catch(() =>
        staticFestivals(500, lang)
          .then((all) => {
            const hit = all.find((f) => String(f.id) === id)
            if (!hit) {
              setState('notfound')
              return
            }
            setFestival(hit)
            setState('idle')
          })
          .catch(() => setState('notfound')),
      )
  }, [id, lang])

  const fmt = (d: string) => d.replace(/-/g, '.').slice(2) // 2026-08-22 → 26.08.22

  return (
    <div className="min-h-screen bg-white text-green pb-24">
      <Header />

      {state === 'loading' && <p className="max-w-3xl mx-auto px-4 pt-16 text-gray-500">{t('search.loading')}</p>}

      {state === 'notfound' && (
        <div className="max-w-3xl mx-auto px-4 pt-16 text-center flex flex-col items-center gap-5">
          <p className="text-gray-500">{t('detail.notFound')}</p>
          <button onClick={() => navigate('/festivals')} className="px-6 py-3 rounded-full bg-green text-white font-bold hover:opacity-90 transition">
            {t('detail.backToList')}
          </button>
        </div>
      )}

      {state === 'idle' && festival && (
        <article className="max-w-3xl mx-auto px-4 pt-8">
          <button onClick={() => navigate(-1)} className="text-[14px] font-bold text-green/60 hover:text-green transition mb-5">
            ← {t('detail.back')}
          </button>

          {/* 포스터 — 없으면 카드와 같은 브랜드 플레이스홀더 */}
          <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 mb-6">
            {festival.imageUrl ? (
              <img src={festival.imageUrl} alt={festival.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-green/5">
                <span className="text-[40px]" aria-hidden="true">🎪</span>
                <span className="text-[13px] font-bold text-green/50">{festival.sigungu ?? festival.sido ?? 'KOTA'}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className={
                festival.status === 'ongoing'
                  ? 'text-[12px] font-black bg-green text-white px-3 py-1 rounded-full'
                  : 'text-[12px] font-bold border border-green/40 text-green/80 px-3 py-1 rounded-full'
              }
            >
              {festival.status === 'ongoing' ? t('festival.ongoing') : t('festival.upcoming')}
            </span>
            <span className="text-[14px] font-semibold text-gray-500">
              {festival.placeName ?? ([festival.sido, festival.sigungu].filter(Boolean).join(' ') || festival.region.name)}
            </span>
          </div>

          <h1 className="text-[26px] md:text-[32px] font-black leading-tight mb-1 text-green">{festival.name}</h1>
          {festival.nameKo && festival.nameKo !== festival.name && (
            <p className="text-[14px] text-gray-400 mb-4">{festival.nameKo}</p>
          )}

          {festival.summary && <p className="text-[15px] text-gray-600 leading-relaxed mb-6">{festival.summary}</p>}

          {/* 기본 정보 */}
          <dl className="grid grid-cols-[76px_1fr] gap-y-3 gap-x-3 text-[15px] mb-8 border-t border-gray-200 pt-6">
            <dt className="font-bold text-green/70">{t('detail.period')}</dt>
            <dd className="tabular-nums">
              {fmt(festival.startDate)} ~ {fmt(festival.endDate)}
            </dd>

            {festival.address && (
              <>
                <dt className="font-bold text-green/70">{t('detail.place')}</dt>
                <dd>{festival.address}</dd>
              </>
            )}

            {festival.tel && (
              <>
                <dt className="font-bold text-green/70">{t('detail.tel')}</dt>
                <dd>
                  <a href={`tel:${festival.tel}`} className="hover:underline">
                    {festival.tel}
                  </a>
                </dd>
              </>
            )}

            {festival.homepage && (
              <>
                <dt className="font-bold text-green/70">{t('detail.homepage')}</dt>
                <dd className="break-all">
                  <a href={festival.homepage} target="_blank" rel="noopener noreferrer" className="text-green font-semibold hover:underline">
                    {festival.homepage.replace(/^https?:\/\//, '').slice(0, 50)}
                  </a>
                </dd>
              </>
            )}
          </dl>

          {/* 길찾기 — 좌표가 있으면 지도 앱으로 연결 */}
          {festival.lat != null && festival.lng != null && (
            <a
              href={`https://map.kakao.com/link/to/${encodeURIComponent(festival.name)},${festival.lat},${festival.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green text-white font-bold text-[15px] hover:opacity-90 transition mb-10"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {t('detail.directions')}
            </a>
          )}

          {/* 주변 관광지 — 축제만 보고 끝나지 않게, 근처에서 뭘 더 할지 이어준다 */}
          {festival.nearbySpots && festival.nearbySpots.length > 0 && (
            <section>
              <h2 className="text-[18px] font-black mb-4 border-b border-gray-200 pb-3">{t('detail.nearby')}</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {festival.nearbySpots.map((s) => (
                  <li key={s.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-[15px] truncate">{s.name}</div>
                      <div className="text-[12px] text-gray-500">{s.category}</div>
                    </div>
                    <span className="shrink-0 text-[13px] font-bold text-pin tabular-nums">
                      {s.distanceM < 1000 ? `${s.distanceM}m` : `${(s.distanceM / 1000).toFixed(1)}km`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-12 pt-6 border-t border-gray-200">
            <Link to="/festivals" className="text-[15px] font-bold text-green hover:underline">
              {t('detail.moreFestivals')} →
            </Link>
          </div>
        </article>
      )}
    </div>
  )
}
