import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'node:fs'

// 로컬 DB의 실축제(TOURAPI)를 prisma/seed-festivals.json 으로 베이크 — seed:prod가 프로덕션 첫 기동 때 적재
// (seed-videos.json 베이크와 같은 패턴 — 서버에 API 키 없이 실데이터 재현). 사용: npm run bake:festivals

async function main() {
  const prisma = new PrismaClient()
  const fs = await prisma.festival.findMany({
    where: { source: 'TOURAPI' },
    orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
    select: {
      tourapiContentId: true, name: true, summary: true, address: true, lat: true, lng: true,
      startDate: true, endDate: true, imageUrl: true, tel: true, region: { select: { slug: true } },
    },
  })
  const items = fs.map((f) => ({
    tourapiContentId: f.tourapiContentId, regionSlug: f.region.slug, name: f.name, summary: f.summary,
    address: f.address, lat: f.lat, lng: f.lng,
    startDate: f.startDate.toISOString().slice(0, 10), endDate: f.endDate.toISOString().slice(0, 10),
    imageUrl: f.imageUrl, tel: f.tel,
  }))
  writeFileSync('prisma/seed-festivals.json', JSON.stringify({ exportedAt: new Date().toISOString().slice(0, 10), items }, null, 1))
  console.log('baked', items.length)
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
