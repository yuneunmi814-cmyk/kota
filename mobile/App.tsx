import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from './src/auth/AuthContext'
import { RootNavigator } from './src/navigation/RootNavigator'
import { OnboardingScreen } from './src/screens/OnboardingScreen'
import { Loading } from './src/components/ui'
import { isOnboarded, setOnboarded } from './src/lib/storage'
import { logAndroidKeyHash } from './src/lib/devKeyHash'
import { registerPushToken } from './src/lib/push'
import { colors } from './src/theme'

function Root() {
  const { ready, isAuthed } = useAuth()
  const [onboarded, setOnboardedState] = useState<boolean | null>(null)

  useEffect(() => { isOnboarded().then(setOnboardedState) }, [])
  // 로그인 상태가 되면 FCM 푸시 토큰 등록
  useEffect(() => { if (isAuthed) registerPushToken() }, [isAuthed])

  if (!ready || onboarded === null) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loading /></View>
  if (!onboarded) return <OnboardingScreen onDone={() => { setOnboarded(); setOnboardedState(true) }} />
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  )
}

export default function App() {
  useEffect(() => { logAndroidKeyHash() }, [])
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
