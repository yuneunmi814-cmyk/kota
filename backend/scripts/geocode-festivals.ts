import { prisma } from '../src/lib/prisma.js'
import { searchKeywordPlaces, type KeywordPlace } from '../src/modules/tourapi/client.js'

// 좌표 없는 축제 지오코딩 배치 — TourAPI 키워드 검색(searchKeyword2)으로 개최 장소의 좌표를 찾는다.
// 문체부 연간 개최계획(source=MCST)은 좌표가 없어 거리순 정렬에서 밀린다.
//
// 오매칭이 최악이다(엉뚱한 도시의 "체육공원"에 붙으면 거리순이 거짓말을 한다) —
// 그래서 검색 결과 주소가 해당 축제의 시군구(없으면 시도)와 일치할 때만 채택한다.
// 멱등: 좌표 있는 축제는 건너뛰므로 429로 끊겨도 재실행하면 이어서 된다.
// 사용: npm run geocode:festivals [-- --max=200] [--dry-run]

const dryRun = process.argv.includes('--dry-run')
const maxArg = process.argv.find((a) => a.startsWith('--max='))
const MAX = maxArg ? Number(maxArg.slice(6)) : Infinity

// "청주시"→"청주", "홍성군"→"홍성", "수영구"→"수영" — 주소 표기 흔들림에 견디게 접미사 제거
function coreName(v: string): string {
  return v.replace(/(특별자치도|특별자치시|특별시|광역시|도|시|군|구)$/, '')
}

// 쿼터 소진 시 TourAPI는 에러가 아니라 '정상 모양의 빈 응답'을 준다(2026-08-06 실측 — 1,024회 헛호출).
// 반드시 있는 키워드로 살아있는지 확인한다.
async function quotaAlive(): Promise<boolean> {
  try { return (await searchKeywordPlaces('경복궁')).length > 0 } catch { return false }
}

async function main() {
  const today = new Date(new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10))
  const targets = await prisma.festival.findMany({
    where: { endDate: { gte: today }, lat: null },
    orderBy: [{ startDate: 'asc' }],
    select: { id: true, name: true, summary: true, sido: true, sigungu: true },
  })
  console.log(`▶ 좌표 없는 예정 축제 ${targets.length}건${dryRun ? ' (DRY-RUN)' : ''}${Number.isFinite(MAX) ? ` · 최대 ${MAX}건` : ''}`)

  if (!(await quotaAlive())) {
    console.log('✖ TourAPI 일일 호출 한도 소진 상태 — 내일(자정 리셋) 재실행하세요. 멱등이라 이어서 됩니다.')
    await prisma.$disconnect()
    return
  }
  let ok = 0
  let miss = 0
  let calls = 0
  let missStreak = 0

  for (const f of targets.slice(0, Number.isFinite(MAX) ? MAX : undefined)) {
    // 후보 키워드: ① 첫 시설명("A광장 및 B공원"→"A광장") ② 시군구+시설명 ③ 축제명
    const rawPlace = f.summary?.split('·')[0]?.trim()
    const firstVenue = rawPlace
      ?.split(/[,及및~()]|\s및\s/)[0]
      ?.trim()
      .replace(/\s*(일원|일대|일읍|등|내)$/g, '')
      .trim()
    const withCity = firstVenue && f.sigungu ? `${coreName(f.sigungu)} ${firstVenue}` : undefined
    const cityWords = new Set([f.sigungu, f.sido, coreName(f.sigungu ?? ''), coreName(f.sido ?? '')])
    const candidates = [...new Set([firstVenue, withCity, f.name].filter(
      (k): k is string => Boolean(k && k.length >= 3 && k !== '미정' && !cityWords.has(k)), // 시군구명 자체는 검색 안 함(아무 장소나 걸림)
    ))]
    // 오매칭 방지 이중 검증: 시도가 맞아야 하고, 시군구는 온전한 이름으로 대조
    // ("중구"→"중" 축약은 부산 중구/울산 중구/대전 중구를 구분 못 해 사고가 난다 — 실측)
    const sidoCore = coreName(f.sido ?? '')
    const sigunguFull = f.sigungu ?? null

    let found: { lat: number; lng: number; via: string } | null = null
    for (const kw of candidates) {
      let items: KeywordPlace[]
      try {
        calls += 1
        items = await searchKeywordPlaces(kw)
      } catch (e) {
        if (e instanceof Error && /429|Too Many/i.test(e.message)) {
          console.log(`⚠ 호출 한도(429) — ${ok}건 반영 후 중단. 재실행하면 이어서 진행됩니다.`)
          await prisma.$disconnect()
          return
        }
        continue
      }
      const hit = items.find(
        (it) =>
          it.mapx && it.mapy && it.addr1 && sidoCore && it.addr1.includes(sidoCore) &&
          (!sigunguFull || it.addr1.includes(sigunguFull) || it.addr1.includes(coreName(sigunguFull) + '시') || it.addr1.includes(coreName(sigunguFull) + '군')),
      )
      if (hit) {
        found = { lat: Number(hit.mapy), lng: Number(hit.mapx), via: `${kw} → ${hit.title}` }
        break
      }
      await new Promise((r) => setTimeout(r, 150))
    }

    if (found) {
      ok += 1
      if (!dryRun) await prisma.festival.update({ where: { id: f.id }, data: { lat: found.lat, lng: found.lng } })
      if (ok <= 15 || ok % 50 === 0) console.log(`  ✓ [${ok}] ${f.name} (${f.sigungu ?? f.sido}) ← ${found.via}`)
    } else {
      miss += 1
      missStreak += 1
      if (missStreak >= 40) { // 연속 40건 미스 → 쿼터가 도중에 죽었는지 재확인
        if (!(await quotaAlive())) {
          console.log(`⚠ 호출 한도 소진 감지 — ${ok}건 반영 후 중단. 재실행하면 이어서 진행됩니다.`)
          break
        }
        missStreak = 0
      }
    }
    if (found) missStreak = 0
  }

  console.log(`✔ 좌표 확보 ${ok}건 · 미확보 ${miss}건 · API 호출 ${calls}회${dryRun ? ' (dry-run)' : ''}`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
