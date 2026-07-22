import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, type Festival } from '../api'
import { staticFestivals } from '../staticData'
import { useT } from '../i18n'

// 티켓형 프로모 배너 — 디자인 시안2: 브라이트 그린 50:50 분할(좌 이미지·우 텍스트+CTA)
// 이미지는 진행중 축제의 실제 포스터를 사용(없으면 플레이스홀더)
export default function PromoBanner() {
  const t = useT()
  const navigate = useNavigate()
  const [img, setImg] = useState<string | null>(null)

  useEffect(() => {
    apiGet<{ items: Festival[] }>('/festivals?limit=8')
      .then((d) => setImg(d.items.find((f) => f.imageUrl)?.imageUrl ?? null))
      .catch(() =>
        staticFestivals(8)
          .then((items) => setImg(items.find((f) => f.imageUrl)?.imageUrl ?? null))
          .catch(() => {}),
      )
  }, [])

  const [line1, line2] = t('home.bannerTitle').split('\n')

  return (
    <section className="max-w-5xl mx-auto px-4 w-full">
      <div className="rounded-2xl overflow-hidden flex flex-col md:flex-row bg-bright p-5 md:p-6 gap-6 shadow-md">
        <div className="md:w-1/2 h-[220px] md:h-[300px] rounded-xl overflow-hidden shrink-0">
          <img
            src={img ?? 'https://picsum.photos/seed/kota-banner/700/450'}
            alt={t('home.bannerCta')}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="md:w-1/2 flex flex-col justify-center items-center text-center px-2 md:px-6">
          <h2 className="text-[24px] md:text-[28px] font-black mb-4 leading-snug text-green">
            {line1}
            <br />
            {line2}
          </h2>
          <p className="mb-8 text-[14px] font-medium text-green/80">{t('home.bannerBody')}</p>
          <button
            onClick={() => navigate('/festivals')}
            className="bg-green text-white px-8 py-3.5 rounded-lg font-bold text-[15px] hover:opacity-90 transition shadow-sm"
          >
            {t('home.bannerCta')}
          </button>
        </div>
      </div>
    </section>
  )
}
