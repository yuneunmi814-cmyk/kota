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
    'home.title': '내 위치 기반 지역 축제',
    'home.myLocation': '내 위치',
    'home.nearMe': '가까운 순',
    'home.searchPlaceholder': '축제, 지역을 검색하세요',
    'home.searchButton': '검색',
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
    'home.title': 'Local Festivals Near You',
    'home.myLocation': 'My location',
    'home.nearMe': 'Nearest first',
    'home.searchPlaceholder': 'Search festivals & regions',
    'home.searchButton': 'Search',
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
    'home.title': 'เทศกาลท้องถิ่นใกล้ตัวคุณ',
    'home.myLocation': 'ตำแหน่งของฉัน',
    'home.nearMe': 'ใกล้สุดก่อน',
    'home.searchPlaceholder': 'ค้นหาเทศกาลหรือภูมิภาค',
    'home.searchButton': 'ค้นหา',
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
    'home.title': '現在地から探す地域の祭り',
    'home.myLocation': '現在地',
    'home.nearMe': '近い順',
    'home.searchPlaceholder': '祭り・地域を検索',
    'home.searchButton': '検索',
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
