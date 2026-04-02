export type UniformsState = {
  u_scale: number
  u_speed: number
  u_color: [number, number, number]
  /** Gesamthelligkeit / Gain */
  u_intensity: number
  /** 0 = Graustufen, 1 = unverändert, >1 übersättigt */
  u_saturation: number
  /** Kontrast um Mittelgrau */
  u_contrast: number
  /** Gamma-Korrektur: 1 = neutral, >1 heller, <1 dunkler (annähernd sRGB-typisch) */
  u_gamma: number
}

export const UNIFORMS_DEFAULTS: UniformsState = {
  u_scale: 5.5,
  u_speed: 0.55,
  u_color: [0.62, 0.48, 0.98],
  u_intensity: 1,
  u_saturation: 1,
  u_contrast: 1,
  u_gamma: 1,
}

export function normalizeUniforms(raw: unknown): UniformsState {
  const u = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const c = u.u_color
  const color: [number, number, number] =
    Array.isArray(c) && c.length === 3 && c.every((x) => typeof x === 'number')
      ? [c[0] as number, c[1] as number, c[2] as number]
      : [...UNIFORMS_DEFAULTS.u_color]

  return {
    u_scale: typeof u.u_scale === 'number' ? u.u_scale : UNIFORMS_DEFAULTS.u_scale,
    u_speed: typeof u.u_speed === 'number' ? u.u_speed : UNIFORMS_DEFAULTS.u_speed,
    u_color: color,
    u_intensity: typeof u.u_intensity === 'number' ? u.u_intensity : UNIFORMS_DEFAULTS.u_intensity,
    u_saturation:
      typeof u.u_saturation === 'number' ? u.u_saturation : UNIFORMS_DEFAULTS.u_saturation,
    u_contrast: typeof u.u_contrast === 'number' ? u.u_contrast : UNIFORMS_DEFAULTS.u_contrast,
    u_gamma: typeof u.u_gamma === 'number' ? u.u_gamma : UNIFORMS_DEFAULTS.u_gamma,
  }
}
