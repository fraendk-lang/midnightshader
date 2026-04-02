import 'dotenv/config'

export function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',

  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_COOKIE_NAME: process.env.JWT_COOKIE_NAME ?? 'midnightshader_token',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',

  S3_ENDPOINT: process.env.S3_ENDPOINT ?? undefined,
  S3_REGION: process.env.S3_REGION ?? 'us-east-1',
  S3_ACCESS_KEY_ID: requireEnv('S3_ACCESS_KEY_ID'),
  S3_SECRET_ACCESS_KEY: requireEnv('S3_SECRET_ACCESS_KEY'),
  S3_BUCKET: requireEnv('S3_BUCKET'),
  S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL ?? undefined,
}

