import { Router } from 'express'
import { z } from 'zod'
import { requireUser } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { Errors } from '../../lib/errors.js'
import { ok, h } from '../../lib/respond.js'
import { ALLOWED_CONTENT_TYPES, UPLOAD_ENABLED, createPresignedUpload } from './s3.js'

export const uploadsRouter = Router()

// S3 presigned PUT URL 발급 (기획설계서 3.7절). S3_BUCKET 미설정 시 503.
uploadsRouter.post(
  '/uploads/presigned-url',
  requireUser,
  validateBody(z.object({
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    purpose: z.enum(['REVIEW', 'PROFILE']),
  })),
  h(async (req, res) => {
    if (!UPLOAD_ENABLED) throw Errors.notConfigured('파일 업로드(S3)')
    const { contentType, purpose } = req.body as { contentType: string; purpose: 'REVIEW' | 'PROFILE' }
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) throw Errors.validation('허용되지 않는 파일 형식입니다')
    ok(res, await createPresignedUpload(contentType, purpose))
  }),
)
