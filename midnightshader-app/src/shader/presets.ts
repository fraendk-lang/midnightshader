/**
 * Kuratierte Presets — gleiche Uniforms wie der Editor (inkl. Grade: u_intensity, u_saturation, u_contrast).
 */

import type { UniformsState } from './uniforms'

export type PresetUniforms = UniformsState

export type ShaderPreset = {
  id: string
  title: string
  tagline: string
  description: string
  /** 0–360 für Galerie-Karten */
  hue: number
  uniforms: PresetUniforms
  fragment: string
}

const GRADE = `
vec3 applyGrade(vec3 col) {
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, clamp(u_saturation, 0.0, 2.0));
  col = (col - 0.5) * u_contrast + 0.5;
  col *= u_intensity;
  float g = max(u_gamma, 0.01);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / g));
  return clamp(col, 0.0, 1.0);
}
`

const HEADER = `precision highp float;
uniform float u_time;
uniform float u_speed;
uniform float u_scale;
uniform vec3 u_color;
uniform float u_intensity;
uniform float u_saturation;
uniform float u_contrast;
uniform float u_gamma;
uniform vec2 u_resolution;
${GRADE}
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}
`

export const SHADER_PRESETS: ShaderPreset[] = [
  {
    id: 'obsidian-flux',
    title: 'Obsidian Flux',
    tagline: 'Signatur-Look',
    description:
      'Mehrschichtiges Rauschen mit Domain-Warping, sanfter Kompression und Akzentfarbe — der Hausstil von MidnightShader.',
    hue: 270,
    uniforms: {
      u_scale: 5.5,
      u_speed: 0.55,
      u_color: [0.62, 0.48, 0.98],
      u_intensity: 1,
      u_saturation: 1,
      u_contrast: 1,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * (u_scale * 0.11);
  float t = u_time * u_speed;
  vec2 w = vec2(fbm(p * 1.6 + t * 0.14), fbm(p * 1.8 - t * 0.11)) * 0.55;
  vec2 q = p + w;
  float n1 = fbm(q + t * 0.07);
  float n2 = fbm(q * 2.2 - t * 0.09 + vec2(3.1, 2.7));
  float n = n1 * 0.62 + n2 * 0.38;
  n = smoothstep(0.12, 0.92, n);
  vec3 voidCol = vec3(0.012, 0.01, 0.028);
  vec3 accent = pow(max(u_color, vec3(0.02)), vec3(0.88));
  vec3 col = mix(voidCol, accent, n);
  float glow = pow(max(0.0, n - 0.42), 2.1);
  col += glow * accent * vec3(1.15, 1.0, 1.25);
  float rim = abs(n1 - n2);
  col += rim * 0.18 * accent;
  col = col / (col + vec3(0.26));
  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'solar-corona',
    title: 'Solar Corona',
    tagline: 'Radial & heiß',
    description:
      'Strahlende Ringe und Turbulenz um ein Zentrum — ideal für energiegeladene Visuals und Bühnen-Looks.',
    hue: 28,
    uniforms: {
      u_scale: 7,
      u_speed: 0.35,
      u_color: [1.0, 0.45, 0.15],
      u_intensity: 1,
      u_saturation: 1,
      u_contrast: 1,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 c = (uv - 0.5) * vec2(aspect, 1.0);
  float r = length(c) * (2.0 + u_scale * 0.08);
  float t = u_time * u_speed;
  float a = atan(c.y, c.x);
  float ring = abs(sin(r * 8.0 - t * 2.0 + fbm(c * 3.2 + t * 0.2) * 2.0));
  ring = pow(max(0.0, 1.0 - ring), 3.0);
  float n = fbm(c * (1.5 + u_scale * 0.05) + vec2(t * 0.15, -t * 0.1));
  float pulse = 0.55 + 0.45 * sin(a * 3.0 + t + n * 4.0);
  vec3 core = vec3(0.02, 0.01, 0.005);
  vec3 hot = pow(max(u_color, vec3(0.03)), vec3(0.9));
  vec3 col = mix(core, hot, ring * pulse);
  col += pow(max(0.0, 1.0 - r * 0.9), 4.0) * hot * 0.4;
  col += n * 0.12 * hot;
  col = col / (col + vec3(0.22));
  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'neon-abyss',
    title: 'Neon Abyss',
    tagline: 'Grid × Tiefe',
    description:
      'Interferenzmuster und subtile Gitter — cyberpunk-nah, ohne Postprocessing, rein fragmentshader.',
    hue: 185,
    uniforms: {
      u_scale: 9,
      u_speed: 0.42,
      u_color: [0.1, 0.95, 0.92],
      u_intensity: 1,
      u_saturation: 1,
      u_contrast: 1,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * (u_scale * 0.09);
  float t = u_time * u_speed;
  float g1 = sin(p.x * 18.0 + t * 1.2) * sin(p.y * 18.0 - t * 0.9);
  float g2 = sin((p.x + p.y) * 14.0 + fbm(p * 2.0) * 3.0 + t);
  float grid = abs(g1 * g2);
  grid = smoothstep(0.15, 0.85, 1.0 - grid);
  float depth = fbm(p * 1.3 + t * 0.08);
  vec3 dark = vec3(0.008, 0.012, 0.02);
  vec3 neon = u_color;
  vec3 col = mix(dark, neon, grid * (0.35 + 0.65 * depth));
  col += pow(max(0.0, grid - 0.5), 2.0) * neon * 1.4;
  col *= 0.85 + 0.15 * sin(t + p.x * 10.0);
  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'mercury-glass',
    title: 'Mercury Glass',
    tagline: 'Flüssiges Metall',
    description:
      'Weiche Streifen und chromatischer Verlauf über die Akzentfarbe — ruhig, premium, editorial-tauglich.',
    hue: 210,
    uniforms: {
      u_scale: 4,
      u_speed: 0.25,
      u_color: [0.75, 0.78, 0.88],
      u_intensity: 1,
      u_saturation: 1,
      u_contrast: 1,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * (u_scale * 0.14);
  float t = u_time * u_speed;
  float flow = fbm(vec2(p.x * 2.0 + t * 0.2, p.y * 6.0 - t * 0.35));
  float bands = smoothstep(0.2, 0.8, sin(p.y * 12.0 + flow * 4.0 + t * 0.5) * 0.5 + 0.5);
  float sheen = fbm(p * 3.5 + t * 0.05);
  vec3 cool = vec3(0.03, 0.035, 0.045);
  vec3 metal = mix(cool * 0.5, u_color, bands);
  metal += sheen * 0.22 * u_color;
  metal += vec3(0.04, 0.06, 0.1) * (1.0 - bands);
  metal = pow(clamp(metal, 0.0, 1.0), vec3(0.92));
  gl_FragColor = vec4(applyGrade(metal), 1.0);
}
`,
  },
  {
    id: 'geometric-rings',
    title: 'Geometric Rings',
    tagline: 'Radial · Steps',
    description: 'Klare Kreise, „quantisiert“ zu geometrischen Ringen (SDF/Math ohne Texturen).',
    hue: 310,
    uniforms: {
      u_scale: 8,
      u_speed: 0.28,
      u_color: [0.75, 0.25, 0.98],
      u_intensity: 1,
      u_saturation: 1,
      u_contrast: 1.1,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  float t = u_time * u_speed;
  float r = length(p) * (1.8 + u_scale * 0.07);
  // Ring-Funktion mit „Steps“:
  float w = 0.22 + 0.02 * sin(t);
  float ring = abs(fract(r + 0.15 * sin(t * 0.8)) - 0.5);
  float mask = 1.0 - smoothstep(w, w + 0.08, ring);

  // Klares Innen/außen-Farbverhalten:
  vec3 bg = vec3(0.02, 0.02, 0.03);
  vec3 col = mix(bg, u_color, mask);
  // Akzentkanten:
  col += mask * mask * u_color * (0.35 + 0.35 * sin(t + r * 2.0));

  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'sdf-shapes',
    title: 'SDF Shapes',
    tagline: 'Circle · Box',
    description: 'Einfache geometrische Formen über SDF-Distanzen (Kreis + Box + Kanten-Glow).',
    hue: 165,
    uniforms: {
      u_scale: 6,
      u_speed: 0.35,
      u_color: [0.12, 0.95, 0.88],
      u_intensity: 1,
      u_saturation: 1,
      u_contrast: 1.05,
      u_gamma: 1,
    },
    fragment: `${HEADER}
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  float t = u_time * u_speed;
  // Rotation für „lebende“ Geometrie:
  float a = t * 0.6;
  mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
  p = rot * p * (1.2 + u_scale * 0.04);

  float d1 = sdCircle(p, 0.26 + 0.03 * sin(t));
  float d2 = sdBox(p * 1.05 + vec2(0.02 * sin(t * 0.7), 0.02 * cos(t * 0.6)), vec2(0.20));

  // Vereinigung (näher am „d“): nehmen wir das Minimum:
  float d = min(d1, d2);

  // Kanten:
  float edge = 1.0 - smoothstep(0.0, 0.03, abs(d));
  // Füllung:
  float fill = 1.0 - smoothstep(0.01, 0.08, d);

  vec3 bg = vec3(0.01, 0.012, 0.02);
  vec3 col = bg + u_color * (0.25 + 0.75 * fill);
  col += edge * edge * u_color * (0.55 + 0.25 * sin(t * 1.4));

  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'tri-grid',
    title: 'Tri Grid',
    tagline: 'Triangles · Motion',
    description: 'Triangel-/Gitter-Linien aus periodischen Koordinaten (geometrisch, animiert).',
    hue: 35,
    uniforms: {
      u_scale: 9,
      u_speed: 0.22,
      u_color: [1.0, 0.55, 0.18],
      u_intensity: 1,
      u_saturation: 1,
      u_contrast: 1.15,
      u_gamma: 1,
    },
    fragment: `${HEADER}
float line(vec2 p, float width) {
  // „Saw“-basierte Linie:
  float x = abs(fract(p.x) - 0.5);
  return 1.0 - smoothstep(width, width + 0.04, x);
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  float t = u_time * u_speed;
  // Skaliere als „Geometrie-Raum“:
  p *= (u_scale * 0.12);

  // Drehe für diagonale „Tri“-Struktur:
  float a = t * 0.2;
  mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
  p = rot * p;

  // Zwei Achsen-Linien + versetzte dritte Achse:
  vec2 p1 = p + vec2(t * 0.25, 0.0);
  vec2 p2 = p + vec2(0.0, -t * 0.18);
  vec2 p3 = p + vec2(t * 0.14, t * 0.12);

  float l1 = line(p1, 0.12);
  float l2 = line(p2 * vec2(1.0, 1.3), 0.12);
  float l3 = line(p3 * vec2(1.25, 0.9), 0.12);

  float g = clamp(l1 + l2 + l3, 0.0, 1.0);
  // Tiefe für „beleuchtete“ Kanten:
  float depth = fbm(p * 1.4 + vec2(t * 0.2, -t * 0.1));
  vec3 bg = vec3(0.01, 0.012, 0.02);
  vec3 col = bg + u_color * g * (0.35 + 0.65 * depth);
  col += pow(g, 2.2) * u_color * 0.35;

  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'liquid-mercury',
    title: 'Liquid Mercury',
    tagline: 'Metal · Flow',
    description: 'Schimmernde, flüssige Metall-Wellen mit Domain-Warping und akzentuierten Highlights.',
    hue: 260,
    uniforms: {
      u_scale: 7.5,
      u_speed: 0.35,
      u_color: [0.65, 0.42, 1.0],
      u_intensity: 1,
      u_saturation: 1.1,
      u_contrast: 1.05,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  float t = u_time * u_speed;

  // Fließendes Warp:
  vec2 q = p * (0.9 + 0.06 * u_scale);
  vec2 w = vec2(
    fbm(q * 2.2 + vec2(t * 0.12, -t * 0.08)),
    fbm(q * 2.2 + vec2(-t * 0.1, t * 0.14))
  );
  q += 0.45 * (w - 0.5);

  // „Strömungs“-Bänder (wie Metallrillen):
  float a = atan(q.y, q.x);
  float r = length(q);
  float flow = fbm(q * 3.4 + vec2(0.0, t * 0.22));

  float stripes = sin((a * 3.5 + r * 8.5) + flow * 6.0 - t * 1.8);
  float bands = smoothstep(0.45, 0.92, stripes * 0.5 + 0.5);

  // Metall-Base + Akzent:
  vec3 bg = vec3(0.02, 0.02, 0.03);
  vec3 mercury = vec3(0.65, 0.62, 0.75);
  vec3 accent = u_color;

  // Glanz/Highlight über „Banddichte“:
  float highlight = pow(bands, 3.0) * (0.35 + 0.65 * sin(t + r * 4.0));
  highlight = clamp(highlight, 0.0, 1.0);

  vec3 col = mix(bg, mercury, bands);
  col += accent * highlight * (0.35 + 0.65 * w.x);

  // Leichtes „Rauschen“ für Flüssigkeit:
  float micro = fbm(p * 7.5 + vec2(t * 0.4, -t * 0.25));
  col += (micro - 0.5) * 0.06 * accent;

  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'neon-nebula',
    title: 'Neon Nebula',
    tagline: 'Nebula · Ribbons',
    description: 'Domänentransformiertes Rauschen mit neonfarbenen Strähnen (wie „Neon Wellen“).',
    hue: 185,
    uniforms: {
      u_scale: 9,
      u_speed: 0.28,
      u_color: [0.05, 0.95, 0.92],
      u_intensity: 1,
      u_saturation: 1.2,
      u_contrast: 1.1,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * u_speed;

  // Domain Warp:
  vec2 q = p * (0.85 + 0.02 * u_scale);
  vec2 warp = vec2(
    fbm(q * 2.3 + vec2(t * 0.10, -t * 0.06)),
    fbm(q * 2.3 + vec2(-t * 0.08, t * 0.12))
  );
  q += 0.65 * (warp - 0.5);

  // Nebel:
  float n = fbm(q * (2.6 + 0.03 * u_scale) + vec2(t * 0.18, -t * 0.22));
  float neb = smoothstep(0.25, 0.85, n);

  // Ribbons/Strähnen:
  float ribbonBase = sin((q.x * 10.0 + q.y * 6.0) + fbm(q * 2.0) * 6.0 - t * 2.0);
  float ribbons = smoothstep(0.55, 0.98, ribbonBase * 0.5 + 0.5);

  // Halo um Zentrum:
  float r = length(p);
  float halo = pow(max(0.0, 1.0 - r * 1.2), 2.5);

  vec3 bg = vec3(0.005, 0.01, 0.02);
  vec3 col = bg;
  col += u_color * neb * (0.25 + 0.75 * halo);
  col += u_color * ribbons * (0.35 + 0.65 * n);

  // Sekundärfarbe (leichtes Pink/Viol):
  vec3 sec = vec3(0.6, 0.3, 1.0);
  col += sec * neb * ribbons * 0.25;

  // Kontrast-Boost:
  col *= 0.75 + 0.55 * neb;

  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'vortex-halo',
    title: 'Vortex Halo',
    tagline: 'Vortex · Glow',
    description: 'Radialer Vortex mit quantisierten Ringen und starkem Glow im Zentrum.',
    hue: 330,
    uniforms: {
      u_scale: 8.5,
      u_speed: 0.24,
      u_color: [0.9, 0.15, 1.0],
      u_intensity: 1,
      u_saturation: 1.15,
      u_contrast: 1.15,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * u_speed;

  float r = length(p);
  float a = atan(p.y, p.x);

  // Vortex + Warp:
  float warp = fbm(p * (2.3 + u_scale * 0.03) + vec2(t * 0.10, -t * 0.08));
  float vortex = a + t * (0.9 + 0.15 * u_scale) + warp * 1.8 / (r + 0.12);

  // Ringe (quantisiert):
  float ringSpace = 0.55 + 0.02 * u_scale;
  float rings = abs(fract((r + 0.06 * sin(t)) / ringSpace) - 0.5);
  float ringMask = 1.0 - smoothstep(0.0, 0.06, rings);

  // Halo:
  float core = exp(-r * (1.8 + 0.08 * u_scale));
  core = pow(core, 1.2);

  // Außenfade:
  float fade = 1.0 - smoothstep(0.55, 1.2, r);

  vec3 bg = vec3(0.01, 0.005, 0.02);
  vec3 col = bg;
  col += u_color * ringMask * (0.35 + 0.65 * core) * fade;

  // Zusätzliche „Tangentiale“ Kanten:
  float edge = pow(max(0.0, 1.0 - rings * 10.0), 2.0);
  vec3 edgeCol = vec3(0.65, 0.3, 1.0);
  col += edgeCol * edge * (0.25 + 0.75 * core);

  // Feines Körnchen:
  col += (fbm(p * 9.0 + vec2(0.0, t * 0.5)) - 0.5) * 0.04 * u_color;

  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'energy-wave',
    title: 'Energy Wave',
    tagline: 'Wave · Warp · Glow',
    description: 'Neon-Wellen mit Domain-Warping und „electric ribbon“-Anmutung.',
    hue: 40,
    uniforms: {
      u_scale: 10,
      u_speed: 0.26,
      u_color: [1.0, 0.62, 0.18],
      u_intensity: 1,
      u_saturation: 1.15,
      u_contrast: 1.12,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * u_speed;

  // Domain warp:
  vec2 q = p * (0.9 + 0.03 * u_scale);
  vec2 w = vec2(
    fbm(q * 2.4 + vec2(t * 0.12, -t * 0.10)),
    fbm(q * 2.4 + vec2(-t * 0.08, t * 0.16))
  );
  q += 0.7 * (w - 0.5);

  // Wellenphase:
  float phase = (q.x * 6.0 - q.y * 3.8) + fbm(q * 2.0) * 4.5 - t * 2.1;
  float wave = sin(phase);

  // Ribbon-Maske:
  float ribbon = 1.0 - smoothstep(0.55, 0.95, abs(wave));
  ribbon = pow(clamp(ribbon, 0.0, 1.0), 1.6);

  // Ausblenden Richtung Rand:
  float r = length(p);
  float fade = 1.0 - smoothstep(0.35, 1.2, r);
  fade = clamp(fade, 0.0, 1.0);

  // Nebel-Dichte:
  float n = fbm(q * (2.0 + 0.03 * u_scale) + vec2(t * 0.16, t * 0.08));
  float neb = smoothstep(0.22, 0.85, n);

  vec3 bg = vec3(0.006, 0.008, 0.02);
  vec3 col = bg + u_color * (0.35 + 0.65 * neb) * ribbon * fade;

  // „Hot“ Edge:
  vec3 hot = vec3(1.0, 0.55, 0.25);
  col += hot * ribbon * ribbon * (0.2 + 0.8 * neb) * fade;

  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'aurora-silk',
    title: 'Aurora Silk',
    tagline: 'Silk · Aurora',
    description: 'Seidige Nordlicht-Bänder mit weichem Farbverlauf und ruhigem Drift.',
    hue: 195,
    uniforms: {
      u_scale: 8.2,
      u_speed: 0.2,
      u_color: [0.12, 0.92, 0.86],
      u_intensity: 1,
      u_saturation: 1.15,
      u_contrast: 1.05,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * u_speed;
  vec2 q = p * (0.9 + u_scale * 0.03);
  vec2 warp = vec2(fbm(q * 2.1 + vec2(t * 0.08, -t * 0.06)), fbm(q * 2.0 + vec2(-t * 0.06, t * 0.08)));
  q += (warp - 0.5) * 0.75;
  float b1 = smoothstep(0.3, 0.92, sin(q.x * 7.0 + q.y * 4.0 + t * 1.1) * 0.5 + 0.5);
  float b2 = smoothstep(0.2, 0.88, sin(q.x * -5.5 + q.y * 6.8 - t * 0.9) * 0.5 + 0.5);
  float neb = smoothstep(0.2, 0.85, fbm(q * 2.4 + t * 0.2));
  vec3 bg = vec3(0.006, 0.012, 0.02);
  vec3 sec = vec3(0.58, 0.3, 1.0);
  vec3 col = bg + u_color * b1 * neb * 0.9 + sec * b2 * neb * 0.45;
  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'obsidian-veins',
    title: 'Obsidian Veins',
    tagline: 'Dark · Veins',
    description: 'Dunkles Material mit leuchtenden Adern, ideal für cinematic Dark UI.',
    hue: 275,
    uniforms: {
      u_scale: 7.2,
      u_speed: 0.26,
      u_color: [0.72, 0.38, 1.0],
      u_intensity: 1,
      u_saturation: 1.08,
      u_contrast: 1.18,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * u_speed;
  vec2 q = p * (1.0 + u_scale * 0.04);
  float n = fbm(q * 3.0 + vec2(t * 0.15, -t * 0.1));
  float n2 = fbm(q * 5.2 + vec2(-t * 0.12, t * 0.13));
  float veins = abs(n - n2);
  veins = 1.0 - smoothstep(0.05, 0.25, veins);
  veins = pow(clamp(veins, 0.0, 1.0), 2.2);
  vec3 bg = vec3(0.01, 0.008, 0.018);
  vec3 col = bg + u_color * veins * 1.3;
  col += vec3(0.12, 0.08, 0.18) * n * 0.2;
  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'plasma-orbit',
    title: 'Plasma Orbit',
    tagline: 'Orbit · Plasma',
    description: 'Orbitale Plasma-Ringe mit energetischem Kern und weichen Ausläufern.',
    hue: 18,
    uniforms: {
      u_scale: 8.8,
      u_speed: 0.3,
      u_color: [1.0, 0.42, 0.16],
      u_intensity: 1,
      u_saturation: 1.1,
      u_contrast: 1.14,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * u_speed;
  float r = length(p) * (2.1 + u_scale * 0.06);
  float a = atan(p.y, p.x);
  float orbit = sin(r * 8.0 - t * 2.2 + fbm(p * 3.0 + t * 0.2) * 4.0);
  orbit = smoothstep(0.65, 0.98, orbit * 0.5 + 0.5);
  float core = exp(-r * 0.75);
  float flare = smoothstep(0.2, 1.0, fbm(p * 4.5 + vec2(t * 0.3, -t * 0.2)));
  vec3 bg = vec3(0.012, 0.008, 0.02);
  vec3 col = bg + u_color * orbit * (0.35 + 0.65 * flare);
  col += vec3(1.0, 0.8, 0.5) * core * 0.35;
  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'cyber-smoke',
    title: 'Cyber Smoke',
    tagline: 'Smoke · Neon',
    description: 'Rauchartige Turbulenz mit kalter Neonfarbe und subtiler Tiefe.',
    hue: 172,
    uniforms: {
      u_scale: 6.8,
      u_speed: 0.24,
      u_color: [0.08, 0.95, 0.8],
      u_intensity: 1,
      u_saturation: 1.1,
      u_contrast: 1.02,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * u_speed;
  vec2 q = p * (0.8 + 0.04 * u_scale);
  float s1 = fbm(q * 2.8 + vec2(t * 0.18, -t * 0.12));
  float s2 = fbm(q * 5.0 + vec2(-t * 0.22, t * 0.1));
  float smoke = smoothstep(0.2, 0.9, s1 * 0.7 + s2 * 0.3);
  float wisps = smoothstep(0.55, 0.95, sin(q.x * 11.0 + s2 * 6.0 - t * 1.6) * 0.5 + 0.5);
  vec3 bg = vec3(0.006, 0.012, 0.018);
  vec3 col = bg + u_color * smoke * 0.7 + u_color * wisps * 0.3;
  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'ion-strands',
    title: 'Ion Strands',
    tagline: 'Strands · Electric',
    description: 'Elektrische Strähnen mit doppelter Frequenz und pulsierender Intensität.',
    hue: 208,
    uniforms: {
      u_scale: 9.4,
      u_speed: 0.32,
      u_color: [0.28, 0.68, 1.0],
      u_intensity: 1,
      u_saturation: 1.2,
      u_contrast: 1.16,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * u_speed;
  vec2 q = p * (0.95 + 0.03 * u_scale);
  float n = fbm(q * 2.2 + vec2(t * 0.12, -t * 0.1));
  float lineA = smoothstep(0.7, 0.98, sin((q.x * 12.0 + q.y * 3.5) + n * 5.0 - t * 1.9) * 0.5 + 0.5);
  float lineB = smoothstep(0.72, 0.99, sin((q.x * -8.0 + q.y * 6.8) - n * 4.5 + t * 1.6) * 0.5 + 0.5);
  float strands = clamp(lineA + lineB, 0.0, 1.0);
  float pulse = 0.75 + 0.25 * sin(t * 2.4 + n * 3.0);
  vec3 bg = vec3(0.005, 0.01, 0.02);
  vec3 col = bg + u_color * strands * pulse;
  col += vec3(0.7, 0.85, 1.0) * pow(strands, 3.0) * 0.35;
  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
  {
    id: 'lumen-rift',
    title: 'Lumen Rift',
    tagline: 'Rift · Bloom',
    description: 'Heller Riss mit Bloom-artigem Kern und dunklem volumetrischen Hintergrund.',
    hue: 300,
    uniforms: {
      u_scale: 8.6,
      u_speed: 0.21,
      u_color: [0.95, 0.28, 0.95],
      u_intensity: 1,
      u_saturation: 1.18,
      u_contrast: 1.12,
      u_gamma: 1,
    },
    fragment: `${HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * u_speed;
  vec2 q = p * (0.9 + 0.03 * u_scale);
  float d = abs(q.y + 0.18 * sin(q.x * 2.6 + t) + (fbm(q * 2.4 + t * 0.1) - 0.5) * 0.45);
  float rift = 1.0 - smoothstep(0.02, 0.16, d);
  float glow = 1.0 - smoothstep(0.1, 0.45, d);
  float haze = smoothstep(0.2, 0.85, fbm(q * 2.8 + vec2(-t * 0.15, t * 0.09)));
  vec3 bg = vec3(0.01, 0.005, 0.018) + vec3(0.08, 0.02, 0.12) * haze * 0.3;
  vec3 col = bg + u_color * rift * 1.2 + vec3(1.0, 0.75, 1.0) * glow * 0.35;
  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`,
  },
]

export function getShaderPreset(id: string): ShaderPreset | undefined {
  return SHADER_PRESETS.find((p) => p.id === id)
}

export const DEFAULT_PRESET_ID = 'obsidian-flux'

export function getDefaultPreset(): ShaderPreset {
  return SHADER_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID) ?? SHADER_PRESETS[0]
}
