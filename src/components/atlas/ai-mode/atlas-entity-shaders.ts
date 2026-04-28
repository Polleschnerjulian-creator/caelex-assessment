/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Shared GLSL + helpers for the AtlasEntity / AtlasEntityMini family.
 *
 * AtlasEntity is the full-stage AI-Mode WebGL scene. AtlasEntityMini
 * is the same orb scaled down to ~20-30px for use as an Astra-chat
 * brand-icon. Both share these shaders and helpers so the visual
 * identity is 1:1 — same shell/core/halo particle layers, same
 * simplex-noise flow field, same mode-reactive timing.
 *
 * Splitting this out lets the mini variant inherit any future tuning
 * to the shaders without a copy-paste sync problem.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as THREE from "three";

// ─── Mode union ───────────────────────────────────────────────────────

export type AtlasMode =
  | "idle"
  | "typing"
  | "thinking"
  | "speaking"
  | "listening";

// ─── 3D simplex noise (shared by every shader that needs flow) ────────

export const NOISE_GLSL = /* glsl */ `
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;
    i = mod(i, 289.0 );
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }
`;

// ─── Shell vertex/fragment — main body ─────────────────────────────────

export const SHELL_VERT = /* glsl */ `
  uniform float uTime, uEnergy, uMode, uAudio, uRadius, uPxSize, uFlowAmp;
  attribute float aSeed;
  varying float vFacing;
  varying float vSeed;
  varying float vActivity;
  varying float vMode;
  ${NOISE_GLSL}
  void main() {
    vec3 d = normalize(position);
    float t = uTime;

    float typingBoost   = step(0.5, uMode) * step(uMode, 1.5);
    float thinkingBoost = step(1.5, uMode) * step(uMode, 2.5);
    float speakingBoost = step(2.5, uMode) * step(uMode, 3.5);
    float listeningBoost= step(3.5, uMode);

    float flowAmp = uFlowAmp
      + typingBoost   * 0.06
      + thinkingBoost * 0.10
      + speakingBoost * 0.06
      - listeningBoost* 0.08;

    float timeScale = 1.0
      + typingBoost   * 0.35
      + thinkingBoost * 0.6
      + speakingBoost * 0.3
      - listeningBoost* 0.3;

    float tt = t * timeScale;

    vec3 flow = vec3(
      snoise(d * 1.2 + vec3(tt * 0.11, 0.0, 0.0)),
      snoise(d * 1.2 + vec3(0.0, tt * 0.13, 100.0)),
      snoise(d * 1.2 + vec3(0.0, 0.0, tt * 0.09) + vec3(200.0))
    );
    vec3 tangentFlow = flow - d * dot(flow, d);
    vec3 dFlow = normalize(d + tangentFlow * flowAmp);

    float n1 = snoise(dFlow * 1.8 + vec3(tt * 0.14));
    float n2 = snoise(dFlow * 3.5 - vec3(tt * 0.09));
    float disp = n1 * 0.7 + n2 * 0.3;

    float breathe =
        0.030 * sin(t * 0.28)
      + 0.012 * sin(t * 0.66 + 1.5);

    float audioPush = listeningBoost * uAudio * 0.25 * (0.5 + 0.5 * sin(d.y * 10.0 + t * 3.0));
    float thinkPulse = thinkingBoost * (0.03 * sin(t * 3.5));

    float r = uRadius * (1.0
      + breathe
      + disp * 0.040
      + uEnergy * 0.06
      + audioPush
      + thinkPulse);

    vec3 pos = dFlow * r;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vec3 viewDir = normalize(-mv.xyz);
    vec3 normal = normalize(mat3(modelViewMatrix) * dFlow);
    vFacing = dot(normal, viewDir);
    vSeed = aSeed;
    vActivity = smoothstep(-0.35, 0.7, n1 + n2 * 0.5);
    vMode = uMode;

    float boost = (aSeed > 0.965) ? 2.6 : (aSeed > 0.88 ? 1.6 : 1.0);
    gl_PointSize = uPxSize * boost * (0.75 + aSeed * 0.55);
    gl_Position = projectionMatrix * mv;
  }
`;

export const SHELL_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime, uEnergy, uMode;
  varying float vFacing;
  varying float vSeed;
  varying float vActivity;
  varying float vMode;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d);

    float rim = 1.0 - abs(vFacing);
    rim = pow(rim, 1.5);

    float flick = 0.86 + 0.14 * sin(uTime * (0.45 + vSeed * 1.2) + vSeed * 11.0);
    float actBoost = 0.55 + vActivity * 0.75;
    float gp = 0.95 + 0.05 * sin(uTime * 0.28);

    float intensity = (0.28 + rim * 0.95) * actBoost * flick * gp;
    intensity *= 1.0 + uEnergy * 0.55;

    float speaking = step(2.5, vMode) * step(vMode, 3.5);
    intensity *= 1.0 + speaking * 0.18 * (0.5 + 0.5 * sin(uTime * 3.0));

    float thinking = step(1.5, vMode) * step(vMode, 2.5);
    intensity *= 1.0 + thinking * 0.2;

    gl_FragColor = vec4(vec3(1.0), alpha * intensity * 0.32);
  }
