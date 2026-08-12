// 축제명 번역기 — 지명 사전(places) + 어휘 사전(lexicon) + 음역기(romanize)를 조합한다.
//
// 축제명은 대부분 '연도 + 회차 + 지명 + 소재 + 행사유형'의 붙임말이다(2026 예산사과축제).
// 띄어쓰기가 없으므로 최장일치로 분절한 뒤, 사전에 있으면 뜻을, 없으면 소리를 옮긴다.
// 사전이 못 덮은 비율(coverage)을 함께 돌려주어 사람이 검수할 대상을 고를 수 있게 한다.

import { LEXICON, LEXICON_KEYS, type Term } from './lexicon.js'
import { SIGUNGU_STEMS, translateSigungu } from './places.js'
import { isHangul, transliterate } from './romanize.js'

export type Lang = 'en' | 'ja' | 'th'
export const LANGS: Lang[] = ['en', 'ja', 'th']

/** 태국어는 수식어가 뒤로 가므로 행사유형 낱말을 앞으로 보낸다 */
const EVENT_WORDS = new Set([
  '축제', '대축제', '페스티벌', '페스타', '축전', '문화제', '문화축제', '문화축전',
  '예술제', '예술축제', '공연예술제', '음악제', '관악제', '영화제', '박람회', '전시회',
  '대회', '한마당', '마켓', '야시장', '페어', '행사',
])

interface Seg {
  ko: string
  /** 사전에서 찾은 번역(없으면 음역 대상) */
  hit: Record<Lang, string> | null
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
    const matched = !lex ? place : !place ? lex : place.ko.length > lex.ko.length ? place : lex
    if (matched) {
      push()
      segs.push({ ko: matched.ko, hit: matched.hit })
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

  const out: Record<Lang, string[]> = { en: [], ja: [], th: [] }
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
      for (const l of LANGS) out[l].push(chunk)
      continue
    }
    for (const seg of segment(chunk)) {
      if (seg.hit) {
        covered += [...seg.ko].filter(isHangul).length
        for (const l of LANGS) if (seg.hit[l]) out[l].push(seg.hit[l])
      } else {
        for (const l of LANGS) out[l].push(transliterate(seg.ko, l))
      }
    }
  }

  // 태국어는 행사유형을 앞으로(เทศกาล…) — 태국어 어순은 핵심어가 앞에 온다
  const thParts = [...out.th]
  const evIdx = [...rest.matchAll(/[가-힣]+/g)].length > 0 ? findEventIndex(rest, out.th) : -1
  if (evIdx > 0) thParts.unshift(...thParts.splice(evIdx, 1))

  const join = (parts: string[], lang: Lang) => {
    const body = parts.filter(Boolean)
    if (lang === 'ja') return [year, ordinal ? `第${ordinal}回` : '', body.join('')].filter(Boolean).join(' ').trim()
    if (lang === 'th') return [ordinal ? `ครั้งที่ ${ordinal}` : '', body.join(' '), year].filter(Boolean).join(' ').trim()
    const en = body.map(cap).join(' ')
    return [year, ordinal ? `${ordinal}${ordSuffix(ordinal)}` : '', en].filter(Boolean).join(' ').trim()
  }

  let en = join(out.en, 'en')
  // 행사임이 드러나지 않으면 Festival을 붙인다 — 검색·이해 모두에 필요하다
  if (!/festival|festa|expo|market|fair|tour|show|concert|competition|week|night/i.test(en)) {
    en = `${en} Festival`.trim()
  }

  return {
    en,
    ja: join(out.ja, 'ja'),
    th: join(thParts, 'th'),
    coverage: hangulTotal === 0 ? 1 : covered / hangulTotal,
  }
}

function findEventIndex(rest: string, thOut: string[]): number {
  for (const w of EVENT_WORDS) {
    if (!rest.includes(w)) continue
    const t = LEXICON[w]?.th
    if (!t) continue
    const idx = thOut.indexOf(t)
    if (idx >= 0) return idx
  }
  return -1
}

function ordSuffix(n: string): string {
  const v = Number(n)
  if (v % 100 >= 11 && v % 100 <= 13) return 'th'
  return ['th', 'st', 'nd', 'rd'][v % 10] ?? 'th'
}
