import { useRef, type ChangeEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useToast } from '../context/ToastContext'

const navLink = (path: string, label: string, location: { pathname: string }) => {
  const active = location.pathname === path
  return (
    <Link
      to={path}
      className={`app-header__menu-link ${active ? 'app-header__menu-link--active' : ''}`}
    >
      {label}
    </Link>
  )
}

export default function AppHeader() {
  const location = useLocation()
  const { push } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    saveProjectLocal,
    exportProjectDownload,
    exportPackDownload,
    importAnyFile,
    projectName,
  } = useProject()

  const onImportClick = () => fileInputRef.current?.click()

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await importAnyFile(file)
      push('Import abgeschlossen.', 'ok')
    } catch (err) {
      push(err instanceof Error ? err.message : 'Import fehlgeschlagen.', 'err')
    }
  }

  return (
    <header className="app-header midnight-architect">
      <div className="app-header__left">
        <Link to="/" className="app-header__brand">
          MidnightShader
        </Link>
        <nav className="app-header__menu" aria-label="Hauptmenü">
          {navLink('/', 'Start', location)}
          {navLink('/gallery', 'Galerie', location)}
          {navLink('/community', 'Community', location)}
          {navLink('/editor', 'Editor', location)}
          {navLink('/node-graph', 'Graph', location)}
          {navLink('/profile', 'Profil', location)}
          {navLink('/settings', 'Einstellungen', location)}
        </nav>
      </div>
      <div className="app-header__right">
        <span className="app-header__project" title={projectName}>
          {projectName}
        </span>
        <div className="app-header__icon-row">
          <Link to="/editor" className="app-header__icon-btn" title="Editor">
            +
          </Link>
          <button
            type="button"
            className="app-header__icon-btn"
            title="Projekt, Pack oder Shader-Datei importieren"
            onClick={onImportClick}
          >
            ↑
          </button>
          <Link to="/settings" className="app-header__icon-btn" title="Einstellungen">
            ⚙
          </Link>
        </div>
        <div className="app-header__actions">
          <button
            type="button"
            className="app-header__btn-secondary"
            onClick={() => {
              saveProjectLocal()
              push('Projekt gespeichert.', 'ok')
            }}
            title="Tastatur: ⌘S / Strg+S im Editor"
          >
            Speichern
          </button>
          <button
            type="button"
            className="app-header__btn-secondary app-header__btn-pack"
            onClick={() => {
              exportPackDownload()
              push('Pack exportiert (Projekt + Snapshots).', 'ok')
            }}
            title="JSON-Pack: aktuelles Projekt und alle Snapshots"
          >
            Pack
          </button>
          <button
            type="button"
            className="app-header__btn-primary"
            onClick={() => {
              exportProjectDownload()
              push('Projekt-JSON heruntergeladen.', 'info')
            }}
          >
            Export
          </button>
          <div className="app-header__avatar" title={projectName} aria-hidden />
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json,.glsl,.frag,.fs,.txt,text/plain"
        className="app-header__file-input"
        onChange={onFileChange}
      />
    </header>
  )
}
