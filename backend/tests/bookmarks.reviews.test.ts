import { beforeAll, describe, expect, it } from 'vitest'
import { api, prisma, seedAll, signupUser } from './helpers.js'
import type { SeedResult } from '../prisma/seed-core.js'

let seed: SeedResult
let token: string

describe('저장·리뷰 (3.4, 3.6)', () => {
  beforeAll(async () => {
    seed = await seedAll()
    token = (await signupUser()).accessToken
  })

  it('저장 추가 → saveCount 증가, 중복 저장은 멱등', async () => {
    const before = await prisma.course.findUniqueOrThrow({ where: { id: seed.publishedCourseId } })
    const res = await api
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetType: 'COURSE', targetId: seed.publishedCourseId.toString() })
    expect(res.status).toBe(201)

    const dup = await api
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetType: 'COURSE', targetId: seed.publishedCourseId.toString() })
    expect(dup.status).toBe(200)
    expect(dup.body.data.bookmarkId).toBe(res.body.data.bookmarkId)

    const after = await prisma.course.findUniqueOrThrow({ where: { id: seed.publishedCourseId } })
    expect(after.saveCount).toBe(before.saveCount + 1)
  })

  it('저장 목록 조회 + 삭제', async () => {
    const list = await api.get('/api/v1/users/me/bookmarks').set('Authorization', `Bearer ${token}`)
    expect(list.status).toBe(200)
    expect(list.body.data.items.length).toBe(1)

    const del = await api
      .delete(`/api/v1/bookmarks?targetType=COURSE&targetId=${seed.publishedCourseId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(del.status).toBe(204)

    const empty = await api.get('/api/v1/users/me/bookmarks').set('Authorization', `Bearer ${token}`)
    expect(empty.body.data.items.length).toBe(0)
  })

  it('리뷰 작성: HTML 태그 제거(sanitize) + 목록 집계', async () => {
    const res = await api
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetType: 'COURSE',
        targetId: seed.publishedCourseId.toString(),
        rating: 5,
        content: '동선이 <script>alert(1)</script> 완벽했어요',
      })
    expect(res.status).toBe(201)

    const list = await api.get(`/api/v1/courses/${seed.publishedCourseId}/reviews`)
    expect(list.body.data.summary.count).toBe(1)
    expect(list.body.data.summary.avg).toBe(5)
    expect(list.body.data.items[0].content).not.toContain('<script>')
  })

  it('신고 3회 누적 시 리뷰 자동 숨김', async () => {
    const reviewId = (await prisma.review.findFirstOrThrow()).id
    for (let i = 0; i < 3; i += 1) {
      const reporter = await signupUser()
      const res = await api
        .post(`/api/v1/reviews/${reviewId}/reports`)
        .set('Authorization', `Bearer ${reporter.accessToken}`)
        .send({ reasonCode: 'SPAM' })
      expect(res.status).toBe(201)
    }
    const review = await prisma.review.findUniqueOrThrow({ where: { id: reviewId } })
    expect(review.status).toBe('HIDDEN')

    const list = await api.get(`/api/v1/courses/${seed.publishedCourseId}/reviews`)
    expect(list.body.data.summary.count).toBe(0)
  })

  it('비로그인 저장 차단, 열람은 허용 (결정 4)', async () => {
    const save = await api.post('/api/v1/bookmarks').send({ targetType: 'COURSE', targetId: seed.publishedCourseId.toString() })
    expect(save.status).toBe(401)

    const browse = await api.get(`/api/v1/courses/${seed.publishedCourseId}`)
    expect(browse.status).toBe(200)
  })
})
