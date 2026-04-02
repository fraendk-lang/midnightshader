import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../services/env.js'

export type AuthedRequest = Request & { userId?: string }

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token =
      req.cookies?.[env.JWT_COOKIE_NAME] ??
      // Fallback for APIs that send Authorization header
      (typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined)

    const bearer = typeof token === 'string' ? token : undefined
    const raw =
      bearer?.startsWith('Bearer ') ? bearer.slice('Bearer '.length) : bearer ?? undefined
    if (!raw) return res.status(401).json({ error: 'Not authenticated' })

    const decoded = jwt.verify(raw, env.JWT_SECRET) as { sub?: string }
    if (!decoded?.sub) return res.status(401).json({ error: 'Invalid token' })

    req.userId = decoded.sub
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

