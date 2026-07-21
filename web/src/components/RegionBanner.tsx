import { useEffect, useRef, useState } from 'react'
import { apiGet, type Region } from '../api'
import { staticRegions } from '../staticData'
import { useT } from '../i18n'

// 지역 선택 원형 배너 — 디자인 시안(샘플3): 원형 일러스트 + 선택 지역 남색 테두리 확대
// API(/regions) 우선, 실패 시 정적 목록 폴백 (백엔드 없이도 화면이 살아있도록)
const FALLBACK: Region[] = [
  { id: 'goyang', name: '고양', slug: 'goyang', thumbnailUrl: null },
  { id: 'gongju', name: '공주', slug: 'gongju', thumbnailUrl: null },
  { id: 'jeonbuk', name: '전북', slug: 'jeonbuk', thumbnailUrl: null },
  { id: 'gyeongbuk', name: '경북', slug: 'gyeongbuk', thumbnailUrl: null },
  { id: 'jeju', name: '제주', slug: 'jeju', thumbnailUrl: null },
  { id: 'seoul', name: '서울', slug: 'seoul', thumbnailUrl: null },
  { id: 'busan', name: '부산', slug: 'busan', thumbnailUrl: null },
  { id: 'daegu', name: '대구', slug: 'daegu', thumbnailUrl: null },
]

export default function RegionBanner() {
  const t = useT()
  const [regions, setRegions] = useState<Region[]>(FALLBACK)
  const [selected, setSelected] = useState<string | null>(null) // null = 전국
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiGet<{ regions: Region[] }>('/regions')
      .then((d) => {
        if (d.regions.length > 0) setRegions(d.regions)
      })
      .catch(() =>
        staticRegions() // API 없으면 베이크된 정적 데이터
          .then((r) => { if (r.length > 0) setRegions(r) })
          .catch(() => {}), // 그래도 없으면 하드코딩 폴백 유지
      )
  }, [])

  const scrollBy = (dir: -1 | 1) => scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })

  const circle = (key: string, name: string, img: string | null, isActive: boolean, onClick: () => void) => (
    <button key={key} onClick={onClick} className="flex flex-col items-center gap-2 cursor-pointer group shrink-0">
      <div
        className={
          isActive
            ? 'w-[88px] h-[88px] rounded-full shadow-md border-[3px] border-navy overflow-hidden relative bg-white'
            : 'w-[74px] h-[74px] rounded-full shadow-sm overflow-hidden group-hover:-translate-y-1 transition-transform bg-white border border-hanji'
        }
      >
        <img
          src={img ?? `https://picsum.photos/seed/kota-${key}/150/150`}
          className={`w-full h-full object-cover ${isActive ? '' : 'opacity-90'}`}
          alt={name}
        />
      </div>
      <span className={isActive ? 'text-[16px] font-black text-navy mt-1' : 'text-[15px] font-medium text-navy'}>{name}</span>
    </button>
  )

  return (
    <section className="w-full bg-paper-2 py-[35px] flex justify-center border-b border-hanji">
      <div className="w-full max-w-[1200px] relative flex items-center justify-center px-[40px]">
        <button
          aria-label="이전 지역"
          onClick={() => scrollBy(-1)}
          className="absolute left-0 w-[32px] h-[32px] border border-gold rounded-full flex items-center justify-center bg-paper hover:bg-gold hover:text-navy transition text-navy shadow-sm"
        >
          <span className="text-sm font-bold">&lt;</span>
        </button>

        <div ref={scrollRef} className="flex items-end gap-[30px] overflow-x-auto scrollbar-none px-2">
          {circle('all', t('region.all'), null, selected === null, () => setSelected(null))}
          {regions.map((r) => circle(r.slug, r.name, r.thumbnailUrl, selected === r.slug, () => setSelected(r.slug)))}
        </div>

        <button
          aria-label="다음 지역"
          onClick={() => scrollBy(1)}
          className="absolute right-0 w-[32px] h-[32px] border border-gold rounded-full flex items-center justify-center bg-paper hover:bg-gold hover:text-navy transition text-navy shadow-sm"
        >
          <span className="text-sm font-bold">&gt;</span>
        </button>
      </div>
    </section>
  )
}
