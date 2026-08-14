import { useState } from 'react'
import { Image, StyleSheet, Text, View, type ImageStyle, type ViewStyle } from 'react-native'
import { colors, radius } from '../theme'

// 축제 포스터 — 없거나 로딩에 실패해도 자리를 채운다(웹의 Poster와 같은 규칙).
//
// 이모지(🎪)를 쓰지 않는 이유: 718건 중 463건이 이미지가 없어 목록을 내리면
// 같은 이모지가 수백 번 지나간다. 기기·OS마다 모양도 달라 디자인으로 통제되지 않는다.
// 대신 이름 첫 글자를 브랜드 색으로 놓아 카드마다 다르게 보이게 한다.

const TINTS = ['#F2F5F3', '#EDF2EF', '#E7EEEA', '#E1EAE5']

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initial(name: string): string {
  const trimmed = name.replace(/^[\s\d[\](){}'"·-]+/, '').trim()
  return [...(trimmed || name)][0] ?? '·'
}

export default function Poster({
  src,
  name,
  style,
  fontSize = 30,
}: {
  src?: string | null
  name: string
  style?: ViewStyle & ImageStyle
  fontSize?: number
}) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return <Image source={{ uri: src }} style={[s.img, style as ImageStyle]} onError={() => setFailed(true)} />
  }
  return (
    <View style={[s.img, s.fallback, { backgroundColor: TINTS[hash(name) % TINTS.length] }, style]}>
      <Text style={[s.letter, { fontSize }]} numberOfLines={1}>
        {initial(name)}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  img: { width: '100%', height: '100%', borderRadius: radius.sm, backgroundColor: colors.bg2 },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '900', color: colors.navy, opacity: 0.42 },
})
