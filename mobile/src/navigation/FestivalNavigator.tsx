import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import FestivalListScreen from '../screens/FestivalListScreen'
import FestivalDetailScreen from '../screens/FestivalDetailScreen'
import NotifySettingsScreen from '../screens/NotifySettingsScreen'
import { colors } from '../theme'

// KOTA 축제 앱 네비게이션 — 웹과 같은 범위(축제 탐색·상세)에 앱만 되는 것(근처 알림)을 더한 구성.
//
// 기존 여행팩 화면(코스·마켓플레이스·결제)은 파일은 남기되 라우팅에서 제외했다.
// 결제 화면이 살아 있으면 스토어 심사에서 인앱결제 규정 문제가 생기고,
// 무엇보다 웹과 앱이 다른 제품이 되어 공모전 '동일 내용' 규정에 걸린다.

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function FestivalsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerTitleStyle: { fontWeight: '800' } }}>
      <Stack.Screen name="FestivalList" component={FestivalListScreen} options={{ title: '축제' }} />
      <Stack.Screen name="FestivalDetail" component={FestivalDetailScreen} options={{ title: '축제 상세' }} />
    </Stack.Navigator>
  )
}

export function FestivalNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.textHint,
      }}
    >
      <Tab.Screen
        name="FestivalsTab"
        component={FestivalsStack}
        options={{
          title: '축제',
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="NotifyTab"
        component={NotifySettingsScreen}
        options={{
          title: '알림',
          headerShown: true,
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  )
}
