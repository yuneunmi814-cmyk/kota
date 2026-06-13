import supertest from 'supertest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { runSeed, type SeedResult } from '../prisma/seed-core.js'
import { issueSession } from '../src/modules/auth/session.js'

export const app = createApp()
export const api = supertest(app)

export async function seedAll(): Promise<SeedResult> {
  return runSeed(prisma, 'test-admin-pw', 4)
}

export const BASE_CONSENTS = [
  { type: 'TERMS', agreed: true, version: '1.0' },
  { type: 'PRIVACY', agreed: true, version: '1.0' },
  { type: 'AGE14', agreed: true, version: '1.0' },
]

let userSeq = 0
export async function signupUser(): Promise<{ userId: string; accessToken: string; refreshToken: string }> {
  userSeq += 1
  const res = await api
    .post('/api/v1/auth/signup')
    .send({ email: `user${userSeq}@test.dev`, password: 'passw0rd1', nickname: `테스터${userSeq}`, consents: BASE_CONSENTS })
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body.data
}

export async function adminToken(adminId: bigint, role: string): Promise<string> {
  const { accessToken } = await issueSession(adminId, 'admin', role)
  return accessToken
}

export { prisma }
