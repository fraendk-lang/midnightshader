import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useProject } from '../context/ProjectContext'
import type { LayerBlendMode } from '../project/layers'
import {
  AddFloatNode,
  FloatConstNode,
  FragmentOutNode,
  MixFinalNode,
  MulFloatNode,
  TimeSourceNode,
  UvSourceNode,
  WaveNode,
} from '../graph/GraphNodeViews'

const nodeTypes = {
  uvSource: UvSourceNode,
  timeSource: TimeSourceNode,
  wave: WaveNode,
  mixFinal: MixFinalNode,
  fragmentOut: FragmentOutNode,
  floatConst: FloatConstNode,
  mulFloat: MulFloatNode,
  addFloat: AddFloatNode,
} satisfies NodeTypes

function randomSpawn() {
  return {
    x: 200 + Math.random() * 140,
    y: 96 + Math.random() * 120,
  }
}

function NodesRail() {
  const { addGraphNode } = useProject()

  return (
    <div className="graph-rail-nodes">
      <p className="graph-rail-hint">
        Neue Knoten erscheinen im sichtbaren Graph-Bereich (feste Startposition). Im Canvas
        verschieben und verbinden.
      </p>
      <span className="graph-add-panel__label">Knoten</span>
      <div className="graph-rail-node-btns">
        <button
          type="button"
          className="graph-add-panel__btn"
          onClick={() =>
            addGraphNode({
              id: crypto.randomUUID(),
              type: 'floatConst',
              position: randomSpawn(),
              data: { value: 0.5, label: '0.5' },
            })
          }
        >
          Konstante
        </button>
        <button
          type="button"
          className="graph-add-panel__btn"
          onClick={() =>
            addGraphNode({
              id: crypto.randomUUID(),
              type: 'mulFloat',
              position: randomSpawn(),
              data: { label: '×' },
            })
          }
        >
          ×
        </button>
        <button
          type="button"
          className="graph-add-panel__btn"
          onClick={() =>
            addGraphNode({
              id: crypto.randomUUID(),
              type: 'addFloat',
              position: randomSpawn(),
              data: { label: '+' },
            })
          }
        >
          +
        </button>
      </div>
    </div>
  )
}

