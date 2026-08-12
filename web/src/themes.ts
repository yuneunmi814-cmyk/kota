import type { Lang } from './i18n'

// 여행 목적 테마 — 8/12 팀 인사이트: "여행계획의 기본은 목적! 누구랑 어디를 뭘 하러 가는가부터
// 시작해서, 거길 가서 뭘 할거냐로 끝난다. 그 중간과정을 계획하는 게 귀찮은 것."
// 지역(어디로) 축만 있던 탐색에 목적 축을 더한다. 백엔드 themes.ts의 분류와 1:1.
export const THEMES = ['food', 'nature', 'heritage', 'music', 'family', 'night'] as const
export type Theme = (typeof THEMES)[number]

export const THEME_META: Record<Theme, { emoji: string; label: Record<Lang, string>; desc: Record<Lang, string> }> = {
  food: {
    emoji: '🍽️',
    label: { ko: '먹거리', en: 'Food', ja: 'グルメ', th: 'อาหาร' },
    desc: {
      ko: '지역 특산물과 먹거리를 즐기는 축제',
      en: 'Festivals for local food and specialties',
      ja: '地域の特産品とグルメを楽しむ祭り',
      th: 'เทศกาลอาหารและของดีประจำถิ่น',
    },
  },
  nature: {
    emoji: '🌸',
    label: { ko: '꽃·자연', en: 'Flowers & Nature', ja: '花・自然', th: 'ดอกไม้ธรรมชาติ' },
    desc: {
      ko: '꽃·바다·숲 등 자연을 즐기는 축제',
      en: 'Festivals among flowers, sea and forests',
      ja: '花・海・森など自然を楽しむ祭り',
      th: 'เทศกาลท่ามกลางดอกไม้ ทะเล และป่า',
    },
  },
  heritage: {
    emoji: '🏯',
    label: { ko: '역사·전통', en: 'Heritage', ja: '歴史・伝統', th: 'ประวัติศาสตร์' },
    desc: {
      ko: '문화유산과 전통을 만나는 축제',
      en: 'Festivals of heritage and tradition',
      ja: '文化遺産と伝統に出会う祭り',
      th: 'เทศกาลมรดกและวัฒนธรรมดั้งเดิม',
    },
  },
  music: {
    emoji: '🎵',
    label: { ko: '음악·공연', en: 'Music & Shows', ja: '音楽・公演', th: 'ดนตรีการแสดง' },
    desc: {
      ko: '음악·공연·예술을 즐기는 축제',
      en: 'Festivals of music, shows and art',
      ja: '音楽・公演・アートを楽しむ祭り',
      th: 'เทศกาลดนตรี การแสดง และศิลปะ',
    },
  },
  family: {
    emoji: '👨‍👩‍👧',
    label: { ko: '가족·체험', en: 'Family', ja: '家族・体験', th: 'ครอบครัว' },
    desc: {
      ko: '아이와 함께 체험하기 좋은 축제',
      en: 'Festivals to enjoy with kids',
      ja: '子どもと一緒に楽しめる祭り',
      th: 'เทศกาลที่ไปกับเด็กๆ ได้',
    },
  },
  night: {
    emoji: '✨',
    label: { ko: '야경·불빛', en: 'Night Lights', ja: '夜景・イルミ', th: 'แสงไฟยามค่ำ' },
    desc: {
      ko: '밤에 빛나는 야경·불빛 축제',
      en: 'Festivals that shine after dark',
      ja: '夜に輝く夜景・イルミネーションの祭り',
      th: 'เทศกาลที่ส่องสว่างยามค่ำคืน',
    },
  },
}

export const isTheme = (v: string | null): v is Theme => !!v && (THEMES as readonly string[]).includes(v)
export const themeLabel = (t: Theme, lang: Lang) => THEME_META[t].label[lang] ?? THEME_META[t].label.ko
export const themeDesc = (t: Theme, lang: Lang) => THEME_META[t].desc[lang] ?? THEME_META[t].desc.ko
