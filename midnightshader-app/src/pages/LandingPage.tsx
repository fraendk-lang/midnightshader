import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  buildAllProjectRows,
  buildRecentCards,
  formatRelative,
  FULL_KEY,
  hueFromString,
  SNAPSHOTS_KEY,
  WORKSPACE_CHANGED_EVENT,
  type CatalogRow,
} from '../lib/workspaceCatalog'

const PLACEHOLDER_COUNT = 4

function padRecentSlots(rows: CatalogRow[]): (CatalogRow | { empty: true; key: string })[] {
  const slots: (CatalogRow | { empty: true; key: string })[] = [...rows]
  let i = 0
  while (slots.length < PLACEHOLDER_COUNT) {
    slots.push({ empty: true, key: `pad-${i++}` })
  }
  return slots.slice(0, PLACEHOLDER_COUNT)
}

export default function LandingPage() {
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === FULL_KEY || e.key === SNAPSHOTS_KEY) {
        refresh()
      }
    }
    const onLocal = () => refresh()
    window.addEventListener('storage', onStorage)
    window.addEventListener(WORKSPACE_CHANGED_EVENT, onLocal)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, onLocal)
    }
  }, [refresh])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [refresh])

  const recentSlots = useMemo(() => {
    void tick
    return padRecentSlots(buildRecentCards(PLACEHOLDER_COUNT))
  }, [tick])

  const allRows = useMemo(() => {
    void tick
    return buildAllProjectRows(12)
  }, [tick])

  return (
    <div className="landing midnight-architect">
      <section className="landing__hero-grid">
        <div className="landing__hero-copy">
          <p className="landing__eyebrow">Shader-Plattform · Obsidian Flux</p>
          <h1 className="landing__title">
            Obsidian
            <br />
            <span className="landing__title-accent">Flux</span>
          </h1>
          <p className="landing__lede">
            Prozedurale Shader-Visuals auf hohem Niveau: kuratierte Looks, Live-Vorschau mit
            professioneller Farbwiedergabe, Graph-zu-GLSL und ein offenes Projektformat — Grundlage
            für eine wachsende Bibliothek geteilter Visuals.
          </p>
          <div className="landing__cta-row">
            <Link to="/gallery" className="landing__cta-primary" onClick={refresh}>
              <span className="landing__cta-primary-inner">
                <span>Galerie &amp; Presets</span>
                <span aria-hidden>→</span>
              </span>
            </Link>
            <Link to="/editor" className="landing__cta-ghost" onClick={refresh}>
              Editor öffnen
            </Link>
            <Link to="/node-graph" className="landing__cta-ghost landing__cta-ghost--dim">
              Node Graph
            </Link>
          </div>
        </div>

        <div className="landing__recent">
          <div className="landing__recent-head">
            <h2 className="landing__recent-title">Zuletzt bearbeitet</h2>
            <a href="#landing-all-projects" className="landing__recent-all">
              Alle Projekte
            </a>
          </div>
          <div className="landing__recent-grid">
            {recentSlots.map((slot) =>
              'empty' in slot ? (
                <div key={slot.key} className="landing__project-card landing__project-card--empty">
                  <div className="landing__project-card-inner">
                    <span className="landing__project-tag landing__project-tag--muted">Frei</span>
                    <p className="landing__project-empty-hint">
                      Snapshot im Editor speichern — erscheint hier automatisch.
                    </p>
                    <Link to="/editor" className="landing__project-empty-link">
                      Zum Editor
                    </Link>
                  </div>
                </div>
              ) : (
                <Link
                  key={slot.id}
                  to={slot.kind === 'current' ? '/editor' : `/editor?open=${encodeURIComponent(slot.id)}`}
                  className="landing__project-card"
                  onClick={refresh}
                >
                  <div
                    className="landing__project-card-visual"
                    style={{
                      ['--card-hue' as string]: `${hueFromString(slot.name)}`,
                    }}
                  >
                    {slot.thumbnailDataUrl ? (
                      <img
                        src={slot.thumbnailDataUrl}
                        alt=""
                        className="landing__project-card-thumb"
                      />
                    ) : null}
                  </div>
                  <div className="landing__project-card-shade" />
                  <div className="landing__project-card-meta">
                    <div>
                      <span
                        className={`landing__project-tag ${
                          slot.kind === 'current' ? 'landing__project-tag--cyan' : ''
                        }`}
                      >
                        {slot.badge}
                      </span>
                      <h3 className="landing__project-name">{slot.name}</h3>
                      <p className="landing__project-sub">
                        {formatRelative(slot.updatedAt)}
                        {slot.sizeLabel ? ` · ${slot.sizeLabel}` : ''}
                      </p>
                    </div>
                    <span className="landing__project-arrow" aria-hidden>
                      ↗
                    </span>
                  </div>
                </Link>
              ),
            )}
          </div>
        </div>
      </section>

      <section id="landing-all-projects" className="landing__all-projects">
        <div className="landing__all-projects-head">
          <h2 className="landing__all-projects-title">Alle Projekte</h2>
          <div className="landing__all-projects-rule" />
        </div>
        {allRows.length === 0 ? (
          <p className="landing__all-projects-empty">
            Noch keine gespeicherten Projekte. Öffne den Editor und lege mit „Snapshot speichern“
            Versionen an — oder nutze „Speichern“ in der Kopfzeile.
          </p>
        ) : (
          <ul className="landing__all-projects-list">
            {allRows.map((row) => (
              <li key={`${row.kind}-${row.id}`}>
                <Link
                  to={row.kind === 'current' ? '/editor' : `/editor?open=${encodeURIComponent(row.id)}`}
                  className="landing__all-row"
                  onClick={refresh}
                >
                  <div
                    className="landing__all-thumb"
                    style={{ ['--thumb-hue' as string]: `${hueFromString(row.name)}` }}
                  >
                    {row.thumbnailDataUrl ? (
                      <img
                        src={row.thumbnailDataUrl}
                        alt=""
                        className="landing__all-thumb-img"
                      />
                    ) : null}
                  </div>
                  <div className="landing__all-body">
                    <h3 className="landing__all-name">{row.name}</h3>
                    <p className="landing__all-meta">
                      {formatRelative(row.updatedAt)}
                      {row.sizeLabel ? ` · ${row.sizeLabel}` : ''}
                    </p>
                  </div>
                  <div className="landing__all-badges">
                    <span
                      className={
                        row.kind === 'current'
                          ? 'landing__pill landing__pill--primary'
                          : 'landing__pill landing__pill--muted'
                      }
                    >
                      {row.badge}
                    </span>
                  </div>
                  <span className="landing__all-chevron" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="landing__workflow" aria-labelledby="landing-workflow-title">
        <h2 id="landing-workflow-title" className="landing__section-title">
          Arbeitsablauf
        </h2>
        <div className="landing__workflow-grid">
          <div className="landing__workflow-card">
            <h3 className="landing__workflow-card-title">1 · Graph</h3>
            <p className="landing__workflow-card-text">
              Nodes verbinden und GLSL erzeugen — dann im Editor weiter verfeinern.
            </p>
            <Link to="/node-graph" className="landing__workflow-link">
              Graph öffnen
            </Link>
          </div>
          <div className="landing__workflow-card">
            <h3 className="landing__workflow-card-title">2 · Code &amp; Vorschau</h3>
            <p className="landing__workflow-card-text">
              Monaco-Editor, Live-Three.js-Viewport, Uniforms und Snapshots für Versionen.
            </p>
            <Link to="/editor" className="landing__workflow-link">
              Editor öffnen
            </Link>
          </div>
          <div className="landing__workflow-card">
            <h3 className="landing__workflow-card-title">3 · Sichern &amp; teilen</h3>
            <p className="landing__workflow-card-text">
              Lokal persistent, JSON-Export/Import — erste Stufe einer Plattform, auf der Looks
              austauschbar und wieder auffindbar werden.
            </p>
            <Link to="/settings" className="landing__workflow-link">
              Daten &amp; App-Infos
            </Link>
          </div>
          <div className="landing__workflow-card landing__workflow-card--wide">
            <h3 className="landing__workflow-card-title">4 · Plattform</h3>
            <p className="landing__workflow-card-text">
              Signature-Presets als Startpunkt; Vision: Registries, eingebettete Vorschauen und
              Community — heute beginnt es mit Galerie und offenem Dateiformat.
            </p>
            <Link to="/gallery" className="landing__workflow-link">
              Zur Galerie
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
