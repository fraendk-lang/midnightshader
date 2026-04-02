import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './services/env.js'
import { authRouter } from './routes/auth.js'
import { communityRouter } from './routes/community.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  )
  app.use(cookieParser())
  app.use(express.json({ limit: '15mb' }))

  app.get('/health', (_req, res) => res.json({ ok: true }))

  app.use('/api/auth', authRouter)
  app.use('/api/community', communityRouter)

  return app
}

