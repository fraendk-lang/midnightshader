import * as THREE from 'three'
import { VERTEX_SHADER, validateFragmentShader } from './constants'
import type { LayerBundle, ShaderLayerMeta } from '../project/layers'
import type { UniformsState } from './uniforms'

export type CompositeSnapshot = {
  metas: ShaderLayerMeta[]
  bundles: Record<string, LayerBundle>
}

const BLEND_FS = `precision highp float;
uniform sampler2D u_base;
uniform sampler2D u_top;
uniform float u_opacity;
uniform int u_mode;
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec3 b = texture2D(u_base, uv).rgb;
  vec3 t = texture2D(u_top, uv).rgb;
  float a = clamp(u_opacity, 0.0, 1.0);
  vec3 outc;
  if (u_mode == 1) {
    outc = b + t * a;
  } else if (u_mode == 2) {
    outc = mix(b, b * t, a);
  } else {
    outc = t * a + b * (1.0 - a);
  }
  gl_FragColor = vec4(clamp(outc, 0.0, 1.0), 1.0);
}
`

const BLIT_FS = `precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  gl_FragColor = vec4(texture2D(u_tex, uv).rgb, 1.0);
}
`

function blendModeToInt(mode: ShaderLayerMeta['blendMode']): number {
  if (mode === 'add') return 1
  if (mode === 'multiply') return 2
  return 0
}

export type VisibleLayerPass = {
  meta: ShaderLayerMeta
  fragment: string
}

export function buildVisibleLayerStack(snapshot: CompositeSnapshot): VisibleLayerPass[] {
  const sorted = [...snapshot.metas].sort((a, b) => a.order - b.order)
  const out: VisibleLayerPass[] = []
  for (const m of sorted) {
    if (!m.visible) continue
    const b = snapshot.bundles[m.id]
    if (!b) continue
    if (!validateFragmentShader(b.fragment).ok) continue
    out.push({ meta: m, fragment: b.fragment })
  }
  return out
}

function makeSharedUniforms(u: UniformsState, w: number, h: number) {
  return {
    u_time: { value: 0 },
    u_scale: { value: u.u_scale },
    u_speed: { value: u.u_speed },
    u_color: { value: new THREE.Vector3(...u.u_color) },
    u_intensity: { value: u.u_intensity },
    u_saturation: { value: u.u_saturation },
    u_contrast: { value: u.u_contrast },
    u_gamma: { value: u.u_gamma },
    u_resolution: { value: new THREE.Vector2(w, h) },
  }
}

function syncUniformsFromState(target: Record<string, THREE.IUniform>, u: UniformsState) {
  target.u_scale.value = u.u_scale
  target.u_speed.value = u.u_speed
  target.u_color.value.set(...u.u_color)
  target.u_intensity.value = u.u_intensity
  target.u_saturation.value = u.u_saturation
  target.u_contrast.value = u.u_contrast
  target.u_gamma.value = u.u_gamma
}

type RTSet = {
  black: THREE.WebGLRenderTarget
  temp: THREE.WebGLRenderTarget
  a: THREE.WebGLRenderTarget
  b: THREE.WebGLRenderTarget
}

function createRT(w: number, h: number) {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })
}

function disposeRTSet(r: RTSet) {
  r.black.dispose()
  r.temp.dispose()
  r.a.dispose()
  r.b.dispose()
}

function computeSafeViewportSize(host: HTMLElement, maxTextureSize: number): { w: number; h: number } {
  const rect = host.getBoundingClientRect()
  const rawW = Math.max(1, Math.floor(rect.width || host.clientWidth || 1))
  const rawH = Math.max(1, Math.floor(rect.height || host.clientHeight || 1))
  // Extra harte Kappe gegen Layout-Ausreisser (z.B. wenn ein Container absurd hoch wird).
  const cap = Math.max(1, Math.min(maxTextureSize || 4096, 4096))
  // Zusätzlich an die reale Fenstergröße koppeln, damit sich der Canvas nicht
  // in einem Resize-Loop auf tausende Pixel aufbläht.
  const windowW = typeof window !== 'undefined' ? Math.max(1, Math.floor(window.innerWidth)) : cap
  const windowH = typeof window !== 'undefined' ? Math.max(1, Math.floor(window.innerHeight - 56)) : cap
  const safeW = Math.min(cap, windowW)
  const safeH = Math.min(cap, windowH)
  return {
    w: Math.min(rawW, safeW),
    h: Math.min(rawH, safeH),
  }
}

/**
 * Live-Vorschau im Editor: alle sichtbaren Ebenen unten→oben mischen.
 */