`;

// ─── Halo — softer outer cloud ─────────────────────────────────────────

export const HALO_VERT = /* glsl */ `
  uniform float uTime, uEnergy, uMode, uRadius, uPxSize;
  attribute float aSeed;
  varying float vFacing, vSeed;
  ${NOISE_GLSL}
  void main() {
    vec3 d = normalize(position);
    float rBase = length(position);
    float t = uTime;
    vec3 flow = vec3(
      snoise(d * 0.9 + vec3(t * 0.06, 0, 0)),
      snoise(d * 0.9 + vec3(0, t * 0.07, 100.0)),
      snoise(d * 0.9 + vec3(0, 0, t * 0.05) + vec3(200.))
    );
    vec3 tangentFlow = flow - d * dot(flow, d);
    vec3 dFlow = normalize(d + tangentFlow * 0.12);
    float breathe = 0.04 * sin(t * 0.22);
    float r = rBase * uRadius * (1.0 + breathe + uEnergy * 0.1);
    vec3 pos = dFlow * r;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vec3 viewDir = normalize(-mv.xyz);
    vec3 normal = normalize(mat3(modelViewMatrix) * dFlow);
    vFacing = dot(normal, viewDir);
    vSeed = aSeed;
    gl_PointSize = uPxSize * (0.6 + aSeed * 1.2);
    gl_Position = projectionMatrix * mv;
  }
`;

export const HALO_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime, uEnergy;
  varying float vFacing, vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d); alpha *= alpha;
    float rim = pow(1.0 - abs(vFacing), 2.0);
    float flick = 0.7 + 0.3 * sin(uTime * (0.3 + vSeed * 0.8) + vSeed * 9.0);
    float intensity = (0.25 + rim * 0.6) * flick;
    intensity *= 1.0 + uEnergy * 0.5;
    gl_FragColor = vec4(vec3(1.0), alpha * intensity * 0.15);
  }
`;

// ─── Stars (only used by full AtlasEntity, never the mini) ────────────

export const STAR_VERT = /* glsl */ `
  uniform float uTime, uPxSize;
  attribute float aSeed;
  varying float vSeed;
  void main() {
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uPxSize * (0.4 + aSeed * 1.4);
    gl_Position = projectionMatrix * mv;
  }
`;

export const STAR_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uStarsAlpha;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d);
    float flick = 0.55 + 0.45 * sin(uTime * (0.3 + vSeed * 1.8) + vSeed * 20.0);
    gl_FragColor = vec4(vec3(1.0), alpha * flick * 0.35 * uStarsAlpha);
  }
`;

// ─── Shockwave ring (only the full AtlasEntity triggers this) ─────────

export const RING_VERT = /* glsl */ `
  uniform float uTime, uStart, uDuration;
  varying float vProgress;
  void main() {
    float p = clamp((uTime - uStart) / uDuration, 0.0, 1.0);
    vProgress = p;
    float scale = 1.0 + p * 4.0;
    vec3 pos = position * scale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const RING_FRAG = /* glsl */ `
  varying float vProgress;
  void main() {
    float fade = 1.0 - vProgress;
    fade = pow(fade, 1.5);
    gl_FragColor = vec4(vec3(1.0), fade * 0.6);
  }
`;

// ─── Final pass — subtle chromatic aberration ─────────────────────────

export const CA_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const CA_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uTime, uCA;
  uniform vec2 uResolution;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec2 center = vec2(0.5);
    vec2 toCenter = uv - center;
    float dist = length(toCenter);
    vec2 dir = dist > 0.0 ? toCenter / dist : vec2(0.0);

    float caAmount = uCA * smoothstep(0.3, 0.9, dist);
    float r = texture2D(tDiffuse, uv - dir * caAmount).r;
    float g = texture2D(tDiffuse, uv).g;
    float b = texture2D(tDiffuse, uv + dir * caAmount).b;

    gl_FragColor = vec4(r, g, b, 1.0);
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Build a particle sphere. `count` particles distributed uniformly on
 * the sphere surface (or in a shell between minR/maxR with a power
 * distribution for the halo's smooth thickness falloff).
 */
export function makeSphereBuffer(
  count: number,
  minR: number,
  maxR: number,
  rPow: number,
): THREE.BufferGeometry {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const dx = Math.sin(phi) * Math.cos(theta);
    const dy = Math.sin(phi) * Math.sin(theta);
    const dz = Math.cos(phi);
    const r = minR + Math.pow(Math.random(), rPow) * (maxR - minR);
    positions[i * 3 + 0] = dx * r;
    positions[i * 3 + 1] = dy * r;
    positions[i * 3 + 2] = dz * r;
    seeds[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  return g;
}

export function modeIndex(m: AtlasMode): number {
  switch (m) {
    case "idle":
      return 0;
    case "typing":
      return 1;
    case "thinking":
      return 2;
    case "speaking":
      return 3;
    case "listening":
      return 4;
  }
}
