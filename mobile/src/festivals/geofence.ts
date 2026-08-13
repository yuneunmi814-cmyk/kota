import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { distanceKm, getFestivals, hasCoords, isLive, type Festival } from './data'
import { wishedKeys } from './wishlist'

// 지오펜싱 — 찜한 축제 근처에 가면 알림.
//
// 이 앱이 웹으로 못 하는 유일한 일이다. 브라우저에는 백그라운드 지오펜싱이 없다
// (W3C Geofencing API는 폐기됐고 크롬도 걷어냈다). 그래서 앱을 만든다.
//
// 설계를 좌우하는 제약: **iOS는 앱당 감시 영역이 20개**(CLLocationManager).
// 그래서 전국 718개가 아니라 '찜한 것 중 지금 유효한 축제 최대 20개'만 건다.
// 관심 없는 축제 알림은 어차피 스팸이므로 제약이 오히려 올바른 UX를 강제한다.
//
// 서버는 쓰지 않는다. 진입 감지도 알림 발송도 기기 안에서 끝난다 —
// 위치가 기기를 떠나지 않으므로 사용자에게 설명하기도 쉽다.

export const GEOFENCE_TASK = 'kota-festival-geofence'
export const RADIUS_M = 3000 // 3km — 차로 5분. 더 좁히면 지나쳐도 안 뜨고, 넓히면 성가시다
export const MAX_REGIONS = 20 // iOS 하드 제한

const NOTIFIED_KEY = 'kota.geofence.notified.v1'
const ENABLED_KEY = 'kota.geofence.enabled'

/** 한 축제당 한 번만 알린다 — 같은 곳을 오갈 때마다 울리면 앱을 지운다 */
async function alreadyNotified(externalId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(NOTIFIED_KEY)
  const map = raw ? (JSON.parse(raw) as Record<string, number>) : {}
  const at = map[externalId]
  if (!at) return false
  // 24시간이 지나면 다시 알릴 수 있게 — 축제가 여러 날이면 다음 날 다시 갈 수도 있다
  return Date.now() - at < 24 * 60 * 60 * 1000
}

async function markNotified(externalId: string) {
  const raw = await AsyncStorage.getItem(NOTIFIED_KEY)
  const map = raw ? (JSON.parse(raw) as Record<string, number>) : {}
  map[externalId] = Date.now()
  await AsyncStorage.setItem(NOTIFIED_KEY, JSON.stringify(map))
}

// 백그라운드 태스크 — 앱이 꺼져 있어도 OS가 깨워서 실행한다.
// 모듈 최상단에서 정의해야 한다(앱 부팅 시 등록되어야 OS가 찾을 수 있음).
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) return
  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType
    region: Location.LocationRegion & { identifier?: string }
  }
  if (eventType !== Location.GeofencingEventType.Enter) return
  const externalId = region.identifier
  if (!externalId) return

  try {
    if (await alreadyNotified(externalId)) return
    const festivals = await getFestivals()
    const f = festivals.find((x) => x.externalId === externalId)
    if (!f || !isLive(f)) return // 끝난 축제 알림은 최악이다

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${f.name}`,
        body: `근처예요. ${f.startDate.slice(5)}~${f.endDate.slice(5)}${f.placeName ? ` · ${f.placeName}` : ''}`,
        data: { externalId },
      },
      trigger: null, // 즉시
    })
    await markNotified(externalId)
  } catch {
    // 백그라운드에서 던지면 OS가 태스크를 죽인다 — 조용히 넘어간다
  }
})

export interface PermissionState {
  foreground: boolean
  background: boolean
}

/** 위치 권한 요청 — 백그라운드는 전경 허용 뒤에만 물을 수 있다(OS 규칙) */
export async function requestPermissions(): Promise<PermissionState> {
  const fg = await Location.requestForegroundPermissionsAsync()
  if (fg.status !== 'granted') return { foreground: false, background: false }
  const bg = await Location.requestBackgroundPermissionsAsync()
  return { foreground: true, background: bg.status === 'granted' }
}

export async function getPermissions(): Promise<PermissionState> {
  const fg = await Location.getForegroundPermissionsAsync()
  const bg = await Location.getBackgroundPermissionsAsync()
  return { foreground: fg.status === 'granted', background: bg.status === 'granted' }
}

/**
 * 감시할 축제를 고른다 — 찜한 것 중 좌표가 있고 지금 유효한 것,
 * 20개가 넘으면 현재 위치에서 가까운 순으로 자른다.
 */
export async function pickRegions(here?: { lat: number; lng: number }): Promise<Festival[]> {
  const [keys, festivals] = await Promise.all([wishedKeys(), getFestivals()])
  const wished = festivals.filter((f) => keys.includes(f.externalId) && hasCoords(f) && isLive(f))
  if (wished.length <= MAX_REGIONS) return wished
  const origin = here
  if (!origin) return wished.slice(0, MAX_REGIONS)
  return [...wished]
    .sort((a, b) => distanceKm(origin, a as any) - distanceKm(origin, b as any))
    .slice(0, MAX_REGIONS)
}

/** 지오펜싱 켜기 — 찜이 바뀌거나 앱이 켜질 때마다 다시 부르면 된다(멱등) */
export async function syncGeofences(): Promise<{ started: boolean; count: number; reason?: string }> {
  const perm = await getPermissions()
  if (!perm.background) return { started: false, count: 0, reason: 'no-background-permission' }

  let here: { lat: number; lng: number } | undefined
  try {
    const pos = await Location.getLastKnownPositionAsync()
    if (pos) here = { lat: pos.coords.latitude, lng: pos.coords.longitude }
  } catch {
    // 위치를 못 잡아도 찜 상위 20개로 진행한다
  }

  const targets = await pickRegions(here)
  const running = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(() => false)
  if (running) await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {})

  if (targets.length === 0) return { started: false, count: 0, reason: 'no-targets' }

  await Location.startGeofencingAsync(
    GEOFENCE_TASK,
    targets.map((f) => ({
      identifier: f.externalId,
      latitude: f.lat as number,
      longitude: f.lng as number,
      radius: RADIUS_M,
      notifyOnEnter: true,
      notifyOnExit: false,
    })),
  )
  await AsyncStorage.setItem(ENABLED_KEY, '1')
  return { started: true, count: targets.length }
}

/** 지오펜싱 끄기 */
export async function stopGeofences(): Promise<void> {
  const running = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(() => false)
  if (running) await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {})
  await AsyncStorage.setItem(ENABLED_KEY, '0')
}

export async function isGeofencingOn(): Promise<boolean> {
  const flag = await AsyncStorage.getItem(ENABLED_KEY)
  if (flag !== '1') return false
  return Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(() => false)
}
