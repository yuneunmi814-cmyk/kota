// 축제 행정구역 매핑 — 주소 문자열에서 시·도/시·군·구를 뽑고, 큐레이션 23개 지역(배너 필터)과 매칭.
// 소스(TourAPI/표준데이터)가 서로 다른 주소 표기를 써도 주소 토큰 파싱으로 일관 처리.

// TourAPI 전국 동기화용 시·도 법정동 코드 16개 (광주+전남은 통합 12).
// 개별 축제의 시·도/시·군·구는 코드가 아니라 각 축제의 addr1을 파싱해 얻는다(통합 지역도 주소로 정확히 분해됨).
export const SIDO_REGN_CDS: string[] = [
  '11', // 서울
  '26', // 부산
  '27', // 대구
  '28', // 인천
  '30', // 대전
  '31', // 울산
  '36110', // 세종
  '41', // 경기
  '43', // 충북
  '44', // 충남
  '47', // 경북
  '48', // 경남
  '50', // 제주
  '51', // 강원
  '52', // 전북
  '12', // 전남·광주 통합
]

// 광역시·특별시·특별자치 → 큐레이션 slug (시·도 자체가 지역)
const SIDO_SLUG: Record<string, string> = {
  서울: 'seoul',
  부산: 'busan',
  대구: 'daegu',
  인천: 'incheon',
  대전: 'daejeon',
  광주: 'gwangju',
  울산: 'ulsan',
  세종: 'sejong',
  제주: 'jeju',
}

// 도 소속 큐레이션 시·군 → slug (시·군·구 단위 매칭)
const SIGUNGU_SLUG: Record<string, string> = {
  경주시: 'gyeongju',
  여수시: 'yeosu',
  강릉시: 'gangneung',
  전주시: 'jeonju',
  수원시: 'suwon',
  춘천시: 'chuncheon',
  청주시: 'cheongju',
  통영시: 'tongyeong',
  안동시: 'andong',
  순천시: 'suncheon',
  군산시: 'gunsan',
  포항시: 'pohang',
  공주시: 'gongju',
  속초시: 'sokcho',
}

const SIDO_SUFFIX = /(특별자치시|특별자치도|특별시|광역시|도)$/
const SIGUNGU_SUFFIX = /(시|군|구)$/

// "충청북도 청주시 상당구 …" → { sido:'충청북도', sigungu:'청주시' }
// "세종특별자치시 조치원읍 …" → { sido:'세종특별자치시', sigungu:null }
export function parseSidoSigungu(address: string | null | undefined): { sido: string | null; sigungu: string | null } {
  if (!address) return { sido: null, sigungu: null }
  const tokens = address.trim().split(/\s+/)
  const sido = tokens[0] && SIDO_SUFFIX.test(tokens[0]) ? tokens[0] : null
  const sigungu = tokens[1] && SIGUNGU_SUFFIX.test(tokens[1]) ? tokens[1] : null
  return { sido, sigungu }
}

// 큐레이션 지역 slug 결정 — 광역시/제주는 시·도로, 도 소속 시는 시·군으로. 미매칭이면 null(전국에서만 노출)
export function curatedSlugFor(sido: string | null, sigungu: string | null): string | null {
  if (sido) {
    for (const [key, slug] of Object.entries(SIDO_SLUG)) if (sido.includes(key)) return slug
  }
  if (sigungu && SIGUNGU_SLUG[sigungu]) return SIGUNGU_SLUG[sigungu]
  return null
}

// 소스 간 중복 제거용 이름 정규화 — 공백·괄호내용·"제N회"·특수문자 제거
export function normalizeFestivalName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, '') // 괄호 내용
    .replace(/제\s*\d+\s*회/g, '') // 제30회 등 회차
    .replace(/[^0-9A-Za-z가-힣]/g, '') // 공백·특수문자
    .toLowerCase()
}
