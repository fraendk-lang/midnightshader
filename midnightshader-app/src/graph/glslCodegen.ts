import type { Edge, Node } from '@xyflow/react'

export type GraphNodeData = {
  label?: string
}

function safeVar(id: string) {
  return `n_${id.replace(/-/g, '_')}`
}

/** Rekursiv vom Output-Knoten aus: erzeugt Zeilen in korrekter Abhängigkeits-Reihenfolge */
export function buildFragmentShader(nodes: Node<GraphNodeData>[], edges: Edge[]): { code: string; error?: string } {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const outNode = nodes.find((n) => n.type === 'fragmentOut')
  if (!outNode) {
    return { code: '', error: 'Kein Ausgabe-Knoten (Fragment Out).' }
  }

  const lines: string[] = []
  const emitted = new Set<string>()

  function edgeToSource(nodeId: string, handleId: string | null | undefined) {
    const e = edges.find((x) => x.target === nodeId && x.targetHandle === handleId)
    if (!e) return null
    return e.source
  }

  function emitExpr(nodeId: string): string {
    if (emitted.has(nodeId)) return safeVar(nodeId)
    const node = nodeById.get(nodeId)
    if (!node) {
      throw new Error(`Unbekannter Knoten: ${nodeId}`)
    }

    const v = safeVar(nodeId)

    switch (node.type) {
      case 'uvSource': {
        lines.push(`  vec2 ${v} = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;`)
        emitted.add(nodeId)
        return v
      }
      case 'timeSource': {
        lines.push(`  float ${v} = u_time * u_speed;`)
        emitted.add(nodeId)
        return v
      }
      case 'wave': {
        const uvSrc = edgeToSource(nodeId, 'uv')
        const phSrc = edgeToSource(nodeId, 'phase')
        if (!uvSrc || !phSrc) {
          throw new Error('Wave: Verbindungen zu UV und Phase fehlen.')
        }
        const uv = emitExpr(uvSrc)
        const ph = emitExpr(phSrc)
        lines.push(`  float ${v} = sin((${uv}.x + ${uv}.y) * u_scale + ${ph}) * 0.5 + 0.5;`)
        emitted.add(nodeId)
        return v
      }
      case 'mixFinal': {
        const mSrc = edgeToSource(nodeId, 'mix')
        if (!mSrc) throw new Error('Mix: Eingang fehlt.')
        const m = emitExpr(mSrc)
        lines.push(`  vec3 ${v} = mix(vec3(0.05, 0.05, 0.07), u_color, ${m});`)
        emitted.add(nodeId)
        return v
      }
      case 'floatConst': {
        const val = Number((node.data as { value?: number }).value ?? 0)
        lines.push(`  float ${v} = ${val.toFixed(6)};`)
        emitted.add(nodeId)
        return v
      }
      case 'mulFloat': {
        const aSrc = edgeToSource(nodeId, 'a')
        const bSrc = edgeToSource(nodeId, 'b')
        if (!aSrc || !bSrc) throw new Error('Multiply: beide Eingänge (a, b) benötigt.')
        const a = emitExpr(aSrc)
        const b = emitExpr(bSrc)
        lines.push(`  float ${v} = ${a} * ${b};`)
        emitted.add(nodeId)
        return v
      }
      case 'addFloat': {
        const aSrc = edgeToSource(nodeId, 'a')
        const bSrc = edgeToSource(nodeId, 'b')
        if (!aSrc || !bSrc) throw new Error('Add: beide Eingänge (a, b) benötigt.')
        const a = emitExpr(aSrc)
        const b = emitExpr(bSrc)
        lines.push(`  float ${v} = ${a} + ${b};`)
        emitted.add(nodeId)
        return v
      }
      case 'fragmentOut': {
        const cSrc = edgeToSource(nodeId, 'color')
        if (!cSrc) throw new Error('Fragment Out: Farbeingang fehlt.')
        const c = emitExpr(cSrc)
        lines.push(`  gl_FragColor = vec4(applyGrade(${c}), 1.0);`)
        emitted.add(nodeId)
        return c
      }
      default:
        throw new Error(`Unbekannter Knotentyp: ${node.type}`)
    }
  }

  try {
    emitExpr(outNode.id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { code: '', error: msg }
  }

  const body = lines.join('\n')
  const code = `precision highp float;
uniform float u_time;
uniform float u_speed;
uniform float u_scale;
uniform vec3 u_color;
uniform float u_intensity;
uniform float u_saturation;
uniform float u_contrast;
uniform float u_gamma;
uniform vec2 u_resolution;

vec3 applyGrade(vec3 col) {
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, clamp(u_saturation, 0.0, 2.0));
  col = (col - 0.5) * u_contrast + 0.5;
  col *= u_intensity;
  float g = max(u_gamma, 0.01);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / g));
  return clamp(col, 0.0, 1.0);
}

void main() {
${body}
}
`
  return { code }
}
