import { useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'
import { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_CLIENT_ID, GOOGLE_ENABLED, GOOGLE_IOS_CLIENT_ID, KAKAO_ENABLED } from '../auth/social'
import { Button } from '../components/ui'
import { colors, radius, space } from '../theme'
import type { MyStackParams } from '../navigation/types'

WebBrowser.maybeCompleteAuthSession()

type Props = NativeStackScreenProps<MyStackParams, 'Login'>

export function LoginScreen({ navigation }: Props) {
  const { login, signup, socialLogin } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (mode === 'signup') {
      if (!email.trim() || !password || nickname.trim().length < 2) {
        Alert.alert('확인', '이메일·비밀번호·닉네임(2자 이상)을 입력하세요')
        return
      }
      // 가입은 약관 동의 화면을 거친다 (AU-02)
      navigation.navigate('Consent', { email: email.trim(), password, nickname: nickname.trim() })
      return
    }
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigation.goBack()
    } catch (e) {
      Alert.alert('실패', e instanceof ApiError ? e.message : '처리 실패')
    } finally {
      setBusy(false)
    }
  }

  async function social(provider: 'kakao' | 'google') {
    setBusy(true)
    try {
      await socialLogin(provider)
      navigation.goBack()
    } catch (e) {
      Alert.alert('소셜 로그인', e instanceof ApiError ? e.message : e instanceof Error ? e.message : '실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: space(6), gap: space(4) }}>
        <Text style={styles.title}>{mode === 'login' ? '로그인' : '회원가입'}</Text>

        <Field label="이메일">
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
        </Field>
        {mode === 'signup' && (
          <Field label="닉네임">
            <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder="여행하는곰" />
          </Field>
        )}
        <Field label="비밀번호">
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="8자 이상, 영문+숫자" />
        </Field>

        <Button title={busy ? '처리 중…' : mode === 'login' ? '로그인' : '가입하기'} onPress={submit} disabled={busy} />
        <Text style={styles.switch} onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? '계정이 없으신가요? 가입하기' : '이미 계정이 있으신가요? 로그인'}
        </Text>

        <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>또는</Text><View style={styles.line} /></View>

        <Button
          title={KAKAO_ENABLED ? '카카오로 시작' : '카카오 로그인 (키 설정 필요)'}
          kind="navy" onPress={() => social('kakao')} disabled={busy || !KAKAO_ENABLED}
        />
        {GOOGLE_ENABLED
          ? <GoogleButton busy={busy} setBusy={setBusy} onDone={() => navigation.goBack()} />
          : <Button title="Google 로그인 (키 설정 필요)" kind="ghost" disabled onPress={() => {}} />}
      </View>
    </KeyboardAvoidingView>
  )
}

// 구글 로그인 — useIdTokenAuthRequest는 플랫폼 클라이언트ID가 없으면 렌더 시 throw하므로
// GOOGLE_ENABLED일 때만 이 컴포넌트를 렌더한다(훅은 조건부 호출 불가 → 컴포넌트 단위로 게이트).
function GoogleButton({ busy, setBusy, onDone }: { busy: boolean; setBusy: (b: boolean) => void; onDone: () => void }) {
  const { socialLoginWithToken } = useAuth()
  const [req, res, prompt] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_ID || undefined,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
  })
  useEffect(() => {
    if (res?.type !== 'success' || !res.params?.id_token) return
    setBusy(true)
    socialLoginWithToken('google', res.params.id_token)
      .then(onDone)
      .catch((e) => Alert.alert('구글 로그인', e instanceof ApiError ? e.message : '실패'))
      .finally(() => setBusy(false))
  }, [res])
  return <Button title="Google로 시작" kind="ghost" onPress={() => prompt()} disabled={busy || !req} />
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textSub, fontSize: 13 }}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.button, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.text },
  switch: { color: colors.textSub, textAlign: 'center', fontSize: 13 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  or: { color: colors.textHint, fontSize: 12 },
})
