import type { Edge, Node } from '@xyflow/react'
import { initialGraphEdges, initialGraphNodes } from '../graph/initialGraph'
import { DEFAULT_FRAGMENT } from '../shader/constants'

/** Minimal für Migration ohne Zyklus schema ↔ layers. */
export type ProjectFileLike = {
  shader: { fragment: string }
  graph: { nodes: Node[]; edges: Edge[] }
  layers?: unknown
}

export const DEFAULT_LAYER_ID = 'layer-1'

export type LayerBlendMode = 'normal' | 'add' | 'multiply'

export type ShaderLayerMeta = {
  id: string
  name: string
  visible: boolean
  order: number
  /** Deckkraft dieser Ebene beim Mischen (0–1). */
  opacity: number
  blendMode: LayerBlendMode
}

export type LayerBundle = {
  fragment: string
  nodes: Node[]
  edges: Edge[]
}

/** Gespeichert in Projekt-JSON unter `layers`. */
export type ProjectLayersPayload = {
  activeLayerId: string
  metas: ShaderLayerMeta[]
  bundles: Record<string, LayerBundle>
}

export function normalizeShaderLayerMeta(m: {
  id: string
  name: string
  visible: boolean
  order: number
  opacity?: unknown
  blendMode?: unknown
}): ShaderLayerMeta {
  const op = typeof m.opacity === 'number' && Number.isFinite(m.opacity) ? m.opacity : 1
  const bm: LayerBlendMode =
    m.blendMode === 'add' || m.blendMode === 'multiply' ? m.blendMode : 'normal'
  return {
    id: m.id,
    name: m.name,
    visible: m.visible,
    order: m.order,
    opacity: Math.min(1, Math.max(0, op)),
    blendMode: bm,
  }
}

function isLayerMetaLoose(
  x: unknown,
): x is { id: string; name: string; visible: boolean; order: number; opacity?: unknown; blendMode?: unknown } {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.visible === 'boolean' &&
    typeof o.order === 'number'
  )
}

function isLayerBundle(x: unknown): x is LayerBundle {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.fragment === 'string' &&
    Array.isArray(o.nodes) &&
    Array.isArray(o.edges)
  )
}

export function defaultLayerBundle(): LayerBundle {
  return {
    fragment: DEFAULT_FRAGMENT,
    nodes: initialGraphNodes,
    edges: initialGraphEdges,
  }
}

/** Aus gespeichertem Projekt: gültige `layers` nutzen oder aus Root-Graph migrieren. */
export function resolveProjectLayers(parsed: ProjectFileLike): ProjectLayersPayload {
  const Lraw = parsed.layers
  if (Lraw && typeof Lraw === 'object' && Lraw !== null) {
    const L = Lraw as Record<string, unknown>
    if (
      typeof L.activeLayerId === 'string' &&
      Array.isArray(L.metas) &&
      typeof L.bundles === 'object' &&
      L.bundles !== null
    ) {
      const rawMetas = L.metas.filter(isLayerMetaLoose)
      const bundles: Record<string, LayerBundle> = {}
      for (const [k, v] of Object.entries(L.bundles as Record<string, unknown>)) {
        if (isLayerBundle(v)) bundles[k] = v
      }
      if (
        rawMetas.length > 0 &&
        rawMetas.every((m) => bundles[m.id]) &&
        rawMetas.some((m) => m.id === L.activeLayerId)
      ) {
        const metas = rawMetas.map(normalizeShaderLayerMeta).sort((a, b) => a.order - b.order)
        return {
          activeLayerId: L.activeLayerId,
          metas,
          bundles: { ...bundles },
        }
      }
    }
  }

  const b: LayerBundle = {
    fragment: parsed.shader.fragment,
    nodes: parsed.graph.nodes,
    edges: parsed.graph.edges,
  }
  return {
    activeLayerId: DEFAULT_LAYER_ID,
    metas: [
      {
        id: DEFAULT_LAYER_ID,
        name: 'Layer 1',
        visible: true,
        order: 0,
        opacity: 1,
        blendMode: 'normal',
      },
    ],
    bundles: { [DEFAULT_LAYER_ID]: b },
  }
}

/** Initialzustand ohne gespeichertes Projekt (Legacy-Graph optional). */
export function initialLayersFromLegacyGraph(nodes: Node[], edges: Edge[]): ProjectLayersPayload {
  return {
    activeLayerId: DEFAULT_LAYER_ID,
    metas: [
      {
        id: DEFAULT_LAYER_ID,
        name: 'Layer 1',
        visible: true,
        order: 0,
        opacity: 1,
        blendMode: 'normal',
      },
    ],
    bundles: {
      [DEFAULT_LAYER_ID]: {
        fragment: DEFAULT_FRAGMENT,
        nodes,
        edges,
      },
    },
  }
}
