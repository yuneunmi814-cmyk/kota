import { useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useAuth, type Consent } from '../auth/AuthContext'
import { ApiError } from '../api/client'
import { Button } from '../components/ui'
import { colors, radius, space } from '../theme'
import type { MyStackParams } from '../navigation/types'

type Props = NativeStackScreenProps<MyStackParams, 'Consent'>

interface Item { type: string; label: string; required: boolean }
const ITEMS: Item[] = [
  { type: 'TERMS', label: '서비스 이용약관', required: true },
  { type: 'PRIVACY', label: '개인정보 수집·이용 동의', required: true },
  { type: 'AGE14', label: '만 14세 이상입니다', required: true },
  { type: 'LOCATION', label: '위치기반서비스 이용약관', required: false },
  { type: 'MARKETING', label: '마케팅 정보 수신(푸시)', required: false },
]

export function ConsentScreen({ navigation, route }: Props) {
  const { signup } = useAuth()
  const { email, password, nickname } = route.params
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)

  const allOn = useMemo(() => ITEMS.every((i) => checked[i.type]), [checked])
  const requiredOk = ITEMS.filter((i) => i.required).every((i) => checked[i.type])

  function toggle(type: string) { setChecked((p) => ({ ...p, [type]: !p[type] })) }
  function toggleAll() {
    const next = !allOn
    setChecked(Object.fromEntries(ITEMS.map((i) => [i.type, next])))
  }

  async function agree() {
    if (!requiredOk) return
    setBusy(true)
    try {
      const consents: Consent[] = ITEMS.map((i) => ({ type: i.type, agreed: Boolean(checked[i.type]), version: '1.0' }))
      await signup(email, password, nickname, consents)
      navigation.navigate('Interests') // 가입 직후 관심 테마 선택 (ON-02)
    } catch (e) {
      Alert.alert('가입 실패', e instanceof ApiError ? e.message : '처리 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space(5) }}>
        <Text style={styles.title}>서비스 이용을 위해{'\n'}동의해 주세요</Text>

        <Pressable onPress={toggleAll} style={[styles.row, styles.allRow]}>
          <Check on={allOn} />
          <Text style={styles.allText}>전체 동의</Text>
        </Pressable>

        {ITEMS.map((i) => (
          <Pressable key={i.type} onPress={() => toggle(i.type)} style={styles.row}>
            <Check on={Boolean(checked[i.type])} />
            <Text style={styles.label}>
              <Text style={{ color: i.required ? colors.textSub : colors.textHint }}>{i.required ? '[필수] ' : '[선택] '}</Text>
              {i.label}
            </Text>
          </Pressable>
        ))}

        <Text style={styles.note}>위치 약관 미동의 시 가이드 모드 진입 시점에 다시 요청합니다.</Text>
      </ScrollView>

      <View style={{ padding: space(5), borderTopWidth: 1, borderTopColor: colors.line }}>
        <Button title={busy ? '처리 중…' : '동의하고 시작하기'} onPress={agree} disabled={busy || !requiredOk} />
      </View>
    </View>
  )
}

function Check({ on }: { on: boolean }) {
  return (
    <View style={[styles.check, on && styles.checkOn]}>
      {on && <Ionicons name="checkmark" size={14} color={colors.white} />}
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 19, fontWeight: '700', color: colors.text, marginBottom: space(5), lineHeight: 26 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bg2 },
  allRow: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.button, paddingHorizontal: 12, marginBottom: 6, borderBottomColor: colors.primary },
  allText: { fontWeight: '700', color: colors.text },
  label: { flex: 1, color: colors.text },
  note: { color: colors.textHint, fontSize: 12, marginTop: space(4) },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
})
