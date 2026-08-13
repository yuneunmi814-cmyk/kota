import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { staticFestivals } from '../staticData'
import { useLang, useT } from '../i18n'
import { distanceKm, isAlwaysOn, NEARBY_RADIUS_KM, type Coords } from '../geo'
import { trackEvent } from '../analytics'

// 홈 '내 주변 축제' 배너 — 위치를 한 번 받아 반경 20km 안에서 지금 열리는 축제를 센다.
//
// 왜 이 자리인가: 지자체는 같은 정보를 통신사 위치기반 광고 문자로 건당 과금해 뿌린다
// (2026-06 공주시 유구 수국축제 수신 확인). 그 수요를 '여행자가 스스로 여는 화면'으로 옮긴 것.
//
// 좌표는 서버로 보내지 않는다. 정적 데이터를 받아 브라우저에서만 거리를 계산한다.

type State =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'done'; count: number; nearest: string | null; coords: Coords }
  | { kind: 'denied' }
  | { kind: 'error' }

export default function NearbyBanner() {
  const t = useT()
  const { lang } = useLang()
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ kind: 'idle' })

  const onFind = () => {
    if (!navigator.geolocation || state.kind === 'locating') return
    setState({ kind: 'locating' })
    trackEvent('nearby_find_click')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: Coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        try {
          const items = await staticFestivals(9999, lang)
          const near = items
            .filter((f) => f.status === 'ongoing' && !isAlwaysOn(f))
            .map((f) => ({ f, km: distanceKm(coords, f) }))
            .filter((x): x is { f: (typeof items)[number]; km: number } => x.km != null && x.km <= NEARBY_RADIUS_KM)
            .sort((a, b) => a.km - b.km)
          setState({ kind: 'done', count: near.length, nearest: near[0]?.f.name ?? null, coords })
          trackEvent('nearby_result', { count: near.length })
        } catch {
          setState({ kind: 'error' })
        }
      },
      (err) => setState({ kind: err.code === err.PERMISSION_DENIED ? 'denied' : 'error' }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  const goList = (coords: Coords) => {
    const q = new URLSearchParams({ lat: coords.lat.toFixed(5), lng: coords.lng.toFixed(5), sort: 'distance' })
    navigate(`/festivals?${q.toString()}`)
  }

  return (
    <section className="w-full max-w-xl mx-auto mb-6">
      <div className="rounded-2xl border border-green/20 bg-green/[0.04] px-5 py-4 text-left">
        {state.kind === 'done' ? (
          state.count > 0 ? (
            <>
              <p className="text-[15px] font-bold text-green mb-1">
                {t('nearby.found').replace('{n}', String(state.count)).replace('{r}', String(NEARBY_RADIUS_KM))}
              </p>
              {state.nearest && <p className="text-[13px] text-green/60 mb-3 truncate">{t('nearby.nearest')} {state.nearest}</p>}
              <button
                onClick={() => goList(state.coords)}
                className="text-[14px] font-bold bg-green text-white rounded-full px-4 py-2"
              >
                {t('nearby.see')}
              </button>
            </>
          ) : (
            <>
              <p className="text-[15px] font-bold text-green mb-1">
                {t('nearby.none').replace('{r}', String(NEARBY_RADIUS_KM))}
              </p>
              <button
                onClick={() => goList(state.coords)}
                className="text-[14px] font-bold underline text-green/80"
              >
                {t('nearby.seeFar')}
              </button>
            </>
          )
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-green">{t('nearby.title')}</p>
              <p className="text-[13px] text-green/60 truncate">
                {state.kind === 'denied'
                  ? t('nearby.denied')
                  : state.kind === 'error'
                    ? t('nearby.error')
                    : t('nearby.sub').replace('{r}', String(NEARBY_RADIUS_KM))}
              </p>
            </div>
            <button
              onClick={onFind}
              disabled={state.kind === 'locating'}
              className="shrink-0 text-[14px] font-bold bg-green text-white rounded-full px-4 py-2 disabled:opacity-50"
            >
              {state.kind === 'locating' ? t('nearby.locating') : t('nearby.cta')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
