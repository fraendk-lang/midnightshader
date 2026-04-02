const SNIPPET_GRADE = `
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

/** Minimale WebGL-1-Fragment-Vorlage — Uniforms müssen mit dem Editor übereinstimmen. */
export const SNIPPET_UNIFORMS = `precision highp float;
uniform float u_time;
uniform float u_speed;
uniform float u_scale;
uniform vec3 u_color;
uniform float u_intensity;
uniform float u_saturation;
uniform float u_contrast;
uniform float u_gamma;
uniform vec2 u_resolution;
${SNIPPET_GRADE}
`

export const SNIPPET_MAIN_START = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * u_speed;
`

export const SNIPPET_MAIN_END = `
  gl_FragColor = vec4(applyGrade(col), 1.0);
}
`

export const DOCS_WEBGL1 =
  'https://www.khronos.org/registry/OpenGL/specs/es/GLSL_ES_Specification_1.00.pdf'
