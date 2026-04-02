import jwt from 'jsonwebtoken'
import { env } from './env.js'

export type JwtPayload = {
  sub: string
}

export function signAccessToken(userId: string): string {
  const payload = { sub: userId } satisfies JwtPayload
  const options = { expiresIn: env.JWT_EXPIRES_IN } as any
  return (jwt as any).sign(payload, env.JWT_SECRET, options) as string
}

