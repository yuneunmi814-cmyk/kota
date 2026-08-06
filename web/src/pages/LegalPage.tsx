import { useEffect } from 'react'
import Header from '../components/Header'
import { setPageMeta } from '../seo'

// 개인정보처리방침·이용약관 (QA D-1) — 한국어+영어 병기 단문.
// 수집 항목이 사실상 없고(회원가입 없음, GA 익명 통계뿐) 법정 필수 고지만 담는다.
const PRIVACY = {
  title: '개인정보처리방침 · Privacy Policy',
  sections: [
    ['수집하는 정보 · What we collect',
     'KOTA 웹은 회원가입이 없으며 이름·연락처 등 개인정보를 수집하지 않습니다. 위치 정보는 "거리순" 정렬 시 브라우저에서만 사용되며 서버로 전송·저장되지 않습니다. 서비스 개선을 위해 Google Analytics의 익명 통계(방문 페이지·유입 경로)를 사용할 수 있습니다.\nKOTA has no sign-up and collects no personal information. Location is used only in your browser for distance sorting and is never sent to or stored on our servers. We may use anonymous Google Analytics statistics (pages visited, referral source) to improve the service.'],
    ['쿠키 · Cookies',
     '언어 설정을 브라우저(localStorage)에 저장합니다. Google Analytics가 익명 식별 쿠키를 사용할 수 있습니다.\nYour language preference is stored in your browser (localStorage). Google Analytics may use anonymous identifier cookies.'],
    ['문의 · Contact', 'yuneunmi814@gmail.com'],
  ],
}

const TERMS = {
  title: '이용약관 · Terms of Service',
  sections: [
    ['서비스 · Service',
     'KOTA는 공공데이터 기반 한국 지역축제 정보를 무료로 제공하는 서비스입니다.\nKOTA is a free service providing Korean local festival information based on public open data.'],
    ['정보의 정확성 · Accuracy',
     '축제 일정·장소는 주최 측 사정으로 변경·취소될 수 있습니다. 방문 전 공식 홈페이지나 문의 전화로 확인하시기 바랍니다. KOTA는 정보 오류·행사 변경으로 인한 손해에 법적 책임을 지지 않습니다.\nFestival dates and venues may change or be cancelled by organizers. Please confirm via the official website or phone before visiting. KOTA is not legally liable for damages arising from information errors or event changes.'],
    ['데이터 출처 · Data sources',
     '한국관광공사 TourAPI, 전국문화축제표준데이터(공공데이터포털), 각 지자체·문화재단 공개 자료.\nKorea Tourism Organization TourAPI, national festival standard open data (data.go.kr), and public materials from local governments and cultural foundations.'],
  ],
}

export default function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const doc = kind === 'privacy' ? PRIVACY : TERMS
  useEffect(() => {
    setPageMeta(doc.title.split(' · ')[0]!, doc.title)
  }, [doc])
  return (
    <div className="min-h-screen bg-white text-green">
      <Header />
      <main className="max-w-3xl mx-auto px-4 pt-12 pb-24">
        <h1 className="text-[26px] font-black mb-8">{doc.title}</h1>
        {doc.sections.map(([h, body]) => (
          <section key={h} className="mb-7">
            <h2 className="text-[17px] font-bold mb-2">{h}</h2>
            {body!.split('\n').map((line, i) => (
              <p key={i} className={`text-[14px] leading-relaxed ${i === 0 ? 'text-gray-700' : 'text-gray-400 mt-1'}`}>{line}</p>
            ))}
          </section>
        ))}
        <p className="text-[12px] text-gray-400 mt-10">시행일 · Effective: 2026-08-06</p>
      </main>
    </div>
  )
}
