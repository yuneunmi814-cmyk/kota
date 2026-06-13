import { Dimensions, Pressable, ScrollView, Text, View, Image, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useResource } from '../api/useResource'
import { Card, ImagePlaceholder, Loading, EmptyState, Badge } from '../components/ui'
import { BookmarkButton } from '../components/BookmarkButton'
import { AudioGuideList } from '../components/AudioGuideList'
import { colors, space } from '../theme'
import type { ExploreStackParams } from '../navigation/types'
import type { SpotDetail } from '../api/types'

type Props = NativeStackScreenProps<ExploreStackParams, 'SpotDetail'>

export function SpotDetailScreen({ navigation, route }: Props) {
  const { data, loading, error } = useResource<SpotDetail>(`/spots/${route.params.spotId}`, { deps: [route.params.spotId] })
  if (loading) return <Loading />
  if (error || !data) return <EmptyState text={error ?? '불러오기 실패'} />

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: space(8) }}>
      {data.images.length > 0 ? (
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {data.images.map((img, i) => (
              <Image key={i} source={{ uri: img.url }} style={{ height: 220, width: SCREEN_W }} />
            ))}
          </ScrollView>
          {data.images.length > 1 && (
            <View style={styles.countBadge}><Text style={styles.countText}>1+ / {data.images.length}</Text></View>
          )}
        </View>
      ) : <ImagePlaceholder height={160} />}
      <View style={{ padding: space(5), gap: space(3) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.title}>{data.name}</Text>
          <Badge label={data.category} />
          {data.reviewSummary.avg != null && <Text style={{ color: colors.primary, fontWeight: '700' }}>★ {data.reviewSummary.avg}</Text>}
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <BookmarkButton targetType="SPOT" targetId={data.id} initial={data.isBookmarked} size={22} />
          </View>
        </View>

        <Card style={{ padding: space(4) }}>
          <Row label="운영시간" value={data.todayHours ?? '정보 없음'} accent={data.todayOpen === true ? '영업 중' : data.todayOpen === false ? '영업 종료' : undefined} />
          {data.admissionFee && <Row label="입장료" value={data.admissionFee} />}
          {data.avgStayMinutes && <Row label="체류" value={`평균 ${data.avgStayMinutes}분`} />}
          {data.address && <Row label="주소" value={data.address} />}
          {data.phone && <Row label="전화" value={data.phone} />}
        </Card>

        {data.tips && (
          <View style={styles.tip}>
            <Text style={{ color: colors.primaryDeep, fontWeight: '700', marginBottom: 4 }}>💡 에디터 꿀팁</Text>
            <Text style={{ color: colors.primaryDeep, lineHeight: 20 }}>{data.tips}</Text>
          </View>
        )}

        <AudioGuideList guides={data.audioGuides} />

        {data.description && <Text style={{ color: colors.textSub, lineHeight: 22 }}>{data.description}</Text>}

        {data.nearbySpots.length > 0 && (
          <>
            <Text style={styles.section}>주변 추천</Text>
            {data.nearbySpots.map((n) => (
              <View key={n.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.bg2 }}>
                <Text style={{ color: colors.text }}>{n.name}</Text>
                <Text style={{ color: colors.textHint }}>{Math.round(n.distanceM)}m</Text>
              </View>
            ))}
          </>
        )}

        <Pressable
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}
          onPress={() => navigation.navigate('ReviewWrite', { targetType: 'SPOT', targetId: data!.id, targetName: data!.name })}
        >
          <Text style={{ color: colors.textSub }}>리뷰 {data.reviewSummary.count}개</Text>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>리뷰 쓰기</Text>
        </Pressable>

        {data.images[0]?.credit && <Text style={{ fontSize: 11, color: colors.textHint }}>이미지 출처: {data.images[0].credit}</Text>}
      </View>
    </ScrollView>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 5, alignItems: 'center' }}>
      <Text style={{ width: 56, color: colors.textSub, fontSize: 13 }}>{label}</Text>
      <Text style={{ flex: 1, color: colors.text, fontSize: 13 }}>{value}</Text>
      {accent && <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>{accent}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  section: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 8 },
  tip: { backgroundColor: colors.primaryWeak, borderRadius: 10, padding: space(4) },
  countBadge: { position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  countText: { color: '#fff', fontSize: 11 },
})

const SCREEN_W = Dimensions.get('window').width
