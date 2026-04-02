/* eslint-disable react-refresh/only-export-components -- Provider + useProject Hook */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import { buildFragmentShader } from '../graph/glslCodegen'
import { initialGraphEdges, initialGraphNodes } from '../graph/initialGraph'
import { GRAPH_LEGACY_KEY, loadSnapshots, notifyWorkspaceChanged } from '../lib/workspaceCatalog'
import { downloadPackJson, downloadProjectJson, readFileAsText, readProjectFile } from '../project/io'
import type { MidnightShaderPackFile, PackItem } from '../project/pack'
import { isPackFile } from '../project/pack'
import {
  defaultLayerBundle,
  initialLayersFromLegacyGraph,
  resolveProjectLayers,
  type LayerBlendMode,
  type LayerBundle,
  type ProjectLayersPayload,
  type ShaderLayerMeta,
} from '../project/layers'
import type { CompositeSnapshot } from '../shader/layerComposite'
import { isProjectFile, type MidnightShaderProjectFile } from '../project/schema'
import { DEFAULT_FRAGMENT, validateFragmentShader } from '../shader/constants'
import { getDefaultPreset } from '../shader/presets'
import { normalizeUniforms, type UniformsState } from '../shader/uniforms'

const STORAGE_FULL = 'midnightshader:fullProject'
const SCHEMA_REVISION = 1 as const

const defaultUniforms: UniformsState = normalizeUniforms(getDefaultPreset().uniforms)

function cloneBundles(b: Record<string, LayerBundle>): Record<string, LayerBundle> {
  const o: Record<string, LayerBundle> = {}
  for (const [k, v] of Object.entries(b)) {
    o[k] = { fragment: v.fragment, nodes: v.nodes, edges: v.edges }
  }
  return o
}

function buildLayersPayload(
  activeLayerId: string,
  metas: ShaderLayerMeta[],
  bundlesSnapshot: Record<string, LayerBundle>,
  fragmentShader: string,
  graphNodes: Node[],
  graphEdges: Edge[],
): ProjectLayersPayload {
  const bundles = {
    ...bundlesSnapshot,
    [activeLayerId]: { fragment: fragmentShader, nodes: graphNodes, edges: graphEdges },
  }
  return { activeLayerId, metas, bundles }
}

function loadGraphLegacy(): { nodes: Node[]; edges: Edge[] } {
  try {
    const raw = localStorage.getItem(GRAPH_LEGACY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { nodes?: Node[]; edges?: Edge[] }
      if (Array.isArray(parsed.nodes) && parsed.nodes.length && Array.isArray(parsed.edges)) {
        return { nodes: parsed.nodes, edges: parsed.edges }
      }
    }
  } catch {
    /* ignore */
  }
  return { nodes: initialGraphNodes, edges: initialGraphEdges }
}

function loadInitial(): {
  fragmentShader: string
  uniforms: UniformsState
  graphNodes: Node[]
  graphEdges: Edge[]
  projectName: string
  projectId: string
  layers: ProjectLayersPayload
} {
  try {
    const raw = localStorage.getItem(STORAGE_FULL)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (isProjectFile(parsed)) {
        const ly = resolveProjectLayers(parsed)
        const bundle = ly.bundles[ly.activeLayerId] ?? defaultLayerBundle()
        return {
          fragmentShader: bundle.fragment,
          uniforms: normalizeUniforms(parsed.uniforms),
          graphNodes: bundle.nodes,
          graphEdges: bundle.edges,
          projectName: parsed.meta.name,
          projectId: parsed.meta.projectId ?? crypto.randomUUID(),
          layers: ly,
        }
      }
    }
  } catch {
    /* ignore */
  }
  const g = loadGraphLegacy()
  const ly = initialLayersFromLegacyGraph(g.nodes, g.edges)
  return {
    fragmentShader: DEFAULT_FRAGMENT,
    uniforms: { ...defaultUniforms },
    graphNodes: g.nodes,
    graphEdges: g.edges,
    projectName: 'Obsidian Flux',
    projectId: crypto.randomUUID(),
    layers: ly,
  }
}

