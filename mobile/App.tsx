import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import { FestivalNavigator } from './src/navigation/FestivalNavigator'
import { ErrorBoundary } from './src/components/ErrorBoundary'
import { syncGeofences } from './src/festivals/geofence'
import { getFestivals } from './src/festivals/data'

// KOTA — 내 여행지 주변 축제.
//
// 앱은 웹과 같은 축제 데이터를 보되, 웹이 못 하는 한 가지를 한다:
// 찜한 축제 근처에 도착하면 알려주는 것(브라우저에는 백그라운드 지오펜싱이 없다).
//
// 로그인·온보딩은 두지 않는다 — 축제를 보는 데 계정이 필요할 이유가 없고,
// 심사 기간에 로그인은 리스크만 늘린다(웹도 같은 원칙).

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export default function App() {
  useEffect(() => {
    // 데이터를 먼저 데워두고(오프라인 대비) 감시 영역을 최신 찜 목록에 맞춘다.
    // 권한이 없으면 syncGeofences가 조용히 아무것도 안 한다.
    getFestivals()
      .then(() => syncGeofences())
      .catch(() => {})
  }, [])

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationContainer>
          <FestivalNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}
