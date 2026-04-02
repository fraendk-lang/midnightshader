import { useEffect, useState } from 'react'
import { SHADER_PRESETS, type ShaderPreset } from '../shader/presets'

type Manifest = { version?: number; presetOrder?: string[] }

export function useOrderedPresets(): ShaderPreset[] {
  const [list, setList] = useState<ShaderPreset[]>(SHADER_PRESETS)

  useEffect(() => {
    let cancel = false
    const b = import.meta.env.BASE_URL || '/'
    const url = b === '/' ? '/presets.manifest.json' : `${b.replace(/\/$/, '')}/presets.manifest.json`
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((m: Manifest | null) => {
        if (cancel || !m?.presetOrder?.length) return
        const order = m.presetOrder
        const map = new Map(SHADER_PRESETS.map((p) => [p.id, p]))
        const next: ShaderPreset[] = []
        for (const id of order) {
          const p = map.get(id)
          if (p) next.push(p)
        }
        for (const p of SHADER_PRESETS) {
          if (!order.includes(p.id)) next.push(p)
        }
        setList(next)
      })
      .catch(() => {})
    return () => {
      cancel = true
    }
  }, [])

  return list
}