type ProjectContextValue = {
  projectId: string
  projectName: string
  setProjectName: (name: string) => void
  fragmentShader: string
  setFragmentShader: (code: string) => void
  uniforms: UniformsState
  setUniforms: React.Dispatch<React.SetStateAction<UniformsState>>
  graphNodes: Node[]
  graphEdges: Edge[]
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addGraphNode: (node: Node) => void
  applyGraphToShader: () => { ok: boolean; error?: string }
  graphCodegenError: string | null
  setGraphCodegenError: (msg: string | null) => void
  saveProjectLocal: () => void
  exportProjectDownload: () => void
  exportPackDownload: () => void
  importProjectFromFile: (file: File) => Promise<void>
  importShaderFromFile: (file: File) => Promise<void>
  importAnyFile: (file: File) => Promise<void>
  /** Ebenen (je Ebene eigener Graph + Fragment; aktiv = Editor/Vorschau) */
  layerMetas: ShaderLayerMeta[]
  activeLayerId: string
  selectLayer: (id: string) => void
  addLayer: () => void
  removeLayer: (id: string) => void
  renameLayer: (id: string) => void
  setLayerVisible: (id: string, visible: boolean) => void
  setLayerOpacity: (id: string, opacity: number) => void
  setLayerBlendMode: (id: string, mode: LayerBlendMode) => void
  /** Reihenfolge ändern (unten->oben) für den Misch-Stack. */
  moveLayerUp: (id: string) => void
  moveLayerDown: (id: string) => void
  /** Ebene duplizieren (Graph-ID Remapping). */
  duplicateLayer: (id: string) => void
  /** Aktueller Misch-Snapshot für Editor-Vorschau & Thumbnails */
  getCompositeSnapshot: () => CompositeSnapshot
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const init = loadInitial()
  const [projectId, setProjectId] = useState(init.projectId)
  const [projectName, setProjectName] = useState(init.projectName)
  const [fragmentShader, setFragmentShader] = useState(init.fragmentShader)
  const [uniforms, setUniforms] = useState<UniformsState>(init.uniforms)
  const [graphNodes, setGraphNodes] = useState<Node[]>(init.graphNodes)
  const [graphEdges, setGraphEdges] = useState<Edge[]>(init.graphEdges)
  const [graphCodegenError, setGraphCodegenError] = useState<string | null>(null)
  const [layerMetas, setLayerMetas] = useState<ShaderLayerMeta[]>(() =>
    [...init.layers.metas].sort((a, b) => a.order - b.order),
  )
  const [activeLayerId, setActiveLayerId] = useState(init.layers.activeLayerId)
  const bundlesRef = useRef<Record<string, LayerBundle>>(cloneBundles(init.layers.bundles))

  const persistRef = useRef(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useLayoutEffect(() => {
    bundlesRef.current = {
      ...bundlesRef.current,
      [activeLayerId]: {
        fragment: fragmentShader,
        nodes: graphNodes,
        edges: graphEdges,
      },
    }
  }, [fragmentShader, graphNodes, graphEdges, activeLayerId])

  const persistFull = useCallback(() => {
    const layers = buildLayersPayload(
      activeLayerId,
      layerMetas,
      bundlesRef.current,
      fragmentShader,
      graphNodes,
      graphEdges,
    )
    const payload: MidnightShaderProjectFile = {
      format: 'midnightshader-project',
      version: 1,
      meta: {
        name: projectName,
        updatedAt: new Date().toISOString(),
        projectId,
        schemaRevision: SCHEMA_REVISION,
      },
      shader: { fragment: fragmentShader },
      uniforms,
      graph: { nodes: graphNodes, edges: graphEdges },
      layers,
    }
    localStorage.setItem(STORAGE_FULL, JSON.stringify(payload))
    localStorage.setItem(
      GRAPH_LEGACY_KEY,
      JSON.stringify({ nodes: graphNodes, edges: graphEdges }),
    )
  }, [
    projectName,
    projectId,
    fragmentShader,
    uniforms,
    graphNodes,
    graphEdges,
    activeLayerId,
    layerMetas,
  ])

  const persistFullRef = useRef(persistFull)
  useEffect(() => {
    persistFullRef.current = persistFull
  }, [persistFull])

  useEffect(() => {
    const flush = () => {
      if (!persistRef.current) return
      try {
        persistFullRef.current()
      } catch {
        /* ignore */
      }
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  useEffect(() => {
    if (!persistRef.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => persistFull(), 800)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (persistRef.current) persistFullRef.current()
    }
  }, [persistFull])

  const applyLoadedProject = useCallback((raw: MidnightShaderProjectFile) => {
    persistRef.current = false
    const nextId = raw.meta.projectId ?? crypto.randomUUID()
    const ly = resolveProjectLayers(raw)
    const bundle = ly.bundles[ly.activeLayerId] ?? defaultLayerBundle()
    setProjectId(nextId)
    setProjectName(raw.meta.name)
    setFragmentShader(bundle.fragment)
    setUniforms(normalizeUniforms(raw.uniforms))
    setGraphNodes(bundle.nodes)
    setGraphEdges(bundle.edges)
    setLayerMetas([...ly.metas].sort((a, b) => a.order - b.order))
    setActiveLayerId(ly.activeLayerId)
    bundlesRef.current = cloneBundles(ly.bundles)
    setGraphCodegenError(null)
    queueMicrotask(() => {
      persistRef.current = true
      const layers = buildLayersPayload(
        ly.activeLayerId,
        ly.metas,
        cloneBundles(ly.bundles),
        bundle.fragment,
        bundle.nodes,
        bundle.edges,
      )
      const stored: MidnightShaderProjectFile = {
        ...raw,
        meta: {
          ...raw.meta,
          projectId: nextId,
          schemaRevision: raw.meta.schemaRevision ?? SCHEMA_REVISION,
        },
        shader: { fragment: bundle.fragment },
        graph: { nodes: bundle.nodes, edges: bundle.edges },
        layers,
      }
      localStorage.setItem(STORAGE_FULL, JSON.stringify(stored))
      notifyWorkspaceChanged()
    })
  }, [])

  const saveProjectLocal = useCallback(() => {
    persistFull()
    notifyWorkspaceChanged()
  }, [persistFull])

  const exportProjectDownload = useCallback(() => {
    const layers = buildLayersPayload(
      activeLayerId,
      layerMetas,
      bundlesRef.current,
      fragmentShader,
      graphNodes,
      graphEdges,
    )
    downloadProjectJson({
      meta: {
        name: projectName,
        updatedAt: new Date().toISOString(),
        projectId,
        schemaRevision: SCHEMA_REVISION,
      },
      shader: { fragment: fragmentShader },
      uniforms,
      graph: { nodes: graphNodes, edges: graphEdges },
      layers,
    })
  }, [projectName, projectId, fragmentShader, uniforms, graphNodes, graphEdges, activeLayerId, layerMetas])

  const exportPackDownload = useCallback(() => {
    const snaps = loadSnapshots()
    const layers = buildLayersPayload(
      activeLayerId,
      layerMetas,
      bundlesRef.current,
      fragmentShader,
      graphNodes,
      graphEdges,
    )
    const items: PackItem[] = [
      {
        kind: 'project',
        name: projectName,
        createdAt: new Date().toISOString(),
        shader: { fragment: fragmentShader },
        uniforms,
        graph: { nodes: graphNodes, edges: graphEdges },
        layers,
      },
      ...snaps.map(
        (s): PackItem => ({
          kind: 'snapshot',
          name: s.name,
          createdAt: s.createdAt,
          shader: { fragment: s.shaderCode },
          uniforms: s.uniforms,
        }),
      ),
    ]
    const pack: Omit<MidnightShaderPackFile, 'format' | 'version'> = {
      exportedAt: new Date().toISOString(),
      sourceProjectId: projectId,
      items,
    }
    downloadPackJson(pack)
  }, [projectName, projectId, fragmentShader, uniforms, graphNodes, graphEdges, activeLayerId, layerMetas])

  const importProjectFromFile = useCallback(
    async (file: File) => {
      const raw = await readProjectFile(file)
      if (!isProjectFile(raw)) {
        throw new Error('Keine gültige MidnightShader-Projektdatei.')
      }
      applyLoadedProject(raw)
    },
    [applyLoadedProject],
  )

  const importShaderFromText = useCallback((trimmed: string) => {
    if (!trimmed) throw new Error('Leerer Shader-Code.')
    const check = validateFragmentShader(trimmed)
    if (!check.ok) {
      throw new Error(check.error || 'GLSL kompiliert nicht (WebGL 1).')
    }
    setFragmentShader(trimmed)
    setGraphCodegenError(null)
  }, [])

  const importShaderFromFile = useCallback(
    async (file: File) => {
      const text = await readFileAsText(file)
      importShaderFromText(text.trim())
    },
    [importShaderFromText],
  )

  const importPackFirst = useCallback(
    (pack: MidnightShaderPackFile) => {
      const item =
        pack.items.find((i) => i.kind === 'project') ?? pack.items[0]
      if (!item) throw new Error('Pack enthält keine Einträge.')
      const synthetic: MidnightShaderProjectFile = {
        format: 'midnightshader-project',
        version: 1,
        meta: {
          name: item.name,
          updatedAt: item.createdAt,
          projectId: pack.sourceProjectId,
          schemaRevision: SCHEMA_REVISION,
        },
        shader: item.shader,
        uniforms: normalizeUniforms(item.uniforms),
        graph: item.graph ?? { nodes: initialGraphNodes, edges: initialGraphEdges },
        layers: item.layers,
      }
      applyLoadedProject(synthetic)
    },
    [applyLoadedProject],
  )

  const importAnyFile = useCallback(
    async (file: File) => {
      const text = (await readFileAsText(file)).trim()
      if (!text) throw new Error('Leere Datei.')
      if (text.startsWith('{')) {
        let parsed: unknown
        try {
          parsed = JSON.parse(text) as unknown
        } catch {
          throw new Error('Ungültiges JSON.')
        }
        if (isProjectFile(parsed)) {
          applyLoadedProject(parsed)
          return
        }
        if (isPackFile(parsed)) {
          importPackFirst(parsed)
          return
        }
        throw new Error('Unbekanntes JSON (weder Projekt noch Pack).')
      }
      importShaderFromText(text)
    },
    [applyLoadedProject, importPackFirst, importShaderFromText],
  )

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setGraphNodes((nds) => applyNodeChanges(changes, nds))
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setGraphEdges((eds) => applyEdgeChanges(changes, eds))
  }, [])

  const onConnect = useCallback((connection: Connection) => {
    setGraphEdges((eds) => addEdge(connection, eds))
  }, [])

  const addGraphNode = useCallback((node: Node) => {
    setGraphNodes((nds) => [...nds, node])
  }, [])

  const applyGraphToShader = useCallback(() => {
    const { code, error } = buildFragmentShader(graphNodes, graphEdges)
    if (error || !code) {
      setGraphCodegenError(error ?? 'Codegenerierung fehlgeschlagen.')
      return { ok: false, error: error ?? 'Unbekannter Fehler' }
    }
    setGraphCodegenError(null)
    setFragmentShader(code)
    return { ok: true }
  }, [graphNodes, graphEdges])

  const selectLayer = useCallback(
    (id: string) => {
      if (id === activeLayerId) return
      bundlesRef.current = {
        ...bundlesRef.current,
        [activeLayerId]: { fragment: fragmentShader, nodes: graphNodes, edges: graphEdges },
      }
      if (!bundlesRef.current[id]) {
        bundlesRef.current = { ...bundlesRef.current, [id]: defaultLayerBundle() }
      }
      const target = bundlesRef.current[id]!
      setActiveLayerId(id)
      setGraphNodes(target.nodes)
      setGraphEdges(target.edges)
      setFragmentShader(target.fragment)
      setGraphCodegenError(null)
    },
    [activeLayerId, fragmentShader, graphNodes, graphEdges],
  )

  const addLayer = useCallback(() => {
    bundlesRef.current = {
      ...bundlesRef.current,
      [activeLayerId]: { fragment: fragmentShader, nodes: graphNodes, edges: graphEdges },
    }
    const id = crypto.randomUUID()
    const nb = defaultLayerBundle()
    bundlesRef.current = { ...bundlesRef.current, [id]: nb }
    const nextOrder =
      layerMetas.length === 0 ? 0 : Math.max(...layerMetas.map((m) => m.order)) + 1
    setLayerMetas((m) => [
      ...m,
      {
        id,
        name: `Layer ${m.length + 1}`,
        visible: true,
        order: nextOrder,
        opacity: 1,
        blendMode: 'normal',
      },
    ])
    setActiveLayerId(id)
    setGraphNodes(nb.nodes)
    setGraphEdges(nb.edges)
    setFragmentShader(nb.fragment)
    setGraphCodegenError(null)
  }, [layerMetas, activeLayerId, fragmentShader, graphNodes, graphEdges])

  const removeLayer = useCallback(
    (id: string) => {
      if (layerMetas.length <= 1) return
      bundlesRef.current = {
        ...bundlesRef.current,
        [activeLayerId]: { fragment: fragmentShader, nodes: graphNodes, edges: graphEdges },
      }
      const rest = { ...bundlesRef.current }
      delete rest[id]
      bundlesRef.current = rest
      const nextMetas = layerMetas
        .filter((m) => m.id !== id)
        .map((m, i) => ({ ...m, order: i }))
      setLayerMetas(nextMetas)
      if (id === activeLayerId) {
        const nid = nextMetas[0]?.id
        if (!nid) return
        const nb = rest[nid] ?? defaultLayerBundle()
        bundlesRef.current = { ...rest, [nid]: nb }
        setActiveLayerId(nid)
        setGraphNodes(nb.nodes)
        setGraphEdges(nb.edges)
        setFragmentShader(nb.fragment)
        setGraphCodegenError(null)
      }
    },
    [layerMetas, activeLayerId, fragmentShader, graphNodes, graphEdges],
  )

  const renameLayer = useCallback(
    (id: string) => {
      const meta = layerMetas.find((m) => m.id === id)
      const n = window.prompt('Name der Ebene', meta?.name ?? '')
      if (n === null) return
      const t = n.trim()
      if (!t) return
      setLayerMetas((ms) => ms.map((m) => (m.id === id ? { ...m, name: t } : m)))
    },
    [layerMetas],
  )

  const setLayerVisible = useCallback((id: string, visible: boolean) => {
    setLayerMetas((ms) => ms.map((m) => (m.id === id ? { ...m, visible } : m)))
  }, [])

  const setLayerOpacity = useCallback((id: string, opacity: number) => {
    const o = Math.min(1, Math.max(0, opacity))
    setLayerMetas((ms) => ms.map((m) => (m.id === id ? { ...m, opacity: o } : m)))
  }, [])

  const setLayerBlendMode = useCallback((id: string, blendMode: LayerBlendMode) => {
    setLayerMetas((ms) => ms.map((m) => (m.id === id ? { ...m, blendMode } : m)))
  }, [])

  const moveLayerInternal = useCallback(
    (id: string, direction: -1 | 1) => {
      const sorted = [...layerMetas].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex((m) => m.id === id)
      if (idx < 0) return
      const ni = idx + direction
      if (ni < 0 || ni >= sorted.length) return
      const swapped = [...sorted]
      const tmp = swapped[idx]!
      swapped[idx] = swapped[ni]!
      swapped[ni] = tmp
      const reOrdered = swapped.map((m, i) => ({ ...m, order: i }))
      setLayerMetas(reOrdered)
    },
    [layerMetas],
  )

  const moveLayerUp = useCallback(
    (id: string) => moveLayerInternal(id, -1),
    [moveLayerInternal],
  )

  const moveLayerDown = useCallback(
    (id: string) => moveLayerInternal(id, 1),
    [moveLayerInternal],
  )

  const duplicateLayer = useCallback(
    (id: string) => {
      const meta = layerMetas.find((m) => m.id === id)
      if (!meta) return
      const src = bundlesRef.current[id] ?? defaultLayerBundle()

      // ReactFlow verlangt eindeutige Node-IDs: deshalb Remapping beim Duplikat.
      const nodeIdMap = new Map<string, string>()
      const newNodes = src.nodes.map((n) => {
        const nid = crypto.randomUUID()
        nodeIdMap.set(n.id, nid)
        return { ...n, id: nid }
      })
      const newEdges = src.edges.map((e) => ({
        ...e,
        id: crypto.randomUUID(),
        source: nodeIdMap.get(e.source) ?? e.source,
        target: nodeIdMap.get(e.target) ?? e.target,
      }))

      const newId = crypto.randomUUID()
      const clonedBundle: LayerBundle = {
        fragment: src.fragment,
        nodes: newNodes,
        edges: newEdges,
      }

      bundlesRef.current = { ...bundlesRef.current, [newId]: clonedBundle }
      const nextOrder =
        layerMetas.length === 0 ? 0 : Math.max(...layerMetas.map((m) => m.order)) + 1

      setLayerMetas((ms) => [
        ...ms,
        {
          ...meta,
          id: newId,
          name: `${meta.name} Copy`,
          visible: true,
          order: nextOrder,
          opacity: meta.opacity,
          blendMode: meta.blendMode,
        },
      ])

      setActiveLayerId(newId)
      setGraphNodes(newNodes)
      setGraphEdges(newEdges)
      setFragmentShader(src.fragment)
      setGraphCodegenError(null)
    },
    [layerMetas],
  )

  const getCompositeSnapshot = useCallback((): CompositeSnapshot => {
    const bundles = {
      ...bundlesRef.current,
      [activeLayerId]: { fragment: fragmentShader, nodes: graphNodes, edges: graphEdges },
    }
    return { metas: layerMetas, bundles }
  }, [layerMetas, activeLayerId, fragmentShader, graphNodes, graphEdges])

  const value = useMemo(
    () => ({
      projectId,
      projectName,
      setProjectName,
      fragmentShader,
      setFragmentShader,
      uniforms,
      setUniforms,
      graphNodes,
      graphEdges,
      onNodesChange,
      onEdgesChange,
      onConnect,
      addGraphNode,
      applyGraphToShader,
      graphCodegenError,
      setGraphCodegenError,
      saveProjectLocal,
      exportProjectDownload,
      exportPackDownload,
      importProjectFromFile,
      importShaderFromFile,
      importAnyFile,
      layerMetas,
      activeLayerId,
      selectLayer,
      addLayer,
      removeLayer,
      renameLayer,
      setLayerVisible,
      setLayerOpacity,
      setLayerBlendMode,
      moveLayerUp,
      moveLayerDown,
      duplicateLayer,
      getCompositeSnapshot,
    }),
    [
      projectId,
      projectName,
      fragmentShader,
      uniforms,
      graphNodes,
      graphEdges,
      onNodesChange,
      onEdgesChange,
      onConnect,
      addGraphNode,
      applyGraphToShader,
      graphCodegenError,
      saveProjectLocal,
      exportProjectDownload,
      exportPackDownload,
      importProjectFromFile,
      importShaderFromFile,
      importAnyFile,
      layerMetas,
      activeLayerId,
      selectLayer,
      addLayer,
      removeLayer,
      renameLayer,
      setLayerVisible,
      setLayerOpacity,
      setLayerBlendMode,
      moveLayerUp,
      moveLayerDown,
      duplicateLayer,
      getCompositeSnapshot,
    ],
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject außerhalb von ProjectProvider')
  return ctx
}
