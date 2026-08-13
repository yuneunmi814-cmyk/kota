// Expo 앱 설정.
//
// .ts가 아니라 .js인 이유: Node 26이 타입 스트리핑에서 'transform' 모드를 없애
// Expo CLI가 app.config.ts를 읽지 못한다("options.mode must be one of: 'strip'").
// 설정 파일 하나 때문에 로컬에서 앱을 못 띄우는 게 더 손해라 JS로 둔다.
// 타입은 JSDoc으로 유지한다.

// 카카오 네이티브 앱 키 — .env의 EXPO_PUBLIC_KAKAO_NATIVE_KEY로 주입(카카오 개발자센터 발급).
const KAKAO_NATIVE_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY ?? ''

/** @type {NonNullable<import('expo/config').ExpoConfig['plugins']>} */
const plugins = [
  ['expo-splash-screen', { backgroundColor: '#1D3557', image: './assets/splash-icon.png', imageWidth: 180 }],
  // 지오펜싱 — 찜한 축제 3km 안에 들어오면 알린다. 백그라운드 위치가 있어야 앱이 꺼져 있어도 동작한다.
  // 심사 리젝 1순위가 '왜 항상 위치가 필요한지 불명확'이므로 문구에 용도를 그대로 적는다.
  [
    'expo-location',
    {
      locationWhenInUsePermission: '지금 내 주변에서 열리는 축제를 찾기 위해 위치를 사용합니다.',
      locationAlwaysAndWhenInUsePermission:
        '찜한 축제 근처에 도착했을 때 알려드리기 위해 위치를 사용합니다. 위치는 기기 안에서만 쓰이며 서버로 전송하지 않습니다.',
      isAndroidBackgroundLocationEnabled: true,
      isIosBackgroundLocationEnabled: true,
    },
  ],
  ['expo-notifications', { color: '#1D3557' }],
  // 카카오 SDK(com.kakao.sdk:* — 로그인용)는 mavenCentral이 아닌 카카오 전용 저장소에만 있어 추가 필수
  ['expo-build-properties', { android: { extraMavenRepos: ['https://devrepo.kakao.com/nexus/content/groups/public/'] } }],
]
// 카카오 SDK(지도·로그인) — 키가 있을 때만 네이티브 설정 주입
if (KAKAO_NATIVE_KEY) plugins.push(['@react-native-kakao/core', { nativeAppKey: KAKAO_NATIVE_KEY }])

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: 'KOTA',
  slug: 'travelpack',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'travelpack',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.travelpack.mobile',
    // 표준 암호화(HTTPS)만 사용 → App Store 수출규정 자진신고 면제
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: 'app.travelpack.mobile',
    adaptiveIcon: {
      backgroundColor: '#1D3557',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    // ACCESS_BACKGROUND_LOCATION — 앱이 꺼진 상태에서도 지오펜스 진입을 받으려면 필요.
    // FOREGROUND_SERVICE는 expo-location이 백그라운드 위치용으로 요구한다.
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'POST_NOTIFICATIONS',
    ],
    predictiveBackGestureEnabled: false,
  },
  plugins,
  web: { favicon: './assets/favicon.png' },
  owner: 'eunmiyoon',
  extra: { eas: { projectId: '1f304bfc-316e-4c2e-bde2-925ee7040daf' } },
}

module.exports = config
