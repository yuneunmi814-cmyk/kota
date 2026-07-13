// KOTA 지역 slug → TourAPI areaCode(+ sigunguCode).
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
  // 전국 확대(2026-06-15) — 광역시는 areaCode만, 도-시는 sigunguCode(areaCode2 확정)
  seoul: { areaCode: 1, lDongRegnCd: '11', sidoKey: '서울' },
  incheon: { areaCode: 2, lDongRegnCd: '28', sidoKey: '인천' },
  daegu: { areaCode: 4, lDongRegnCd: '27', sidoKey: '대구' },
  daejeon: { areaCode: 3, lDongRegnCd: '30', sidoKey: '대전' },
  gwangju: { areaCode: 5, lDongRegnCd: '29', sidoKey: '광주' },
  ulsan: { areaCode: 7, lDongRegnCd: '31', sidoKey: '울산' },
  sejong: { areaCode: 8, lDongRegnCd: '36', sidoKey: '세종' },
  suwon: { areaCode: 31, sigunguCode: 13, lDongRegnCd: '41', sidoKey: '경기' },     // 경기 수원시
  chuncheon: { areaCode: 32, sigunguCode: 13, lDongRegnCd: '51', sidoKey: '강원' }, // 강원 춘천시
  cheongju: { areaCode: 33, sigunguCode: 10, lDongRegnCd: '43', sidoKey: '충청북' },// 충북 청주시
  tongyeong: { areaCode: 36, sigunguCode: 17, lDongRegnCd: '48', sidoKey: '경상남' },// 경남 통영시
  andong: { areaCode: 35, sigunguCode: 11, lDongRegnCd: '47', sidoKey: '경상북' },  // 경북 안동시
  suncheon: { areaCode: 38, sigunguCode: 11, lDongRegnCd: '46', sidoKey: '전라남' },// 전남 순천시
  gunsan: { areaCode: 37, sigunguCode: 2, lDongRegnCd: '52', sidoKey: '전북' },     // 전북 군산시
  pohang: { areaCode: 35, sigunguCode: 23, lDongRegnCd: '47', sidoKey: '경상북' },  // 경북 포항시
  gongju: { areaCode: 34, sigunguCode: 1, lDongRegnCd: '44', sidoKey: '충청남' },   // 충남 공주시
}

export function resolveArea(slug: string): AreaMapping | null {
  return REGION_AREA[slug] ?? null
}
