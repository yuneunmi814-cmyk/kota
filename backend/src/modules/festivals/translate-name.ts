// 축제명 번역기 — 지명 사전(places) + 어휘 사전(lexicon) + 음역기(romanize)를 조합한다.
//
// 축제명은 대부분 '연도 + 회차 + 지명 + 소재 + 행사유형'의 붙임말이다(2026 예산사과축제).
// 띄어쓰기가 없으므로 최장일치로 분절한 뒤, 사전에 있으면 뜻을, 없으면 소리를 옮긴다.
// 사전이 못 덮은 비율(coverage)을 함께 돌려주어 사람이 검수할 대상을 고를 수 있게 한다.

import { LEXICON, LEXICON_KEYS, type Term } from './lexicon.js'
import { SIGUNGU_STEMS, translateSigungu } from './places.js'
import { isHangul, katakana, transliterate } from './romanize.js'

export type Lang = 'en' | 'ja' | 'th'
export const LANGS: Lang[] = ['en', 'ja', 'th']

/** 태국어는 수식어가 뒤로 가므로 행사유형 낱말을 앞으로 보낸다 */
const EVENT_WORDS = new Set([
  '축제', '대축제', '페스티벌', '페스타', '축전', '문화제', '문화축제', '문화축전',
  '예술제', '예술축제', '공연예술제', '음악제', '관악제', '영화제', '박람회', '전시회',
  '대회', '한마당', '마켓', '야시장', '페어', '행사',
])

/**
 * 태국어에서 뒤로 보내는 한정어 — 태국어는 '핵심어 + 수식어' 순서다.
 * 한국어 '국제코미디페스티벌'을 그대로 이어붙이면 เทศกาลนานาชาติตลก(축제-국제-코미디)가 되는데,
 * 자연스러운 태국어는 เทศกาลตลกนานาชาติ(축제-코미디-국제)다.
 */
const TH_TRAILING = new Set(['국제', '전국', '세계', '대한민국', '한국', '전통'])

interface Seg {
  ko: string
  /** 사전에서 찾은 번역(없으면 음역 대상) */
  hit: Record<Lang, string> | null
  /** 지명인가 — 태국어 어순 재배치와 일본어 독음 병기에 쓴다 */
  isPlace?: boolean
}

/** 사전(지명 + 어휘)에서 최장일치로 분절 */
function segment(text: string): Seg[] {
  const segs: Seg[] = []
  let buf = ''
  let i = 0
  const push = () => {
    if (buf) segs.push({ ko: buf, hit: null })
    buf = ''
  }
  while (i < text.length) {
    // 어휘·지명 양쪽에서 최장일치를 고른다. 길이가 같으면 어휘가 이긴다.
    // (지명을 뒤로 미루면 '부산'이 '부'+'산(Mountain)'으로 잘려 Bu Mountain이 된다)
    let lex: { ko: string; hit: Record<Lang, string> } | null = null
    for (const key of LEXICON_KEYS) {
      if (text.startsWith(key, i)) {
        const t = LEXICON[key] as Term
        lex = { ko: key, hit: { en: t.en, ja: t.ja, th: t.th } }
        break
      }
    }
    let place: { ko: string; hit: Record<Lang, string> } | null = null
    for (const stem of SIGUNGU_STEMS) {
      // 한 글자 지명(중·동·서)은 오탐이 많아 축제명 안에서는 쓰지 않는다
      if (stem.length < 2) continue
      if (text.startsWith(stem, i)) {
        const p = translateSigungu(stem)
        place = { ko: stem, hit: { en: p.en, ja: p.ja, th: p.th } }
        break
      }
    }
    const isPlace = !!place && (!lex || place.ko.length > lex.ko.length)
    const matched = !lex ? place : !place ? lex : place.ko.length > lex.ko.length ? place : lex
    if (matched) {
      push()
      segs.push({ ko: matched.ko, hit: matched.hit, isPlace })
      i += matched.ko.length
    } else {
      buf += text[i] as string
      i += 1
    }
  }
  push()
  return segs
}

