import { ScrollView, Text, View, Pressable, Image } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useResource } from '../api/useResource'
import { Card, ImagePlaceholder, Loading, EmptyState } from '../components/ui'
import { colors, space } from '../theme'
import type { ExploreStackParams } from '../navigation/types'
import type { Region } from '../api/types'

type Props = NativeStackScreenProps<ExploreStackParams, 'Regions'>

export function RegionsScreen({ navigation }: Props) {
  const { data, loading, error } = useResource<{ regions: Region[] }>('/regions')
  if (loading) return <Loading />
  if (error || !data) return <EmptyState text={error ?? '불러오기 실패'} />

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(5) }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(3) }}>
        {data.regions.map((r) => (
          <Pressable
            key={r.id}
            style={{ width: '47.5%' }}
            onPress={() => navigation.navigate('CourseList', { regionId: r.id, regionName: r.name })}
          >
            <Card>
              {r.thumbnailUrl ? <Image source={{ uri: r.thumbnailUrl }} style={{ height: 96, width: '100%' }} /> : <ImagePlaceholder height={96} />}
              <View style={{ padding: space(3) }}>
                <Text style={{ fontWeight: '600', color: colors.text }}>{r.name}</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  )
}
