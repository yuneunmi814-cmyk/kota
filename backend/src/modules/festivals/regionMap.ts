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

/** 정식 시·도 17개 — 화면 필터·분류의 기준값 */
export const SIDO_CANONICAL = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시',
  '세종특별자치시', '경기도', '강원특별자치도', '충청북도', '충청남도',
  '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도',
] as const

// 소스마다 표기가 달라(축약형·구 명칭·통합 명칭) 정식 명칭으로 통일한다.
// 특히 TourAPI는 '전남광주통합특별시'를 쓰지만 표준데이터는 '전라남도'/'광주광역시'를 써서
// 정규화하지 않으면 같은 지역이 화면에서 3갈래로 쪼개진다(2026-08 실측: 통합 15건 별도 집계).
const SIDO_ALIAS: Record<string, string> = {
  서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시',
  광주: '광주광역시', 대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시',
  경기: '경기도', 강원: '강원특별자치도', 강원도: '강원특별자치도',
  충북: '충청북도', 충남: '충청남도', 전북: '전북특별자치도', 전라북도: '전북특별자치도',
  전남: '전라남도', 경북: '경상북도', 경남: '경상남도', 제주: '제주특별자치도', 제주도: '제주특별자치도',
}

// 옛 광주광역시 5개 구 — '전남광주통합특별시' 주소를 광주/전남으로 되돌릴 때 사용
const GWANGJU_GU = new Set(['동구', '서구', '남구', '북구', '광산구'])

/** '전남광주통합특별시'처럼 통합·축약 표기를 정식 시·도명으로 되돌린다 */
function canonicalizeSido(raw: string, sigungu: string | null): string {
  if ((SIDO_CANONICAL as readonly string[]).includes(raw)) return raw
  if (raw.includes('전남광주통합')) {
    // 구(區)면 옛 광주, 시·군이면 전남 (여수시·순천시 등)
    return sigungu && GWANGJU_GU.has(sigungu) ? '광주광역시' : '전라남도'
  }
  return SIDO_ALIAS[raw] ?? raw
}

// "충청북도 청주시 상당구 …" → { sido:'충청북도', sigungu:'청주시' }
// "강원 춘천시 온의동 …"     → { sido:'강원특별자치도', sigungu:'춘천시' }  (축약형 보정)
// "세종특별자치시 조치원읍 …" → { sido:'세종특별자치시', sigungu:null }
export function parseSidoSigungu(address: string | null | undefined): { sido: string | null; sigungu: string | null } {
  if (!address) return { sido: null, sigungu: null }
  const tokens = address.trim().split(/\s+/)
  const head = tokens[0]
  const sigungu = tokens[1] && SIGUNGU_SUFFIX.test(tokens[1]) ? tokens[1] : null
  if (!head) return { sido: null, sigungu }
  // 정식 접미사가 있거나(충청북도), 별칭에 있으면(강원) 시·도로 인정
  const isSido = SIDO_SUFFIX.test(head) || head in SIDO_ALIAS
  return { sido: isSido ? canonicalizeSido(head, sigungu) : null, sigungu }
}

// 큐레이션 지역 slug 결정 — 광역시/제주는 시·도로, 도 소속 시는 시·군으로. 미매칭이면 null(전국에서만 노출)
export function curatedSlugFor(sido: string | null, sigungu: string | null): string | null {
  if (sido) {
    for (const [key, slug] of Object.entries(SIDO_SLUG)) if (sido.includes(key)) return slug
  }
  if (sigungu && SIGUNGU_SLUG[sigungu]) return SIGUNGU_SLUG[sigungu]
  return null
}

// 소스 간 중복 제거용 이름 정규화 — 표시 이름은 그대로 두고 "판정 키"만 만든다.
// 연도 접두를 지우는 이유: 표준데이터는 "2026 고양호수예술축제", TourAPI는 "고양호수예술축제"로
// 같은 축제를 다르게 표기해 중복 제거가 새어나갔다(2026-08 실측). 시작일이 같을 때만 비교하므로
// 연도를 지워도 서로 다른 축제가 같다고 판정될 위험은 낮다.
export function normalizeFestivalName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, '') // 괄호 내용
    .replace(/제\s*\d+\s*회/g, '') // 제30회 등 회차
    .replace(/\b(19|20)\d{2}\s*(년도?)?/g, '') // 2026 / 2026년 등 연도 표기
    .replace(/[^0-9A-Za-z가-힣]/g, '') // 공백·특수문자
    .toLowerCase()
}
