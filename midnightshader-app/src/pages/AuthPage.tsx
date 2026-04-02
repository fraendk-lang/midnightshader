import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

type Mode = 'login' | 'register'

export default function AuthPage({ mode }: { mode: Mode }) {
  const { user, login, register } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)

  const title = mode === 'login' ? 'Login' : 'Registrieren'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
        push('Login erfolgreich.', 'ok')
      } else {
        const dn = displayName.trim() || undefined
        await register(email.trim(), password, dn)
        push('Konto erstellt.', 'ok')
      }
      navigate('/community')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Auth fehlgeschlagen.'
      push(msg, 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="simple-page midnight-architect">
      <h1 style={{ margin: 0, fontFamily: 'Space Grotesk' }}>{title}</h1>
      <p style={{ marginTop: 8, color: 'var(--on-surface-variant)', fontSize: 14, lineHeight: 1.6 }}>
        Damit du veröffentlichen und liken kannst, brauchst du einen Account. Auth läuft über Cookies.
      </p>

      {user ? (
        <p style={{ marginTop: 16, color: 'var(--secondary)' }}>Du bist eingeloggt als {user.displayName}.</p>
      ) : null}

      <form onSubmit={onSubmit} style={{ marginTop: 18, maxWidth: 420 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--on-surface-variant)' }}>
          E-Mail
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          style={{ width: '100%', marginBottom: 12 }}
        />

        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--on-surface-variant)' }}>
          Passwort
        </label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          style={{ width: '100%', marginBottom: 12 }}
        />

        {mode === 'register' ? (
          <>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--on-surface-variant)' }}>
              Anzeigename (optional)
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              type="text"
              style={{ width: '100%', marginBottom: 12 }}
            />
          </>
        ) : null}

        <button type="submit" className="save-btn" disabled={busy}>
          {busy ? '...' : title}
        </button>
      </form>

      {mode === 'login' ? (
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--on-surface-variant)' }}>
          Noch kein Konto? <a style={{ color: 'var(--secondary)' }} href="/register">Registrieren</a>
        </p>
      ) : (
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--on-surface-variant)' }}>
          Hast du schon ein Konto? <a style={{ color: 'var(--secondary)' }} href="/login">Login</a>
        </p>
      )}
    </main>
  )
}

