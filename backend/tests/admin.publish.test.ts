import { beforeAll, describe, expect, it } from 'vitest'
import { adminToken, api, seedAll } from './helpers.js'
import type { SeedResult } from '../prisma/seed-core.js'

let seed: SeedResult
let editorToken: string
let reviewerToken: string
let superToken: string

describe('관리자 발행 워크플로 (2.2, 3.8)', () => {
  beforeAll(async () => {
    seed = await seedAll()
    editorToken = await adminToken(seed.admins.editor, 'CONTENT_MANAGER')
    reviewerToken = await adminToken(seed.admins.reviewer, 'CONTENT_MANAGER')
    superToken = await adminToken(seed.admins.super, 'SUPER_ADMIN')
  })

  it('관리자 로그인 (TOTP 미설정 시드 계정)', async () => {
    const res = await api.post('/api/v1/admin/auth/login').send({ email: 'editor@travelpack.app', password: 'test-admin-pw' })
    expect(res.status).toBe(200)
    expect(res.body.data.mfaRequired).toBe(false)
    expect(res.body.data.role).toBe('CONTENT_MANAGER')
  })

  it('DRAFT → 검수 요청 → 작성자 본인 발행 403 (4-eyes)', async () => {
    const submit = await api
      .post(`/api/v1/admin/courses/${seed.draftCourseId}/submit`)
      .set('Authorization', `Bearer ${editorToken}`)
    expect(submit.status).toBe(200)
    expect(submit.body.data.status).toBe('IN_REVIEW')

    const selfPublish = await api
      .post(`/api/v1/admin/courses/${seed.draftCourseId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`)
    expect(selfPublish.status).toBe(403)
  })

  it('검수자 발행 성공 → 공개 목록 노출', async () => {
    const publish = await api
      .post(`/api/v1/admin/courses/${seed.draftCourseId}/publish`)
      .set('Authorization', `Bearer ${reviewerToken}`)
    expect(publish.status).toBe(200)
    expect(publish.body.data.status).toBe('PUBLISHED')

    const list = await api.get('/api/v1/courses')
    const titles = list.body.data.items.map((i: { title: string }) => i.title)
    expect(titles).toContain('서쪽 노을 미식 코스')
  })

  it('회수(unpublish) → ARCHIVED, 공개 목록에서 제외', async () => {
    const res = await api
      .post(`/api/v1/admin/courses/${seed.draftCourseId}/unpublish`)
      .set('Authorization', `Bearer ${editorToken}`)
    expect(res.body.data.status).toBe('ARCHIVED')

    const list = await api.get('/api/v1/courses')
    const titles = list.body.data.items.map((i: { title: string }) => i.title)
    expect(titles).not.toContain('서쪽 노을 미식 코스')
  })

  it('역할 제한: MARKETER가 코스 발행 시도 → 403', async () => {
    const marketer = await api
      .post('/api/v1/admin/accounts')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ email: 'marketer@travelpack.app', name: '마케터', role: 'MARKETER' })
    expect(marketer.status).toBe(201)
    const mToken = await adminToken(BigInt(marketer.body.data.adminId), 'MARKETER')

    const res = await api
      .post(`/api/v1/admin/courses/${seed.draftCourseId}/submit`)
      .set('Authorization', `Bearer ${mToken}`)
    expect(res.status).toBe(403)
  })

  it('감사 로그가 기록된다 (SUPER 조회)', async () => {
    const res = await api.get('/api/v1/admin/audit-logs?entityType=course').set('Authorization', `Bearer ${superToken}`)
    expect(res.status).toBe(200)
    const actions = res.body.data.items.map((l: { action: string }) => l.action)
    expect(actions).toContain('COURSE_PUBLISH')
    expect(actions).toContain('COURSE_UNPUBLISH')
  })

  it('일반 사용자 토큰으로 관리자 API 접근 401', async () => {
    const res = await api.get('/api/v1/admin/courses')
    expect(res.status).toBe(401)
  })
})
