import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiFetch } from '../lib/api'

type CommunityEntryListItem = {
  id: string
  title: string
  tagline: string | null
  description: string | null
  author: { displayName: string }
  createdAt: string
  publishedAt: string
  views: number
  likesCount: number
  favoritesCount: number
  thumbnailUrl: string | null
}

export default function CommunityPage() {
  const { user, loading: authLoading } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()

  const [items, setItems] = useState<CommunityEntryListItem[]>([])
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'new' | 'top' | 'favorites'>('new')

  const load = async () => {
    setBusy(true)
    try {
      const query = new URLSearchParams()
      if (q.trim()) query.set('q', q.trim())
      query.set('sort', sort)
      query.set('page', '1')
      query.set('pageSize', '12')
      const data = await apiFetch<{ items: CommunityEntryListItem[] }>(
        `/api/community/entries?${query.toString()}`,
      )
      setItems(data.items ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Community laden fehlgeschlagen.'
      push(msg, 'err')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort])

  useEffect(() => {
    const t = setTimeout(() => void load(), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const requireLogin = () => {
    if (authLoading) return false
    if (user) return true
    push('Bitte einloggen, um zu liken/favorisieren.', 'info')
    navigate('/login')
    return false
  }

  const onToggleLike = async (id: string) => {
    if (!requireLogin()) return
    try {
      await apiFetch(`/api/community/entries/${id}/like`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Like fehlgeschlagen.'
      push(msg, 'err')
    }
  }

  const onToggleFavorite = async (id: string) => {
    if (!requireLogin()) return
    try {
      await apiFetch(`/api/community/entries/${id}/favorite`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Favorite fehlgeschlagen.'
      push(msg, 'err')
    }
  }

  const emptyState = useMemo(() => {
    if (busy) return null
    return items.length === 0 ? (
      <p style={{ color: 'var(--on-surface-variant)', marginTop: 16 }}>
        Noch keine Community-Einträge. Veröffentliche im Editor einen Look mit „Publish to Community“.
      </p>
    ) : null
  }, [busy, items.length])

  return (
    <main className="simple-page midnight-architect">
      <h1 style={{ margin: 0, fontFamily: 'Space Grotesk' }}>Community Shader Gallery</h1>
      <p style={{ marginTop: 8, color: 'var(--on-surface-variant)', fontSize: 14, lineHeight: 1.6 }}>
        Shared Looks mit echten Thumbnails (aus dem Backend Thumbnail-Upload).
      </p>

      <div className="community-toolbar">
        <input
          className="community-search"
          placeholder="Suche nach Titel …"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="community-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as 'new' | 'top' | 'favorites')}
        >
          <option value="new">Neu</option>
          <option value="top">Top (Views)</option>
          <option value="favorites">Favoriten</option>
        </select>
        <button type="button" className="community-refresh" onClick={() => void load()} disabled={busy}>
          {busy ? '…' : 'Refresh'}
        </button>
      </div>

      {emptyState}

      <ul className="community-grid">
        {items.map((it) => (
          <li key={it.id} className="gallery-card community-card">
            <div className="gallery-card__thumb-wrap community-card__thumb-wrap">
              {it.thumbnailUrl ? (
                <img className="community-card__thumb-img" src={it.thumbnailUrl} alt="" />
              ) : (
                <div
                  className="community-card__thumb-placeholder"
                  style={{ ['--card-hue' as string]: `${(it.title.length * 37) % 360}` }}
                />
              )}
            </div>

            <div className="gallery-card__body">
              <p className="gallery-card__tag">{it.tagline ?? 'Community'}</p>
              <h2 className="gallery-card__title">{it.title}</h2>
              <p className="gallery-card__desc">
                {it.author.displayName} · {it.views.toLocaleString('de-DE')} Views
              </p>

              <div className="community-card__meta-row">
                <button
                  type="button"
                  className="community-mini-btn"
                  onClick={() => void onToggleLike(it.id)}
                >
                  Like · {it.likesCount}
                </button>
                <button
                  type="button"
                  className="community-mini-btn"
                  onClick={() => void onToggleFavorite(it.id)}
                >
                  Star · {it.favoritesCount}
                </button>
              </div>

              <Link to={`/editor?communityId=${encodeURIComponent(it.id)}`} className="gallery-card__cta">
                Open in Editor
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}

