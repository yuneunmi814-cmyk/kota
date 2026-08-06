// 시·도 이름 다국어 — 지역탭·카드 지역 라벨용 (QA C-1: 축제명은 번역돼도 지역탭이 한국어면 외국인은 필터를 못 쓴다).
// 17개 고정 행정구역이라 정적 맵이 안전하다(축제명과 달리 데이터가 늘지 않음).
const SIDO_I18N: Record<string, { en: string; ja: string; th: string }> = {
  서울특별시: { en: 'Seoul', ja: 'ソウル', th: 'โซล' },
  부산광역시: { en: 'Busan', ja: '釜山', th: 'ปูซาน' },
  대구광역시: { en: 'Daegu', ja: '大邱', th: 'แทกู' },
  인천광역시: { en: 'Incheon', ja: '仁川', th: 'อินชอน' },
  광주광역시: { en: 'Gwangju', ja: '光州', th: 'ควังจู' },
  대전광역시: { en: 'Daejeon', ja: '大田', th: 'แทจอน' },
  울산광역시: { en: 'Ulsan', ja: '蔚山', th: 'อุลซาน' },
  세종특별자치시: { en: 'Sejong', ja: '世宗', th: 'เซจง' },
  경기도: { en: 'Gyeonggi', ja: '京畿道', th: 'คยองกี' },
  강원특별자치도: { en: 'Gangwon', ja: '江原道', th: 'คังวอน' },
  충청북도: { en: 'Chungbuk', ja: '忠清北道', th: 'ชุงชองเหนือ' },
  충청남도: { en: 'Chungnam', ja: '忠清南道', th: 'ชุงชองใต้' },
  전북특별자치도: { en: 'Jeonbuk', ja: '全北道', th: 'ชอลลาเหนือ' },
  전라남도: { en: 'Jeonnam', ja: '全羅南道', th: 'ชอลลาใต้' },
  경상북도: { en: 'Gyeongbuk', ja: '慶尚北道', th: 'คยองซังเหนือ' },
  경상남도: { en: 'Gyeongnam', ja: '慶尚南道', th: 'คยองซังใต้' },
  제주특별자치도: { en: 'Jeju', ja: '済州', th: 'เชจู' },
}

/** 시·도 이름을 현재 언어로 — 미지원 언어·미등록 이름은 원문 유지 */
export function sidoLabel(name: string, lang: string): string {
  if (lang === 'ko') return name
  const tr = SIDO_I18N[name]
  return tr?.[lang as 'en' | 'ja' | 'th'] ?? name
}
