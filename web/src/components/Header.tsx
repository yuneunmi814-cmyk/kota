import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LANGS, useLang, useT } from '../i18n'
import { destinationCentroids } from '../staticData'
import Icon from './Icon'

// 상단 헤더 — 로고 · 내 위치/여행지 · 언어. (8/9 회의: 내 위치 버튼을 언어 토글 옆에 상시 배치,
// 누르면 ① 현재 위치 사용 ② 여행지(도시) 입력 — 외국인은 방한 전에 목적지 기준으로 찾으므로
// '내 위치'만으로는 수천 km가 떠 무의미하다는 결정 반영)
export default function Header() {
  const t = useT()
  const { lang, setLang } = useLang()
  const [langOpen, setLangOpen] = useState(false)
  const [locOpen, setLocOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [dest, setDest] = useState('')
  const [destErr, setDestErr] = useState(false)
  const navigate = useNavigate()
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setLocOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const goCoords = (lat: number, lng: number, destName?: string) => {
    setLocOpen(false)
    setDest('')
    const q = new URLSearchParams({ lat: lat.toFixed(5), lng: lng.toFixed(5), sort: 'distance' })
    if (destName) q.set('dest', destName)
    navigate(`/festivals?${q.toString()}`)
  }

  const onMyLocation = () => {
    if (!navigator.geolocation || locating) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); goCoords(pos.coords.latitude, pos.coords.longitude) },
      () => { setLocating(false); setLocOpen(false); navigate('/festivals?geo=denied') },
      { enableHighAccuracy: false, timeout: 10_000 },
    )
  }

  // 여행지 입력 → 시군구/시도 축제 중심좌표 기준 거리순 (정적 데이터 기반, 서버 불필요)
  const onDest = async (e: FormEvent) => {
    e.preventDefault()
    const q = dest.trim().replace(/\s+/g, '')
    if (!q) return
    try {
      const cents = await destinationCentroids()
      const hit =
        cents.find((c) => c.name.replace(/\s+/g, '') === q) ??
        cents.find((c) => c.name.replace(/\s+/g, '').startsWith(q)) ??
        cents.find((c) => q.startsWith(c.name.replace(/(특별자치도|특별자치시|특별시|광역시|도|시|군|구)$/, '').replace(/\s+/g, '')))
      if (hit) {
        goCoords(hit.lat, hit.lng, hit.name)
      } else {
        setDestErr(true)
        setTimeout(() => setDestErr(false), 2500)
      }
    } catch {
      setDestErr(true)
    }
  }

  return (
    <header className="w-full flex justify-center bg-white h-[72px] z-50 border-b border-gray-100 sticky top-0">
      <div className="w-full max-w-[1200px] flex items-center justify-between px-5">
        <Link to="/" className="font-black text-[24px] tracking-tighter text-green">
          KOTA
        </Link>

        <div className="flex items-center gap-4">
          {/* 내 위치 / 여행지 */}
          <div className="relative" ref={boxRef}>
            <button
              onClick={() => setLocOpen((v) => !v)}
              className="flex items-center gap-1 text-[14px] font-semibold text-green hover:opacity-70 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#D32F2F" stroke="#004027" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" fill="#FFF" />
              </svg>
              {t('nav.myLocation')} <span className="text-[10px]">▼</span>
            </button>
            {locOpen && (
              <div className="absolute right-0 top-[38px] bg-white border border-gray-200 shadow-lg rounded-xl w-[260px] p-3 flex flex-col gap-2">
                <button
                  onClick={onMyLocation}
                  className="w-full py-2.5 rounded-lg bg-green text-white text-[14px] font-bold hover:opacity-90 transition"
                >
                  {locating ? '…' : <><Icon name="pin" size={14} /> {t('nav.myLocation')}</>}
                </button>
                <form onSubmit={onDest} className="flex gap-1.5">
                  <input
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                    placeholder={t('dest.placeholder')}
                    className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-green"
                  />
                  <button type="submit" className="shrink-0 px-3 py-2 rounded-lg border border-green text-green text-[13px] font-bold hover:bg-green hover:text-white transition">
                    →
                  </button>
                </form>
                {destErr && <p className="text-[12px] text-pin">{t('dest.notFound')}</p>}
              </div>
            )}
          </div>

          {/* 언어 */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1 text-[14px] font-semibold text-green hover:opacity-70 transition"
            >
              <Icon name="globe" size={14} /> {LANGS.find((l) => l.code === lang)?.label} <span className="text-[10px]">▼</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-[38px] bg-white border border-gray-200 shadow-lg rounded-xl min-w-[130px] overflow-hidden">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLang(l.code)
                      setLangOpen(false)
                    }}
                    className={`block w-full text-left px-4 py-2.5 text-[14px] hover:bg-gray-50 ${l.code === lang ? 'text-green font-bold' : 'text-gray-600'}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