function LayersRail() {
  const {
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
  } = useProject()

  const sorted = useMemo(
    () => [...layerMetas].sort((a, b) => a.order - b.order),
    [layerMetas],
  )

  return (
    <div className="graph-rail-layers">
      <p className="graph-rail-hint">
        Jede Ebene: eigener Graph + GLSL. Unten→oben gemischt in der{' '}
        <strong>Editor-Vorschau</strong>. Deckkraft und Modus steuern das Überblenden; ausgeblendete
        Ebenen (○) fehlen im Mix.
      </p>
      <ul className="graph-layer-list">
        {sorted.map((m) => (
          <li key={m.id}>
            <div
              className={`graph-layer-row ${m.id === activeLayerId ? 'is-active' : ''}`.trim()}
            >
              <button
                type="button"
                className="graph-layer-row__vis"
                title={m.visible ? 'Sichtbar (Platzhalter)' : 'Ausgeblendet'}
                aria-pressed={m.visible}
                onClick={() => setLayerVisible(m.id, !m.visible)}
              >
                {m.visible ? '●' : '○'}
              </button>
              <button
                type="button"
                className="graph-layer-row__name"
                onClick={() => selectLayer(m.id)}
                onDoubleClick={() => renameLayer(m.id)}
                title="Doppelklick: umbenennen"
              >
                {m.name}
              </button>
              <div className="graph-layer-row__reorder">
                <button
                  type="button"
                  className="graph-layer-row__btn"
                  title="Nach oben"
                  disabled={m.id === sorted[0]?.id}
                  onClick={() => moveLayerUp(m.id)}
                >
                  ^
                </button>
                <button
                  type="button"
                  className="graph-layer-row__btn"
                  title="Nach unten"
                  disabled={m.id === sorted[sorted.length - 1]?.id}
                  onClick={() => moveLayerDown(m.id)}
                >
                  v
                </button>
                <button
                  type="button"
                  className="graph-layer-row__btn graph-layer-row__btn--dup"
                  title="Duplizieren"
                  onClick={() => duplicateLayer(m.id)}
                >
                  dup
                </button>
              </div>
              <button
                type="button"
                className="graph-layer-row__del"
                disabled={layerMetas.length <= 1}
                title="Ebene löschen"
                onClick={() => removeLayer(m.id)}
              >
                ×
              </button>
            </div>
            <div className="graph-layer-mix">
              <label className="graph-layer-mix__label">
                Deckkraft
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={m.opacity}
                  onChange={(e) => setLayerOpacity(m.id, Number(e.target.value))}
                />
              </label>
              <label className="graph-layer-mix__label graph-layer-mix__label--select">
                Modus
                <select
                  value={m.blendMode}
                  onChange={(e) =>
                    setLayerBlendMode(m.id, e.target.value as LayerBlendMode)
                  }
                >
                  <option value="normal">Normal</option>
                  <option value="add">Additiv</option>
                  <option value="multiply">Multiplizieren</option>
                </select>
              </label>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="graph-layer-add graph-add-panel__btn" onClick={addLayer}>
        + Ebene hinzufügen
      </button>
    </div>
  )
}

function NodeGraphCanvas() {
  const {
    graphNodes,
    graphEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    applyGraphToShader,
    graphCodegenError,
    setGraphCodegenError,
    activeLayerId,
  } = useProject()

  const onApply = useCallback(() => {
    const r = applyGraphToShader()
    if (!r.ok && r.error) setGraphCodegenError(r.error)
  }, [applyGraphToShader, setGraphCodegenError])

  const defaultEdgeOptions = useMemo(
    () => ({ style: { stroke: 'rgba(182, 160, 255, 0.5)', strokeWidth: 2 } }),
    [],
  )

  return (
    <>
      <div className="graph-scope-note" role="note">
        <strong>Graph vs. Galerie-Presets:</strong> Dieser Graph erzeugt ein{' '}
        <em>eigenes, vereinfachtes</em> GLSL-Fragment. Signature-Looks aus der Galerie existieren
        nur im Editor-Code — <strong>„Graph → GLSL anwenden“ ersetzt</strong> den aktuellen
        Fragment-Shader vollständig (Presets danach ggf. erneut laden).
      </div>
      <details className="graph-manual">
        <summary className="graph-manual__summary">Anleitung: Node Editor bedienen</summary>
        <div className="graph-manual__body">
          <p>
            <strong>Ebenen:</strong> Links unter „Ebenen“ wechselst du zwischen separaten Graphs.
            Nur die <em>aktive</em> Ebene wird in den Editor übernommen. „+ Ebene hinzufügen“ legt
            eine neue Ebene mit Standard-Graph an.
          </p>
          <p>
            <strong>Knoten hinzufügen:</strong> Tab „Knoten“ — oder weiterhin unten im Canvas-Bereich
            arbeiten. Neue Knoten erscheinen an einer festen Startposition im Graph.
          </p>
          <p>
            <strong>Verbindungen:</strong> Von einem <em>Ausgang</em> (kleiner Punkt rechts) zum{' '}
            <em>Eingang</em> (Punkt links) eines anderen Knotens ziehen. Nur passende Typen
            (z.&nbsp;B. Float → Float) lassen sich verbinden.
          </p>
          <p>
            <strong>Graph → GLSL:</strong> Wenn alles bis zum Knoten „Fragment Out“ durchgängig
            verbunden ist, erzeugt der Button vollständigen Fragment-Code und schreibt ihn in den
            Editor-Shader (nur für die <em>aktive Ebene</em>). Fehler erscheinen im roten Banner.
          </p>
          <p>
            <strong>Beispiel (funktionierender Minimal-Graph):</strong> Verbinde wie folgt:
            <code>UV → Wellen-Sin (UV)</code>, <code>Zeit × Speed → Wellen-Sin (Phase)</code>,
            <code>Wellen-Sin (Out) → Mix → Farbe</code> und <code>Mix → Fragment Out</code>.
            Danach „Graph → GLSL anwenden“, um den Look im Editor zu sehen.
          </p>
          <p>
            <strong>Tipp:</strong> Wenn du einen Knoten verdrahtest, prüfe besonders die Eingänge am
            Knoten „Fragment Out“ — ohne eine gültige Kante gibt es oft direkt einen
            Codegen-Fehler.
          </p>
          <p>
            <strong>Navigation:</strong> Leertaste + Ziehen = Canvas schwenken, Mausrad = Zoomen.
            Minimap unten rechts, Steuerung links unten.
          </p>
          <p>
            <strong>Speichern:</strong> Projekt und Snapshots bleiben lokal im Browser; Export und
            Pack über die Kopfzeile (nicht auf dieser Seite).
          </p>
        </div>
      </details>
      <div className="graph-toolbar">
        <div>
          <h1>Node Graph</h1>
          <p className="graph-toolbar-hint">
            Ebenen links · Knoten verbinden · Shader in den Editor übernehmen. Speichern / Export /
            Pack in der Kopfzeile.
          </p>
        </div>
        <div className="graph-toolbar-actions">
          <button type="button" className="save-btn" onClick={onApply}>
            Graph → GLSL anwenden
          </button>
          <Link to="/editor" className="link-to-editor">
            Zum Editor →
          </Link>
        </div>
      </div>
      {graphCodegenError && <div className="graph-error-banner">{graphCodegenError}</div>}
      <div className="graph-canvas-wrap">
        <ReactFlow
          key={activeLayerId}
          nodes={graphNodes}
          edges={graphEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          defaultEdgeOptions={defaultEdgeOptions}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#484847" gap={20} size={1} />
          <Controls className="graph-controls" />
          <MiniMap
            className="graph-minimap"
            maskColor="rgba(14, 14, 14, 0.85)"
            nodeColor={() => '#262626'}
          />
        </ReactFlow>
      </div>
    </>
  )
}

export default function NodeGraphPage() {
  const [railTab, setRailTab] = useState<'layers' | 'nodes'>('layers')

  return (
    <div className="graph-page graph-page--split">
      <aside className="graph-rail" aria-label="Ebenen und Knoten">
        <div className="graph-rail-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={railTab === 'layers'}
            className={railTab === 'layers' ? 'is-active' : ''}
            onClick={() => setRailTab('layers')}
          >
            Ebenen
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={railTab === 'nodes'}
            className={railTab === 'nodes' ? 'is-active' : ''}
            onClick={() => setRailTab('nodes')}
          >
            Knoten
          </button>
        </div>
        <div className="graph-rail-body" role="tabpanel">
          {railTab === 'layers' ? <LayersRail /> : <NodesRail />}
        </div>
      </aside>
      <ReactFlowProvider>
        <div className="graph-main">
          <NodeGraphCanvas />
        </div>
      </ReactFlowProvider>
    </div>
  )
}
