import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { api, ApiError } from '../api/client'
import { Button } from '../components/ui'
import { colors, radius, space } from '../theme'
import type { ExploreStackParams } from '../navigation/types'

type Props = NativeStackScreenProps<ExploreStackParams, 'ReviewWrite'>

export function ReviewWriteScreen({ navigation, route }: Props) {
  const { targetType, targetId, targetName } = route.params
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (rating < 1) { Alert.alert('확인', '별점을 선택하세요'); return }
    if (content.trim().length < 1) { Alert.alert('확인', '리뷰 내용을 입력하세요'); return }
    setBusy(true)
    try {
      await api('/reviews', { method: 'POST', auth: true, body: { targetType, targetId, rating, content: content.trim() } })
      Alert.alert('등록 완료', '리뷰가 등록되었습니다.')
      navigation.goBack()
    } catch (e) {
      Alert.alert('실패', e instanceof ApiError ? e.message : '등록 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: space(5), gap: space(4) }}>
      <Text style={styles.target}>{targetName}</Text>

      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
            <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={34} color={colors.primary} />
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.textarea}
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={1000}
        placeholder="코스 동선, 스팟 정보가 도움이 됐는지 알려주세요 (최대 1,000자)"
        placeholderTextColor={colors.textHint}
      />
      <Text style={styles.count}>{content.length} / 1,000</Text>
      <Text style={styles.note}>사진의 위치 정보(EXIF GPS)는 업로드 시 자동 제거됩니다.</Text>

      <Button title={busy ? '등록 중…' : '등록하기'} onPress={submit} disabled={busy} />
    </View>
  )
}

const styles = StyleSheet.create({
  target: { fontSize: 15, fontWeight: '600', color: colors.text },
  stars: { flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: space(2) },
  textarea: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.button, padding: 12, minHeight: 140, textAlignVertical: 'top', color: colors.text, fontSize: 15 },
  count: { alignSelf: 'flex-end', color: colors.textHint, fontSize: 12 },
  note: { color: colors.textHint, fontSize: 12 },
})
