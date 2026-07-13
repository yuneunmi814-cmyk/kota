import { execSync } from 'node:child_process'

// 테스트 DB에 마이그레이션 적용
export default function setup(): void {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://yoon@localhost:5432/kota_test'
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  })
}
