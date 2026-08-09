import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Festival } from '../api'
import { staticFestivals } from '../staticData'
import { useT } from '../i18n'

// 티켓형 프로모 배너 — 디자인 시안2: 브라이트 그린 50:50 분할(좌 이미지·우 텍스트+CTA)
// 이미지는 진행중 축제의 실제 포스터를 사용(없으면 플레이스홀더)
export default function PromoBanner() {
  const t = useT()
  const navigate = useNavigate()
  const [hot, setHot] = useState<Festival | null>(null)

  // 8/9 회의: 배너를 '지금 가장 핫한 축제'로 — 클릭수(GA) 연동 전까지는 지역 방문자 빅데이터
  // 기반 인기순 1위(이미지 보유·진행중 우선)를 사용
  useEffect(() => {
    staticFestivals(9999)
      .then((items) => {
        const withImg = items.filter((f) => f.imageUrl)
        const pick =
          [...withImg].sort((a, b) => (b.status === 'ongoing' ? 1 : 0) - (a.status === 'ongoing' ? 1 : 0) || (b.popularity ?? 0) - (a.popularity ?? 0))[0] ?? null
        setHot(pick)
      })
      .catch(() => {})
  }, [])

  const [line1, line2] = t('home.bannerTitle').split('\n')

  return (
    <section className="max-w-5xl mx-auto px-4 w-full">
      <div className="rounded-2xl overflow-hidden flex flex-col md:flex-row bg-bright p-5 md:p-6 gap-6 shadow-md">
        <div className="md:w-1/2 h-[220px] md:h-[300px] rounded-xl overflow-hidden shrink-0 bg-white/60">
          {hot?.imageUrl ? (
            /* 포스터는 세로형이 많아 cover는 잘린다(8/9 회의) — contain으로 원본 비율 유지 */
            <img src={hot.imageUrl} alt={hot.name} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[56px]" aria-hidden="true">🎪</div>
          )}
        </div>
        <div className="md:w-1/2 flex flex-col justify-center items-center text-center px-2 md:px-6">
          <h2 className="text-[24px] md:text-[28px] font-black mb-4 leading-snug text-green">
            {line1}
            <br />
            {line2}
          </h2>
          <p className="mb-2 text-[14px] font-medium text-green/80">{t('home.bannerBody')}</p>
          {hot && <p className="mb-6 text-[15px] font-black text-green">🔥 {hot.name}</p>}
          <button
            onClick={() => navigate(hot ? `/festivals/${hot.id}` : '/festivals')}
            className="bg-green text-white px-8 py-3.5 rounded-lg font-bold text-[15px] hover:opacity-90 transition shadow-sm"
          >
            {t('home.bannerCta')}
          </button>
        </div>
      </div>
    </section>
  )
}
