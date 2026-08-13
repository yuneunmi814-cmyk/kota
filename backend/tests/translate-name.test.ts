import { describe, expect, it } from 'vitest'
import { placeName, translateSigungu } from '../src/modules/festivals/places.js'
import { katakana, romanize, thai } from '../src/modules/festivals/romanize.js'
import { translateFestivalName } from '../src/modules/festivals/translate-name.js'

// 축제 다국어 자동 번역 회귀 테스트.
// 여기 걸린 사례는 전부 실제 축제 데이터에서 오번역이 발견돼 고친 것들이다 —
// 사전을 늘릴 때 예전 오류가 되살아나지 않도록 붙잡아 둔다.

describe('romanize — 국어의 로마자 표기법', () => {
  it('기본 음절을 옮긴다', () => {
    expect(romanize('예산')).toBe('Yesan')
    expect(romanize('함평')).toBe('Hampyeong')
    expect(romanize('서울')).toBe('Seoul')
  })

  it('ㄹ 비음화 — 받침 ㅇ 뒤의 ㄹ은 [ㄴ]', () => {
    expect(romanize('강릉')).toBe('Gangneung')
    expect(romanize('종로')).toBe('Jongno')
  })

  it('유음화 — ㄴ+ㄹ은 ll', () => {
    expect(romanize('신라')).toBe('Silla')
  })

  it('연음 — 받침이 다음 음절 첫소리로 넘어간다', () => {
    expect(romanize('목포')).toBe('Mokpo')
    expect(romanize('단양')).toBe('Danyang')
  })
})

describe('가타카나·태국문자 음역', () => {
  it('반모음을 겹쳐 적지 않는다', () => {
    // ㅇ 초성 + ㅑ는 ヤ / ยา 하나로 — 아ヤ, อยา 같은 겹침이 나오면 안 된다
    expect(katakana('양양')).toBe('ヤンヤン')
    expect(thai('양양')).toBe('ยังยัง')
  })

  it('어중 유성음화 — 평음은 어두에서 무성, 모음 사이에서 유성', () => {
    // 이 구분이 없으면 일본인이 읽어도 현지 발음과 어긋난다
    expect(katakana('부산')).toBe('プサン')
    expect(katakana('제주')).toBe('チェジュ')
    expect(katakana('안동')).toBe('アンドン')
    expect(katakana('대구')).toBe('テグ')
  })

  it('가타카나에서도 ㄹ 비음화를 반영한다', () => {
    expect(katakana('강릉')).toBe('カンヌン')
  })

  it('받침을 표기한다', () => {
    expect(katakana('부산')).toBe('プサン')
  })
})

describe('지명 사전', () => {
  it('시·군·구 접미사를 언어별 관용에 맞춘다', () => {
    expect(translateSigungu('강릉시').en).toBe('Gangneung')
    expect(translateSigungu('중구').en).toBe('Jung-gu')
    expect(translateSigungu('강릉시').ja).toBe('江陵市')
  })

  it('이름 자체가 표제어면 접미사로 오인하지 않는다', () => {
    // '대구'의 끝 글자를 '구(區)'로 떼면 Dae-gu가 된다
    expect(translateSigungu('대구').en).toBe('Daegu')
  })

  it('외국인이 읽을 지명을 만든다', () => {
    expect(placeName('강원특별자치도', '강릉시', 'en')).toBe('Gangneung, Gangwon-do')
    expect(placeName('서울특별시', '중구', 'ja')).toBe('ソウル 中区')
  })

  it('복수 시군구 표기는 첫 번째만 쓴다', () => {
    expect(placeName('서울특별시', '성동구, 서초구', 'en')).toBe('Seongdong-gu, Seoul')
  })
})

describe('축제명 번역', () => {
  it('지명 + 소재 + 행사유형을 조합한다', () => {
    const t = translateFestivalName('2026 예산사과축제')
    expect(t.en).toBe('2026 Yesan Apple Festival')
    expect(t.coverage).toBe(1)
  })

  it('일본어는 첫 지명에 가타카나 독음을 병기한다', () => {
    // 한자만 쓰면 일본 한자음으로 읽어(礼山→レイザン) 현지에서 통하지 않는다
    expect(translateFestivalName('2026 예산사과축제').ja).toBe('2026 礼山（イェサン）りんご祭り')
    expect(translateFestivalName('부산국제코미디페스티벌').ja).toContain('釜山（プサン）')
  })

  it('태국어는 핵심어를 앞에, 지명을 뒤에 둔다', () => {
    // 낱말을 한국어 순서대로 이어붙이면 '축제 예산 사과'가 되어 읽히지 않는다
    expect(translateFestivalName('2026 예산사과축제').th).toBe('เทศกาลแอปเปิล เยซัน 2026')
    // 한정어(국제)는 핵심어 뒤로 — เทศกาลตลกนานาชาติ(축제-코미디-국제)
    expect(translateFestivalName('부산국제코미디페스티벌').th).toBe('เทศกาลตลกนานาชาติ ปูซาน')
  })

  it('띄어쓰기 없는 합성어를 분절한다', () => {
    expect(translateFestivalName('제주국제관악제').en).toBe('Jeju International Wind Music Festival')
    expect(translateFestivalName('안동국제탈춤페스티벌').en).toBe('Andong International Mask Dance Festival')
  })

  it('지명이 어휘보다 길면 지명이 이긴다', () => {
    // '부산'을 '부'+'산(Mountain)'으로 자르면 Bu Mountain이 된다
    expect(translateFestivalName('부산국제코미디페스티벌').en).toBe('Busan International Comedy Festival')
    // 반대로 '팔공산'은 자연 지명이라 통째로 잡혀야 한다
    expect(translateFestivalName('팔공산 한우축제').en).toContain('Palgongsan')
  })

  it('연도와 회차를 보존한다', () => {
    const t = translateFestivalName('제4회 2026 대전 0시 축제')
    expect(t.en).toMatch(/^2026 4th /)
    expect(t.ja).toContain('第4回')
  })

  it('행사임이 드러나지 않으면 Festival을 붙인다', () => {
    expect(translateFestivalName('태봉제').en).toMatch(/Festival$/)
  })

  it('사전이 못 덮으면 coverage가 낮게 나온다', () => {
    // 시적인 이름은 음역밖에 못 하므로 사람 검수로 넘어가야 한다
    expect(translateFestivalName('바람 불어 좋은 날, 판교에서').coverage).toBeLessThan(0.5)
  })

  it('영문·숫자 토막은 그대로 둔다', () => {
    expect(translateFestivalName('GES2026 게임 축제').en).toContain('GES2026')
  })
})
