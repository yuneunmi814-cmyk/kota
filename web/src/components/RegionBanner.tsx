import { useEffect, useRef, useState } from 'react'
import { apiGet, type Sido } from '../api'
import { staticSidos } from '../staticData'
import { useLang, useT } from '../i18n'
import { sidoLabel } from '../sidoI18n'

// 시·도 선택 배너 — 데이터(축제의 sido)에서 목록을 만들어 하드코딩 불일치를 없앤다.
// 이전에는 웹이 지역 slug를 하드코딩해 백엔드에 없는 지역(goyang·jeonbuk·gyeongbuk)을 누르면 결과가 0건이었다.
// 지역 사진은 쓰지 않는다 — 시·도를 대표하는 실제 사진이 없어 랜덤 이미지가 들어가던 문제(2026-08 QA)를 없앰.
export default function RegionBanner({ selected, onSelect }: { selected: string | null; onSelect: (sido: string | null) => void }) {
  const t = useT()
  const { lang } = useLang()
  const [sidos, setSidos] = useState<Sido[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiGet<{ sidos: Sido[] }>('/festivals/sidos')
      .then((d) => setSidos(d.sidos))
      .catch(() => staticSidos().then(setSidos).catch(() => setSidos([])))
  }, [])

  const scrollBy = (dir: -1 | 1) => scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })

  const chip = (key: string, label: string, count: number | null, isActive: boolean, onClick: () => void) => (
    <button
      key={key}
      onClick={onClick}
      aria-pressed={isActive}
      className={`shrink-0 px-5 py-2.5 rounded-full border text-[15px] font-bold transition flex items-center gap-2 ${
        isActive
          ? 'bg-green border-green text-white shadow-sm'
          : 'bg-white border-gray-300 text-green hover:border-green'
      }`}
    >
      {label}
      {count !== null && (
        <span className={`text-[12px] font-semibold tabular-nums ${isActive ? 'text-white/70' : 'text-gray-400'}`}>{count}</span>
      )}
    </button>
  )

  return (
    <section className="w-full bg-white py-4 flex justify-center mb-4">
      <div className="w-full max-w-[900px] relative flex items-center justify-center px-10">
        <button
          aria-label="이전 지역"
          onClick={() => scrollBy(-1)}
          className="absolute left-0 w-9 h-9 border border-gray-300 rounded-full flex items-center justify-center bg-white text-green hover:bg-gray-100 transition shadow-sm z-10"
        >
          <span className="text-sm font-bold">&lt;</span>
        </button>

        <div ref={scrollRef} className="flex items-center gap-2.5 overflow-x-auto px-2 py-1 scroll-smooth">
          {chip('all', t('region.all'), null, selected === null, () => onSelect(null))}
          {sidos.map((s) => chip(s.name, sidoLabel(s.name, lang), s.count, selected === s.name, () => onSelect(s.name)))}
        </div>

        <button
          aria-label="다음 지역"
          onClick={() => scrollBy(1)}
          className="absolute right-0 w-9 h-9 border border-gray-300 rounded-full flex items-center justify-center bg-white text-green hover:bg-gray-100 transition shadow-sm z-10"
        >
          <span className="text-sm font-bold">&gt;</span>
        </button>
      </div>
    </section>
  )
}
