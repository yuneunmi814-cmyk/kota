import { useEffect, useState } from 'react'
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { colors, font, radius, space } from '../theme'
import { Badge, Button, Loading } from '../components/ui'
import Poster from '../components/Poster'
import { getFestivals, type Festival } from '../festivals/data'
import { isWished, toggleWish } from '../festivals/wishlist'
import { syncGeofences } from '../festivals/geofence'
import { syncReminders } from '../festivals/reminders'

// 축제 상세 — 웹 상세와 같은 정보(기간·장소·문의) + 길찾기.
// 찜을 누르면 그 자리에서 지오펜스가 걸린다: "찜 = 근처 가면 알려줌"이 앱의 약속이다.

export default function FestivalDetailScreen() {
  const route = useRoute<any>()
  const externalId: string = route.params?.externalId
  const [f, setF] = useState<Festival | null>(null)
  const [wish, setWish] = useState(false)

  useEffect(() => {
    ;(async () => {
      const all = await getFestivals()
      setF(all.find((x) => x.externalId === externalId) ?? null)
      setWish(await isWished(externalId))
    })()
  }, [externalId])

  if (!f) return <Loading />

  const onWish = async () => {
    const now = await toggleWish(externalId)
    setWish(now)
    syncGeofences().catch(() => {})
    syncReminders().catch(() => {})
  }

  const openMap = () => {
    if (f.lat == null || f.lng == null) return
    const label = encodeURIComponent(f.name)
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${f.lat},${f.lng}&q=${label}`,
      android: `geo:${f.lat},${f.lng}?q=${f.lat},${f.lng}(${label})`,
      default: `https://map.kakao.com/link/to/${label},${f.lat},${f.lng}`,
    })
    Linking.openURL(url as string).catch(() => {})
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: space(12) }}>
      <View style={s.hero}>
        <Poster src={f.imageUrl} name={f.name} fontSize={56} style={{ borderRadius: 0 }} />
      </View>

      <View style={s.pad}>
        <View style={s.row}>
          <Badge label={f.status === 'ongoing' ? '진행중' : '예정'} tone={f.status === 'ongoing' ? 'green' : 'gray'} />
          <Pressable hitSlop={10} onPress={onWish}>
            <Text style={{ fontSize: 24, color: wish ? colors.primary : colors.line }}>{wish ? '♥' : '♡'}</Text>
          </Pressable>
        </View>

        <Text style={s.name}>{f.name}</Text>
        <Text style={s.meta}>{f.startDate} ~ {f.endDate}</Text>
        {(f.placeName || f.address) && <Text style={s.meta}>{f.placeName ?? f.address}</Text>}
        {f.tel && <Text style={s.meta}>문의 {f.tel}</Text>}
        {f.summary && <Text style={s.summary}>{f.summary}</Text>}

        {wish && (
          <View style={s.notice}>
            <Text style={s.noticeTx}>
              찜해두었어요. 이 축제 3km 안에 들어오면 알려드릴게요.
            </Text>
          </View>
        )}

        {f.lat != null && f.lng != null && (
          <View style={{ marginTop: space(4) }}>
            <Button title="길찾기" onPress={openMap} />
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  hero: { width: '100%', height: 220, backgroundColor: colors.bg2 },
  pad: { padding: space(4), gap: space(2) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: font.h1, fontWeight: '800', color: colors.text, marginTop: space(1) },
  meta: { fontSize: font.body, color: colors.textSub },
  summary: { fontSize: font.body, color: colors.text, lineHeight: 22, marginTop: space(2) },
  notice: { marginTop: space(3), padding: space(3), borderRadius: radius.button, backgroundColor: colors.primaryWeak },
  noticeTx: { fontSize: font.caption + 1, color: colors.primaryDeep, fontWeight: '600' },
})
