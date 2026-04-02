import { Link } from 'react-router-dom'
import ShaderThumbnail from '../components/ShaderThumbnail'
import { useOrderedPresets } from '../lib/useOrderedPresets'

export default function GalleryPage() {
  const presets = useOrderedPresets()

  return (
    <div className="gallery-page midnight-architect">
      <header className="gallery-page__header">
        <p className="gallery-page__eyebrow">Plattform</p>
        <h1 className="gallery-page__title">Shader-Galerie</h1>
        <p className="gallery-page__lede">
          Echte WebGL-Vorschau pro Preset — im Editor weiterdrehen, als Projekt/Pack exportieren und
          mit anderen teilen. Die Reihenfolge kann über{' '}
          <code className="gallery-page__code-inline">public/presets.manifest.json</code> gesteuert
          werden.
        </p>
        <div className="gallery-page__header-actions">
          <Link to="/editor" className="gallery-page__btn gallery-page__btn--primary">
            Eigenen Look starten
          </Link>
          <Link to="/node-graph" className="gallery-page__btn gallery-page__btn--ghost">
            Aus dem Graph generieren
          </Link>
        </div>
      </header>

      <ul className="gallery-page__grid">
        {presets.map((p) => (
          <li key={p.id} className="gallery-card">
            <ShaderThumbnail
              fragment={p.fragment}
              uniforms={p.uniforms}
              className="gallery-card__thumb-wrap"
            />
            <div className="gallery-card__body">
              <p className="gallery-card__tag">{p.tagline}</p>
              <h2 className="gallery-card__title">{p.title}</h2>
              <p className="gallery-card__desc">{p.description}</p>
              <Link
                to={`/editor?preset=${encodeURIComponent(p.id)}`}
                className="gallery-card__cta"
              >
                Im Editor laden
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <section className="gallery-page__vision" aria-labelledby="vision-heading">
        <h2 id="vision-heading" className="gallery-page__vision-title">
          Vision
        </h2>
        <p className="gallery-page__vision-text">
          MidnightShader soll der Ort werden, an dem du prozedurale Shader-Visuals auf höchstem
          Niveau baust — und an dem Looks wieder auffindbar, austauschbar und erweiterbar sind.
          Live-Thumbnails, offenes Projektformat, Pack-Export und JSON-Registry-Pfad (
          <code className="gallery-page__code-inline">presets.manifest.json</code>) sind die Basis
          für spätere Registries und Community-Feeds.
        </p>
      </section>
    </div>
  )
}
