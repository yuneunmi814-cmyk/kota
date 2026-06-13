// TravelPack 지역 slug → TourAPI areaCode(+ sigunguCode).
// areaCode: 서울1 인천2 대전3 대구4 광주5 부산6 울산7 세종8 경기31 강원32 충북33 충남34 경북35 경남36 전북37 전남38 제주39
// 광역 단위(제주·부산)는 areaCode만으로 충분. 시군구 단위는 sigunguCode 필요 — 값은 TourAPI areaCode2(시군구) 응답으로 확정 권장.
export interface AreaMapping {
  areaCode: number      // TourAPI(KorService) areaCode
  sigunguCode?: number
  lDongRegnCd: string   // 법정동 시도 코드 — EngService2(영문)·DataLab(방문자수) 공용
  sidoKey: string       // 시도명 부분일치 키 — 방문자수 areaNm 매칭
  note?: string
}

// sigunguCode는 TourAPI areaCode2, lDongRegnCd는 법정동 시도코드 (2026-06-13 확정)
export const REGION_AREA: Record<string, AreaMapping> = {
  jeju: { areaCode: 39, lDongRegnCd: '50', sidoKey: '제주' },
  busan: { areaCode: 6, lDongRegnCd: '26', sidoKey: '부산' },
  gyeongju: { areaCode: 35, sigunguCode: 2, lDongRegnCd: '47', sidoKey: '경상북' },  // 경북 경주시
  yeosu: { areaCode: 38, sigunguCode: 13, lDongRegnCd: '46', sidoKey: '전라남' },    // 전남 여수시
  gangneung: { areaCode: 32, sigunguCode: 1, lDongRegnCd: '51', sidoKey: '강원' },   // 강원 강릉시
  jeonju: { areaCode: 37, sigunguCode: 12, lDongRegnCd: '52', sidoKey: '전북' },   // 전북특별자치도 전주시 (areaNm "전북특별자치도")
}

export function resolveArea(slug: string): AreaMapping | null {
  return REGION_AREA[slug] ?? null
}
