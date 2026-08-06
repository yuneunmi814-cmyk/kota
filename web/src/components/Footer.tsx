import { Link } from 'react-router-dom'
import { useT } from '../i18n'

// 푸터 (QA D-1) — 법적 고지·데이터 출처. 모든 페이지 하단(App 공통 렌더).
export default function Footer() {
  const t = useT()
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8 text-center flex flex-col gap-3">
        <div className="flex justify-center gap-5 text-[13px] font-bold text-green">
          <Link to="/privacy" className="hover:underline">{t('footer.privacy')}</Link>
          <Link to="/terms" className="hover:underline">{t('footer.terms')}</Link>
        </div>
        <p className="text-[12px] text-gray-400 leading-relaxed max-w-2xl mx-auto">{t('footer.disclaimer')}</p>
        <p className="text-[12px] text-gray-400">{t('footer.source')} · © 2026 KOTA</p>
      </div>
    </footer>
  )
}
