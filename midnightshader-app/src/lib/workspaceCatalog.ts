import { isProjectFile } from '../project/schema'
import type { UniformsState } from '../shader/uniforms'

export const SNAPSHOTS_KEY = 'midnightshader:snapshots'
export const FULL_KEY = 'midnightshader:fullProject'
/** Legacy: nur noch für Migration / Anzeige in Einstellungen */
export const GRAPH_LEGACY_KEY = 'midnightshader:graph'
export const WORKSPACE_CHANGED_EVENT = 'midnightshader:workspace-changed'

export function notifyWorkspaceChanged() {
  window.dispatchEvent(new Event(WORKSPACE_CHANGED_EVENT))
}

export type StoredSnapshot = {
  id: string
  name: string
  createdAt: string
  shaderCode: string
  uniforms: UniformsState
  /** JPEG-Data-URL, beim Snapshot erzeugt (optional bei älteren Einträgen). */
  thumbnailDataUrl?: string
}

export type CurrentProjectSummary = {
  id: '__current__'
  name: string
  updatedAt: string
}

export type CatalogRow = {
  id: string
  name: string
  updatedAt: string
  kind: 'current' | 'snapshot'
  badge: string
  sizeLabel: string
  thumbnailDataUrl?: string
}

function approxShaderSizeBytes(code: string) {
  return new TextEncoder().encode(code).length
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(1)} KB`
}

function formatRelative(iso: string) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} Min.`
  const h = Math.floor(m / 60)
  if (h < 48) return `vor ${h} Std.`
  const d = Math.floor(h / 24)
  return `vor ${d} Tag${d === 1 ? '' : 'en'}`
}

export function loadSnapshots(): StoredSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is StoredSnapshot =>
        typeof x === 'object' &&
        x !== null &&
        typeof (x as StoredSnapshot).id === 'string' &&
        typeof (x as StoredSnapshot).name === 'string' &&
        typeof (x as StoredSnapshot).createdAt === 'string' &&
        typeof (x as StoredSnapshot).shaderCode === 'string' &&
        ((x as StoredSnapshot).thumbnailDataUrl === undefined ||
          typeof (x as StoredSnapshot).thumbnailDataUrl === 'string'),
    )
  } catch {
    return []
  }
}

export function loadCurrentSummary(): CurrentProjectSummary | null {
  try {
    const raw = localStorage.getItem(FULL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isProjectFile(parsed)) return null
    return {
      id: '__current__',
      name: parsed.meta.name,
      updatedAt: parsed.meta.updatedAt,
    }
  } catch {
    return null
  }
}

/** Hash 0–360 für dezente Hintergrund-Variation pro Name */
export function hueFromString(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}

export function buildRecentCards(max = 4): CatalogRow[] {
  const current = loadCurrentSummary()
  const snaps = [...loadSnapshots()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const out: CatalogRow[] = []
  if (current) {
    out.push({
      id: current.id,
      name: current.name,
      updatedAt: current.updatedAt,
      kind: 'current',
      badge: 'Aktives Projekt',
      sizeLabel: '',
    })
  }
  for (const s of snaps) {
    if (out.length >= max) break
    out.push({
      id: s.id,
      name: s.name,
      updatedAt: s.createdAt,
      kind: 'snapshot',
      badge: 'Snapshot',
      sizeLabel: formatBytes(approxShaderSizeBytes(s.shaderCode)),
      thumbnailDataUrl: s.thumbnailDataUrl,
    })
  }
  return out.slice(0, max)
}

export function buildAllProjectRows(limit = 12): CatalogRow[] {
  const current = loadCurrentSummary()
  const snaps = loadSnapshots()
  const rows: CatalogRow[] = []

  if (current) {
    rows.push({
      id: current.id,
      name: current.name,
      updatedAt: current.updatedAt,
      kind: 'current',
      badge: 'Aktuell',
      sizeLabel: '',
    })
  }

  for (const s of snaps) {
    rows.push({
      id: s.id,
      name: s.name,
      updatedAt: s.createdAt,
      kind: 'snapshot',
      badge: 'Snapshot',
      sizeLabel: formatBytes(approxShaderSizeBytes(s.shaderCode)),
      thumbnailDataUrl: s.thumbnailDataUrl,
    })
  }

  rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return rows.slice(0, limit)
}

export { formatRelative }
