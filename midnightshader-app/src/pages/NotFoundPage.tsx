import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="not-found-page midnight-architect">
      <div className="not-found-page__inner">
        <p className="not-found-page__code">404</p>
        <h1 className="not-found-page__title">Seite nicht gefunden</h1>
        <p className="not-found-page__text">
          Diese Adresse gibt es in MidnightShader nicht. Über die Startseite erreichst du Editor und
          Node Graph.
        </p>
        <Link to="/" className="not-found-page__link">
          Zur Startseite
        </Link>
      </div>
    </main>
  )
}
