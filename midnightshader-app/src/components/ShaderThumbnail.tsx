import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { VERTEX_SHADER, validateFragmentShader } from '../shader/constants'
import type { UniformsState } from '../shader/uniforms'

export default function ShaderThumbnail({
  fragment,
  uniforms,
  className = '',
}: {
  fragment: string
  uniforms: UniformsState
  className?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const ok = validateFragmentShader(fragment)
    if (!ok.ok) {
      host.replaceChildren()
      const fall = document.createElement('div')
      fall.className = 'shader-thumb shader-thumb--error'
      fall.title = ok.error ?? 'Shader-Fehler'
      host.appendChild(fall)
      return () => host.removeChild(fall)
    }

    const w = Math.max(120, host.clientWidth || 200)
    const h = Math.max(68, host.clientHeight || 112)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(1)
    renderer.setSize(w, h)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.02
    host.replaceChildren(renderer.domElement)

    const uniformsObj = {
      u_time: { value: 0 },
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

    let raf = 0
    const clock = new THREE.Clock()
    const tick = () => {
      uniformsObj.u_time.value = clock.getElapsedTime()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      mesh.geometry.dispose()
      material.dispose()
      renderer.dispose()
      host.replaceChildren()
    }
  }, [
    fragment,
    uniforms.u_scale,
    uniforms.u_speed,
    uniforms.u_color,
    uniforms.u_intensity,
    uniforms.u_saturation,
    uniforms.u_contrast,
    uniforms.u_gamma,
  ])

  return <div ref={hostRef} className={`shader-thumb-host ${className}`.trim()} />
}
