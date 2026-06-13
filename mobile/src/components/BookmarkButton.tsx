import { useState } from 'react'
import { Alert, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { colors } from '../theme'

interface Props {
  targetType: 'COURSE' | 'SPOT'
  targetId: string
  initial: boolean | null
  size?: number
}

export function BookmarkButton({ targetType, targetId, initial, size = 24 }: Props) {
  const { isAuthed } = useAuth()
  const [saved, setSaved] = useState(Boolean(initial))
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (!isAuthed) {
      Alert.alert('로그인이 필요해요', 'MY 탭에서 로그인하면 저장할 수 있어요.')
      return
    }
    const next = !saved
    setSaved(next) // 낙관적 갱신
    setBusy(true)
    try {
      if (next) await api('/bookmarks', { method: 'POST', auth: true, body: { targetType, targetId } })
      else await api(`/bookmarks?targetType=${targetType}&targetId=${targetId}`, { method: 'DELETE', auth: true })
    } catch (e) {
      setSaved(!next) // 롤백
      Alert.alert('오류', e instanceof ApiError ? e.message : '처리 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Pressable onPress={toggle} disabled={busy} hitSlop={8}>
      <Ionicons name={saved ? 'heart' : 'heart-outline'} size={size} color={saved ? colors.primary : colors.textSub} />
    </Pressable>
  )
}
