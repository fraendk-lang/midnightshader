import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../db/prisma.js'
import { signAccessToken } from '../services/jwt.js'
import { env } from '../services/env.js'
import type { AuthedRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

export const authRouter = Router()

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  displayName: z.string().min(1).max(60).optional(),
})

authRouter.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { email, password, displayName } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'Email already in use' })

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: displayName ?? email.split('@')[0] ?? 'User',
    },
    select: { id: true, email: true, displayName: true, createdAt: true },
  })

  return res.status(201).json({ user })
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
})

authRouter.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  const token = signAccessToken(user.id)

  // cookie maxAge: 7d is default; exact parsing is overkill for MVP
  res.cookie(env.JWT_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  return res.json({
    user: { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt },
  })
})

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(env.JWT_COOKIE_NAME, { path: '/' })
  return res.status(204).send()
})

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId
  if (!userId) return res.status(401).json({ error: 'Not authenticated' })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, createdAt: true },
  })

  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json({ user })
})

