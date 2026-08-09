import type { Lang } from './i18n'

// 권역 7개 — QA A-3(2026-08-06): 시·도 17개 가로 스크롤을 권역 7개 + 2단 구조로 축소.
// 1단 = 전국 + 6권역(한 줄에 들어가 모바일도 스크롤 불필요), 2단 = 선택 권역의 하위 시·도.
export type RegionGroup = {
  key: string
  label: Record<Lang, string>
  sidos: string[] // 이 권역에 속하는 정식 시·도명 (festivals.sido 값과 일치)
}

export const REGION_GROUPS: RegionGroup[] = [
  { key: 'capital', label: { ko: '수도권', en: 'Seoul·Gyeonggi', ja: '首都圏', th: 'เขตเมืองหลวง' }, sidos: ['서울특별시', '경기도', '인천광역시'] },
  { key: 'gangwon', label: { ko: '강원', en: 'Gangwon', ja: '江原', th: 'คังวอน' }, sidos: ['강원특별자치도'] },
  { key: 'chungcheong', label: { ko: '충청', en: 'Chungcheong', ja: '忠清', th: 'ชุงชอง' }, sidos: ['충청남도', '충청북도', '대전광역시', '세종특별자치시'] },
  { key: 'jeolla', label: { ko: '전라', en: 'Jeolla', ja: '全羅', th: 'ชอลลา' }, sidos: ['전북특별자치도', '전라남도', '광주광역시'] },
  { key: 'gyeongsang', label: { ko: '경상', en: 'Gyeongsang', ja: '慶尚', th: 'คยองซัง' }, sidos: ['경상북도', '경상남도', '부산광역시', '대구광역시', '울산광역시'] },
  { key: 'jeju', label: { ko: '제주', en: 'Jeju', ja: '済州', th: 'เชจู' }, sidos: ['제주특별자치도'] },
]

export function groupLabel(g: RegionGroup, lang: Lang): string {
  return g.label[lang] ?? g.label.ko
}

/** 시·도명이 속한 권역 찾기 (URL의 ?sido= 로 들어왔을 때 어느 권역을 펼칠지 판단) */
export function groupOfSido(sido: string | null): RegionGroup | null {
  if (!sido) return null
  return REGION_GROUPS.find((g) => g.sidos.includes(sido)) ?? null
}
