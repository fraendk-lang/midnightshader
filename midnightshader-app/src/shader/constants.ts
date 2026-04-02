import { getDefaultPreset } from './presets'
export type { UniformsState } from './uniforms'

export const DEFAULT_FRAGMENT = getDefaultPreset().fragment

// Three.js bringt bei Standard-Geometrien bereits Attribute wie `position` mit.
// Wenn wir `attribute vec3 position;` selbst deklarieren, gibt es oft „redefinition“.
// PlaneGeometry(2,2) liefert dabei (nahezu) Clipspace-Positionen.
export const VERTEX_SHADER = `
void main() {
  // Use Three.js matrices to map the fullscreen quad into clip space.
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// Für Validierung müssen wir den Vertex-Shader vollständig kompilierbar machen.
// Drei.js kann beim Rendern Attribute für `position` intern bereitstellen, aber
// `validateFragmentShader()` kompiliert hier isoliert.
const VALIDATE_VERTEX_SHADER = `
attribute vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// Wiederverwendeter Prüf-Kontext: verhindert, dass bei jedem Fragment-Check neue
// WebGL-Kontexte erzeugt werden (sonst kommt es zu „too many active WebGL contexts“).
let validationCanvas: HTMLCanvasElement | null = null
let validationGL: WebGLRenderingContext | null = null

function getValidationGL(): WebGLRenderingContext | null {
  if (validationGL) return validationGL
  if (typeof document === 'undefined') return null
  if (!validationCanvas) validationCanvas = document.createElement('canvas')
  validationGL = validationCanvas.getContext('webgl')
  return validationGL
}

export function validateFragmentShader(fragment: string) {
  const gl = getValidationGL()
  if (!gl) return { ok: false, error: 'WebGL ist nicht verfuegbar.' }

  const vs = gl.createShader(gl.VERTEX_SHADER)
  const fs = gl.createShader(gl.FRAGMENT_SHADER)
  if (!vs || !fs) return { ok: false, error: 'Shader konnte nicht erstellt werden.' }

  try {
    gl.shaderSource(vs, VALIDATE_VERTEX_SHADER)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      return { ok: false, error: gl.getShaderInfoLog(vs) || 'Vertex-Fehler.' }
    }

    gl.shaderSource(fs, fragment)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      return { ok: false, error: gl.getShaderInfoLog(fs) || 'Fragment-Fehler.' }
    }
    return { ok: true, error: '' }
  } finally {
    // Cleanup: verhindert Shader-Leaks und reduziert Risiko von WebGL-Ressourcenproblemen.
    gl.deleteShader(vs)
    gl.deleteShader(fs)
  }
}
