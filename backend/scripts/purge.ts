import { prisma } from '../src/lib/prisma.js'
import { runRetention } from '../src/modules/retention/purge.js'

// 데이터 파기 배치 (일 1회 크론 권장):
//   npm run purge            # 실제 파기
//   npm run purge -- --dry-run
const dryRun = process.argv.includes('--dry-run')

const s = await runRetention(new Date(), dryRun)
console.log(
  `▶ 데이터 파기${s.dryRun ? ' (dry-run)' : ''} — 탈퇴 회원 완전 파기 ${s.purgedUsers}건 · 체크인 좌표 NULL ${s.clearedCheckins}건`,
)
await prisma.$disconnect()
