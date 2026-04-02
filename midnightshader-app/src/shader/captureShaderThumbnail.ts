import * as THREE from 'three'
import { VERTEX_SHADER, validateFragmentShader } from './constants'
import type { UniformsState } from './uniforms'

/** Ein Frame wie im Editor; festes u_time für wiedererkennbare Thumbnails. */
const THUMB_TIME = 1.25

/**
 * Rendert den Shader einmal offscreen und liefert eine JPEG-Data-URL oder null bei Fehler.
 */
export function captureShaderThumbnail(
  fragment: string,
  uniforms: UniformsState,
  size: { w: number; h: number } = { w: 320, h: 180 },
): string | null {
  const check = validateFragmentShader(fragment)
  if (!check.ok) return null

  const { w, h } = size
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const uniformsObj = {
    u_time: { value: THUMB_TIME },
    u_scale: { value: uniforms.u_scale },
    u_speed: { value: uniforms.u_speed },
    u_color: { value: new THREE.Vector3(...uniforms.u_color) },
    u_intensity: { value: uniforms.u_intensity },
    u_saturation: { value: uniforms.u_saturation },
    u_contrast: { value: uniforms.u_contrast },
    u_gamma: { value: uniforms.u_gamma },
    u_resolution: { value: new THREE.Vector2(w, h) },
  }

  const material = new THREE.ShaderMaterial({
    uniforms: uniformsObj,
    vertexShader: VERTEX_SHADER,
    fragmentShader: fragment,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  scene.add(mesh)

  renderer.render(scene, camera)
  let dataUrl: string
  try {
    dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.82)
  } catch {
    mesh.geometry.dispose()
    material.dispose()
    renderer.dispose()
    return null
  }

  mesh.geometry.dispose()
  material.dispose()
  renderer.dispose()

  if (!dataUrl || dataUrl.length < 32) return null
  return dataUrl
}
