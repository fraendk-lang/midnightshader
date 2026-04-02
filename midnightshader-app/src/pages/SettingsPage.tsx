import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FULL_KEY,
  GRAPH_LEGACY_KEY,
  SNAPSHOTS_KEY,
} from '../lib/workspaceCatalog'
import {
  readReducedMotionPreference,
  REDUCED_MOTION_KEY,
  setReducedMotionPreference,
} from '../lib/preferences'

const STORAGE_ROWS: { key: string; note: string }[] = [
  { key: FULL_KEY, note: 'Aktives Projekt (Shader, Uniforms, Graph)' },
  { key: SNAPSHOTS_KEY, note: 'Gespeicherte Snapshots' },
  { key: GRAPH_LEGACY_KEY, note: 'Älteres Graph-Format (Kompatibilität)' },
  { key: REDUCED_MOTION_KEY, note: 'Darstellung: weniger Bewegung' },
]

export default function SettingsPage() {
  const [reducedMotion, setReducedMotion] = useState(readReducedMotionPreference)

  return (
    <main className="settings-page midnight-architect">
      <div className="settings-page__inner">
        <p className="settings-page__crumb">
          <Link to="/">Start</Link>
          <span aria-hidden> / </span>
          <span>Einstellungen</span>
        </p>
        <h1 className="settings-page__title">Einstellungen</h1>
        <p className="settings-page__lede">
          MidnightShader speichert dein Projekt lokal im Browser. Kein Cloud-Zwang — über die
          Kopfzeile: <strong>Import</strong> akzeptiert Projekt-JSON, Pack-JSON, oder reine Shader-Texte
          (<code>.glsl</code> / <code>.frag</code>). <strong>Pack</strong> exportiert das aktuelle
          Projekt plus alle Snapshots als eine Datei (<code>midnightshader-pack</code>).
        </p>

        <section className="settings-page__section" aria-labelledby="settings-formats-heading">
          <h2 id="settings-formats-heading" className="settings-page__h2">
            Dateiformate
          </h2>
          <ul className="settings-page__list">
            <li>
              <code className="settings-page__code">midnightshader-project</code> — ein Projekt inkl.
              Graph (Export-Button).
            </li>
            <li>
              <code className="settings-page__code">midnightshader-pack</code> — Sammeldatei aus
              Kopfzeile „Pack“ (Projekt + Snapshots).
            </li>
            <li>
              Roher GLSL-Fragmentcode — muss die Standard-Uniforms deklarieren und gegen WebGL 1
              kompilieren.
            </li>
          </ul>
        </section>

        <section className="settings-page__section" aria-labelledby="settings-appearance-heading">
          <h2 id="settings-appearance-heading" className="settings-page__h2">
            Darstellung
          </h2>
          <label className="settings-page__toggle">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => {
                const v = e.target.checked
                setReducedMotion(v)
                setReducedMotionPreference(v)
              }}
            />
            <span>Animationen und Übergänge reduzieren</span>
          </label>
        </section>

        <section className="settings-page__section" aria-labelledby="settings-data-heading">
          <h2 id="settings-data-heading" className="settings-page__h2">
            Lokale Daten (localStorage)
          </h2>
          <p className="settings-page__muted">
            Diese Schlüssel werden von der App verwendet. Zum Leeren: Browsereinstellungen →
            Website-Daten, oder Daten manuell entfernen (Projekt geht verloren).
          </p>
          <table className="settings-page__table">
            <thead>
              <tr>
                <th scope="col">Schlüssel</th>
                <th scope="col">Inhalt</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE_ROWS.map((row) => (
                <tr key={row.key}>
                  <td>
                    <code className="settings-page__code">{row.key}</code>
                  </td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="settings-page__section" aria-labelledby="settings-about-heading">
          <h2 id="settings-about-heading" className="settings-page__h2">
            Über MidnightShader
          </h2>
          <p className="settings-page__muted">
            Version <strong>{__APP_VERSION__}</strong> · Obsidian Flux — Editor, Node Graph und
            Live-Shader-Vorschau in einer Anwendung.
          </p>
        </section>

        <div className="settings-page__footer-actions">
          <Link to="/gallery" className="settings-page__btn settings-page__btn--ghost">
            Galerie
          </Link>
          <Link to="/editor" className="settings-page__btn">
            Zum Editor
          </Link>
          <Link to="/node-graph" className="settings-page__btn settings-page__btn--ghost">
            Node Graph
          </Link>
        </div>
      </div>
    </main>
  )
}
