import { useCallback, useEffect, useState } from 'react'
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import * as Location from 'expo-location'
import { useNavigation } from '@react-navigation/native'
import { colors, font, radius, space } from '../theme'
import { Badge, EmptyState, Loading } from '../components/ui'
import { distanceKm, getFestivals, hasCoords, isAlwaysOn, type Festival } from '../festivals/data'
import { onWishChange, toggleWish, wishedKeys } from '../festivals/wishlist'
import { syncGeofences } from '../festivals/geofence'
import { syncReminders } from '../festivals/reminders'

// 축제 목록 — 기본은 '내 주변'. 웹과 달리 앱은 '지금 여기'로 열리는 게 자연스럽다.
// 위치를 못 얻으면 날짜순으로 조용히 떨어진다(권한을 강요하지 않는다).

type Tab = 'near' | 'all' | 'wished'
const NEAR_RADIUS_KM = 50

export default function FestivalListScreen() {
  const nav = useNavigation<any>()
  const [items, setItems] = useState<Festival[] | null>(null)
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null)
  const [tab, setTab] = useState<Tab>('near')
  const [wished, setWished] = useState<string[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const [f, w] = await Promise.all([getFestivals(), wishedKeys()])
    setItems(f)
    setWished(w)
  }, [])

  useEffect(() => {
    load()
    return onWishChange(setWished)
  }, [load])

  useEffect(() => {
    ;(async () => {
      const perm = await Location.getForegroundPermissionsAsync()
      if (perm.status !== 'granted') return
      const pos = await Location.getLastKnownPositionAsync().catch(() => null)
      if (pos) setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    })()
  }, [])

  const onToggle = async (f: Festival) => {
    await toggleWish(f.externalId)
    // 찜이 바뀌면 감시 영역도 즉시 따라간다 — 사용자가 설정을 다시 열 이유가 없다
    syncGeofences().catch(() => {})
    syncReminders().catch(() => {})
  }

  if (!items) return <Loading />

  const live = items.filter((f) => f.status !== 'ended')
  let list: (Festival & { km?: number })[] = live
  if (tab === 'wished') list = live.filter((f) => wished.includes(f.externalId))
  else if (tab === 'near' && here) {
    list = live
      .filter((f) => hasCoords(f) && !isAlwaysOn(f))
      .map((f) => ({ ...f, km: distanceKm(here, { lat: f.lat as number, lng: f.lng as number }) }))
      .filter((f) => (f.km as number) <= NEAR_RADIUS_KM)
      .sort((a, b) => (a.km as number) - (b.km as number))
  } else {
    list = [...live].sort((a, b) => a.startDate.localeCompare(b.startDate))
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'near', label: '내 주변' },
    { key: 'all', label: '전체' },
    { key: 'wished', label: `♥ 찜${wished.length ? ` ${wished.length}` : ''}` },
  ]

  return (
    <View style={s.wrap}>
      <View style={s.tabs}>
        {TABS.map((tb) => (
          <Pressable key={tb.key} onPress={() => setTab(tb.key)} style={[s.tab, tab === tb.key && s.tabOn]}>
            <Text style={[s.tabTx, tab === tb.key && s.tabTxOn]}>{tb.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'near' && !here && (
        <Text style={s.hint}>위치를 아직 못 받았어요. 알림 설정에서 위치를 허용하면 가까운 순으로 보여드려요.</Text>
      )}

      <FlatList
        data={list}
        keyExtractor={(f) => f.externalId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
        ListEmptyComponent={
          <EmptyState
            text={tab === 'wished' ? '아직 찜한 축제가 없어요.\n마음에 드는 축제에 ♥를 눌러보세요.' : '표시할 축제가 없어요.'}
          />
        }
        contentContainerStyle={{ padding: space(4), paddingBottom: space(12) }}
        renderItem={({ item: f }) => (
          <Pressable style={s.card} onPress={() => nav.navigate('FestivalDetail', { externalId: f.externalId })}>
            {f.imageUrl ? (
              <Image source={{ uri: f.imageUrl }} style={s.thumb} />
            ) : (
              <View style={[s.thumb, s.thumbEmpty]}><Text style={s.thumbTx}>🎪</Text></View>
            )}
            <View style={s.body}>
              <View style={s.row}>
                <Badge label={f.status === 'ongoing' ? '진행중' : '예정'} tone={f.status === 'ongoing' ? 'green' : 'gray'} />
                {f.km != null && <Text style={s.km}>{f.km < 1 ? '1km 이내' : `${f.km.toFixed(0)}km`}</Text>}
              </View>
              <Text style={s.name} numberOfLines={2}>{f.name}</Text>
              <Text style={s.meta} numberOfLines={1}>
                {f.startDate.slice(5)}~{f.endDate.slice(5)}
                {f.placeName ? ` · ${f.placeName}` : f.sigungu ? ` · ${f.sigungu}` : ''}
              </Text>
            </View>
            <Pressable hitSlop={10} onPress={() => onToggle(f)} style={s.heart}>
              <Text style={{ fontSize: 20, color: wished.includes(f.externalId) ? colors.primary : colors.line }}>
                {wished.includes(f.externalId) ? '♥' : '♡'}
              </Text>
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', gap: space(2), paddingHorizontal: space(4), paddingTop: space(3) },
  tab: { paddingHorizontal: space(3.5), paddingVertical: space(2), borderRadius: radius.pill, backgroundColor: colors.bg2 },
  tabOn: { backgroundColor: colors.navy },
  tabTx: { fontSize: font.caption + 1, fontWeight: '700', color: colors.textSub },
  tabTxOn: { color: colors.white },
  hint: { paddingHorizontal: space(4), paddingTop: space(3), color: colors.textHint, fontSize: font.caption },
  card: { flexDirection: 'row', gap: space(3), padding: space(3), marginBottom: space(3), backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line },
  thumb: { width: 78, height: 78, borderRadius: radius.sm, backgroundColor: colors.bg2 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbTx: { fontSize: 26 },
  body: { flex: 1, justifyContent: 'center', gap: space(1) },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  km: { fontSize: font.caption, color: colors.primary, fontWeight: '700' },
  name: { fontSize: font.body, fontWeight: '700', color: colors.text },
  meta: { fontSize: font.caption, color: colors.textSub },
  heart: { paddingLeft: space(1), justifyContent: 'center' },
})
