// ═══════════════════════════════════════════════════════════
// AuraVisualizer — WebGL shader visualization for voice state
//
// Renders the LiveKit-inspired Aura effect that responds to
// the current voice state (idle/listening/thinking/speaking).
// ═══════════════════════════════════════════════════════════

import { ReactShaderToy } from './ReactShaderToy';
import { useAuraAnimation } from './useAuraAnimation';
import type { VoiceState } from '../../services/voiceLive/types';

interface AuraVisualizerProps {
  /** Current voice state */
  state: VoiceState;
  /** Canvas size in CSS pixels (default 220) */
  size?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * Aura fragment shader (LiveKit-inspired).
 * Creates a flowing, organic orb effect driven by uniforms.
 */
const AURA_FRAGMENT_SHADER = `
const float TAU = 6.283185;

vec2 randFibo(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.xx + p.yx) * p.xy);
}

vec3 Tonemap(vec3 x) {
  x *= 4.0;
  return x / (1.0 + x);
}

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float sdCircle(vec2 st, float r) {
  return length(st) - r;
}

float getSdf(vec2 st) {
  return sdCircle(st, uScale);
}

vec2 turb(vec2 pos, float t, float it) {
  mat2 rot = mat2(0.6, -0.25, 0.25, 0.9);
  mat2 lr = mat2(0.6, -0.8, 0.8, 0.6);
  float freq = mix(2.0, 15.0, uFrequency);
  float amp = uAmplitude;
  float fg = 1.4;
  float at = t * 0.1 * uSpeed;
  for (int i = 0; i < 4; i++) {
    vec2 rp = pos * rot;
    vec2 w = sin(freq * rp + float(i) * at + it);
    pos += (amp / freq) * rot[0] * w;
    rot *= lr;
    amp *= mix(1.0, max(w.x, w.y), uVariance);
    freq *= fg;
  }
  return pos;
}

const float IT = 36.0;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec3 pp = vec3(0.0);
  vec3 bloom = vec3(0.0);
  float t = iTime * 0.5;
  vec2 pos = uv - 0.5;

  vec2 prev = turb(pos, t, -1.0 / IT);
  float sp = mix(1.0, TAU, uSpacing);

  for (float i = 1.0; i < IT + 1.0; i++) {
    float iter = i / IT;
    vec2 st = turb(pos, t, iter * sp);
    float d = abs(getSdf(st));
    float pd = distance(st, prev);
    prev = st;

    float db = exp2(pd * 2.0 * 1.4426950408889634) - 1.0;
    float ds = smoothstep(0.0, uBlur * 0.05 + max(db * uSmoothing, 0.001), d);

    vec3 col = uColor;
    if (uColorShift > 0.01) {
      vec3 h = rgb2hsv(col);
      h.x = fract(h.x + (1.0 - iter) * uColorShift * 0.3);
      col = hsv2rgb(h);
    }

    float inv = 1.0 / max(d + db, 0.001);
    pp += (ds - 1.0) * col;
    bloom += clamp(inv, 0.0, 250.0) * col;
  }

  pp *= 1.0 / IT;
  bloom = bloom / (bloom + 2e4);
  vec3 c = (-pp + bloom * 3.0 * uBloom) * 1.2;
  c += (randFibo(fragCoord).x - 0.5) / 255.0;
  c = Tonemap(c);

  float a = luma(c) * uMix;
  fragColor = vec4(c * uMix, a);
}
`;

export function AuraVisualizer({
  state,
  size = 220,
  className,
}: AuraVisualizerProps) {
  const uniforms = useAuraAnimation(state);

  return (
    <ReactShaderToy
      fragmentShader={AURA_FRAGMENT_SHADER}
      uniforms={uniforms}
      width={size}
      height={size}
      className={className}
    />
  );
}
