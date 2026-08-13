import { useCallback, useEffect, useState } from 'react'
import { Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import * as Notifications from 'expo-notifications'
import { colors, font, radius, space } from '../theme'
import { Button } from '../components/ui'
import {
  MAX_REGIONS,
  RADIUS_M,
  getPermissions,
  isGeofencingOn,
  pickRegions,
  requestPermissions,
  stopGeofences,
  syncGeofences,
  type PermissionState,
} from '../festivals/geofence'
import { onWishChange } from '../festivals/wishlist'
import { pendingReminderCount, syncReminders } from '../festivals/reminders'

// 알림 설정 — 무엇을 왜 수집하는지 화면에서 그대로 보여준다.
// 위치 권한은 '켜라'고 조르는 대신, 켜면 무엇이 되는지 먼저 보여주고 사용자가 고르게 한다.

export default function NotifySettingsScreen() {
  const [perm, setPerm] = useState<PermissionState>({ foreground: false, background: false })
  const [on, setOn] = useState(false)
  const [watching, setWatching] = useState(0)
  const [reminders, setReminders] = useState(0)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setPerm(await getPermissions())
    setOn(await isGeofencingOn())
    setWatching((await pickRegions()).length)
    setReminders(await pendingReminderCount())
  }, [])

  useEffect(() => {
    refresh()
    return onWishChange(() => refresh())
  }, [refresh])

  const enable = async () => {
    setBusy(true)
    try {
      const p = perm.background ? perm : await requestPermissions()
      setPerm(p)
      if (!p.background) {
        setBusy(false)
        return
      }
      await Notifications.requestPermissionsAsync()
      await syncGeofences()
      await syncReminders()
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      await stopGeofences()
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: space(4), gap: space(4) }}>
      <View style={s.card}>
        <View style={s.row}>
          <View style={{ flex: 1, gap: space(1) }}>
            <Text style={s.title}>찜한 축제 근처 알림</Text>
            <Text style={s.sub}>
              찜해둔 축제 {RADIUS_M / 1000}km 안에 들어오면 알려드려요. 앱을 켜두지 않아도 동작합니다.
            </Text>
          </View>
          <Switch value={on} disabled={busy} onValueChange={(v) => (v ? enable() : disable())} />
        </View>
      </View>

      {on && (
        <View style={s.stat}>
          <Text style={s.statTx}>
            지금 감시 중인 축제 <Text style={s.statNum}>{watching}</Text>곳
          </Text>
          <Text style={s.sub}>
            찜을 추가하면 자동으로 반영돼요. 기기 제약으로 최대 {MAX_REGIONS}곳까지 감시하며, 그보다 많으면
            현재 위치에서 가까운 순으로 고릅니다.
          </Text>
        </View>
      )}

      <View style={s.card}>
        <Text style={s.title}>일정 알림</Text>
        <Text style={s.sub}>
          찜한 축제가 내일 시작하거나 내일이 마지막 날이면 오전 10시에 알려드려요.
          {reminders > 0 ? ` 지금 ${reminders}건 예약돼 있어요.` : ''}
        </Text>
      </View>

      {!perm.background && (
        <View style={s.warn}>
          <Text style={s.warnTx}>
            {perm.foreground
              ? '"항상 허용"이 필요해요. 앱이 꺼져 있을 때도 근처에 왔는지 확인하려면 위치 권한을 "항상"으로 바꿔주세요.'
              : '위치 권한이 필요해요.'}
          </Text>
          <Button title="설정 열기" kind="ghost" onPress={() => Linking.openSettings()} />
        </View>
      )}

      <View style={s.privacy}>
        <Text style={s.privacyTitle}>위치 정보는 이렇게 씁니다</Text>
        <Text style={s.privacyTx}>
          · 위치는 <Text style={s.b}>기기 안에서만</Text> 사용하며 서버로 전송하거나 저장하지 않습니다.{'\n'}
          · 근처 판정과 알림 발송이 모두 기기에서 이뤄집니다.{'\n'}
          · 알림을 끄면 위치 사용도 즉시 중단됩니다.{'\n'}
          · 축제 정보는 한국관광공사 등 공공 API에서 받아옵니다.
        </Text>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  card: { padding: space(4), borderRadius: radius.card, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  sub: { fontSize: font.caption + 1, color: colors.textSub, lineHeight: 18 },
  stat: { padding: space(4), borderRadius: radius.card, backgroundColor: colors.bg2, gap: space(2) },
  statTx: { fontSize: font.body, color: colors.text, fontWeight: '700' },
  statNum: { color: colors.primary },
  warn: { padding: space(4), borderRadius: radius.card, backgroundColor: colors.primaryWeak, gap: space(3) },
  warnTx: { fontSize: font.caption + 1, color: colors.primaryDeep, lineHeight: 18 },
  privacy: { padding: space(4), borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, gap: space(2) },
  privacyTitle: { fontSize: font.caption + 1, fontWeight: '800', color: colors.text },
  privacyTx: { fontSize: font.caption, color: colors.textSub, lineHeight: 19 },
  b: { fontWeight: '800', color: colors.text },
})
