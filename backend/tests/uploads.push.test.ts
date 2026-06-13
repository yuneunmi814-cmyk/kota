import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminToken, api, seedAll, signupUser } from './helpers.js'
import { createPresignedUpload } from '../src/modules/uploads/s3.js'
import type { SeedResult } from '../prisma/seed-core.js'

let seed: SeedResult

describe('파일 업로드 (3.7)', () => {
  let token: string
  beforeAll(async () => {
    await seedAll()
    token = (await signupUser()).accessToken
  })

  it('S3 미설정 시 503', async () => {
    const res = await api.post('/api/v1/uploads/presigned-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'image/jpeg', purpose: 'REVIEW' })
    expect(res.status).toBe(503)
    expect(res.body.error.code).toBe('NOT_CONFIGURED')
  })

  it('허용되지 않는 형식은 422', async () => {
    const res = await api.post('/api/v1/uploads/presigned-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'application/pdf', purpose: 'REVIEW' })
    expect(res.status).toBe(422)
  })

  it('비로그인 401', async () => {
    const res = await api.post('/api/v1/uploads/presigned-url').send({ contentType: 'image/jpeg', purpose: 'REVIEW' })
    expect(res.status).toBe(401)
  })
})

describe('S3 presign 생성 (버킷 설정 시)', () => {
  beforeAll(() => {
    process.env.S3_BUCKET = 'travelpack-test-bucket'
    process.env.AWS_REGION = 'ap-northeast-2'
    process.env.AWS_ACCESS_KEY_ID = 'AKIATEST'
    process.env.AWS_SECRET_ACCESS_KEY = 'testsecret'
  })
  afterAll(() => { delete process.env.S3_BUCKET })

  it('presigned PUT URL과 fileUrl을 생성한다', async () => {
    const r = await createPresignedUpload('image/jpeg', 'REVIEW')
    expect(r.key).toMatch(/^uploads\/reviews\/.+\.jpg$/)
    expect(r.uploadUrl).toContain('X-Amz-Signature')
    expect(r.uploadUrl).toContain('travelpack-test-bucket')
    expect(r.fileUrl).toContain(r.key)
  })
})

describe('푸시 캠페인 (3.8, 야간 차단·마케팅 미동의 제외)', () => {
  let marketerToken: string
  let opsToken: string
  const NIGHT = '2026-06-13T23:30:00+09:00'
  const DAY = '2026-06-13T10:00:00+09:00'

  beforeAll(async () => {
    seed = await seedAll()
    marketerToken = await adminToken(seed.admins.super, 'MARKETER')
    opsToken = await adminToken(seed.admins.super, 'OPERATION_MANAGER')

    // 마케팅 동의 + 푸시 토큰 보유 사용자
    const u1 = await signupUser()
    await api.put('/api/v1/users/me/consents').set('Authorization', `Bearer ${u1.accessToken}`)
      .send([{ type: 'MARKETING', agreed: true, version: '1.0' }])
    await api.post('/api/v1/users/me/push-tokens').set('Authorization', `Bearer ${u1.accessToken}`)
      .send({ fcmToken: 'tok-marketing-1' })

    // 마케팅 미동의(기본) + 토큰 보유 사용자 → 제외 대상
    const u2 = await signupUser()
    await api.post('/api/v1/users/me/push-tokens').set('Authorization', `Bearer ${u2.accessToken}`)
      .send({ fcmToken: 'tok-no-consent' })
  })

  it('야간(21~08시) 발송은 422 차단', async () => {
    const res = await api.post('/api/v1/admin/push-campaigns').set('Authorization', `Bearer ${marketerToken}`)
      .send({ title: '심야 세일', body: '지금', target: 'ALL', scheduledAt: NIGHT })
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('NIGHT_BLOCKED')
  })

  it('주간 발송: 마케팅 동의자만 수신자 집계, FCM 미설정이라 no-op', async () => {
    const res = await api.post('/api/v1/admin/push-campaigns').set('Authorization', `Bearer ${marketerToken}`)
      .send({ title: '여름 제주 특가', body: '지금 떠나요', target: 'ALL', scheduledAt: DAY })
    expect(res.status).toBe(200)
    expect(res.body.data.recipients).toBe(1) // 미동의 사용자 제외
    expect(res.body.data.push.configured).toBe(false)
    expect(res.body.data.status).toBe('SCHEDULED')
  })

  it('MARKETER 외 역할은 403', async () => {
    const res = await api.post('/api/v1/admin/push-campaigns').set('Authorization', `Bearer ${opsToken}`)
      .send({ title: 'x', body: 'y', target: 'ALL', scheduledAt: DAY })
    expect(res.status).toBe(403)
  })

  it('THEME 타깃에 themeId 누락 시 422', async () => {
    const res = await api.post('/api/v1/admin/push-campaigns').set('Authorization', `Bearer ${marketerToken}`)
      .send({ title: 'x', body: 'y', target: 'THEME', scheduledAt: DAY })
    expect(res.status).toBe(422)
  })
})
