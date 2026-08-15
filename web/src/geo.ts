// 좌표 계산 공용 모듈.
//
// 위치는 브라우저 밖으로 내보내지 않는다 — 좌표는 서버로 전송하지 않고 여기서만 쓴다.
// (사업자는 위치기반서비스사업자로 신고돼 있으나, 수집하지 않는 편이 사용자에게도
//  우리에게도 안전하므로 클라이언트 계산 원칙을 유지한다.)

export type Coords = { lat: number; lng: number }

/** 두 지점 사이 거리(km). 축제에 좌표가 없으면 null */
export function distanceKm(a: Coords, f: { lat?: number | null; lng?: number | null }): number | null {
  if (f.lat == null || f.lng == null) return null
  const R = 6371
  const dLat = ((f.lat - a.lat) * Math.PI) / 180
  const dLng = ((f.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((f.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

const DAY = 86_400_000

/** 1년 이상 이어지는 상시 운영 행사인가 — '지금 근처' 집계에서는 제외한다 */
export function isAlwaysOn(f: { startDate: string; endDate: string }): boolean {
  return new Date(f.endDate).getTime() - new Date(f.startDate).getTime() >= 300 * DAY /* 1/1~12/31은 364일이라 365로 두면 빠진다 */
}

/** 내 주변 탐색 기본 반경(km) — 차로 30분 남짓, 여행 중 '들를 만한' 거리 */
export const NEARBY_RADIUS_KM = 20
