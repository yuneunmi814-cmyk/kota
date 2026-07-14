import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LANGS, useLang, useT } from '../i18n'

// 상단 GNB — 디자인 시안(샘플3): 남색 텍스트 + 금색 포인트, 활성 탭 금색 밑줄
export default function Header() {
  const t = useT()
  const { lang, setLang } = useLang()
  const [langOpen, setLangOpen] = useState(false)
  const navigate = useNavigate()

  const menus = [
    { key: 'festivals', label: t('nav.festivals'), active: true },
    { key: 'food', label: t('nav.food') },
    { key: 'spots', label: t('nav.spots') },
    { key: 'packs', label: t('nav.packs'), badge: 'AI' },
  ]

  return (
    <header className="w-full flex justify-center bg-paper h-[80px] z-50 border-b border-hanji sticky top-0">
      <div className="w-full max-w-[1200px] flex items-center justify-between px-4 relative">
        <Link to="/" className="font-black text-[24px] flex items-center tracking-widest text-navy">
          KOTA
        </Link>

        <nav className="hidden md:flex items-center gap-[45px] font-bold text-[17px] text-navy">
          {menus.map((m) =>
            m.active ? (
              <div
                key={m.key}
                className="text-gold cursor-pointer relative h-[80px] flex items-center after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[3px] after:bg-gold"
              >
                {m.label}
              </div>
            ) : (
              <div key={m.key} className="flex items-center gap-1 cursor-pointer hover:text-gold transition-colors">
                {m.label}
                {m.badge && (
                  <span className="bg-gold text-navy text-[10px] font-black px-[4px] py-[1px] rounded-sm">{m.badge}</span>
                )}
              </div>
            ),
          )}
        </nav>

        <div className="flex items-center gap-[18px]">
          <button
            aria-label={t('home.searchButton')}
            onClick={() => navigate('/search')}
            className="w-[36px] h-[36px] rounded-full bg-navy flex items-center justify-center text-gold hover:bg-navy-2 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1 text-[14px] text-navy cursor-pointer font-medium hover:text-gold transition-colors"
            >
              🌐 {LANGS.find((l) => l.code === lang)?.label} <span className="text-[10px]">▼</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-[36px] bg-paper border border-hanji shadow-lg rounded-sm min-w-[120px]">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLang(l.code)
                      setLangOpen(false)
                    }}
                    className={`block w-full text-left px-4 py-2 text-[14px] hover:bg-paper-2 ${l.code === lang ? 'text-gold font-bold' : 'text-navy'}`}
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
