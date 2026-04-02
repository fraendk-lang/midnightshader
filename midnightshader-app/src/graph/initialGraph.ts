import type { Edge, Node } from '@xyflow/react'
import type { GraphNodeData } from './glslCodegen'

export const initialGraphNodes: Node<GraphNodeData>[] = [
  {
    id: 'uv-1',
    type: 'uvSource',
    position: { x: 0, y: 40 },
    data: { label: 'UV' },
  },
  {
    id: 'time-1',
    type: 'timeSource',
    position: { x: 0, y: 200 },
    data: { label: 'Zeit × Speed' },
  },
  {
    id: 'wave-1',
    type: 'wave',
    position: { x: 260, y: 100 },
    data: { label: 'Wellen-Sin' },
  },
  {
    id: 'mix-1',
    type: 'mixFinal',
    position: { x: 520, y: 120 },
    data: { label: 'Mix → Farbe' },
  },
  {
    id: 'out-1',
    type: 'fragmentOut',
    position: { x: 780, y: 120 },
    data: { label: 'Fragment Out' },
  },
]

export const initialGraphEdges: Edge[] = [
  { id: 'e1', source: 'uv-1', target: 'wave-1', sourceHandle: 'out', targetHandle: 'uv' },
  { id: 'e2', source: 'time-1', target: 'wave-1', sourceHandle: 'out', targetHandle: 'phase' },
  { id: 'e3', source: 'wave-1', target: 'mix-1', sourceHandle: 'out', targetHandle: 'mix' },
  { id: 'e4', source: 'mix-1', target: 'out-1', sourceHandle: 'out', targetHandle: 'color' },
]
