import { beforeAll, describe, expect, it } from 'vitest'
import { api, BASE_CONSENTS, seedAll } from './helpers.js'

describe('인증 (3.1)', () => {
  beforeAll(async () => {
    await seedAll()
  })

  it('회원가입 → 토큰 발급, 중복 가입 409', async () => {
    const body = { email: 'auth@test.dev', password: 'passw0rd1', nickname: '가입테스터', consents: BASE_CONSENTS }
    const res = await api.post('/api/v1/auth/signup').send(body)
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.accessToken).toBeTruthy()
    expect(res.body.data.refreshToken).toBeTruthy()

    const dup = await api.post('/api/v1/auth/signup').send(body)
    expect(dup.status).toBe(409)
    expect(dup.body.error.code).toBe('AUTH_DUPLICATE')
  })

  it('필수 약관 미동의 시 422', async () => {
    const res = await api.post('/api/v1/auth/signup').send({
      email: 'noconsent@test.dev',
      password: 'passw0rd1',
      nickname: '미동의자',
      consents: [{ type: 'TERMS', agreed: true, version: '1.0' }],
    })
    expect(res.status).toBe(422)
  })

  it('로그인 성공/실패', async () => {
    const okRes = await api.post('/api/v1/auth/login').send({ email: 'auth@test.dev', password: 'passw0rd1' })
    expect(okRes.status).toBe(200)
    expect(okRes.body.data.user.nickname).toBe('가입테스터')

    const bad = await api.post('/api/v1/auth/login').send({ email: 'auth@test.dev', password: 'wrong-pass1' })
    expect(bad.status).toBe(401)
  })

  it('RTR: 회전 후 이전 토큰 재사용 시 패밀리 전체 무효화', async () => {
    const login = await api.post('/api/v1/auth/login').send({ email: 'auth@test.dev', password: 'passw0rd1' })
    const first = login.body.data.refreshToken as string

    const rotated = await api.post('/api/v1/auth/refresh').send({ refreshToken: first })
    expect(rotated.status).toBe(200)
    const second = rotated.body.data.refreshToken as string
    expect(second).not.toBe(first)

    // 이전(회전된) 토큰 재사용 → 탈취 의심 → 401
    const reuse = await api.post('/api/v1/auth/refresh').send({ refreshToken: first })
    expect(reuse.status).toBe(401)
    expect(reuse.body.error.code).toBe('AUTH_SESSION_REVOKED')

    // 같은 패밀리의 최신 토큰도 무효화되어야 한다
    const after = await api.post('/api/v1/auth/refresh').send({ refreshToken: second })
    expect(after.status).toBe(401)
  })

  it('닉네임 중복 확인', async () => {
    const taken = await api.get('/api/v1/auth/nickname-check?value=가입테스터')
    expect(taken.body.data.available).toBe(false)
    const free = await api.get('/api/v1/auth/nickname-check?value=새로운닉네임')
    expect(free.body.data.available).toBe(true)
  })
})
