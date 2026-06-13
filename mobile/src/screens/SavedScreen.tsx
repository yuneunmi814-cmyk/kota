import { useCallback } from 'react'
import { FlatList, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useResource } from '../api/useResource'
import { useAuth } from '../auth/AuthContext'
import { Card, Loading, EmptyState } from '../components/ui'
import { colors, space } from '../theme'
import type { Paged } from '../api/types'

interface BookmarkRow {
  bookmarkId: string
  targetType: 'COURSE' | 'SPOT'
  target: { id: string; title?: string; name?: string; region?: string; durationDays?: number; spotCount?: number }
}

export function SavedScreen() {
  const { isAuthed } = useAuth()
  const { data, loading, error, reload } = useResource<Paged<BookmarkRow>>(isAuthed ? '/users/me/bookmarks?limit=20' : null, { auth: true })
  useFocusEffect(useCallback(() => { if (isAuthed) reload() }, [isAuthed, reload]))

  if (!isAuthed) return <EmptyState text="로그인하면 저장한 코스를 볼 수 있어요" />
  if (loading) return <Loading />
  if (error || !data) return <EmptyState text={error ?? '불러오기 실패'} />
  if (data.items.length === 0) return <EmptyState text="저장한 항목이 없어요" />

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5), gap: space(3) }}
      data={data.items}
      keyExtractor={(b) => b.bookmarkId}
      renderItem={({ item: b }) => (
        <Card style={{ padding: space(4) }}>
          <Text style={{ fontWeight: '600', color: colors.text }}>{b.target.title ?? b.target.name}</Text>
          {b.targetType === 'COURSE' && (
            <Text style={{ color: colors.textHint, fontSize: 12, marginTop: 4 }}>
              {b.target.region} · 명소 {b.target.spotCount}곳
            </Text>
          )}
        </Card>
      )}
    />
  )
}
