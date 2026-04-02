import type { CSSProperties } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

type NodeLabel = { label?: string }
const box: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  minWidth: 140,
  fontSize: 12,
  background: '#20201f',
  color: '#fff',
  border: '1px solid rgba(72, 72, 71, 0.25)',
}

const title: CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.12em',
  color: '#00e3fd',
  marginBottom: 6,
}

export function UvSourceNode(props: NodeProps) {
  const data = props.data as NodeLabel
  return (
    <div style={box}>
      <div style={title}>{data.label ?? 'UV'}</div>
      <div style={{ color: '#adaaaa' }}>gl_FragCoord → NDC</div>
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#b6a0ff' }} />
    </div>
  )
}

export function TimeSourceNode(props: NodeProps) {
  const data = props.data as NodeLabel
  return (
    <div style={box}>
      <div style={title}>{data.label ?? 'Zeit'}</div>
      <div style={{ color: '#adaaaa' }}>u_time × u_speed</div>
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#b6a0ff' }} />
    </div>
  )
}

export function WaveNode(props: NodeProps) {
  const data = props.data as NodeLabel
  return (
    <div style={box}>
      <Handle type="target" position={Position.Left} id="uv" style={{ top: '35%', background: '#b6a0ff' }} />
      <Handle type="target" position={Position.Left} id="phase" style={{ top: '65%', background: '#00e3fd' }} />
      <div style={title}>{data.label ?? 'Wave'}</div>
      <div style={{ color: '#adaaaa' }}>sin(uv + phase) × u_scale</div>
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#b6a0ff' }} />
    </div>
  )
}

export function MixFinalNode(props: NodeProps) {
  const data = props.data as NodeLabel
  return (
    <div style={box}>
      <Handle type="target" position={Position.Left} id="mix" style={{ background: '#b6a0ff' }} />
      <div style={title}>{data.label ?? 'Mix'}</div>
      <div style={{ color: '#adaaaa' }}>mix(dunkel, u_color, f)</div>
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#b6a0ff' }} />
    </div>
  )
}

export function FragmentOutNode(props: NodeProps) {
  const data = props.data as NodeLabel
  return (
    <div style={{ ...box, borderColor: 'rgba(182, 160, 255, 0.35)' }}>
      <Handle type="target" position={Position.Left} id="color" style={{ background: '#b6a0ff' }} />
      <div style={{ ...title, color: '#b6a0ff' }}>{data.label ?? 'Out'}</div>
      <div style={{ color: '#adaaaa' }}>gl_FragColor</div>
    </div>
  )
}

export function FloatConstNode(props: NodeProps) {
  const data = props.data as NodeLabel & { value?: number }
  const v = data.value ?? 0
  return (
    <div style={box}>
      <div style={title}>{data.label ?? 'Konstante'}</div>
      <div style={{ color: '#adaaaa', fontFamily: 'ui-monospace, monospace' }}>{v.toFixed(4)}</div>
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#26e6ff' }} />
    </div>
  )
}

export function MulFloatNode(props: NodeProps) {
  const data = props.data as NodeLabel
  return (
    <div style={box}>
      <Handle type="target" position={Position.Left} id="a" style={{ top: '32%', background: '#b6a0ff' }} />
      <Handle type="target" position={Position.Left} id="b" style={{ top: '68%', background: '#00e3fd' }} />
      <div style={title}>{data.label ?? '×'}</div>
      <div style={{ color: '#adaaaa' }}>float × float</div>
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#b6a0ff' }} />
    </div>
  )
}

export function AddFloatNode(props: NodeProps) {
  const data = props.data as NodeLabel
  return (
    <div style={box}>
      <Handle type="target" position={Position.Left} id="a" style={{ top: '32%', background: '#b6a0ff' }} />
      <Handle type="target" position={Position.Left} id="b" style={{ top: '68%', background: '#00e3fd' }} />
      <div style={title}>{data.label ?? '+'}</div>
      <div style={{ color: '#adaaaa' }}>float + float</div>
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#b6a0ff' }} />
    </div>
  )
}
