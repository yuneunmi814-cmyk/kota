// 한글 음역기 — 로마자(국어의 로마자 표기법) · 가타카나 · 태국문자.
//
// 왜 필요한가: 축제는 매주 새로 유입되는데(5개 소스 주간 자동수집) 사람이 매번 번역할 수 없다.
// 사전에 없는 고유명사(삽교호·갓바위·흥해)가 나와도 외국인이 "읽고 현지에서 물어볼 수 있는"
// 표기를 만들어 주는 것이 이 모듈의 목적이다. 뜻을 옮기는 건 lexicon.ts, 소리를 옮기는 건 여기.
//
// 한계: 태국어 표기는 관용 표기(서울=โซล)가 아닌 음역이다. 유명 지명은 places.ts가 우선한다.

const BASE = 0xac00
const CHO_N = 19
const JUNG_N = 21
const JONG_N = 28

export interface Jamo { cho: number; jung: number; jong: number }

/** 한글 음절 1자를 초/중/종성 인덱스로 분해. 음절이 아니면 null */
export function decompose(ch: string): Jamo | null {
  const code = ch.codePointAt(0)
  if (code == null) return null
  const i = code - BASE
  if (i < 0 || i >= CHO_N * JUNG_N * JONG_N) return null
  return { cho: Math.floor(i / (JUNG_N * JONG_N)), jung: Math.floor(i / JONG_N) % JUNG_N, jong: i % JONG_N }
}

export const isHangul = (ch: string) => decompose(ch) !== null

// ── 로마자 ─────────────────────────────────────────────
// 국어의 로마자 표기법(문화체육관광부 고시) 기준 표
const R_CHO = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h']
const R_JUNG = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i']
const R_JONG = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't']
// 받침이 다음 음절 첫소리로 넘어갈 때(연음)의 소리 — 겹받침은 뒷자음이 넘어간다
const R_JONG_LINK = ['', 'g', 'kk', 'ks', 'n', 'nj', 'nh', 'd', 'r', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'rh', 'm', 'b', 'ps', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h']

/**
 * 한글 문자열을 로마자로. 자음동화(백마→Baengma), 유음화(신라→Silla), 연음을 반영한다.
 * @param capitalize 첫 글자를 대문자로 (고유명사용, 기본 true)
 */
export function romanize(text: string, capitalize = true): string {
  const chars = [...text]
  let out = ''
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i] as string
    const cur = decompose(ch)
    if (!cur) {
      out += ch
      continue
    }
    const prev = i > 0 ? decompose(chars[i - 1] as string) : null
    const next = i + 1 < chars.length ? decompose(chars[i + 1] as string) : null
    // 앞 음절 받침이 이 음절로 연음되는 경우 첫소리를 그 받침 소리로 대체
    let cho = R_CHO[cur.cho] as string
    if (cur.cho === 11 && prev && prev.jong !== 0 && prev.jong !== 21) {
      const link = R_JONG_LINK[prev.jong] as string
      cho = link.length > 1 && prev.jong >= 9 && prev.jong <= 15 ? link.slice(1) : link
      if (cho === 'h') cho = ''
    }
    if (cur.cho === 5 && prev) {
      // ㄹ 비음화 — 받침 ㅇ·ㅁ·ㄱ·ㅂ 뒤의 ㄹ은 [ㄴ] (강릉 Gangneung, 종로 Jongno)
      if ([21, 16, 1, 2, 3, 24, 17, 26].includes(prev.jong)) cho = 'n'
      // 유음화 — 받침 ㄴ·ㄹ 뒤의 ㄹ은 [ㄹ] (신라 Silla, 대관령 Daegwallyeong)
      else if (prev.jong === 4 || prev.jong === 8) cho = 'l'
    }
    out += cho + (R_JUNG[cur.jung] as string)
    if (cur.jong === 0) continue
    if (next && next.cho === 11) {
      if (cur.jong === 21) out += 'ng'
      else if (cur.jong >= 9 && cur.jong <= 15) out += R_JONG[cur.jong] as string // 겹받침은 앞자음만 남는다
      continue
    }
    let jong = R_JONG[cur.jong] as string
    if (next) {
      const nc = next.cho
      // ㄹ 앞에서도 같은 비음화가 일어난다 (백로 Baengno)
      if (nc === 2 || nc === 6 || nc === 5) {
        if (jong === 'k') jong = 'ng'
        else if (jong === 't' && nc !== 5) jong = 'n'
        else if (jong === 'p') jong = 'm'
      }
      if ((jong === 'n' && nc === 5) || (jong === 'l' && nc === 2)) jong = 'l'
    }
    out += jong
  }
  if (!capitalize || out.length === 0) return out
  return (out[0] as string).toUpperCase() + out.slice(1)
}

