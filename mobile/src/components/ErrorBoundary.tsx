import React from 'react'
import { ScrollView, Text, View } from 'react-native'
import { colors } from '../theme'

// 렌더 단계의 JS 에러를 잡아 흰 화면 크래시 대신 내용을 화면에 표시한다.
// (네이티브 크래시는 못 잡지만, 대부분의 JS 런타임 에러를 가시화 → 원인 진단 + UX 보호)
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // 콘솔/Play vitals에 남도록 출력
    console.error('[ErrorBoundary]', error?.message, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 72, gap: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>문제가 발생했어요</Text>
          <Text style={{ color: colors.textSub, lineHeight: 20 }}>
            앱을 완전히 종료한 뒤 다시 열어 주세요. 계속 발생하면 아래 내용을 캡처해 보내주시면 바로 고치겠습니다.
          </Text>
          <Text selectable style={{ color: '#C2410C', fontSize: 13, fontWeight: '600' }}>
            {String(error?.message ?? error)}
          </Text>
          {!!error?.stack && (
            <Text selectable style={{ color: colors.textHint, fontSize: 11 }}>
              {error.stack.slice(0, 2000)}
            </Text>
          )}
        </ScrollView>
      </View>
    )
  }
}