export function installEditorCompositeViewport(opts: {
  host: HTMLElement
  getUniforms: () => UniformsState
  getSnapshot: () => CompositeSnapshot
}): { dispose: () => void } {
  const { host, getUniforms, getSnapshot } = opts

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  // Drei.js (>= r180) unterstützt WebGL1-Contexts nicht mehr zuverlässig.
  // Daher lassen wir den Renderer den passenden Kontext wählen.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  host.appendChild(renderer.domElement)

  const geom = new THREE.PlaneGeometry(2, 2)
  const mesh = new THREE.Mesh(geom)
  scene.add(mesh)

  const maxTex = renderer.capabilities.maxTextureSize || 4096
  let { w, h } = computeSafeViewportSize(host, maxTex)
  renderer.setSize(w, h)

  let rt: RTSet = {
    black: createRT(w, h),
    temp: createRT(w, h),
    a: createRT(w, h),
    b: createRT(w, h),
  }

  renderer.setRenderTarget(rt.black)
  renderer.setClearColor(0x000000, 1)
  renderer.clear(true, true, true)
  renderer.setRenderTarget(null)

  const u0 = getUniforms()
  const sharedUniforms = makeSharedUniforms(u0, w, h)

  const blendUniforms = {
    u_base: { value: rt.black.texture },
    u_top: { value: rt.temp.texture },
    u_opacity: { value: 1 },
    u_mode: { value: 0 },
    u_resolution: { value: new THREE.Vector2(w, h) },
  }
  const blendMat = new THREE.ShaderMaterial({
    uniforms: blendUniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: BLEND_FS,
    toneMapped: false,
  })

  const blitUniforms = {
    u_tex: { value: rt.a.texture },
    u_resolution: { value: new THREE.Vector2(w, h) },
  }
  const blitMat = new THREE.ShaderMaterial({
    uniforms: blitUniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: BLIT_FS,
    toneMapped: true,
  })

  const blendScene = new THREE.Scene()
  const blendMesh = new THREE.Mesh(geom, blendMat)
  blendScene.add(blendMesh)

  const layerScene = new THREE.Scene()
  const layerMesh = new THREE.Mesh(geom)
  layerScene.add(layerMesh)

  let layerMats: THREE.ShaderMaterial[] = []
  let stackSig = ''

  const disposeLayerMats = () => {
    for (const m of layerMats) m.dispose()
    layerMats = []
  }

  const rebuildLayerMaterials = (stack: VisibleLayerPass[]) => {
    disposeLayerMats()
    for (const pass of stack) {
      layerMats.push(
        new THREE.ShaderMaterial({
          uniforms: sharedUniforms,
          vertexShader: VERTEX_SHADER,
          fragmentShader: pass.fragment,
          toneMapped: false,
        }),
      )
    }
  }

  const clock = new THREE.Clock()
  let raf = 0

  const resizeTargets = () => {
    const { w: nw, h: nh } = computeSafeViewportSize(host, maxTex)
    if (nw === w && nh === h) return
    w = nw
    h = nh
    renderer.setSize(w, h)
    disposeRTSet(rt)
    rt = {
      black: createRT(w, h),
      temp: createRT(w, h),
      a: createRT(w, h),
      b: createRT(w, h),
    }
    renderer.setRenderTarget(rt.black)
    renderer.setClearColor(0x000000, 1)
    renderer.clear(true, true, true)
    renderer.setRenderTarget(null)
    sharedUniforms.u_resolution.value.set(w, h)
    blendUniforms.u_resolution.value.set(w, h)
    blitUniforms.u_resolution.value.set(w, h)
    stackSig = ''
  }

  const tick = () => {
    resizeTargets()
    const u = getUniforms()
    syncUniformsFromState(sharedUniforms, u)
    sharedUniforms.u_time.value = clock.getElapsedTime()

    const snapshot = getSnapshot()
    const stack = buildVisibleLayerStack(snapshot)
    const nextSig = stack.map((p) => `${p.meta.id}\0${p.fragment}`).join('\x01')
    if (nextSig !== stackSig) {
      stackSig = nextSig
      rebuildLayerMaterials(stack)
    }

    if (stack.length === 0) {
      renderer.setRenderTarget(null)
      renderer.setClearColor(0x000000, 1)
      renderer.clear(true, true, true)
      raf = requestAnimationFrame(tick)
      return
    }

    let curBase: THREE.WebGLRenderTarget = rt.black
    blendUniforms.u_resolution.value.set(w, h)

    for (let i = 0; i < stack.length; i++) {
      renderer.setRenderTarget(rt.temp)
      renderer.setClearColor(0x000000, 1)
      renderer.clear(true, true, true)
      layerMesh.material = layerMats[i]!
      renderer.render(layerScene, camera)

      const outRT = i % 2 === 0 ? rt.a : rt.b
      renderer.setRenderTarget(outRT)
      renderer.setClearColor(0x000000, 1)
      renderer.clear(true, true, true)
      blendUniforms.u_base.value = curBase.texture
      blendUniforms.u_top.value = rt.temp.texture
      blendUniforms.u_opacity.value = stack[i]!.meta.opacity
      blendUniforms.u_mode.value = blendModeToInt(stack[i]!.meta.blendMode)
      renderer.render(blendScene, camera)
      curBase = outRT
    }

    blitUniforms.u_tex.value = curBase.texture
    mesh.material = blitMat
    renderer.setRenderTarget(null)
    renderer.setClearColor(0x000000, 1)
    renderer.clear(true, true, true)
    renderer.render(scene, camera)

    raf = requestAnimationFrame(tick)
  }
  tick()

  const onResize = () => resizeTargets()
  window.addEventListener('resize', onResize)

  return {
    dispose: () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      disposeLayerMats()
      blendMat.dispose()
      blitMat.dispose()
      geom.dispose()
      disposeRTSet(rt)
      renderer.dispose()
      if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement)
    },
  }
}