// ── 가타카나 ─────────────────────────────────────────────
// 자음 행(ア/カ/サ…) × 모음 열 조합으로 만든다. 한국어 초성은 어두 무성음으로 들리므로
// ㄱ→カ행, ㄷ→タ행, ㅂ→パ행, ㅈ→チャ행을 쓴다(일본 관광 매체 관용 표기).
const K_ROW: Record<number, [string, string, string, string, string]> = {
  0: ['カ', 'キ', 'ク', 'ケ', 'コ'], // ㄱ
  1: ['カ', 'キ', 'ク', 'ケ', 'コ'], // ㄲ
  2: ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'], // ㄴ
  3: ['タ', 'ティ', 'トゥ', 'テ', 'ト'], // ㄷ
  4: ['タ', 'ティ', 'トゥ', 'テ', 'ト'], // ㄸ
  5: ['ラ', 'リ', 'ル', 'レ', 'ロ'], // ㄹ
  6: ['マ', 'ミ', 'ム', 'メ', 'モ'], // ㅁ
  7: ['パ', 'ピ', 'プ', 'ペ', 'ポ'], // ㅂ
  8: ['パ', 'ピ', 'プ', 'ペ', 'ポ'], // ㅃ
  9: ['サ', 'シ', 'ス', 'セ', 'ソ'], // ㅅ
  10: ['サ', 'シ', 'ス', 'セ', 'ソ'], // ㅆ
  11: ['ア', 'イ', 'ウ', 'エ', 'オ'], // ㅇ
  12: ['チャ', 'チ', 'チュ', 'チェ', 'チョ'], // ㅈ
  13: ['チャ', 'チ', 'チュ', 'チェ', 'チョ'], // ㅉ
  14: ['チャ', 'チ', 'チュ', 'チェ', 'チョ'], // ㅊ
  15: ['カ', 'キ', 'ク', 'ケ', 'コ'], // ㅋ
  16: ['タ', 'ティ', 'トゥ', 'テ', 'ト'], // ㅌ
  17: ['パ', 'ピ', 'プ', 'ペ', 'ポ'], // ㅍ
  18: ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'], // ㅎ
}
// 모음 → [행 인덱스(a/i/u/e/o), 덧붙일 작은 가나]
// y계열은 'i'단 + 작은 ャュョ, w계열은 'u'단 + 작은 ァォェィ로 만든다(광→クァン, 경→キョン)
const K_VOWEL: Array<[number, string]> = [
  [0, ''], // ㅏ
  [3, ''], // ㅐ
  [1, 'ャ'], // ㅑ
  [1, 'ェ'], // ㅒ
  [4, ''], // ㅓ
  [3, ''], // ㅔ
  [1, 'ョ'], // ㅕ
  [1, 'ェ'], // ㅖ
  [4, ''], // ㅗ
  [2, 'ァ'], // ㅘ
  [2, 'ェ'], // ㅙ
  [2, 'ェ'], // ㅚ
  [1, 'ョ'], // ㅛ
  [2, ''], // ㅜ
  [2, 'ォ'], // ㅝ
  [2, 'ェ'], // ㅞ
  [2, 'ィ'], // ㅟ
  [1, 'ュ'], // ㅠ
  [2, ''], // ㅡ
  [1, ''], // ㅢ
  [1, ''], // ㅣ
]
// ㅇ 초성은 작은 가나 대신 ヤ/ユ/ヨ/ワ 등 독립 가나를 쓴다
const K_ZERO: Record<number, string> = {
  2: 'ヤ', 3: 'イェ', 6: 'ヨ', 7: 'イェ', 9: 'ワ', 10: 'ウェ', 11: 'ウェ',
  12: 'ヨ', 14: 'ウォ', 15: 'ウェ', 16: 'ウィ', 17: 'ユ', 19: 'ウィ',
}
const K_JONG = ['', 'ク', 'ク', 'ク', 'ン', 'ン', 'ン', 'ッ', 'ル', 'ク', 'ム', 'ル', 'ル', 'ル', 'プ', 'ル', 'ム', 'プ', 'プ', 'ッ', 'ッ', 'ン', 'ッ', 'ッ', 'ク', 'ッ', 'プ', 'ッ']

// 어중 유성음화 — 한국어 평음 ㄱㄷㅂㅈ은 어두에서 무성, 유성음 사이에서 유성으로 소리난다.
// 부산은 プサン이지만 제주는 チェジュ, 안동은 アンドン이다. 이 구분이 없으면 일본인이 읽어도
// 현지 발음과 어긋나 길을 물을 수 없다.
const K_ROW_VOICED: Record<number, [string, string, string, string, string]> = {
  0: ['ガ', 'ギ', 'グ', 'ゲ', 'ゴ'], // ㄱ
  3: ['ダ', 'ディ', 'ドゥ', 'デ', 'ド'], // ㄷ
  7: ['バ', 'ビ', 'ブ', 'ベ', 'ボ'], // ㅂ
  12: ['ジャ', 'ジ', 'ジュ', 'ジェ', 'ジョ'], // ㅈ
}
/** 유성 환경을 만드는 받침 — 없음 · ㄴ · ㄹ · ㅁ · ㅇ */
const VOICING_JONG = new Set([0, 4, 8, 16, 21])

