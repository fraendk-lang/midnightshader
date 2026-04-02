import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db/prisma.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import { uploadThumbnail, getThumbnailUrl } from '../services/s3.js'

export const communityRouter = Router()

const EntryCreateSchema = z.object({
  title: z.string().min(1).max(140),
  tagline: z.string().max(220).optional(),
  description: z.string().max(2000).optional(),
  fragment: z.string().min(1),
  uniforms: z.any(),
  layers: z.any().optional(),
  thumbnailDataUrl: z.string().optional(),
})

communityRouter.get('/entries', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'new'
  const page = Number(req.query.page ?? 1)
  const pageSize = Number(req.query.pageSize ?? 12)

  const where = q ? { title: { contains: q, mode: 'insensitive' as const } } : undefined

  const orderBy =
    sort === 'top'
      ? ({ views: 'desc' } as const)
      : sort === 'favorites'
        ? ({ publishedAt: 'desc' } as const)
        : ({ publishedAt: 'desc' } as const)

  const take = Math.min(50, Math.max(1, pageSize))
  const skip = Math.max(0, page - 1) * take

  const total = await prisma.communityEntry.count({ where: where as any })
  const items = await prisma.communityEntry.findMany({
    where: where as any,
    orderBy,
    take,
    skip,
    select: {
      id: true,
      title: true,
      tagline: true,
      description: true,
      authorId: true,
      fragment: true,
      thumbnailKey: true,
      createdAt: true,
      publishedAt: true,
      views: true,
      _count: { select: { likes: true, favorites: true } },
      author: { select: { displayName: true } },
    },
  })

  const itemsWithThumb = await Promise.all(
    items.map(async (it) => {
      const thumbnailUrl = it.thumbnailKey ? await getThumbnailUrl(it.thumbnailKey) : null
      return {
        id: it.id,
        title: it.title,
        tagline: it.tagline,
        description: it.description,
        author: it.author,
        createdAt: it.createdAt,
        publishedAt: it.publishedAt,
        views: it.views,
        likesCount: it._count.likes,
        favoritesCount: it._count.favorites,
        thumbnailUrl,
      }
    }),
  )

  return res.json({
    items: itemsWithThumb,
    page,
    pageSize: take,
    total,
  })
})

communityRouter.get('/entries/:id', async (req, res) => {
  const id = req.params.id
  const entry = await prisma.communityEntry.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      tagline: true,
      description: true,
      authorId: true,
      uniforms: true,
      layers: true,
      fragment: true,
      thumbnailKey: true,
      createdAt: true,
      publishedAt: true,
      views: true,
      _count: { select: { likes: true, favorites: true } },
      author: { select: { displayName: true } },
    },
  })

  if (!entry) return res.status(404).json({ error: 'Not found' })

  const thumbnailUrl = entry.thumbnailKey ? await getThumbnailUrl(entry.thumbnailKey) : null

  return res.json({
    id: entry.id,
    title: entry.title,
    tagline: entry.tagline,
    description: entry.description,
    author: entry.author,
    uniforms: entry.uniforms,
    layers: entry.layers,
    fragment: entry.fragment,
    createdAt: entry.createdAt,
    publishedAt: entry.publishedAt,
    views: entry.views,
    likesCount: entry._count.likes,
    favoritesCount: entry._count.favorites,
    thumbnailUrl,
  })
})

communityRouter.get('/me/entries', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId
  if (!userId) return res.status(401).json({ error: 'Not authenticated' })

  const items = await prisma.communityEntry.findMany({
    where: { authorId: userId },
    orderBy: { publishedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      tagline: true,
      description: true,
      fragment: true,
      thumbnailKey: true,
      createdAt: true,
      publishedAt: true,
      views: true,
      _count: { select: { likes: true, favorites: true } },
    },
  })

  const itemsWithThumb = await Promise.all(
    items.map(async (it) => {
      const thumbnailUrl = it.thumbnailKey ? await getThumbnailUrl(it.thumbnailKey) : null
      return {
        id: it.id,
        title: it.title,
        tagline: it.tagline,
        description: it.description,
        createdAt: it.createdAt,
        publishedAt: it.publishedAt,
        views: it.views,
        likesCount: it._count.likes,
        favoritesCount: it._count.favorites,
        thumbnailUrl,
      }
    }),
  )

  return res.json({ items: itemsWithThumb, count: itemsWithThumb.length })
})

communityRouter.post('/entries/:id/view', async (req, res) => {
  const id = req.params.id
  const updated = await prisma.communityEntry.update({
    where: { id },
    data: { views: { increment: 1 } },
    select: { id: true, views: true },
  })
  return res.json({ id: updated.id, views: updated.views })
})

communityRouter.post('/entries', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId
  if (!userId) return res.status(401).json({ error: 'Not authenticated' })

  const parsed = EntryCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { title, tagline, description, fragment, uniforms, layers, thumbnailDataUrl } = parsed.data

  let thumbnailKey: string | undefined = undefined
  let thumbnailMime: string | undefined = undefined
  if (thumbnailDataUrl) {
    // Create entry first to get stable ID for S3 key
    const created = await prisma.communityEntry.create({
      data: {
        authorId: userId,
        title,
        tagline,
        description,
        fragment,
        uniforms,
        layers,
      },
    })
    try {
      const uploaded = await uploadThumbnail({
        entryId: created.id,
        dataUrl: thumbnailDataUrl,
      })

      await prisma.communityEntry.update({
        where: { id: created.id },
        data: {
          thumbnailKey: uploaded.key,
          thumbnailMime: uploaded.mime,
        },
      })
    } catch {
      // Thumbnail ist optional: Entry trotzdem veröffentlichen.
      // (z.B. wenn S3/Bucket noch nicht bereit ist)
    }

    return res.status(201).json({ id: created.id })
  }

  const created = await prisma.communityEntry.create({
    data: {
      authorId: userId,
      title,
      tagline,
      description,
      fragment,
      uniforms,
      layers,
    },
    select: { id: true },
  })

  return res.status(201).json(created)
})

communityRouter.post('/entries/:id/like', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId
  if (!userId) return res.status(401).json({ error: 'Not authenticated' })

  const entryId = req.params.id

  const entry = await prisma.communityEntry.findUnique({ where: { id: entryId }, select: { id: true } })
  if (!entry) return res.status(404).json({ error: 'Entry not found' })

  const existing = await prisma.entryLike.findFirst({ where: { userId, entryId } })
  if (existing) {
    await prisma.entryLike.deleteMany({ where: { userId, entryId } })
    return res.json({ liked: false })
  }

  await prisma.entryLike.create({ data: { userId, entryId } })
  return res.json({ liked: true })
})

communityRouter.post(
  '/entries/:id/favorite',
  requireAuth,
  async (req: AuthedRequest, res) => {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Not authenticated' })

    const entryId = req.params.id
    const entry = await prisma.communityEntry.findUnique({
      where: { id: entryId },
      select: { id: true },
    })
    if (!entry) return res.status(404).json({ error: 'Entry not found' })

    const existing = await prisma.entryFavorite.findFirst({ where: { userId, entryId } })
    if (existing) {
      await prisma.entryFavorite.deleteMany({ where: { userId, entryId } })
      return res.json({ favorite: false })
    }

    await prisma.entryFavorite.create({ data: { userId, entryId } })
    return res.json({ favorite: true })
  },
)