const THUMB_TIME = 1.25

/** Thumbnail: gleiche Compositing-Pipeline wie die Editor-Vorschau. */
export function captureCompositeThumbnail(
  snapshot: CompositeSnapshot,
  uniforms: UniformsState,
  size: { w: number; h: number } = { w: 320, h: 180 },
): string | null {
  const stack = buildVisibleLayerStack(snapshot)
  if (stack.length === 0) return null

  const { w, h } = size
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

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geom = new THREE.PlaneGeometry(2, 2)

  const rt: RTSet = {
    black: createRT(w, h),
    temp: createRT(w, h),
    a: createRT(w, h),
    b: createRT(w, h),
  }
  renderer.setRenderTarget(rt.black)
  renderer.setClearColor(0x000000, 1)
  renderer.clear(true, true, true)
  renderer.setRenderTarget(null)

  const sharedUniforms = makeSharedUniforms(uniforms, w, h)
  sharedUniforms.u_time.value = THUMB_TIME
  syncUniformsFromState(sharedUniforms, uniforms)

  const blendUniforms = {
    u_base: { value: rt.black.texture },
    u_top: { value: rt.temp.texture },
    u_opacity: { value: 1 },
    u_mode: { value: 0 },
    u_resolution: { value: new THREE.Vector2(w, h) },
  }
  const blendMat = new THREE.ShaderMaterial({
    uniforms: blendUniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: BLEND_FS,
    toneMapped: false,
  })
  const blendScene = new THREE.Scene()
  blendScene.add(new THREE.Mesh(geom, blendMat))

  const layerScene = new THREE.Scene()
  const layerMesh = new THREE.Mesh(geom)
  layerScene.add(layerMesh)

  const layerMats = stack.map(
    (pass) =>
      new THREE.ShaderMaterial({
        uniforms: sharedUniforms,
        vertexShader: VERTEX_SHADER,
        fragmentShader: pass.fragment,
        toneMapped: false,
      }),
  )

  try {
    let curBase: THREE.WebGLRenderTarget = rt.black
    for (let i = 0; i < stack.length; i++) {
      renderer.setRenderTarget(rt.temp)
      renderer.clear(true, true, true)
      layerMesh.material = layerMats[i]!
      renderer.render(layerScene, camera)

      const outRT = i % 2 === 0 ? rt.a : rt.b
      renderer.setRenderTarget(outRT)
      renderer.clear(true, true, true)
      blendUniforms.u_base.value = curBase.texture
      blendUniforms.u_top.value = rt.temp.texture
      blendUniforms.u_opacity.value = stack[i]!.meta.opacity
      blendUniforms.u_mode.value = blendModeToInt(stack[i]!.meta.blendMode)
      renderer.render(blendScene, camera)
      curBase = outRT
    }

    const blitUniforms = {
      u_tex: { value: curBase.texture },
      u_resolution: { value: new THREE.Vector2(w, h) },
    }
    const blitMat = new THREE.ShaderMaterial({
      uniforms: blitUniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: BLIT_FS,
      toneMapped: true,
    })
    const blitScene = new THREE.Scene()
    blitScene.add(new THREE.Mesh(geom, blitMat))
    renderer.setRenderTarget(null)
    renderer.clear(true, true, true)
    renderer.render(blitScene, camera)
    blitMat.dispose()
  } catch {
    for (const m of layerMats) m.dispose()
    blendMat.dispose()
    geom.dispose()
    disposeRTSet(rt)
    renderer.dispose()
    return null
  }

  let dataUrl: string
  try {
    dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.82)
  } catch {
    for (const m of layerMats) m.dispose()
    blendMat.dispose()
    geom.dispose()
    disposeRTSet(rt)
    renderer.dispose()
    return null
  }

  for (const m of layerMats) m.dispose()
  blendMat.dispose()
  geom.dispose()
  disposeRTSet(rt)
  renderer.dispose()

  if (!dataUrl || dataUrl.length < 32) return null
  return dataUrl
}
