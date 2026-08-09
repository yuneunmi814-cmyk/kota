import { useEffect } from 'react'
import Header from '../components/Header'
import { setPageMeta } from '../seo'
import { useLang, type Lang } from '../i18n'

// 법적 고지 — 개인정보처리방침 · 이용약관 · 면책조항.
// QA C-1(2026-08-06): 이전엔 한/영 병기 하드코딩이라 태국어·일본어로 안 바뀌던 문제 → 4개 언어 적용.
// 수집 항목이 사실상 없다(회원가입 없음, GA 익명 통계뿐).
type Doc = { title: string; sections: [string, string][] }
export type LegalKind = 'privacy' | 'terms' | 'disclaimer'

const DOCS: Record<LegalKind, Record<Lang, Doc>> = {
  privacy: {
    ko: {
      title: '개인정보처리방침',
      sections: [
        ['수집하는 정보', 'KOTA 웹은 회원가입이 없으며 이름·연락처 등 개인정보를 수집하지 않습니다. 위치 정보는 "거리순" 정렬 시 브라우저에서만 사용되며 서버로 전송·저장되지 않습니다. 서비스 개선을 위해 Google Analytics의 익명 통계(방문 페이지·유입 경로)를 사용할 수 있습니다.'],
        ['쿠키', '언어 설정을 브라우저(localStorage)에 저장합니다. Google Analytics가 익명 식별 쿠키를 사용할 수 있습니다.'],
        ['문의', 'yuneunmi814@gmail.com'],
      ],
    },
    en: {
      title: 'Privacy Policy',
      sections: [
        ['What we collect', 'KOTA has no sign-up and collects no personal information. Location is used only in your browser for distance sorting and is never sent to or stored on our servers. We may use anonymous Google Analytics statistics (pages visited, referral source) to improve the service.'],
        ['Cookies', 'Your language preference is stored in your browser (localStorage). Google Analytics may use anonymous identifier cookies.'],
        ['Contact', 'yuneunmi814@gmail.com'],
      ],
    },
    ja: {
      title: 'プライバシーポリシー',
      sections: [
        ['収集する情報', 'KOTAは会員登録がなく、氏名・連絡先などの個人情報を収集しません。位置情報は「近い順」並べ替えの際にブラウザ内でのみ使用され、サーバーへ送信・保存されません。サービス改善のためGoogle Analyticsの匿名統計(閲覧ページ・流入経路)を利用する場合があります。'],
        ['Cookie', '言語設定をブラウザ(localStorage)に保存します。Google Analyticsが匿名の識別Cookieを使用する場合があります。'],
        ['お問い合わせ', 'yuneunmi814@gmail.com'],
      ],
    },
    th: {
      title: 'นโยบายความเป็นส่วนตัว',
      sections: [
        ['ข้อมูลที่เก็บ', 'KOTA ไม่มีการสมัครสมาชิกและไม่เก็บข้อมูลส่วนบุคคล เช่น ชื่อหรือข้อมูลติดต่อ ตำแหน่งที่ตั้งใช้เฉพาะในเบราว์เซอร์เพื่อจัดเรียงตามระยะทาง ไม่ส่งหรือบันทึกบนเซิร์ฟเวอร์ เราอาจใช้สถิติแบบไม่ระบุตัวตนของ Google Analytics เพื่อปรับปรุงบริการ'],
        ['คุกกี้', 'การตั้งค่าภาษาถูกเก็บในเบราว์เซอร์ (localStorage) Google Analytics อาจใช้คุกกี้ระบุตัวตนแบบไม่ระบุชื่อ'],
        ['ติดต่อ', 'yuneunmi814@gmail.com'],
      ],
    },
  },
  terms: {
    ko: {
      title: '이용약관',
      sections: [
        ['서비스', 'KOTA는 공공데이터 기반 한국 지역축제 정보를 무료로 제공하는 서비스입니다.'],
        ['정보의 정확성', '축제 일정·장소는 주최 측 사정으로 변경·취소될 수 있습니다. 방문 전 공식 홈페이지나 문의 전화로 확인하시기 바랍니다.'],
        ['데이터 출처', '한국관광공사 TourAPI, 전국문화축제표준데이터(공공데이터포털), 문화체육관광부 지역축제 개최계획, 각 지자체·문화재단 공개 자료.'],
      ],
    },
    en: {
      title: 'Terms of Service',
      sections: [
        ['Service', 'KOTA is a free service providing Korean local festival information based on public open data.'],
        ['Accuracy', 'Festival dates and venues may change or be cancelled by organizers. Please confirm via the official website or phone before visiting.'],
        ['Data sources', 'Korea Tourism Organization TourAPI, national festival standard open data (data.go.kr), the Ministry of Culture’s regional festival plan, and public materials from local governments and cultural foundations.'],
      ],
    },
    ja: {
      title: '利用規約',
      sections: [
        ['サービス', 'KOTAは公共データに基づく韓国の地域祭り情報を無料で提供するサービスです。'],
        ['情報の正確性', '祭りの日程・会場は主催者の都合により変更・中止される場合があります。訪問前に公式サイトや問い合わせ先でご確認ください。'],
        ['データ出典', '韓国観光公社 TourAPI、全国文化祭り標準データ(公共データポータル)、文化体育観光部の地域祭り開催計画、各自治体・文化財団の公開資料。'],
      ],
    },
    th: {
      title: 'ข้อกำหนดการใช้งาน',
      sections: [
        ['บริการ', 'KOTA เป็นบริการฟรีที่ให้ข้อมูลเทศกาลท้องถิ่นของเกาหลี อ้างอิงจากข้อมูลเปิดสาธารณะ'],
        ['ความถูกต้อง', 'กำหนดการและสถานที่จัดงานอาจเปลี่ยนแปลงหรือยกเลิกโดยผู้จัด กรุณาตรวจสอบเว็บไซต์ทางการหรือโทรสอบถามก่อนเดินทาง'],
        ['แหล่งข้อมูล', 'TourAPI การท่องเที่ยวเกาหลี, ข้อมูลมาตรฐานเทศกาลวัฒนธรรม (data.go.kr), แผนจัดเทศกาลของกระทรวงวัฒนธรรม และข้อมูลเปิดจากหน่วยงานท้องถิ่น'],
      ],
    },
  },
  disclaimer: {
    ko: {
      title: '면책조항',
      sections: [
        ['정보 제공 목적', 'KOTA가 제공하는 축제·관광 정보는 공공데이터를 가공한 참고 자료이며, 정확성·완전성을 보증하지 않습니다.'],
        ['책임의 한계', 'KOTA는 정보의 오류, 축제 일정·장소 변경·취소, 링크된 외부 사이트의 내용으로 발생한 어떠한 손해에 대해서도 법적 책임을 지지 않습니다. 방문 전 반드시 주최 측 공식 채널로 확인하시기 바랍니다.'],
        ['저작권', '축제 이미지·명칭 등의 권리는 각 주최 측에 있으며, 출처 표시 목적으로만 사용됩니다.'],
      ],
    },
    en: {
      title: 'Disclaimer',
      sections: [
        ['Purpose', 'Festival and travel information on KOTA is reference material processed from public data; its accuracy and completeness are not guaranteed.'],
        ['Limitation of liability', 'KOTA is not legally liable for any damages arising from information errors, changes or cancellations of festivals, or the content of linked external sites. Always confirm via the organizer’s official channels before visiting.'],
        ['Copyright', 'Rights to festival images and names belong to their respective organizers and are used for attribution purposes only.'],
      ],
    },
    ja: {
      title: '免責事項',
      sections: [
        ['提供目的', 'KOTAが提供する祭り・観光情報は公共データを加工した参考資料であり、正確性・完全性を保証しません。'],
        ['責任の制限', 'KOTAは情報の誤り、祭りの日程・会場の変更・中止、リンク先サイトの内容により生じたいかなる損害についても法的責任を負いません。訪問前に必ず主催者の公式チャンネルでご確認ください。'],
        ['著作権', '祭りの画像・名称などの権利は各主催者に帰属し、出典表示の目的でのみ使用されます。'],
      ],
    },
    th: {
      title: 'ข้อจำกัดความรับผิด',
      sections: [
        ['วัตถุประสงค์', 'ข้อมูลเทศกาลและการท่องเที่ยวบน KOTA เป็นข้อมูลอ้างอิงที่ประมวลจากข้อมูลสาธารณะ ไม่รับประกันความถูกต้องและครบถ้วน'],
        ['ขอบเขตความรับผิด', 'KOTA ไม่รับผิดชอบทางกฎหมายต่อความเสียหายใดๆ ที่เกิดจากข้อมูลผิดพลาด การเปลี่ยนแปลงหรือยกเลิกเทศกาล หรือเนื้อหาของเว็บไซต์ภายนอกที่ลิงก์ไว้ กรุณายืนยันผ่านช่องทางทางการของผู้จัดก่อนเดินทางเสมอ'],
        ['ลิขสิทธิ์', 'สิทธิ์ในภาพและชื่อเทศกาลเป็นของผู้จัดแต่ละราย ใช้เพื่อการอ้างอิงแหล่งที่มาเท่านั้น'],
      ],
    },
  },
}

const EFFECTIVE: Record<Lang, string> = {
  ko: '시행일: 2026-08-06',
  en: 'Effective: 2026-08-06',
  ja: '施行日: 2026-08-06',
  th: 'มีผลบังคับใช้: 2026-08-06',
}

export default function LegalPage({ kind }: { kind: LegalKind }) {
  const { lang } = useLang()
  const doc = DOCS[kind][lang] ?? DOCS[kind].ko
  useEffect(() => {
    setPageMeta(doc.title, doc.title)
  }, [doc])
  return (
    <div className="min-h-screen bg-white text-green">
      <Header />
      <main className="max-w-3xl mx-auto px-4 pt-12 pb-24">
        <h1 className="text-[26px] font-black mb-8">{doc.title}</h1>
        {doc.sections.map(([h, body]) => (
          <section key={h} className="mb-7">
            <h2 className="text-[17px] font-bold mb-2">{h}</h2>
            <p className="text-[14px] leading-relaxed text-gray-700">{body}</p>
          </section>
        ))}
        <p className="text-[12px] text-gray-400 mt-10">{EFFECTIVE[lang] ?? EFFECTIVE.ko}</p>
      </main>
    </div>
  )
}
