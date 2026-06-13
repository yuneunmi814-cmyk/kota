import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import KakaoMapView, { KakaoMap } from '@react-native-kakao/map'
import { colors } from '../theme'

// 카카오 네이티브 키가 있을 때만 실제 지도를 렌더(네이티브 dev build 필요).
// 키가 없으면(Expo Go·미설정) 플레이스홀더로 폴백 → 앱은 정상 동작.
const KAKAO_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY ?? ''
export const MAP_ENABLED = Boolean(KAKAO_KEY)

let initPromise: Promise<void> | null = null
function ensureInit(): Promise<void> {
  if (!initPromise) initPromise = KakaoMap.initializeKakaoMapSDK(KAKAO_KEY)
  return initPromise
}

export interface MapMarker { lat: number; lng: number; label?: string; done?: boolean }

interface Props {
  lat: number
  lng: number
  markers?: MapMarker[]
  zoomLevel?: number
  height?: number
  style?: ViewStyle
}

export function MapView({ lat, lng, markers, zoomLevel = 13, height = 200, style }: Props) {
  const [ready, setReady] = useState(false)
  const failed = useRef(false)

  useEffect(() => {
    if (!MAP_ENABLED) return
    ensureInit().then(() => setReady(true)).catch(() => { failed.current = true; setReady(false) })
  }, [])

  if (!MAP_ENABLED || failed.current) {
    return <Placeholder height={height} markers={markers} style={style} />
  }

  return (
    <View style={[{ height, borderRadius: 12, overflow: 'hidden' }, style]}>
      {ready ? (
        <KakaoMapView style={{ flex: 1 }} initialCamera={{ lat, lng, zoomLevel }} />
      ) : (
        <Placeholder height={height} markers={markers} />
      )}
    </View>
  )
}

function Placeholder({ height, markers, style }: { height: number; markers?: MapMarker[]; style?: ViewStyle }) {
  const done = markers?.filter((m) => m.done).length ?? 0
  return (
    <View style={[styles.ph, { height }, style]}>
      <Text style={styles.phText}>지도</Text>
      {markers && markers.length > 0 && (
        <Text style={styles.phSub}>경유지 {markers.length}곳{done ? ` · ${done} 완료` : ''}</Text>
      )}
      {!MAP_ENABLED && <Text style={styles.phHint}>카카오 키 설정 시 지도 표시</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  ph: { backgroundColor: colors.bg2, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4 },
  phText: { color: colors.textSub, fontWeight: '600' },
  phSub: { color: colors.textHint, fontSize: 12 },
  phHint: { color: colors.textHint, fontSize: 11 },
})
