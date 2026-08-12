// 축제 테마(여행 목적) 분류 — 2026-08-12 팀 인사이트 반영.
//
// 왜: 실제 여행 계획은 "목적 → 어떻게 → 어디로" 순서로 정해진다("여행계획의 기본은 목적!
// 누구랑 어디를 뭘 하러 가는가", 8/12 팀 논의). 그런데 우리 탐색축은 '지역'뿐이라
// 사용자가 첫 단계(목적)에서 쓸 입구가 없었다. 검색어도 "충청남도 축제"보다
// "가족이랑 갈 만한 축제"·"먹거리 축제"로 들어온다(SEO/GEO 직결).
//
// 분류 근거 2단: ① 문체부 소스의 축제 유형(summary 끝에 '· 문화예술' 형태) — 공식 분류라 신뢰
//               ② 이름 키워드 — 유형이 없는 소스(TourAPI·표준데이터·kfes)용
// 한 축제가 여러 테마에 속할 수 있다(예: 야행 = 역사 + 야경).

export const THEMES = ['food', 'nature', 'heritage', 'music', 'family', 'night'] as const
export type Theme = (typeof THEMES)[number]

/** 화면·SEO용 테마 메타 — 라벨은 검색어에 쓰이는 표현으로 */
export const THEME_META: Record<Theme, { ko: string; en: string; ja: string; th: string; emoji: string }> = {
  food: { ko: '먹거리', en: 'Food', ja: 'グルメ', th: 'อาหาร', emoji: '🍽️' },
  nature: { ko: '꽃·자연', en: 'Flowers & Nature', ja: '花・自然', th: 'ดอกไม้ธรรมชาติ', emoji: '🌸' },
  heritage: { ko: '역사·전통', en: 'Heritage', ja: '歴史・伝統', th: 'ประวัติศาสตร์', emoji: '🏯' },
  music: { ko: '음악·공연', en: 'Music & Shows', ja: '音楽・公演', th: 'ดนตรีการแสดง', emoji: '🎵' },
  family: { ko: '가족·체험', en: 'Family', ja: '家族・体験', th: 'ครอบครัว', emoji: '👨‍👩‍👧' },
  night: { ko: '야경·불빛', en: 'Night Lights', ja: '夜景・イルミ', th: 'แสงไฟยามค่ำ', emoji: '✨' },
}

// 문체부 공식 유형 → 테마
const OFFICIAL: [RegExp, Theme[]][] = [
  [/지역특산물/, ['food']],
  [/자연생태/, ['nature']],
  [/전통역사/, ['heritage']],
  [/문화예술/, ['music']],
  [/주민화합/, ['family']],
]

// 이름 키워드 → 테마 (유형 정보가 없는 소스용). 앞의 규칙이 우선하지 않고 전부 누적된다.
const KEYWORDS: [RegExp, Theme[]][] = [
  [/전어|대하|꽃게|한우|불고기|삼겹|막국수|닭갈비|김밥|라면|만두|국수|치맥|맥주|막걸리|와인|커피|디저트|베이커리|빵|떡볶이|젓갈|인삼|포도|사과|대추|곶감|딸기|감귤|수박|메론|복숭아|토마토|고추|마늘|더덕|버섯|장류|장터|미식|푸드|음식|먹거리|맛|굴|낙지|꼬막|전복|새우|광어|고등어/, ['food']],
  [/벚꽃|수국|장미|국화|튤립|연꽃|해바라기|억새|갈대|단풍|매화|철쭉|유채|코스모스|꽃|정원|가든|반딧불|갯벌|생태|숲|바다|해변|해수욕|물놀이|워터|계곡|섬|호수|강|산/, ['nature']],
  [/야행|국가유산|문화재|읍성|서원|향교|고분|왕릉|대첩|의병|충절|백제|신라|가야|조선|전통|민속|풍물|농악|한지|도자|탈춤|아리랑|문화제|역사/, ['heritage']],
  [/페스티벌|뮤직|음악|콘서트|재즈|락|록|힙합|버스킹|공연|연극|인형극|영화|비엔날레|아트|미술|무용|댄스|합창|오페라|예술제/, ['music']],
  [/어린이|아이|키즈|가족|체험|곤충|동물|반려|캠핑|놀이|과학|우주|별빛|천문/, ['family']],
  [/야행|야간|불꽃|드론|미디어아트|라이트|빛|조명|일루미|달빛|별빛|루미나리에|크리스마스|트리|해맞이|일출|해넘이/, ['night']],
]

/**
 * 축제 하나의 테마 목록. 이름 + (있으면) 문체부 유형 문자열로 판정.
 * 어디에도 안 걸리면 빈 배열 — 억지로 채우지 않는다(잘못된 분류가 없느니만 못함).
 */
export function classifyThemes(name: string, summary?: string | null): Theme[] {
  const found = new Set<Theme>()
  const text = `${name} ${summary ?? ''}`
  for (const [re, themes] of OFFICIAL) {
    if (summary && re.test(summary)) themes.forEach((t) => found.add(t))
  }
  for (const [re, themes] of KEYWORDS) {
    if (re.test(text)) themes.forEach((t) => found.add(t))
  }
  return THEMES.filter((t) => found.has(t)) // 항상 같은 순서로
}
