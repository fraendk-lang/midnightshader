import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiFetch } from '../lib/api'

type CommunityEntryListItem = {
  id: string
  title: string
  tagline: string | null
  description: string | null
  createdAt: string
  publishedAt: string
  views: number
  likesCount: number
  favoritesCount: number
  thumbnailUrl: string | null
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const { push } = useToast()

  const [items, setItems] = useState<CommunityEntryListItem[]>([])
  const [busy, setBusy] = useState(false)

  const load = async () => {
    if (!user) return
    setBusy(true)
    try {
      const data = await apiFetch<{ items: CommunityEntryListItem[] }>('/api/community/me/entries')
      setItems(data.items ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Profil laden fehlgeschlagen.'
      push(msg, 'err')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id])

  if (authLoading) {
    return (
      <main className="simple-page midnight-architect">
        <p style={{ color: 'var(--on-surface-variant)' }}>Lade Profil …</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="simple-page midnight-architect">
        <h1 style={{ margin: 0, fontFamily: 'Space Grotesk' }}>Profil</h1>
        <p style={{ marginTop: 8, color: 'var(--on-surface-variant)' }}>
          Bitte einloggen, um dein Profil zu sehen.
        </p>
        <Link to="/login" className="save-btn">
          Zum Login
        </Link>
      </main>
    )
  }

  return (
    <main className="simple-page midnight-architect">
      <h1 style={{ margin: 0, fontFamily: 'Space Grotesk' }}>{user.displayName}</h1>
      <p style={{ marginTop: 8, color: 'var(--on-surface-variant)', fontSize: 14, lineHeight: 1.6 }}>
        Deine veröffentlichten Looks in der Community.
      </p>

      {busy ? <p style={{ color: 'var(--on-surface-variant)' }}>Lade Einträge …</p> : null}

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
                {it.views.toLocaleString('de-DE')} Views · {it.likesCount} Likes · {it.favoritesCount}{' '}
                Stars
              </p>

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

