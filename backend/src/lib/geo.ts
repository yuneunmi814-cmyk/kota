import { prisma } from './prisma.js'

// 체크인 반경 정책 (기획설계서 6.2 결정 3)
// 기본 300m, 카테고리 기본값 → spots.checkin_radius_m로 스팟별 오버라이드
const CATEGORY_RADIUS_M: Record<string, number> = {
  실내: 200,
  박물관: 200,
  전시: 200,
  카페: 200,
  맛집: 200,
  해변: 700,
  공원: 700,
  산: 1000,
  테마파크: 700,
}
export const DEFAULT_CHECKIN_RADIUS_M = 300

export function resolveCheckinRadius(spot: { checkinRadiusM: number | null; category: string }): number {
  return spot.checkinRadiusM ?? CATEGORY_RADIUS_M[spot.category] ?? DEFAULT_CHECKIN_RADIUS_M
}

/** PostGIS로 스팟과 좌표 간 거리(m) 계산 */
export async function distanceToSpotMeters(spotId: bigint, lat: number, lng: number): Promise<number> {
  const rows = await prisma.$queryRaw<{ distance: number }[]>`
    SELECT ST_Distance(location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distance
    FROM spots WHERE id = ${spotId}`
  return rows[0]?.distance ?? Number.POSITIVE_INFINITY
}

export async function nearbySpots(spotId: bigint, limitCount = 4) {
  return prisma.$queryRaw<{ id: bigint; name: string; category: string; distance_m: number }[]>`
    SELECT s.id, s.name, s.category,
           ST_Distance(s.location, t.location) AS distance_m
    FROM spots s, (SELECT location FROM spots WHERE id = ${spotId}) t
    WHERE s.id <> ${spotId} AND s.status = 'ACTIVE'
    ORDER BY s.location <-> t.location
    LIMIT ${limitCount}`
}

export async function writeCheckinLocation(visitId: bigint, lat: number, lng: number): Promise<void> {
  await prisma.$executeRaw`
    UPDATE trip_visits
    SET checkin_location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    WHERE id = ${visitId}`
}
