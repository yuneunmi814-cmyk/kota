import { useEffect, useState } from 'react'
import { apiGet, type Festival } from '../api'
import { useT } from '../i18n'

// 다가오는 축제 레일 — GET /festivals (진행중+예정, 시작일순). API 없거나 비면 섹션 숨김
export default function FestivalRail() {
  const t = useT()
  const [festivals, setFestivals] = useState<Festival[]>([])

  useEffect(() => {
    apiGet<{ items: Festival[] }>('/festivals?limit=8')
      .then((d) => setFestivals(d.items))
      .catch(() => setFestivals([]))
  }, [])

  if (festivals.length === 0) return null

  return (
    <section className="max-w-5xl mx-auto mb-20 text-left">
      <h2 className="text-2xl font-black mb-6 border-b-2 border-gold pb-3 flex items-center gap-2">
        {t('home.festivals')}
      </h2>
      <div className="flex gap-5 overflow-x-auto pb-3">
        {festivals.map((f) => (
          <article key={f.id} className="w-[240px] shrink-0 bg-white border border-hanji rounded-sm shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <div className="h-[150px] overflow-hidden bg-paper-2">
              <img
                src={f.imageUrl ?? `https://picsum.photos/seed/kota-fest-${f.id}/400/250`}
                alt={f.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={
                    f.status === 'ongoing'
                      ? 'text-[11px] font-black bg-gold text-navy px-2 py-0.5 rounded-sm'
                      : 'text-[11px] font-bold border border-navy/30 text-navy/70 px-2 py-0.5 rounded-sm'
                  }
                >
                  {f.status === 'ongoing' ? t('festival.ongoing') : t('festival.upcoming')}
                </span>
                <span className="text-[12px] text-navy/60">{f.region.name}</span>
              </div>
              <h3 className="font-bold text-[16px] leading-snug mb-1">{f.name}</h3>
              <p className="text-[12px] text-navy/60">
                {f.startDate.slice(5).replace('-', '.')} ~ {f.endDate.slice(5).replace('-', '.')}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
