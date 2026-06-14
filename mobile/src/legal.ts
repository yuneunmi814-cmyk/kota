// 사업자 신원정보 + 약관/정책 (전자상거래법 §10 표시 의무, 위치정보법, 통신판매중개자 고지).
// 값은 EXPO_PUBLIC_BIZ_* 환경변수로 주입(개인정보 — 공개 레포에 하드코딩하지 않음).
// 실제 값은 gitignore된 mobile/.env 에 설정. 미설정 시 "(미설정)"으로 표시.

const env = (k: string, fallback = '') => (process.env[k] as string | undefined)?.trim() || fallback

export const BUSINESS = {
  name: env('EXPO_PUBLIC_BIZ_NAME', '프로젝트윤'),
  ceo: env('EXPO_PUBLIC_BIZ_CEO'),
  regNo: env('EXPO_PUBLIC_BIZ_REG_NO'), // 사업자등록번호
  address: env('EXPO_PUBLIC_BIZ_ADDRESS'),
  tel: env('EXPO_PUBLIC_BIZ_TEL'),
  email: env('EXPO_PUBLIC_BIZ_EMAIL'),
  mailOrderNo: env('EXPO_PUBLIC_BIZ_MAILORDER_NO'), // 통신판매업 신고번호(간이과세자 면제 시 비움)
  lbsReportNo: env('EXPO_PUBLIC_BIZ_LBS_NO'), // 위치기반서비스사업 신고번호
}

// 통신판매중개자 고지 (전자상거래법 §20)
export const BROKER_NOTICE =
  '「TravelPack」은 크리에이터가 등록한 유료 여행팩 거래에 대하여 통신판매중개자이며, 통신판매의 당사자가 아닙니다. 개별 거래의 정보·책임은 판매자(크리에이터)에게 있습니다. (회사가 직접 제공하는 코스는 회사가 당사자입니다.)'

// 약관/정책 외부 링크 (호스팅 후 EXPO_PUBLIC_LEGAL_BASE_URL 설정 시 활성)
const LEGAL_BASE = env('EXPO_PUBLIC_LEGAL_BASE_URL')
export const POLICIES: { key: string; title: string; url: string | null }[] = [
  { key: 'terms', title: '이용약관', url: LEGAL_BASE ? `${LEGAL_BASE}/terms` : null },
  { key: 'privacy', title: '개인정보처리방침', url: LEGAL_BASE ? `${LEGAL_BASE}/privacy` : null },
  { key: 'location', title: '위치기반서비스 이용약관', url: LEGAL_BASE ? `${LEGAL_BASE}/location` : null },
  { key: 'refund', title: '청약철회 및 환불정책', url: LEGAL_BASE ? `${LEGAL_BASE}/refund` : null },
]
