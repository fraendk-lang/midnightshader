import Editor from '@monaco-editor/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import {
  notifyWorkspaceChanged,
  SNAPSHOTS_KEY,
  type StoredSnapshot,
} from '../lib/workspaceCatalog'
import { apiFetch } from '../lib/api'
import { captureShaderThumbnail } from '../shader/captureShaderThumbnail'
import {
  captureCompositeThumbnail,
  installEditorCompositeViewport,
} from '../shader/layerComposite'
import { DEFAULT_FRAGMENT, validateFragmentShader } from '../shader/constants'
import { DOCS_WEBGL1, SNIPPET_MAIN_END, SNIPPET_MAIN_START, SNIPPET_UNIFORMS } from '../shader/glslSnippets'
import { getShaderPreset, SHADER_PRESETS } from '../shader/presets'
import { normalizeUniforms } from '../shader/uniforms'

type MobileTab = 'view' | 'code' | 'params'
type GradeProfile = 'balanced' | 'cinematic' | 'neon'

const PRESET_GRADE_PROFILE: Record<string, GradeProfile> = {
  'obsidian-flux': 'cinematic',
  'solar-corona': 'neon',
  'neon-abyss': 'neon',
  'mercury-glass': 'cinematic',
  'geometric-rings': 'balanced',
  'sdf-shapes': 'balanced',
  'tri-grid': 'neon',
  'liquid-mercury': 'cinematic',
  'neon-nebula': 'neon',
  'vortex-halo': 'neon',
  'energy-wave': 'neon',
  'aurora-silk': 'cinematic',
  'obsidian-veins': 'cinematic',
  'plasma-orbit': 'neon',
  'cyber-smoke': 'cinematic',
  'ion-strands': 'neon',
  'lumen-rift': 'neon',
}

function useNarrowEditor(breakpoint: number) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const u = () => setNarrow(mq.matches)
    u()
    mq.addEventListener('change', u)
    return () => mq.removeEventListener('change', u)
  }, [breakpoint])
  return narrow
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
}

