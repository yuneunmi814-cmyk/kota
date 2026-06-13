// TravelPack 지역 slug → TourAPI areaCode(+ sigunguCode).
// areaCode: 서울1 인천2 대전3 대구4 광주5 부산6 울산7 세종8 경기31 강원32 충북33 충남34 경북35 경남36 전북37 전남38 제주39
// 광역 단위(제주·부산)는 areaCode만으로 충분. 시군구 단위는 sigunguCode 필요 — 값은 TourAPI areaCode2(시군구) 응답으로 확정 권장.
export interface AreaMapping {
  areaCode: number
  sigunguCode?: number
  note?: string
}

// sigunguCode는 TourAPI areaCode2 응답으로 확정함 (2026-06-13)
export const REGION_AREA: Record<string, AreaMapping> = {
  jeju: { areaCode: 39 },
  busan: { areaCode: 6 },
  gyeongju: { areaCode: 35, sigunguCode: 2 },  // 경북 경주시
  yeosu: { areaCode: 38, sigunguCode: 13 },    // 전남 여수시
  gangneung: { areaCode: 32, sigunguCode: 1 }, // 강원 강릉시
  jeonju: { areaCode: 37, sigunguCode: 12 },   // 전북 전주시
}

export function resolveArea(slug: string): AreaMapping | null {
  return REGION_AREA[slug] ?? null
}
