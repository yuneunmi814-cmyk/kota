import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import { trackEvent } from '../analytics'
import { apiGet, type Festival } from '../api'
import { removeJsonLd, setFestivalJsonLd, setPageMeta } from '../seo'
import { staticFestivals } from '../staticData'
import { useLang, useT } from '../i18n'
import { sidoLabel } from '../sidoI18n'
import { downloadIcs, googleCalUrl, isWished, onWishChange, toggleWish } from '../wishlist'

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
  const [, setWishVer] = useState(0)
  useEffect(() => onWishChange(() => setWishVer((v) => v + 1)), [])
  const [state, setState] = useState<'loading' | 'idle' | 'notfound'>('loading')

  // 8/9 회의 P0: 목록(정적 데이터)과 상세(API)의 숫자 id 체계가 환경마다 달라
  // '숭례문 클릭 → 송도해변축제'가 떴다. 이제 목록과 같은 정적 데이터에서 먼저 해석해
  // 항상 일치시키고, 주변 관광지·최신값은 환경 불변 externalId로 API에서 보강한다.
  useEffect(() => {
    if (!id) return
    let alive = true
    setState('loading')
    staticFestivals(9999, lang)
      .then((all) => {
        if (!alive) return
        const hit = all.find((f) => String(f.id) === id)
        if (!hit) {
          setState('notfound')
          return
        }
        setFestival(hit)
        setState('idle')
        if (hit.externalId) {
          apiGet<FestivalDetail>(`/festivals/external/${encodeURIComponent(hit.externalId)}`, lang)
            .then((d) => { if (alive) setFestival({ ...d, id: hit.id }) }) // URL의 id 유지
            .catch(() => {}) // API 콜드 스타트 등은 무시 — 정적 정보만으로 완결
        }
      })
      .catch(() => setState('notfound'))
    return () => { alive = false }
  }, [id, lang])

  // SEO: 축제별 title·description·JSON-LD(Event) — 검색·AI 검색이 축제 단위로 색인하게
  useEffect(() => {
    if (!festival) return
    const dates = `${festival.startDate} ~ ${festival.endDate}`
    setPageMeta(festival.name, festival.summary ?? `${festival.placeName ?? festival.region.name} · ${dates}`)
    setFestivalJsonLd(festival)
    trackEvent('view_festival', { festival_id: festival.id, festival_name: festival.nameKo ?? festival.name })
    return removeJsonLd
  }, [festival])

  const fmt = (d: string) => d.replace(/-/g, '.').slice(2) // 2026-08-22 → 26.08.22

  // BUG-01 잔존(2026-08-06): 일부 축제 주소 원문에 폐지된 '전남광주통합특별시'가 남아 있다.
  // sido는 이미 정규화됐으니 주소의 통합 표기를 정규 시·도명으로 치환해 표시한다.
  const cleanAddress = (addr: string, sido?: string | null) =>
    addr.replace(/전남광주통합특별시/g, sido && sido !== '전남광주통합특별시' ? sido : '광주·전남')

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
              {festival.placeName ?? (festival.sido ? `${sidoLabel(festival.sido, lang)}${lang === 'ko' && festival.sigungu ? ` ${festival.sigungu}` : ''}` : festival.region.name)}
            </span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[26px] md:text-[32px] font-black leading-tight mb-1 text-green">{festival.name}</h1>
            {/* 찜 — 알림(앱 푸시)의 1단계. 비로그인 localStorage */}
            <button
              aria-label={t('wish.label')}
              onClick={() => toggleWish(festival)}
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[20px] border transition ${
                isWished(festival) ? 'bg-pin border-pin text-white' : 'bg-white border-gray-300 text-gray-400 hover:text-pin hover:border-pin'
              }`}
            >
              {isWished(festival) ? '♥' : '♡'}
            </button>
          </div>
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
                <dd>{cleanAddress(festival.address, festival.sido)}</dd>
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
              onClick={() => trackEvent('directions_click', { festival_id: festival.id, festival_name: festival.nameKo ?? festival.name })}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green text-white font-bold text-[15px] hover:opacity-90 transition mb-10"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {t('detail.directions')}
            </a>
          )}

          {/* 캘린더 등록 — "날짜 세팅해두면 달력이랑 같이"(8/12 팀 채팅). 서버 없이 동작 */}
          <div className="flex flex-wrap items-center gap-2 mb-10">
            <span className="text-[13px] font-bold text-green/60">📅 {t('detail.addToCalendar')}:</span>
            <a
              href={googleCalUrl(festival)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('calendar_add', { festival_name: festival.nameKo ?? festival.name, method: 'google' })}
              className="px-4 py-2 rounded-full border border-green text-green text-[13px] font-bold hover:bg-green hover:text-white transition"
            >
              {t('detail.googleCal')}
            </a>
            <button
              onClick={() => { downloadIcs(festival); trackEvent('calendar_add', { festival_name: festival.nameKo ?? festival.name, method: 'ics' }) }}
              className="px-4 py-2 rounded-full border border-green text-green text-[13px] font-bold hover:bg-green hover:text-white transition"
            >
              {t('detail.icsFile')}
            </button>
          </div>

          {/* 주변 관광지 — 서버(PostGIS)가 계산한 반경 3km 결과.
              F-1(2026-08-06): nearbySpots가 있는데(=서버가 계산함) 0건이면 섹션이 사라져 축제마다 들쭉날쭉해 보였다.
              계산 결과가 있으면(빈 배열 포함) 섹션을 항상 그리고, 0건이면 안내 문구를 보여 일관성을 유지한다.
              (좌표가 없어 서버가 계산하지 않은 경우엔 nearbySpots 자체가 undefined → 섹션 생략) */}
          {festival.nearbySpots && (
            <section>
              <h2 className="text-[18px] font-black mb-4 border-b border-gray-200 pb-3">{t('detail.nearby')}</h2>
              {festival.nearbySpots.length === 0 ? (
                <p className="text-[14px] text-gray-400 py-2">{t('detail.nearbyEmpty')}</p>
              ) : (
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
              )}
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
