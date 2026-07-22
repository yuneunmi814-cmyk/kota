import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { runSeed } from './seed-core.js'

// 프로덕션 안전 시드 — 기동 시(Dockerfile) 1회 실행.
// runSeed()는 파괴적(전체 deleteMany 후 재생성)이므로, 반드시 가드를 통과할 때만 실행:
//   ① SEED_ON_START !== 'false'  (기본 활성 — 끄려면 환경변수 SEED_ON_START=false)
//   ② 기존 데이터가 비어 있음(region.count() === 0)  ← 이미 채워졌으면 절대 덮어쓰지 않음
//   ③ 예외: SEED_FORCE=true 면 데이터가 있어도 강제로 삭제 후 재시드(콘텐츠 갱신용 1회성).
//      ⚠️ 켜둔 채로 두면 재기동마다 데이터가 초기화되니, 갱신 후 반드시 다시 끌 것.
// 어떤 오류가 나도 서버 기동은 계속되도록 예외를 삼킨다(시드 실패가 배포를 막지 않게).
const prisma = new PrismaClient()
const force = process.env.SEED_FORCE === 'true'

interface BakedFestival {
  tourapiContentId: string
  regionSlug: string
  name: string
  summary: string | null
  address: string | null
  lat: number | null
  lng: number | null
  startDate: string
  endDate: string
  imageUrl: string | null
  tel: string | null
}

// 베이크된 실축제(prisma/seed-festivals.json, bake:festivals로 생성) 적재 — API 키 없이 실데이터 재현
async function seedBakedFestivals(): Promise<number> {
  let items: BakedFestival[]
  try {
    items = (JSON.parse(readFileSync(resolve(import.meta.dirname, 'seed-festivals.json'), 'utf-8')) as { items: BakedFestival[] }).items
  } catch {
    return 0 // 베이크 파일 없으면 조용히 건너뜀
  }
  const regions = await prisma.region.findMany({ select: { id: true, slug: true } })
  const bySlug = new Map(regions.map((r) => [r.slug, r.id]))
  let created = 0
  for (const f of items) {
    const regionId = bySlug.get(f.regionSlug)
    if (!regionId) continue
    const { regionSlug: _slug, tourapiContentId, startDate, endDate, ...data } = f
    await prisma.festival.upsert({
      where: { tourapiContentId },
      update: {},
      create: { ...data, tourapiContentId, regionId, startDate: new Date(startDate), endDate: new Date(endDate) },
    })
    created += 1
  }
  return created
}

try {
  if (process.env.SEED_ON_START === 'false' && !force) {
    console.log('[seed-prod] SEED_ON_START=false → 시드 건너뜀')
  } else {
    const existing = await prisma.region.count()
    if (existing > 0 && !force) {
      console.log(`[seed-prod] 이미 데이터 존재(지역 ${existing}곳) → 시드 건너뜀(덮어쓰지 않음)`)
    } else {
      if (force && existing > 0) console.warn(`[seed-prod] ⚠️ SEED_FORCE=true — 기존 데이터(지역 ${existing}곳)를 삭제하고 재시드합니다`)
      // 비번 env 미설정 시 고정 기본값 대신 랜덤 생성 — 공개 레포에 적힌 비번으로 프로덕션 관리자가 만들어지는 것 방지
      let password = process.env.SEED_ADMIN_PASSWORD
      if (!password) {
        password = randomBytes(9).toString('base64url')
        console.log(`[seed-prod] ⚠️ SEED_ADMIN_PASSWORD 미설정 → 랜덤 생성: ${password}`)
        console.log('[seed-prod]    (이 로그에서만 확인 가능 — 지금 기록해 두거나, env 설정 후 SEED_FORCE=true로 재시드하세요)')
      }
      const result = await runSeed(prisma, password, 10, { regions: true })
      const festivalCount = await seedBakedFestivals()
      const [regions, spots, courses] = await Promise.all([prisma.region.count(), prisma.spot.count(), prisma.course.count()])
      console.log(`[seed-prod] 초기 시드 완료 — 지역 ${regions}곳 / 스팟 ${spots} / 코스 ${courses} / 실축제 ${festivalCount}건(베이크)`)
      console.log(`[seed-prod] 발행 코스 #${result.publishedCourseId} · 관리자 super@/editor@/reviewer@kota.app`)
    }
  }
} catch (e) {
  console.error('[seed-prod] 시드 실패(서버 기동은 계속):', e instanceof Error ? e.message : e)
} finally {
  await prisma.$disconnect()
}