export default function EditorPage() {
  const {
    fragmentShader,
    setFragmentShader,
    uniforms,
    setUniforms,
    projectName,
    setProjectName,
    saveProjectLocal,
    getCompositeSnapshot,
  } = useProject()
  const { push } = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [searchParams, setSearchParams] = useSearchParams()
  const mountRef = useRef<HTMLDivElement | null>(null)
  const uniformsRefLive = useRef(uniforms)
  const [error, setError] = useState('')

  function applyGradeProfileToUniforms(profile: GradeProfile, base: unknown) {
    const u = normalizeUniforms(base)
    if (profile === 'cinematic') {
      return normalizeUniforms({
        ...u,
        u_intensity: 0.92,
        u_saturation: 0.88,
        u_contrast: 1.2,
        u_gamma: 1.08,
      })
    }
    if (profile === 'neon') {
      return normalizeUniforms({
        ...u,
        u_intensity: 1.12,
        u_saturation: 1.35,
        u_contrast: 1.1,
        u_gamma: 0.95,
      })
    }
    return normalizeUniforms({
      ...u,
      u_intensity: 1,
      u_saturation: 1,
      u_contrast: 1.05,
      u_gamma: 1,
    })
  }

  function applyPresetWithRecommendedGrade(p: (typeof SHADER_PRESETS)[number]) {
    const profile = PRESET_GRADE_PROFILE[p.id] ?? 'balanced'
    setFragmentShader(p.fragment)
    setUniforms(applyGradeProfileToUniforms(profile, p.uniforms))
    setProjectName(p.title)
  }

  useEffect(() => {
    uniformsRefLive.current = uniforms
  }, [uniforms])

  const narrow = useNarrowEditor(1023)
  const [mTab, setMTab] = useState<MobileTab>('view')

  const [snapshots, setSnapshots] = useState<StoredSnapshot[]>(() => {
    try {
      const raw = localStorage.getItem(SNAPSHOTS_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed
        .filter(
          (x): x is StoredSnapshot =>
            typeof x === 'object' &&
            x !== null &&
            typeof (x as StoredSnapshot).id === 'string' &&
            typeof (x as StoredSnapshot).shaderCode === 'string',
        )
        .map((x) => ({
          ...x,
          uniforms: normalizeUniforms((x as StoredSnapshot).uniforms),
        }))
    } catch {
      return []
    }
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveProjectLocal()
        push('Projekt gespeichert.', 'ok')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saveProjectLocal, push])

  const openId = searchParams.get('open')
  useEffect(() => {
    if (!openId) return

    const stripOpen = () =>
      setSearchParams(
        (p) => {
          const n = new URLSearchParams(p)
          n.delete('open')
          return n
        },
        { replace: true },
      )

    if (openId === '__current__') {
      stripOpen()
      return
    }

    try {
      const raw = localStorage.getItem(SNAPSHOTS_KEY)
      if (raw) {
        const list = JSON.parse(raw) as StoredSnapshot[]
        const s = Array.isArray(list) ? list.find((x) => x.id === openId) : undefined
        if (s) {
          setProjectName(s.name)
          setUniforms(normalizeUniforms(s.uniforms))
          setFragmentShader(s.shaderCode)
        }
      }
    } catch {
      /* ignore */
    }
    stripOpen()
  }, [openId, setSearchParams, setProjectName, setUniforms, setFragmentShader])

  const presetParam = searchParams.get('preset')
  useEffect(() => {
    if (!presetParam) return
    const p = getShaderPreset(presetParam)
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        n.delete('preset')
        return n
      },
      { replace: true },
    )
    if (!p) return
    const profile = PRESET_GRADE_PROFILE[p.id] ?? 'balanced'
    setFragmentShader(p.fragment)
    setUniforms(applyGradeProfileToUniforms(profile, p.uniforms))
    setProjectName(p.title)
  }, [presetParam, setSearchParams, setFragmentShader, setProjectName, setUniforms])

  const communityId = searchParams.get('communityId')
  useEffect(() => {
    if (!communityId) return

    const stripCommunityId = () =>
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev)
          n.delete('communityId')
          return n
        },
        { replace: true },
      )

    const loadCommunityEntry = async () => {
      try {
        // Views zählen
        await apiFetch(`/api/community/entries/${communityId}/view`, {
          method: 'POST',
          body: JSON.stringify({}),
        })

        const entry = await apiFetch<{
          title: string
          uniforms: unknown
          fragment: string
        }>(`/api/community/entries/${communityId}`)

        setProjectName(entry.title)
        setUniforms(normalizeUniforms(entry.uniforms))
        setFragmentShader(entry.fragment)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Community Entry laden fehlgeschlagen.'
        push(msg, 'err')
      } finally {
        stripCommunityId()
      }
    }

    void loadCommunityEntry()
  }, [communityId, setFragmentShader, setSearchParams, setProjectName, setUniforms, push])

  /* Vorschau: alle sichtbaren Ebenen unten→oben mischen (siehe Node Graph). */
  const getSnapshotRef = useRef(getCompositeSnapshot)
  useEffect(() => {
    getSnapshotRef.current = getCompositeSnapshot
  }, [getCompositeSnapshot])

  useEffect(() => {
    if (!mountRef.current) return
    const { dispose } = installEditorCompositeViewport({
      host: mountRef.current,
      getUniforms: () => uniformsRefLive.current,
      // Keine Re-Installation beim Identitätswechsel von `getCompositeSnapshot`,
      // sondern nur Daten via Ref nachführen. Verhindert „zu viele WebGL Contexts“.
      getSnapshot: () => getSnapshotRef.current(),
    })
    return () => dispose()
  }, [])

  useEffect(() => {
    const check = validateFragmentShader(fragmentShader)
    if (!check.ok) {
      queueMicrotask(() => setError(check.error))
      return
    }
    queueMicrotask(() => setError(''))
  }, [fragmentShader])

  const applyShader = useCallback((nextCode: string) => {
    setFragmentShader(nextCode)
    const check = validateFragmentShader(nextCode)
    if (!check.ok) {
      setError(check.error)
      return
    }
    setError('')
  }, [setFragmentShader])

  const rand = (min: number, max: number) => min + Math.random() * (max - min)
  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))

  const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
    // h: 0..360, s/v: 0..1
    const c = v * s
    const hh = (h % 360) / 60
    const x = c * (1 - Math.abs((hh % 2) - 1))
    let r1 = 0
    let g1 = 0
    let b1 = 0
    if (hh >= 0 && hh < 1) {
      r1 = c
      g1 = x
      b1 = 0
    } else if (hh >= 1 && hh < 2) {
      r1 = x
      g1 = c
      b1 = 0
    } else if (hh >= 2 && hh < 3) {
      r1 = 0
      g1 = c
      b1 = x
    } else if (hh >= 3 && hh < 4) {
      r1 = 0
      g1 = x
      b1 = c
    } else if (hh >= 4 && hh < 5) {
      r1 = x
      g1 = 0
      b1 = c
    } else {
      r1 = c
      g1 = 0
      b1 = x
    }
    const m = v - c
    return [r1 + m, g1 + m, b1 + m]
  }

  const randomizeLook = () => {
    const p = SHADER_PRESETS[Math.floor(Math.random() * SHADER_PRESETS.length)]!
    // Uniform-Jitter für „Random“ Look:
    const jitter = rand(0.65, 1.35)
    const jitterSpeed = rand(0.65, 1.35)
    const hueJ = rand(-35, 35)
    const [r, g, b] = hsvToRgb((p.hue + hueJ + 360) % 360, 0.88, 0.98)

    const u = normalizeUniforms({
      ...p.uniforms,
      u_scale: clamp(p.uniforms.u_scale * jitter, 0.4, 28),
      u_speed: clamp(p.uniforms.u_speed * jitterSpeed, 0.01, 3),
      u_color: [r, g, b] as [number, number, number],
    })

    const profile = PRESET_GRADE_PROFILE[p.id] ?? 'balanced'
    setFragmentShader(p.fragment)
    setUniforms(applyGradeProfileToUniforms(profile, u))
    setProjectName(`${p.title} (Random)`)
    push('Random Shader geladen.', 'ok')
  }

  const applyCinematicGrade = () => {
    setUniforms((u) => applyGradeProfileToUniforms('cinematic', u))
    push('Cinematic Grade aktiv.', 'ok')
  }

  const applyNeonBoost = () => {
    setUniforms((u) => applyGradeProfileToUniforms('neon', u))
    push('Neon Boost aktiv.', 'ok')
  }

  const applyPresetGrade = () => {
    const p = SHADER_PRESETS.find((x) => x.fragment === fragmentShader)
    if (!p) {
      push('Kein Preset aktiv (manueller Shader).', 'info')
      return
    }
    const profile = PRESET_GRADE_PROFILE[p.id] ?? 'balanced'
    setUniforms((u) => applyGradeProfileToUniforms(profile, u))
    push(`Preset Grade: ${profile}.`, 'ok')
  }

  const activePresetId = useMemo(() => {
    const hit = SHADER_PRESETS.find((p) => p.fragment === fragmentShader)
    return hit?.id ?? ''
  }, [fragmentShader])

  const recommendedGrade = useMemo<GradeProfile | null>(() => {
    if (!activePresetId) return null
    return PRESET_GRADE_PROFILE[activePresetId] ?? 'balanced'
  }, [activePresetId])

  const colorHex = useMemo(() => {
    const [r, g, b] = uniforms.u_color
    return (
      '#' +
      [r, g, b]
        .map((v) => Math.round(v * 255).toString(16).padStart(2, '0'))
        .join('')
    )
  }, [uniforms.u_color])

  const [publishBusy, setPublishBusy] = useState(false)

  const saveSnapshot = () => {
    const check = validateFragmentShader(fragmentShader)
    const thumb = check.ok
      ? captureCompositeThumbnail(getCompositeSnapshot(), uniforms) ??
        captureShaderThumbnail(fragmentShader, uniforms)
      : null
    const next: StoredSnapshot = {
      id: crypto.randomUUID(),
      name: projectName.trim() || 'Untitled Shader',
      createdAt: new Date().toISOString(),
      shaderCode: fragmentShader,
      uniforms: { ...uniforms },
      ...(thumb ? { thumbnailDataUrl: thumb } : {}),
    }
    const updated = [next, ...snapshots].slice(0, 20)
    setSnapshots(updated)
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated))
    notifyWorkspaceChanged()
    push(
      thumb ? 'Snapshot mit Vorschaubild gespeichert.' : 'Snapshot gespeichert (Shader-Fehler: kein Thumbnail).',
      thumb ? 'ok' : 'info',
    )
  }

  const publishCommunity = async () => {
    if (!user) {
      push('Bitte zuerst einloggen, um zu veröffentlichen.', 'info')
      navigate('/login')
      return
    }
    if (publishBusy) return
    setPublishBusy(true)
    try {
      const check = validateFragmentShader(fragmentShader)
      if (!check.ok) {
        push(check.error || 'Shader-Fehler: kann nicht veröffentlicht werden.', 'err')
        return
      }

      const snapshot = getCompositeSnapshot()
      const thumb = captureCompositeThumbnail(snapshot, uniforms) ?? null

      const payload: unknown = {
        title: projectName.trim() || 'Untitled Shader',
        tagline: 'Community Look',
        fragment: fragmentShader,
        uniforms,
        layers: snapshot,
        ...(thumb ? { thumbnailDataUrl: thumb } : {}),
      }

      await apiFetch('/api/community/entries', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      push('In der Community veröffentlicht.', 'ok')
      navigate('/community')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Publish fehlgeschlagen.'
      push(msg, 'err')
    } finally {
      setPublishBusy(false)
    }
  }

  const editorTabAttr = narrow ? mTab : 'all'

  const fullStarter = `${SNIPPET_UNIFORMS}${SNIPPET_MAIN_START}
  vec3 col = 0.5 + 0.5 * cos(t + p.xyx + u_color);
${SNIPPET_MAIN_END}`

  return (
    <div
      className="app-shell app-shell--editor"
      data-editor-tab={editorTabAttr}
    >
      {narrow && (
        <nav className="editor-mobile-tabs" aria-label="Editor-Ansicht wechseln">
          <button
            type="button"
            className={mTab === 'view' ? 'is-active' : ''}
            onClick={() => setMTab('view')}
          >
            Vorschau
          </button>
          <button
            type="button"
            className={mTab === 'code' ? 'is-active' : ''}
            onClick={() => setMTab('code')}
          >
            Code
          </button>
          <button
            type="button"
            className={mTab === 'params' ? 'is-active' : ''}
            onClick={() => setMTab('params')}
          >
            Regler
          </button>
        </nav>
      )}
      <aside className="sidebar">
        <h2>Shader-Designer</h2>
        <Link to="/" className="sidebar-link">
          ← Start
        </Link>
        <Link to="/node-graph" className="sidebar-link">
          ← Node Graph bearbeiten
        </Link>

        <details className="editor-glsl-help">
          <summary>GLSL &amp; WebGL-1-Hilfe</summary>
          <p className="editor-glsl-help__p">
            Der Editor kompiliert gegen <strong>WebGL 1 / GLSL ES 1.00</strong>. Keine
            <code>#version 300 es</code>, keine Standard-<code>dFdx</code> ohne Extension.
          </p>
          <p className="editor-glsl-help__p">
            <a href={DOCS_WEBGL1} target="_blank" rel="noreferrer">
              GLSL ES 1.00 Spec (Khronos)
            </a>
          </p>
          <p className="editor-glsl-help__p">
            Performance: weniger Texture-Lookups, Schleifen mit fester Obergrenze, komplexe Shader
            können mobile GPUs belasten.
          </p>
          <div className="editor-glsl-help__snips">
            <button
              type="button"
              className="editor-glsl-help__btn"
              onClick={() =>
                copyText(SNIPPET_UNIFORMS).then(() => push('Uniform-Block kopiert.', 'info')).catch(() => push('Zwischenablage fehlgeschlagen.', 'err'))
              }
            >
              Uniform-Block kopieren
            </button>
            <button
              type="button"
              className="editor-glsl-help__btn"
              onClick={() =>
                copyText(SNIPPET_MAIN_START + '\n  vec3 col = u_color;\n' + SNIPPET_MAIN_END)
                  .then(() => push('main()-Gerüst kopiert.', 'info'))
                  .catch(() => push('Zwischenablage fehlgeschlagen.', 'err'))
              }
            >
              main()-Gerüst kopieren
            </button>
            <button
              type="button"
              className="editor-glsl-help__btn"
              onClick={() =>
                copyText(fullStarter)
                  .then(() => push('Minimal-Shader kopiert.', 'info'))
                  .catch(() => push('Zwischenablage fehlgeschlagen.', 'err'))
              }
            >
              Minimal-Shader kopieren
            </button>
          </div>
        </details>

        <label>Projektname</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <label className="sidebar-label-strong">Look-Preset</label>
        <select
          className="sidebar-select"
          aria-label="Shader-Preset"
          value={activePresetId}
          onChange={(e) => {
            const id = e.target.value
            const p = getShaderPreset(id)
            if (!p) return
            applyPresetWithRecommendedGrade(p)
          }}
        >
          <option value="">— Manuell / eigenes GLSL —</option>
          {SHADER_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="save-btn"
          onClick={() => randomizeLook()}
          title="Wählt ein zufälliges geometrisches/Signature-Preset und jittert Uniforms."
        >
          Random Shader
        </button>
        <div className="editor-quickmodes">
          <button type="button" className="editor-quickmodes__btn" onClick={applyPresetGrade}>
            Preset Grade
          </button>
          <button type="button" className="editor-quickmodes__btn" onClick={applyCinematicGrade}>
            Cinematic
          </button>
          <button type="button" className="editor-quickmodes__btn" onClick={applyNeonBoost}>
            Neon Boost
          </button>
        </div>
        {recommendedGrade ? (
          <p className="editor-grade-badge">
            Recommended: <strong>{recommendedGrade}</strong>
          </p>
        ) : (
          <p className="editor-grade-badge editor-grade-badge--muted">Recommended: manual shader</p>
        )}
        <p className="sidebar-hint">
          Quick Modes: <strong>Preset Grade</strong> = empfohlener Preset-Look,{' '}
          <strong>Cinematic</strong> = gedämpfter/filmischer, <strong>Neon Boost</strong> = kräftiger/leuchtender.
        </p>
        <p className="sidebar-hint">
          <Link to="/gallery">Galerie</Link> — Signature-Looks
        </p>
        <p className="sidebar-hint">
          Die Vorschau <strong>mischt alle sichtbaren Ebenen</strong> (Reihenfolge, Deckkraft und Modus
          im <Link to="/node-graph">Node Graph</Link>).
        </p>
        <label>Geschwindigkeit: {uniforms.u_speed.toFixed(2)}</label>
        <input
          type="range"
          min="0"
          max="3"
          step="0.01"
          value={uniforms.u_speed}
          onChange={(e) => setUniforms((u) => ({ ...u, u_speed: Number(e.target.value) }))}
        />
        <label>Skalierung: {uniforms.u_scale.toFixed(2)}</label>
        <input
          type="range"
          min="0.5"
          max="28"
          step="0.1"
          value={uniforms.u_scale}
          onChange={(e) => setUniforms((u) => ({ ...u, u_scale: Number(e.target.value) }))}
        />
        <label>Farbe: {colorHex}</label>
        <input
          type="color"
          value={colorHex}
          onChange={(e) => {
            const hex = e.target.value
            const r = parseInt(hex.slice(1, 3), 16) / 255
            const g = parseInt(hex.slice(3, 5), 16) / 255
            const b = parseInt(hex.slice(5, 7), 16) / 255
            setUniforms((u) => ({ ...u, u_color: [r, g, b] }))
          }}
        />
        <label>Intensität: {uniforms.u_intensity.toFixed(2)}</label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.01"
          value={uniforms.u_intensity}
          onChange={(e) =>
            setUniforms((u) => ({ ...u, u_intensity: Number(e.target.value) }))
          }
        />
        <label>Sättigung: {uniforms.u_saturation.toFixed(2)}</label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.01"
          value={uniforms.u_saturation}
          onChange={(e) =>
            setUniforms((u) => ({ ...u, u_saturation: Number(e.target.value) }))
          }
        />
        <label>Kontrast: {uniforms.u_contrast.toFixed(2)}</label>
        <input
          type="range"
          min="0.2"
          max="2.5"
          step="0.01"
          value={uniforms.u_contrast}
          onChange={(e) =>
            setUniforms((u) => ({ ...u, u_contrast: Number(e.target.value) }))
          }
        />
        <label>Gamma: {uniforms.u_gamma.toFixed(2)}</label>
        <input
          type="range"
          min="0.4"
          max="2.4"
          step="0.01"
          value={uniforms.u_gamma}
          onChange={(e) =>
            setUniforms((u) => ({ ...u, u_gamma: Number(e.target.value) }))
          }
        />
        <button type="button" className="save-btn" onClick={saveSnapshot}>
          Snapshot speichern
        </button>
        <button
          type="button"
          className="save-btn community-publish-btn"
          onClick={() => void publishCommunity()}
          disabled={publishBusy}
          title={!user ? 'Login erforderlich' : 'Look in die Community veröffentlichen'}
        >
          {publishBusy ? 'Veröffentliche…' : 'Publish to Community'}
        </button>
        <div className="snapshot-list">
          <div className="snapshot-title">Versionen</div>
          {snapshots.slice(0, 5).map((s) => (
            <button
              key={s.id}
              type="button"
              className="snapshot-item"
              onClick={() => {
                setProjectName(s.name)
                setUniforms(normalizeUniforms(s.uniforms))
                applyShader(s.shaderCode)
              }}
            >
              {s.thumbnailDataUrl ? (
                <img
                  src={s.thumbnailDataUrl}
                  alt=""
                  className="snapshot-item__thumb"
                />
              ) : null}
              <span>{s.name}</span>
              <small>{new Date(s.createdAt).toLocaleString('de-DE')}</small>
            </button>
          ))}
        </div>
      </aside>
      <main className="viewport" ref={mountRef} />
      <section className="editor-panel">
        <div className="editor-header">GLSL Fragment Shader</div>
        <Editor
          height="100%"
          defaultLanguage="cpp"
          theme="vs-dark"
          value={fragmentShader}
          onChange={(value) => applyShader(value ?? DEFAULT_FRAGMENT)}
          options={{ minimap: { enabled: false }, fontSize: 13 }}
        />
        {error ? (
          <div className="shader-error" role="alert" aria-live="assertive">
            {error}
          </div>
        ) : null}
      </section>
    </div>
  )
}
