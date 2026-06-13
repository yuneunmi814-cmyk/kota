import { useState } from 'react'
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useResource } from '../api/useResource'
import { api, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, ImagePlaceholder, Loading, EmptyState, Pill } from '../components/ui'
import { MapView } from '../components/MapView'
import { BookmarkButton } from '../components/BookmarkButton'
import { colors, space } from '../theme'
import type { ExploreStackParams } from '../navigation/types'
import type { CourseDetail, Trip } from '../api/types'

type Props = NativeStackScreenProps<ExploreStackParams, 'CourseDetail'>

const TRANSPORT: Record<string, string> = { WALK: '도보', BUS: '버스', TAXI: '택시', CAR: '자동차' }

export function CourseDetailScreen({ navigation, route }: Props) {
  const { isAuthed } = useAuth()
  const { data, loading, error } = useResource<CourseDetail>(`/courses/${route.params.courseId}`, { auth: true, deps: [route.params.courseId] })
  const [day, setDay] = useState(1)
  const [starting, setStarting] = useState(false)

  if (loading) return <Loading />
  if (error || !data) return <EmptyState text={error ?? '불러오기 실패'} />

  const dayData = data.days.find((d) => d.dayNo === day) ?? data.days[0]

  async function startTrip() {
    if (!isAuthed) {
      Alert.alert('로그인이 필요해요', '여행을 시작하려면 로그인하세요.')
      return
    }
    setStarting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const trip = await api<Trip>('/trips', { method: 'POST', auth: true, body: { courseId: data!.id, startDate: today } })
      // 탭 경계를 넘는 이동(Explore → Trips) — 중첩 네비게이션 런타임 지원, 타입은 느슨하게 캐스팅
      const parent = navigation.getParent() as { navigate: (name: string, params: unknown) => void } | undefined
      parent?.navigate('TripsTab', { screen: 'GuideMode', params: { tripId: trip.id } })
    } catch (e) {
      Alert.alert('오류', e instanceof ApiError ? e.message : '여행 생성 실패')
    } finally {
      setStarting(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space(6) }}>
        {data.cover ? <Image source={{ uri: data.cover }} style={{ height: 200, width: '100%' }} /> : <ImagePlaceholder height={160} />}
        <View style={{ padding: space(5), gap: space(3) }}>
          <Text style={styles.title}>{data.title}</Text>
          {data.summary && <Text style={{ color: colors.textSub }}>{data.summary}</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pill label={`${data.durationDays}일`} />
            <Pill label={`명소 ${data.spotCount}곳`} />
            {data.estCost ? <Pill label={`약 ${Math.round(data.estCost / 10000)}만원`} /> : null}
          </View>

          {data.days.length > 1 && (
            <View style={{ flexDirection: 'row', gap: space(4), borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 6 }}>
              {data.days.map((d) => (
                <Pressable key={d.dayNo} onPress={() => setDay(d.dayNo)}>
                  <Text style={[styles.dayTab, day === d.dayNo && styles.dayTabActive]}>Day {d.dayNo}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {dayData?.items.map((it, idx) => (
            <View key={it.id}>
              <Pressable onPress={() => navigation.navigate('SpotDetail', { spotId: it.spot.id })} style={styles.step}>
                <View style={styles.stepNo}><Text style={{ color: colors.white, fontWeight: '700', fontSize: 11 }}>{it.order}</Text></View>
                <Text style={{ fontWeight: '600', color: colors.text, flex: 1 }}>{it.spot.name}</Text>
                {it.stayMinutes ? <Text style={{ color: colors.textHint, fontSize: 12 }}>{it.stayMinutes}분</Text> : null}
              </Pressable>
              {it.transportToNext && idx < dayData.items.length - 1 && (
                <Text style={styles.transport}>{TRANSPORT[it.transportToNext]} {it.transportMinutes ?? ''}분</Text>
              )}
            </View>
          ))}

          {(() => {
            const spots = data.days.flatMap((d) => d.items.map((it) => it.spot))
            const first = spots[0]
            return first ? (
              <MapView lat={first.lat} lng={first.lng} height={160} style={{ marginTop: 4 }}
                markers={spots.map((s) => ({ lat: s.lat, lng: s.lng, label: s.name }))} />
            ) : null
          })()}

          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}
            onPress={() => navigation.navigate('ReviewWrite', { targetType: 'COURSE', targetId: data!.id, targetName: data!.title })}
          >
            <Text style={{ color: colors.text }}>
              {data.reviewSummary.avg != null ? `★ ${data.reviewSummary.avg} · 리뷰 ${data.reviewSummary.count}` : '아직 리뷰가 없어요'}
            </Text>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>리뷰 쓰기</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.cta}>
        <View style={styles.saveBtn}><BookmarkButton targetType="COURSE" targetId={data.id} initial={data.isBookmarked} /></View>
        <Button title={starting ? '시작하는 중…' : '이 코스로 여행 시작'} onPress={startTrip} disabled={starting} style={{ flex: 1 }} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  dayTab: { color: colors.textSub, fontWeight: '600' },
  dayTabActive: { color: colors.primary, borderBottomWidth: 2, borderBottomColor: colors.primary, paddingBottom: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  stepNo: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  transport: { color: colors.textHint, fontSize: 12, paddingLeft: 26, paddingVertical: 2 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: space(3), padding: space(4), borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
  saveBtn: { width: 48, height: 46, borderWidth: 1, borderColor: colors.line, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
})
