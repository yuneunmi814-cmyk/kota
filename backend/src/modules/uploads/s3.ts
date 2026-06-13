import { randomUUID } from 'node:crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../../config/env.js'

// 업로드 활성 여부는 라우터가 503 판단에 사용 (서버 기동 시점 기준)
export const UPLOAD_ENABLED = Boolean(env.S3_BUCKET)

// 호출 시점의 process.env를 우선 읽는다(테스트에서 동적으로 설정 가능)
const bucket = () => process.env.S3_BUCKET || env.S3_BUCKET || ''
const region = () => process.env.AWS_REGION || env.AWS_REGION
const publicBase = () => process.env.S3_PUBLIC_BASE_URL || env.S3_PUBLIC_BASE_URL || ''

// 허용 이미지 타입 → 확장자
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
export const ALLOWED_CONTENT_TYPES = Object.keys(EXT)

let client: S3Client | null = null
function s3(): S3Client {
  if (!client) client = new S3Client({ region: region() })
  return client
}

export interface PresignResult { uploadUrl: string; fileUrl: string; key: string }

// purpose: REVIEW | PROFILE → 객체 키 prefix. 만료 5분 presigned PUT URL.
export async function createPresignedUpload(contentType: string, purpose: 'REVIEW' | 'PROFILE'): Promise<PresignResult> {
  const ext = EXT[contentType]!
  const prefix = purpose === 'PROFILE' ? 'profiles' : 'reviews'
  const key = `uploads/${prefix}/${randomUUID()}.${ext}`

  const cmd = new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType })
  const uploadUrl = await getSignedUrl(s3(), cmd, { expiresIn: 300 })

  const base = publicBase() || `https://${bucket()}.s3.${region()}.amazonaws.com`
  const fileUrl = `${base.replace(/\/$/, '')}/${key}`
  return { uploadUrl, fileUrl, key }
}
