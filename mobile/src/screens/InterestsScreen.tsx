import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { api, ApiError } from '../api/client'
import { useResource } from '../api/useResource'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui'
import { colors, radius, space } from '../theme'
import type { MyStackParams } from '../navigation/types'
import type { Theme } from '../api/types'

type Props = NativeStackScreenProps<MyStackParams, 'Interests'>

export function InterestsScreen({ navigation }: Props) {
  const { user, refreshMe } = useAuth()
  const { data } = useResource<{ themes: Theme[] }>('/themes')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (user) setSelected(new Set(user.interests.map((i) => i.id))) }, [user])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function save() {
    setBusy(true)
    try {
      await api('/users/me/interests', { method: 'PUT', auth: true, body: { themeIds: [...selected] } })
      await refreshMe()
      navigation.goBack()
    } catch (e) {
      Alert.alert('실패', e instanceof ApiError ? e.message : '저장 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space(5) }}>
        <Text style={styles.title}>어떤 여행을 좋아하세요?</Text>
        <Text style={styles.sub}>관심 테마를 고르면 홈 추천에 반영돼요</Text>
        <View style={styles.chips}>
          {data?.themes.map((t) => {
            const on = selected.has(t.id)
            return (
              <Pressable key={t.id} onPress={() => toggle(t.id)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.name}</Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
      <View style={{ padding: space(5), borderTopWidth: 1, borderTopColor: colors.line }}>
        <Button title={busy ? '저장 중…' : '저장'} onPress={save} disabled={busy} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { color: colors.textSub, marginTop: 6, marginBottom: space(5) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextOn: { color: colors.white, fontWeight: '600' },
})
