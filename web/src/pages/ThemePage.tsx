import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import Header from '../components/Header'
import Icon from '../components/Icon'
import FestivalRail from '../components/FestivalRail'
import { setPageMeta } from '../seo'
import { useLang, useT } from '../i18n'
import { THEMES, THEME_META, isTheme, themeDesc, themeLabel, type Theme } from '../themes'

// 목적별 축제 랜딩 — "가족과 갈 만한 축제"·"먹거리 축제" 같은 검색어의 착지점(SEO/GEO).
// 8/12 팀 인사이트: 여행은 '목적'에서 시작하는데 우리 탐색축은 지역뿐이었다.
export default function ThemePage() {
  const { key } = useParams<{ key: string }>()
  const { lang } = useLang()
  const t = useT()
  const raw = key ?? null
  const theme: Theme | null = isTheme(raw) ? raw : null

  useEffect(() => {
    if (theme) setPageMeta(`${themeLabel(theme, lang)} 축제`, themeDesc(theme, lang))
  }, [theme, lang])

  if (!theme) {
    return (
      <div className="min-h-screen bg-white text-green">
        <Header />
        <main className="max-w-3xl mx-auto px-4 pt-16 text-center">
          <p className="text-gray-500 mb-6">{t('detail.notFound')}</p>
          <Link to="/festivals" className="px-6 py-3 rounded-full bg-green text-white font-bold">{t('detail.backToList')}</Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-green pb-20">
      <Header />
      <main className="w-full max-w-5xl mx-auto pt-12 px-4 text-center">
        <p className="mb-3 text-green flex justify-center"><Icon name={THEME_META[theme].icon} size={40} strokeWidth={1.5} /></p>
        <h1 className="text-[26px] md:text-[32px] font-black mb-3">{themeLabel(theme, lang)}</h1>
        <p className="text-[15px] text-gray-500 mb-8">{themeDesc(theme, lang)}</p>

        {/* 다른 목적으로 이동 */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {THEMES.map((k) => (
            <Link
              key={k}
              to={`/themes/${k}`}
              className={`px-4 py-2 rounded-full border text-[14px] font-bold transition ${
                k === theme ? 'bg-green border-green text-white' : 'bg-white border-gray-300 text-green hover:border-green'
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><Icon name={THEME_META[k].icon} size={15} /> {themeLabel(k, lang)}</span>
            </Link>
          ))}
        </div>
      </main>
      <FestivalRail coords={null} filterSidos={null} theme={theme} hideTitle />
      <div className="text-center">
        <Link to="/festivals" className="text-[15px] font-bold text-green hover:underline">{t('detail.moreFestivals')} →</Link>
      </div>
    </div>
  )
}
