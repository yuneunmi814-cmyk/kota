import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// 다국어 UI (회의록 7/1 액션: 태·일 번역이 소셜 로그인보다 먼저) — 타겟: 태국 1순위·일본
export type Lang = 'ko' | 'en' | 'th' | 'ja'

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'th', label: 'ไทย' },
  { code: 'ja', label: '日本語' },
]

const MESSAGES = {
  ko: {
    'home.festivals': '다가오는 축제',
    'festival.ongoing': '진행중',
    'festival.upcoming': '예정',
    'nav.festivals': '축제',
    'nav.food': '찐맛집',
    'nav.spots': '관광지',
    'nav.packs': '여행팩',
    'home.title': '어디로 가시나요?',
    'home.searchPlaceholder': '여행지, 축제, 맛집을 검색하세요',
    'home.searchButton': '검색',
    'home.bannerTitle': '시간이 멈춘 듯한\n당신만의 여행을 찾으세요',
    'home.bannerBody': '민화 속 풍경처럼 고요하고 아름다운 지역축제를 만나보세요.',
    'home.bannerCta': '여행팩 보기',
    'home.regions': '지역',
    'region.all': '전국',
    'search.title': '검색 결과',
    'search.courses': '여행팩·코스',
    'search.spots': '관광지·맛집',
    'search.regions': '지역',
    'search.empty': '검색 결과가 없습니다. 다른 검색어를 시도해 보세요.',
    'search.error': '검색 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
    'search.loading': '검색 중…',
  },
  en: {
    'home.festivals': 'Upcoming festivals',
    'festival.ongoing': 'Now on',
    'festival.upcoming': 'Upcoming',
    'nav.festivals': 'Festivals',
    'nav.food': 'Local Eats',
    'nav.spots': 'Attractions',
    'nav.packs': 'Travel Packs',
    'home.title': 'Where are you going?',
    'home.searchPlaceholder': 'Search festivals, food & places',
    'home.searchButton': 'Search',
    'home.bannerTitle': 'Find a journey\nwhere time stands still',
    'home.bannerBody': 'Discover serene local festivals, as beautiful as a Korean folk painting.',
    'home.bannerCta': 'Browse packs',
    'home.regions': 'Regions',
    'region.all': 'All Korea',
    'search.title': 'Search results',
    'search.courses': 'Travel packs & courses',
    'search.spots': 'Attractions & eats',
    'search.regions': 'Regions',
    'search.empty': 'No results. Try a different keyword.',
    'search.error': 'Something went wrong. Please try again.',
    'search.loading': 'Searching…',
  },
  th: {
    'home.festivals': 'เทศกาลที่กำลังจะมาถึง',
    'festival.ongoing': 'กำลังจัด',
    'festival.upcoming': 'เร็วๆ นี้',
    'nav.festivals': 'เทศกาล',
    'nav.food': 'ร้านเด็ด',
    'nav.spots': 'ที่เที่ยว',
    'nav.packs': 'แพ็กเกจเที่ยว',
    'home.title': 'จะไปเที่ยวที่ไหนดี?',
    'home.searchPlaceholder': 'ค้นหาเทศกาล ร้านอาหาร สถานที่เที่ยว',
    'home.searchButton': 'ค้นหา',
    'home.bannerTitle': 'พบการเดินทางของคุณ\nที่เวลาเหมือนหยุดนิ่ง',
    'home.bannerBody': 'สัมผัสเทศกาลท้องถิ่นเกาหลีที่งดงามราวภาพวาดพื้นบ้าน',
    'home.bannerCta': 'ดูแพ็กเกจ',
    'home.regions': 'ภูมิภาค',
    'region.all': 'ทั่วเกาหลี',
    'search.title': 'ผลการค้นหา',
    'search.courses': 'แพ็กเกจ & คอร์สเที่ยว',
    'search.spots': 'ที่เที่ยว & ร้านอาหาร',
    'search.regions': 'ภูมิภาค',
    'search.empty': 'ไม่พบผลลัพธ์ ลองคำอื่นดูนะ',
    'search.error': 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
    'search.loading': 'กำลังค้นหา…',
  },
  ja: {
    'home.festivals': 'まもなく開催の祭り',
    'festival.ongoing': '開催中',
    'festival.upcoming': '開催予定',
    'nav.festivals': '祭り',
    'nav.food': '本場グルメ',
    'nav.spots': '観光地',
    'nav.packs': '旅行パック',
    'home.title': 'どこへ行きますか？',
    'home.searchPlaceholder': '祭り・グルメ・観光地を検索',
    'home.searchButton': '検索',
    'home.bannerTitle': '時が止まったような\nあなただけの旅を',
    'home.bannerBody': '民画の風景のように静かで美しい地域の祭りに出会えます。',
    'home.bannerCta': 'パックを見る',
    'home.regions': '地域',
    'region.all': '全国',
    'search.title': '検索結果',
    'search.courses': '旅行パック・コース',
    'search.spots': '観光地・グルメ',
    'search.regions': '地域',
    'search.empty': '結果がありません。別のキーワードをお試しください。',
    'search.error': 'エラーが発生しました。しばらくしてからもう一度お試しください。',
    'search.loading': '検索中…',
  },
} as const satisfies Record<Lang, Record<string, string>>

type MsgKey = keyof (typeof MESSAGES)['ko']

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'ko', setLang: () => {} })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('kota.lang')
    return saved === 'en' || saved === 'th' || saved === 'ja' || saved === 'ko' ? saved : 'ko'
  })
  useEffect(() => {
    localStorage.setItem('kota.lang', lang)
    document.documentElement.lang = lang
  }, [lang])
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

export function useT() {
  const { lang } = useContext(LangContext)
  return (key: MsgKey) => MESSAGES[lang][key] ?? MESSAGES.ko[key]
}
