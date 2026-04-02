import type { Edge, Node } from '@xyflow/react'
import type { UniformsState } from '../shader/uniforms'
import type { ProjectLayersPayload } from './layers'

export const PROJECT_FORMAT = 'midnightshader-project' as const
export const PROJECT_VERSION = 1 as const

export type MidnightShaderProjectFile = {
  format: typeof PROJECT_FORMAT
  version: typeof PROJECT_VERSION
  meta: {
    name: string
    updatedAt: string
    /** Stabile Projekt-ID für Packs & spätere Sync-Strategien */
    projectId?: string
    /** Dateischema-Revision (App-Logik), unabhängig von `version` */
    schemaRevision?: number
  }
  shader: {
    fragment: string
  }
  uniforms: UniformsState
  graph: {
    nodes: Node[]
    edges: Edge[]
  }
  /** Mehrere Ebenen: je Ebene eigener Graph + Fragment (aktive Ebene = Vorschau / Editor). */
  layers?: ProjectLayersPayload
}

export function isProjectFile(x: unknown): x is MidnightShaderProjectFile {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  const u = o.uniforms as Record<string, unknown> | null
  const colorOk =
    u &&
    typeof u.u_scale === 'number' &&
    typeof u.u_speed === 'number' &&
    Array.isArray(u.u_color) &&
    u.u_color.length === 3 &&
    u.u_color.every((n) => typeof n === 'number')
  const mid = o.meta as Record<string, unknown> | null
  if (mid?.projectId !== undefined && typeof mid.projectId !== 'string') return false
  if (mid?.schemaRevision !== undefined && typeof mid.schemaRevision !== 'number') return false

  return (
    o.format === PROJECT_FORMAT &&
    o.version === PROJECT_VERSION &&
    typeof o.meta === 'object' &&
    o.meta !== null &&
    typeof (o.meta as { name?: unknown }).name === 'string' &&
    typeof o.shader === 'object' &&
    o.shader !== null &&
    typeof (o.shader as { fragment?: unknown }).fragment === 'string' &&
    Boolean(colorOk) &&
    Array.isArray((o.graph as { nodes?: unknown })?.nodes) &&
    Array.isArray((o.graph as { edges?: unknown })?.edges)
  )
}
