import type { MidnightShaderPackFile } from './pack'
import { PACK_FORMAT, PACK_VERSION } from './pack'
import type { MidnightShaderProjectFile } from './schema'
import { PROJECT_FORMAT, PROJECT_VERSION } from './schema'

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'))
    reader.readAsText(file)
  })
}

export function downloadProjectJson(project: Omit<MidnightShaderProjectFile, 'format' | 'version'>) {
  const payload: MidnightShaderProjectFile = {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    ...project,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safe = project.meta.name.replace(/[^\w-]+/g, '_').slice(0, 64) || 'project'
  a.href = url
  a.download = `${safe}.midnightshader.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function readProjectFile(file: File): Promise<MidnightShaderProjectFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        const parsed = JSON.parse(text) as unknown
        resolve(parsed as MidnightShaderProjectFile)
      } catch {
        reject(new Error('Ungültige JSON-Datei.'))
      }
    }
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'))
    reader.readAsText(file)
  })
}

export function downloadPackJson(pack: Omit<MidnightShaderPackFile, 'format' | 'version'>) {
  const payload: MidnightShaderPackFile = {
    format: PACK_FORMAT,
    version: PACK_VERSION,
    ...pack,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  a.href = url
  a.download = `midnightshader-pack-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}
