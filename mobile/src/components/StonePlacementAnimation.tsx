import { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

// 착수(着手)의 손맛 — 바둑돌 놓는 1.5초 풀시퀀스. (Stonemark 'StonePlacementAnimation' 이식)
//  0.00s 햅틱 "딱"(Heavy) + 화면 어두워짐
//  0.05s 햅틱 "똑"(Rigid)
//  0.10~0.30s 먹 한 방울 떨어짐
//  0.30s 잔물결 2회 + 돌 박힘(스프링)
//  0.90~1.40s "+N점" 플로팅
//  1.50s 완료 → onDone (탭으로 스킵 가능)
const INK = '#3A2418' // 먹·바둑판 선
const STONE = '#161616' // 흑돌

export function StonePlacementAnimation({ scoreDelta = 1, onDone }: { scoreDelta?: number; onDone?: () => void }) {
  const overlay = useRef(new Animated.Value(0)).current
  const dropY = useRef(new Animated.Value(-140)).current
  const dropOp = useRef(new Animated.Value(0)).current
  const stone = useRef(new Animated.Value(0)).current
  const r1 = useRef(new Animated.Value(0)).current
  const r2 = useRef(new Animated.Value(0)).current
  const scoreOp = useRef(new Animated.Value(0)).current
  const scoreY = useRef(new Animated.Value(30)).current
  const done = useRef(false)

  function finish() {
    if (done.current) return
    done.current = true
    onDone?.()
  }

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {})
    const tHaptic = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {}), 50)

    Animated.timing(overlay, { toValue: 0.42, duration: 100, useNativeDriver: true }).start()
    Animated.parallel([
      Animated.timing(dropOp, { toValue: 1, duration: 200, delay: 100, useNativeDriver: true }),
      Animated.timing(dropY, { toValue: 0, duration: 200, delay: 100, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start()
    Animated.timing(r1, { toValue: 1, duration: 900, delay: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
    Animated.timing(r2, { toValue: 1, duration: 1000, delay: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
    Animated.timing(dropOp, { toValue: 0, duration: 150, delay: 300, useNativeDriver: true }).start()
    Animated.spring(stone, { toValue: 1, delay: 300, friction: 4, tension: 120, useNativeDriver: true }).start()
    Animated.sequence([
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(scoreOp, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(scoreY, { toValue: -10, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.delay(100),
      Animated.timing(scoreOp, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start()

    const tDone = setTimeout(finish, 1500)
    return () => { clearTimeout(tHaptic); clearTimeout(tDone) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ripple = (v: Animated.Value, grow: number, op: number) => ({
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, grow] }) }],
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [op, 0] }),
  })

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={finish}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: overlay }]} />
      <View style={styles.center} pointerEvents="none">
        <Animated.View style={[styles.ripple, { width: 90, height: 90, borderRadius: 45 }, ripple(r1, 3.6, 0.55)]} />
        <Animated.View style={[styles.ripple, { width: 70, height: 70, borderRadius: 35, borderWidth: 1 }, ripple(r2, 4.4, 0.35)]} />
        <Animated.View style={[styles.drop, { opacity: dropOp, transform: [{ translateY: dropY }] }]} />
        <Animated.View style={[styles.stone, { transform: [{ scale: stone }] }]} />
        <Animated.Text style={[styles.score, { opacity: scoreOp, transform: [{ translateY: scoreY }] }]}>
          +{scoreDelta}점
        </Animated.Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ripple: { position: 'absolute', borderWidth: 2, borderColor: INK },
  drop: { position: 'absolute', width: 14, height: 22, borderRadius: 7, backgroundColor: INK },
  stone: {
    position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: STONE,
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  score: { position: 'absolute', top: '38%', fontSize: 28, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
})
