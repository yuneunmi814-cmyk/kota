import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { Errors } from '../../lib/errors.js'
import { h, ok } from '../../lib/respond.js'
import { parseId, parsePage } from '../../lib/util.js'

export const festivalsRouter = Router()

const festivalSelect = {
  id: true, name: true, summary: true, address: true, lat: true, lng: true,
  startDate: true, endDate: true, imageUrl: true, tel: true,
  region: { select: { id: true, name: true, slug: true, visitorScore: true } },
} satisfies Prisma.FestivalSelect
type FestivalForCard = Prisma.FestivalGetPayload<{ select: typeof festivalSelect }>

// KST 기준 오늘 00:00 (UTC Date 컬럼과 비교용)
function todayKst(): Date {
  const kst = new Date(Date.now() + 9 * 3600_000)
  return new Date(`${kst.toISOString().slice(0, 10)}T00:00:00Z`)
}

function toCard(f: FestivalForCard, today: Date) {
  return {
    id: f.id,
    name: f.name,
    summary: f.summary,
    address: f.address,
    lat: f.lat,
    lng: f.lng,
    startDate: f.startDate.toISOString().slice(0, 10),
    endDate: f.endDate.toISOString().slice(0, 10),
    imageUrl: f.imageUrl,
    tel: f.tel,
    region: { id: f.region.id, name: f.region.name, slug: f.region.slug },
    popularity: f.region.visitorScore, // 지역 방문자수(관광 빅데이터) 기반 인기 프록시
    // 진행중(ongoing) / 예정(upcoming) / 종료(ended) — KST 오늘 기준
    status: f.endDate < today ? 'ended' : f.startDate <= today ? 'ongoing' : 'upcoming',
  }
}

// YYYY-MM-DD → UTC Date
function parseDateParam(v: unknown, name: string): Date | undefined {
  if (typeof v !== 'string' || v === '') return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw Errors.validation(`${name}은 YYYY-MM-DD 형식이어야 합니다`)
  const d = new Date(`${v}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) throw Errors.validation(`${name}이 올바른 날짜가 아닙니다`)
  return d
}

// 시작일 오름차순 정렬용 복합 커서 — "YYYY-MM-DD_<id>" (id 단독 커서는 날짜 정렬과 어긋남)
function parseFestivalCursor(v: unknown): { startDate: Date; id: bigint } | null {
  if (typeof v !== 'string') return null
  const m = /^(\d{4}-\d{2}-\d{2})_(\d+)$/.exec(v)
  if (!m) return null
  const d = new Date(`${m[1]}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : { startDate: d, id: BigInt(m[2]!) }
}

// 축제 목록 — 기본: 진행중+예정(endDate >= 오늘), 시작일 오름차순. ?region=slug ?from= ?to= ?includeEnded=1
festivalsRouter.get(
  '/festivals',
  h(async (req, res) => {
    const { limit } = parsePage(req.query as Record<string, unknown>, 20, 50)
    const cursor = parseFestivalCursor(req.query.cursor)
    const regionSlug = typeof req.query.region === 'string' && req.query.region !== '' ? req.query.region : undefined
    const from = parseDateParam(req.query.from, 'from')
    const to = parseDateParam(req.query.to, 'to')
    const includeEnded = req.query.includeEnded === '1' || req.query.includeEnded === 'true'
    const today = todayKst()

    const where: Prisma.FestivalWhereInput = {
      ...(regionSlug ? { region: { slug: regionSlug } } : {}),
      // from~to 기간과 겹치는 축제 (시작 ≤ to && 종료 ≥ from)
      ...(from ? { endDate: { gte: from } } : includeEnded ? {} : { endDate: { gte: today } }),
      ...(to ? { startDate: { lte: to } } : {}),
      ...(cursor
        ? { OR: [{ startDate: { gt: cursor.startDate } }, { startDate: cursor.startDate, id: { gt: cursor.id } }] }
        : {}),
    }

    const items = await prisma.festival.findMany({
      where,
      orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
      take: limit,
      select: festivalSelect,
    })
    const last = items.length === limit ? items[items.length - 1] : undefined
    ok(res, {
      items: items.map((f) => toCard(f, today)),
      nextCursor: last ? `${last.startDate.toISOString().slice(0, 10)}_${last.id}` : null,
    })
  }),
)

// 축제 달력 — 월 단위 날짜별 진행 축제 수 (회의록 7/1: "축제 많은 날"로 여행일 선정)
festivalsRouter.get(
  '/festivals/calendar',
  h(async (req, res) => {
    const year = Number(req.query.year)
    const month = Number(req.query.month)
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw Errors.validation('year(2000~2100)를 지정하세요')
    if (!Number.isInteger(month) || month < 1 || month > 12) throw Errors.validation('month(1~12)를 지정하세요')
    const regionSlug = typeof req.query.region === 'string' && req.query.region !== '' ? req.query.region : undefined

    const monthStart = new Date(Date.UTC(year, month - 1, 1))
    const nextMonth = new Date(Date.UTC(year, month, 1))

    const festivals = await prisma.festival.findMany({
      where: {
        startDate: { lt: nextMonth },
        endDate: { gte: monthStart },
        ...(regionSlug ? { region: { slug: regionSlug } } : {}),
      },
      select: { startDate: true, endDate: true },
    })

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const counts = new Array<number>(daysInMonth).fill(0)
    for (const f of festivals) {
      const first = f.startDate > monthStart ? f.startDate.getUTCDate() : 1
      const lastDate = f.endDate < nextMonth ? f.endDate : new Date(Date.UTC(year, month - 1, daysInMonth))
      const last = lastDate.getUTCMonth() === month - 1 ? lastDate.getUTCDate() : daysInMonth
      for (let d = first; d <= last; d += 1) counts[d - 1] = (counts[d - 1] ?? 0) + 1
    }

    ok(res, {
      year,
      month,
      days: counts.map((count, i) => ({ date: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`, count })),
    })
  }),
)

// 축제 상세 — 좌표 있으면 주변 관광지·맛집(반경 3km, 가까운 순 8곳)까지
festivalsRouter.get(
  '/festivals/:festivalId',
  h(async (req, res) => {
    const id = parseId(req.params.festivalId, 'festivalId')
    const festival = await prisma.festival.findUnique({ where: { id }, select: festivalSelect })
    if (!festival) throw Errors.notFound('축제')

    let nearbySpots: { id: bigint; name: string; category: string; distanceM: number }[] = []
    if (festival.lat != null && festival.lng != null) {
      const rows = await prisma.$queryRaw<{ id: bigint; name: string; category: string; distance_m: number }[]>`
        SELECT id, name, category,
               ST_Distance(location, ST_SetSRID(ST_MakePoint(${festival.lng}, ${festival.lat}), 4326)::geography) AS distance_m
        FROM spots
        WHERE status = 'ACTIVE' AND location IS NOT NULL
          AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${festival.lng}, ${festival.lat}), 4326)::geography, 3000)
        ORDER BY distance_m ASC
        LIMIT 8`
      nearbySpots = rows.map((r) => ({ id: r.id, name: r.name, category: r.category, distanceM: Math.round(r.distance_m) }))
    }

    ok(res, { ...toCard(festival, todayKst()), nearbySpots })
  }),
)