/** 영문 제목에서 소문자로 두는 접속어 */
const LOWER = new Set(['and', 'of', 'in', 'the', 'for', 'with'])
const cap = (s: string) => (!s || LOWER.has(s) ? s : (s[0] as string).toUpperCase() + s.slice(1))

export interface NameTranslation {
  en: string
  ja: string
  th: string
  /** 사전이 덮은 한글 비율 0~1 — 낮을수록 사람 검수가 필요하다 */
  coverage: number
}

/**
 * 축제명 하나를 3개 언어로. 연도·회차는 보존하고, 사전에 없는 고유명사는 음역한다.
 *
 * 2026 예산사과축제 → 2026 Yesan Apple Festival · 2026 礼山りんご祭り
 */
export function translateFestivalName(name: string): NameTranslation {
  const src = name.replace(/\s+/g, ' ').trim()

  // 연도(2026·2026년)와 회차(제4회)를 떼어 앞머리로 보관
  let year = ''
  let ordinal = ''
  let rest = src
  rest = rest.replace(/(^|\s)(20\d{2})\s*년?/, (_m, _p, y) => {
    year = y
    return ' '
  })
  rest = rest.replace(/제?\s*(\d+)\s*[회차]/, (_m, n) => {
    ordinal = n
    return ' '
  })
  rest = rest.replace(/\s+/g, ' ').trim()

  interface Part { ko: string; en: string; ja: string; th: string; isPlace: boolean; isEvent: boolean; isTrailing: boolean }
  const parts: Part[] = []
  let covered = 0
  let hangulTotal = 0

  // 공백·구두점 단위로 나눈 뒤 각 덩어리를 사전으로 분절
  for (const chunk of rest.split(/([\s,·ㆍ~\-–—:/()[\]<>「」『』"']+)/)) {
    if (!chunk) continue
    if (/^[\s,·ㆍ~\-–—:/()[\]<>「」『』"']+$/.test(chunk)) continue
    const hangulCount = [...chunk].filter(isHangul).length
    hangulTotal += hangulCount
    if (hangulCount === 0) {
      // 영문·숫자(BPAM, V.7, OST)는 그대로 둔다
      parts.push({ ko: chunk, en: chunk, ja: chunk, th: chunk, isPlace: false, isEvent: false, isTrailing: false })
      continue
    }
    for (const seg of segment(chunk)) {
      if (seg.hit) {
        covered += [...seg.ko].filter(isHangul).length
        parts.push({
          ko: seg.ko,
          en: seg.hit.en,
          ja: seg.hit.ja,
          th: seg.hit.th,
          isPlace: !!seg.isPlace,
          isEvent: EVENT_WORDS.has(seg.ko),
          isTrailing: TH_TRAILING.has(seg.ko),
        })
      } else {
        parts.push({
          ko: seg.ko,
          en: transliterate(seg.ko, 'en'),
          ja: transliterate(seg.ko, 'ja'),
          th: transliterate(seg.ko, 'th'),
          isPlace: false,
          isEvent: false,
          isTrailing: false,
        })
      }
    }
  }

  const en0 = parts.map((p) => p.en).filter(Boolean).map(cap).join(' ')
  let en = [year, ordinal ? `${ordinal}${ordSuffix(ordinal)}` : '', en0].filter(Boolean).join(' ').trim()
  // 행사임이 드러나지 않으면 Festival을 붙인다 — 검색·이해 모두에 필요하다
  if (!/festival|festa|expo|market|fair|tour|show|concert|competition|week|night/i.test(en)) {
    en = `${en} Festival`.trim()
  }

  // 일본어 — 첫 지명에 가타카나 독음을 병기한다.
  // 한자만 쓰면 일본인은 일본 한자음으로 읽어(礼山→レイザン) 현지에서 통하지 않는다.
  // 관광 매체 관용대로 「礼山（イェサン）」으로 적어 읽는 법을 같이 준다.
  let rubyDone = false
  const jaBody = parts
    .map((p) => {
      if (!p.isPlace || rubyDone) return p.ja
      const kana = katakana(p.ko)
      if (!kana || kana === p.ja) return p.ja
      rubyDone = true
      return `${p.ja}（${kana}）`
    })
    .filter(Boolean)
    .join('')
  const ja = [year, ordinal ? `第${ordinal}回` : '', jaBody].filter(Boolean).join(' ').trim()

  // 태국어 — 핵심어(행사유형)를 맨 앞에 두고 수식어를 뒤에 붙인 뒤 지명을 띄어 쓴다.
  // '축제 예산 사과'가 아니라 '사과축제, 예산'이 되어야 읽힌다.
  const th = (() => {
    const events = parts.filter((p) => p.isEvent && p.th)
    const places = parts.filter((p) => p.isPlace && p.th)
    const trailing = parts.filter((p) => p.isTrailing && p.th)
    const core = parts.filter((p) => !p.isEvent && !p.isPlace && !p.isTrailing && p.th)
    // 행사유형이 없으면 원래 순서를 지킨다(조어·시적인 이름)
    const phrase = events.length
      ? [...events, ...core, ...trailing].map((p) => p.th).join('')
      : parts.map((p) => p.th).filter(Boolean).join(' ')
    const tail = places.map((p) => p.th).join(' ')
    return [ordinal ? `ครั้งที่ ${ordinal}` : '', phrase, tail, year].filter(Boolean).join(' ').trim()
  })()

  return { en, ja, th, coverage: hangulTotal === 0 ? 1 : covered / hangulTotal }
}


/**
 * 축제 요약 번역.
 *
 * 요약은 산문이 아니라 정형 조각이다 — 문체부는 '장소 일원 · 유형',
 * 표준데이터는 '프로그램+프로그램+프로그램'. 그래서 구분자로 쪼갠 뒤
 * 조각마다 사전을 태우고 못 찾은 고유명사만 음역한다.
 *
 * '통도사 일원 · 전통역사' → 'Tongdosa area · History & Tradition'
 */
export function translateSummary(text: string): NameTranslation | null {
  const src = text.replace(/\s+/g, ' ').trim()
  if (!src) return null

  const out: Record<Lang, string[]> = { en: [], ja: [], th: [] }
  let covered = 0
  let hangulTotal = 0

  for (const frag of src.split(/\s*(?:[+·ㆍ,、/()]|및)\s*/)) {
    const piece = frag.trim()
    if (!piece) continue
    const acc: Record<Lang, string[]> = { en: [], ja: [], th: [] }

    for (const chunk of piece.split(/(\s+)/)) {
      if (!chunk.trim()) continue
      const hangulCount = [...chunk].filter(isHangul).length
      hangulTotal += hangulCount
      if (hangulCount === 0) {
        for (const l of LANGS) acc[l].push(chunk)
        continue
      }
      for (const seg of segment(chunk)) {
        if (seg.hit) {
          covered += [...seg.ko].filter(isHangul).length
          for (const l of LANGS) if (seg.hit[l]) acc[l].push(seg.hit[l])
        } else {
          for (const l of LANGS) acc[l].push(transliterate(seg.ko, l))
        }
      }
    }
    // 영어는 낱말을 띄우고, 일본어는 붙이고, 태국어는 띄운다
    if (acc.en.length) out.en.push(acc.en.join(' '))
    if (acc.ja.length) out.ja.push(acc.ja.join(''))
    if (acc.th.length) out.th.push(acc.th.join(' '))
  }

  const join = (parts: string[]) => parts.filter(Boolean).join(' · ')
  return {
    en: join(out.en),
    ja: join(out.ja),
    th: join(out.th),
    coverage: hangulTotal === 0 ? 1 : covered / hangulTotal,
  }
}

function ordSuffix(n: string): string {
  const v = Number(n)
  if (v % 100 >= 11 && v % 100 <= 13) return 'th'
  return ['th', 'st', 'nd', 'rd'][v % 10] ?? 'th'
}
