import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from './env.js'

function createS3() {
  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: Boolean(env.S3_ENDPOINT),
  })
}

const s3 = createS3()

export function parseDataUrl(dataUrl: string): { mime: string; body: Buffer } | null {
  // Accept:
  // data:image/jpeg;base64,....
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!m) return null
  const mime = m[1]
  const b64 = m[2]
  return { mime, body: Buffer.from(b64, 'base64') }
}

export async function uploadThumbnail(opts: {
  entryId: string
  dataUrl: string
  mimeOverride?: string
}): Promise<{ key: string; mime: string }> {
  const parsed = parseDataUrl(opts.dataUrl)
  if (!parsed) throw new Error('Invalid thumbnail data URL')

  const mime = opts.mimeOverride ?? parsed.mime
  const key = `thumbnails/${opts.entryId}/thumb.jpg`

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: parsed.body,
      ContentType: mime,
      // Public-read is optional; by default keep it private.
      // If the bucket is public, we can still use S3_PUBLIC_BASE_URL.
      ACL: undefined,
    }),
  )

  return { key, mime }
}

export async function getThumbnailUrl(key: string): Promise<string> {
  if (env.S3_PUBLIC_BASE_URL) {
    return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`
  }
  const signed = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    { expiresIn: 60 * 5 },
  )
  return signed
}

