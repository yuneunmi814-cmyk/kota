import { useEffect, useLayoutEffect } from 'react'
import { FlatList, Image, Pressable, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useResource } from '../api/useResource'
import { Card, ImagePlaceholder, Loading, EmptyState, Pill } from '../components/ui'
import { colors, space } from '../theme'
import type { ExploreStackParams } from '../navigation/types'
import type { CourseCard, Paged } from '../api/types'

type Props = NativeStackScreenProps<ExploreStackParams, 'CourseList'>

export function CourseListScreen({ navigation, route }: Props) {
  const { regionId, regionName } = route.params ?? {}
  const path = regionId ? `/courses?regionId=${regionId}&limit=20` : '/courses?limit=20'
  const { data, loading, error } = useResource<Paged<CourseCard>>(path, { deps: [regionId] })

  useLayoutEffect(() => {
    if (regionName) navigation.setOptions({ title: regionName })
  }, [navigation, regionName])

  if (loading) return <Loading />
  if (error || !data) return <EmptyState text={error ?? '불러오기 실패'} />
  if (data.items.length === 0) return <EmptyState text="등록된 코스가 없습니다" />

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5), gap: space(3) }}
      data={data.items}
      keyExtractor={(c) => c.id}
      renderItem={({ item: c }) => (
        <Pressable onPress={() => navigation.navigate('CourseDetail', { courseId: c.id })}>
          <Card>
            {c.cover ? <Image source={{ uri: c.cover }} style={{ height: 120, width: '100%' }} /> : <ImagePlaceholder height={120} />}
            <View style={{ padding: space(3), gap: 4 }}>
              <Text style={{ fontWeight: '600', fontSize: 14, color: colors.text }}>{c.title}</Text>
              <Text style={{ fontSize: 12, color: colors.textHint }}>
                {c.durationDays > 1 ? `${c.durationDays - 1}박${c.durationDays}일` : '당일'} · 명소 {c.spotCount}곳
                {c.estCost ? ` · 약 ${Math.round(c.estCost / 10000)}만원` : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                {c.themes.slice(0, 3).map((t) => <Pill key={t} label={t} />)}
              </View>
            </View>
          </Card>
        </Pressable>
      )}
    />
  )
}
