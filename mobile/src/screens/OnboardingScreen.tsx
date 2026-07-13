import { useState } from 'react'
import { Dimensions, ScrollView, StyleSheet, Text, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native'
import { Button } from '../components/ui'
import { colors, space } from '../theme'

const SLIDES = [
  { title: '3시간 걸리던 여행 준비,\n3분이면 끝나요', desc: '지역만 고르면 검증된 코스가 도착해요' },
  { title: '코스를 따라가며\n가이드 받기', desc: '다음 목적지 안내와 도착 체크인까지' },
  { title: '관광지마다\n에디터 꿀팁', desc: '운영시간·입장료·숨은 팁을 한눈에' },
]

const { width } = Dimensions.get('window')

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0)

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width))
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.skip} onPress={onDone}>건너뛰기</Text>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} style={{ flexGrow: 0 }}>
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={styles.art}><Text style={styles.artMark}>KOTA</Text></View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.desc}>{s.desc}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => <View key={i} style={[styles.dot, i === page && styles.dotOn]} />)}
      </View>

      <View style={{ padding: space(5) }}>
        <Button title={page === SLIDES.length - 1 ? '시작하기' : '다음'} onPress={onDone} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingTop: space(12) },
  skip: { alignSelf: 'flex-end', color: colors.textHint, padding: space(5) },
  slide: { alignItems: 'center', paddingHorizontal: space(8), gap: space(4) },
  art: { width: 180, height: 180, borderRadius: 90, backgroundColor: colors.primaryWeak, alignItems: 'center', justifyContent: 'center', marginBottom: space(4) },
  artMark: { color: colors.primary, fontWeight: '700', fontSize: 18 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center', lineHeight: 30 },
  desc: { fontSize: 14, color: colors.textSub, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: space(6) },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotOn: { width: 18, backgroundColor: colors.primary },
})