/** 한글 문자열을 가타카나로 음역 */
export function katakana(text: string): string {
  const chars = [...text]
  let out = ''
  for (let i = 0; i < chars.length; i += 1) {
    const j = decompose(chars[i] as string)
    if (!j) {
      out += chars[i]
      continue
    }
    const prev = i > 0 ? decompose(chars[i - 1] as string) : null
    const voiced = !!prev && VOICING_JONG.has(prev.jong)

    if (j.cho === 11 && K_ZERO[j.jung]) out += K_ZERO[j.jung]
    else {
      const [col, small] = K_VOWEL[j.jung] as [number, string]
      let row = K_ROW[j.cho] as string[]
      // ㄹ 비음화 — 받침 ㅇ·ㅁ 뒤의 ㄹ은 [ㄴ]으로 소리난다 (강릉 カンヌン)
      if (j.cho === 5 && prev && (prev.jong === 21 || prev.jong === 16)) row = K_ROW[2] as string[]
      else if (voiced && K_ROW_VOICED[j.cho]) row = K_ROW_VOICED[j.cho] as string[]
      out += row[col] + small
    }
    out += K_JONG[j.jong]
  }
  return out
}

// ── 태국문자 ─────────────────────────────────────────────
// 태국어 매체의 한국 지명 표기 관용(부산 ปูซาน · 강원 คังวอน · 인천 อินชอน)에 맞춘 음역.
const T_CHO = ['ค', 'ก', 'น', 'ท', 'ต', 'ร', 'ม', 'ป', 'ป', 'ซ', 'ซ', 'อ', 'ช', 'จ', 'ช', 'ค', 'ท', 'พ', 'ฮ']
// 모음 → [앞에 붙는 것, 받침 없을 때 뒤, 받침 있을 때 뒤]
const T_JUNG: Array<[string, string, string]> = [
  ['', 'า', 'ั'], // ㅏ
  ['แ', '', 'ั'], // ㅐ
  ['', 'ยา', 'ยั'], // ㅑ
  ['', 'แย', 'ยั'], // ㅒ
  ['', 'อ', '็อ'], // ㅓ
  ['เ', '', '็'], // ㅔ
  ['', 'ยอ', 'ย็อ'], // ㅕ
  ['เ', 'ย', 'ย็'], // ㅖ
  ['โ', '', ''], // ㅗ
  ['', 'วา', 'วั'], // ㅘ
  ['', 'แว', 'วั'], // ㅙ
  ['', 'เว', 'เว'], // ㅚ
  ['', 'โย', 'ยง'], // ㅛ
  ['', 'ู', 'ุ'], // ㅜ
  ['', 'วอ', 'ว็อ'], // ㅝ
  ['', 'เว', 'เว'], // ㅞ
  ['', 'วี', 'วิ'], // ㅟ
  ['', 'ยู', 'ยุ'], // ㅠ
  ['', 'ือ', 'ึ'], // ㅡ
  ['', 'ึย', 'ึย'], // ㅢ
  ['', 'ี', 'ิ'], // ㅣ
]
const T_JONG = ['', 'ก', 'ก', 'ก', 'น', 'น', 'น', 'ต', 'ล', 'ก', 'ม', 'ล', 'ล', 'ล', 'บ', 'ล', 'ม', 'บ', 'บ', 'ต', 'ต', 'ง', 'ต', 'ต', 'ก', 'ต', 'บ', 'ต']

/** 한글 문자열을 태국문자로 음역 */
export function thai(text: string): string {
  let out = ''
  for (const ch of text) {
    const j = decompose(ch)
    if (!j) {
      out += ch
      continue
    }
    const [pre, post, postWithJong] = T_JUNG[j.jung] as [string, string, string]
    const tail = j.jong ? postWithJong : post
    // ㅇ 초성 + 반모음(ㅑㅕㅛㅠ·ㅘㅝ…)은 ย·ว 자체가 자음 역할을 하므로 อ를 겹치지 않는다
    const cho = j.cho === 11 && /^[ยว]/.test(tail) ? '' : T_CHO[j.cho]
    out += pre + cho + tail + T_JONG[j.jong]
  }
  return out
}

/** 언어별 음역 진입점 */
export function transliterate(text: string, lang: 'en' | 'ja' | 'th'): string {
  if (lang === 'en') return romanize(text)
  if (lang === 'ja') return katakana(text)
  return thai(text)
}
