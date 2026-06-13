// API 베이스. 안드로이드 에뮬레이터는 호스트 localhost를 10.0.2.2로 접근.
// 실기기/배포는 EXPO_PUBLIC_API_BASE로 주입(예: https://api.travelpack.app/api/v1).
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ?? 'http://10.0.2.2:4000/api/v1'

// 체크인 기본 반경(서버가 최종 검증하지만 클라 선검증용 표시값)
export const DEFAULT_CHECKIN_RADIUS_M = 300
