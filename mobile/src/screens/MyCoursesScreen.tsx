import { useEffect, useState } from 'react'
import { Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useResource } from '../api/useResource'
import { api, ApiError } from '../api/client'
import { Button, Card, ImagePlaceholder, Loading, EmptyState, Badge } from '../components/ui'
import { colors, radius, space } from '../theme'
import { durationLabel } from '../lib/format'
import type { MyStackParams } from '../navigation/types'
import type { MyCourse, ContentStatus, Paged } from '../api/types'

type Props = NativeStackScreenProps<MyStackParams, 'MyCourses'>

const STATUS: Record<ContentStatus, { label: string; tone: 'gray' | 'orange' | 'green' | 'navy' }> = {
  DRAFT: { label: '작성 중', tone: 'gray' },
  IN_REVIEW: { label: '검수 중', tone: 'orange' },
  PUBLISHED: { label: '판매 중', tone: 'green' },
  ARCHIVED: { label: '보관됨', tone: 'navy' },
}

export function MyCoursesScreen({ navigation }: Props) {
  const { data, loading, error, reload } = useResource<Paged<MyCourse>>('/me/courses?limit=30', { auth: true })
  const [videoOpen, setVideoOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)

  // 에디터에서 돌아오면 목록 갱신
  useEffect(() => navigation.addListener('focus', reload), [navigation, reload])

  async function generate() {
    if (!url.trim()) { Alert.alert('확인', '유튜브·틱톡 영상 URL을 붙여넣어 주세요'); return }
    setBusy(true)
    try {
      const r = await api<{ courseId: string; title: string; region: string; spotCount: number; skipped: string[] }>(
        '/me/courses/from-video', { method: 'POST', auth: true, body: { url: url.trim(), caption: caption.trim() || undefined } },
      )
      setVideoOpen(false); setUrl(''); setCaption('')
      Alert.alert('코스 생성됨 🎬', `${r.title}\n${r.region} · 명소 ${r.spotCount}곳${r.skipped.length ? `\n(못 찾은 곳: ${r.skipped.slice(0, 3).join(', ')})` : ''}\n\n검토 후 검수 요청하세요.`)
      navigation.navigate('CourseEditor', { courseId: r.courseId })
    } catch (e) {
      Alert.alert('생성 실패', e instanceof ApiError ? e.message : '잠시 후 다시 시도해 주세요')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: space(4), paddingBottom: space(2), gap: space(2) }}>
        <Button title="+ 새 여행팩 만들기" onPress={() => navigation.navigate('CourseEditor', {})} />
        <Button title="🎬 영상으로 코스 만들기" kind="navy" onPress={() => setVideoOpen(true)} />
      </View>

      {loading ? (
        <Loading />
      ) : error ? (
        <EmptyState text={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState text={'아직 만든 여행팩이 없어요.\n나만의 코스를 만들어 공개해 보세요!'} />
      ) : (
        <FlatList
          contentContainerStyle={{ padding: space(4), paddingTop: 0, gap: space(3) }}
          data={data.items}
          keyExtractor={(c) => c.id}
          renderItem={({ item: c }) => (
            <Pressable onPress={() => navigation.navigate('CourseEditor', { courseId: c.id })}>
              <Card style={{ flexDirection: 'row' }}>
                {c.cover ? <Image source={{ uri: c.cover }} style={{ width: 88, height: 88 }} /> : <ImagePlaceholder height={88} />}
                <View style={{ flex: 1, padding: space(3), gap: 4, justifyContent: 'center' }}>
                  <Badge label={STATUS[c.status].label} tone={STATUS[c.status].tone} />
                  <Text style={{ fontWeight: '700', color: colors.text }} numberOfLines={1}>{c.title}</Text>
                  <Text style={{ fontSize: 12, color: colors.textHint }}>
                    {c.region} · {durationLabel(c.durationDays)} · 명소 {c.spotCount}곳
                  </Text>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}

      {/* 영상 → 코스 자동생성 모달 */}
      <Modal visible={videoOpen} animationType="slide" transparent onRequestClose={() => setVideoOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>🎬 영상으로 코스 만들기</Text>
            <Text style={styles.sheetDesc}>유튜브·틱톡 여행영상 URL을 붙여넣으면 AI가 영상 속 장소(관광지·맛집·카페)를 뽑아 코스를 자동으로 만들어요.</Text>
            <TextInput
              style={styles.input} value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false}
              placeholder="https://youtube.com/... 또는 틱톡 URL" placeholderTextColor={colors.textHint}
            />
            <TextInput
              style={[styles.input, { height: 72 }]} value={caption} onChangeText={setCaption} multiline
              placeholder="(인스타 릴스는 캡션을 여기 붙여넣어 주세요 — 선택)" placeholderTextColor={colors.textHint}
            />
            <Button title={busy ? 'AI가 분석 중…' : '코스 생성'} onPress={generate} disabled={busy} />
            <Pressable onPress={() => !busy && setVideoOpen(false)} style={{ paddingVertical: 8 }}>
              <Text style={{ textAlign: 'center', color: colors.textSub }}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: space(5), gap: space(3) },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  sheetDesc: { fontSize: 13, color: colors.textSub, lineHeight: 18 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.button, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: colors.text, backgroundColor: colors.white },
})
