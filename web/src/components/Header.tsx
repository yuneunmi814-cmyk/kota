import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LANGS, useLang } from '../i18n'

// 상단 헤더 — 디자인 시안2: 화이트 + 딥그린. 축제 단일 서비스라 메뉴 없이 로고·언어만.
// (A-1/B-1 2026-08-06: 헤더 검색 돋보기 제거 — 검색 진입점은 홈 검색창 하나로 통일)
export default function Header() {
  const { lang, setLang } = useLang()
  const [langOpen, setLangOpen] = useState(false)

  return (
    <header className="w-full flex justify-center bg-white h-[72px] z-50 border-b border-gray-100 sticky top-0">
      <div className="w-full max-w-[1200px] flex items-center justify-between px-5">
        <Link to="/" className="font-black text-[24px] tracking-tighter text-green">
          KOTA
        </Link>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1 text-[14px] font-semibold text-green hover:opacity-70 transition"
            >
              🌐 {LANGS.find((l) => l.code === lang)?.label} <span className="text-[10px]">▼</span>
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
