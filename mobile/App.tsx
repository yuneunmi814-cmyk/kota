import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from './src/auth/AuthContext'
import { RootNavigator } from './src/navigation/RootNavigator'
import { OnboardingScreen } from './src/screens/OnboardingScreen'
import { Loading } from './src/components/ui'
import { ErrorBoundary } from './src/components/ErrorBoundary'
import { isOnboarded, setOnboarded } from './src/lib/storage'
import { colors } from './src/theme'

function Root() {
  const { ready } = useAuth()
  const [onboarded, setOnboardedState] = useState<boolean | null>(null)

  useEffect(() => { isOnboarded().then(setOnboardedState) }, [])
  // 푸시 토큰 등록은 FCM(google-services.json) 구성 후 재활성화 — 미구성 상태의 네이티브 호출 크래시 방지
  // (lib/push.ts·백엔드 /users/me/push-tokens는 보존)

  if (!ready || onboarded === null) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loading /></View>
  if (!onboarded) return <OnboardingScreen onDone={() => { setOnboarded(); setOnboardedState(true) }} />
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthProvider>
          <Root />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}
