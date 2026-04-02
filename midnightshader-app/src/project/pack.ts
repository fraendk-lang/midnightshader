import type { Edge, Node } from '@xyflow/react'
import type { ProjectLayersPayload } from './layers'
import type { UniformsState } from '../shader/uniforms'

export const PACK_FORMAT = 'midnightshader-pack' as const
export const PACK_VERSION = 1 as const

export type PackItem = {
  kind: 'project' | 'snapshot'
  name: string
  createdAt: string
  shader: { fragment: string }
  uniforms: UniformsState
  graph?: { nodes: Node[]; edges: Edge[] }
  layers?: ProjectLayersPayload
}

export type MidnightShaderPackFile = {
  format: typeof PACK_FORMAT
  version: typeof PACK_VERSION
  exportedAt: string
  sourceProjectId?: string
  items: PackItem[]
}

export function isPackFile(x: unknown): x is MidnightShaderPackFile {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (o.format !== PACK_FORMAT || o.version !== PACK_VERSION) return false
  if (typeof o.exportedAt !== 'string' || !Array.isArray(o.items)) return false
  return o.items.every((it) => {
    if (!it || typeof it !== 'object') return false
    const i = it as Record<string, unknown>
    const u = i.uniforms as Record<string, unknown> | undefined
    const colorOk =
      u &&
      typeof u.u_scale === 'number' &&
      typeof u.u_speed === 'number' &&
      Array.isArray(u.u_color) &&
      u.u_color.length === 3
    return (
      (i.kind === 'project' || i.kind === 'snapshot') &&
      typeof i.name === 'string' &&
      typeof i.createdAt === 'string' &&
      typeof i.shader === 'object' &&
      i.shader !== null &&
      typeof (i.shader as { fragment?: unknown }).fragment === 'string' &&
      Boolean(colorOk)
    )
  })
}
