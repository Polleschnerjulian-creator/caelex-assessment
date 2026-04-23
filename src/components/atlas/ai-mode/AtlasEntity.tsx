"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * AtlasEntity — WebGL scene for the AI Mode overlay.
 *
 * A three-layer particle sphere (core + shell + halo) on a starfield,
 * shader-animated via simplex noise. Supports mode-reactive behaviour
 * (idle / typing / thinking / speaking / listening) and an audio-
 * reactive listening pulse. Rendered through an EffectComposer with
 * bloom + chromatic aberration.
 *
 * React boundary: the parent owns state (mode, audioLevel, energy).
 * We expose those to the render loop via a ref-held uniforms object
 * so mode transitions don't force React to re-mount the canvas. A
 * `triggerShockwave()` method is exposed via `onReady` for submit-
 * time visual punch.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// ─── Types ────────────────────────────────────────────────────────────

export type AtlasMode =
  | "idle"
  | "typing"
  | "thinking"
  | "speaking"
  | "listening";

export interface AtlasEntityHandle {
  /** Trigger the shockwave ring. Call on submit. */
  triggerShockwave: () => void;
  /** Push a one-shot energy pulse (0..1 added to current energy). */
  bumpEnergy: (amount: number) => void;
}

interface AtlasEntityProps {
  /** Current mode. Uniform smooths between modes over ~200ms. */
  mode: AtlasMode;
  /** Audio amplitude 0..1 for listening-mode surface pulse. */
  audioLevel?: number;
  /** Fired once with a handle exposing imperative hooks. */
  onReady?: (handle: AtlasEntityHandle) => void;
}

// ─── Shared GLSL — 3D simplex noise ────────────────────────────────────

const NOISE_GLSL = /* glsl */ `
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

const SHELL_VERT = /* glsl */ `
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

    // gedämpfte flow-amplitude: thinking war 0.20 (starke deformation),
    // speaking 0.12. das war mit dem starken timeScale-boost zusammen
    // zu viel "explosions"-feeling. jetzt sanfte wellen statt schocks.
    float flowAmp = uFlowAmp
      + typingBoost   * 0.06
      + thinkingBoost * 0.10
      + speakingBoost * 0.06
      - listeningBoost* 0.08;

    // Zahmere timeScale-werte: thinking war 1.3 (stark), speaking 0.6.
    // das wirkte beim submit + während des streamings wie eine kleine
    // explosion. halbiert auf 0.6 / 0.3 — spürbar, aber nicht hektisch.
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

const SHELL_FRAG = /* glsl */ `
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

    // Speaking: ruhigeres, langsameres pulsieren (3Hz statt 7Hz,
    // 18% statt 35% amplitude) — der orb soll beim sprechen "atmen"
    // und nicht flackern. text-streaming + schnelles shader-flicker
    // kumulieren sonst zu wahrgenommenem jank.
    float speaking = step(2.5, vMode) * step(vMode, 3.5);
    intensity *= 1.0 + speaking * 0.18 * (0.5 + 0.5 * sin(uTime * 3.0));

    float thinking = step(1.5, vMode) * step(vMode, 2.5);
    intensity *= 1.0 + thinking * 0.2;

    gl_FragColor = vec4(vec3(1.0), alpha * intensity * 0.32);
  }
`;

// ─── Halo — softer outer cloud ─────────────────────────────────────────

const HALO_VERT = /* glsl */ `
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

const HALO_FRAG = /* glsl */ `
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

// ─── Stars ────────────────────────────────────────────────────────────

const STAR_VERT = /* glsl */ `
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

const STAR_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d);
    float flick = 0.55 + 0.45 * sin(uTime * (0.3 + vSeed * 1.8) + vSeed * 20.0);
    gl_FragColor = vec4(vec3(1.0), alpha * flick * 0.35);
  }
`;

// ─── Shockwave ring ───────────────────────────────────────────────────

const RING_VERT = /* glsl */ `
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

const RING_FRAG = /* glsl */ `
  varying float vProgress;
  void main() {
    float fade = 1.0 - vProgress;
    fade = pow(fade, 1.5);
    gl_FragColor = vec4(vec3(1.0), fade * 0.6);
  }
`;

// ─── Final pass — subtle chromatic aberration ─────────────────────────

const CA_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CA_FRAG = /* glsl */ `
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

function makeSphereBuffer(
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

function modeIndex(m: AtlasMode): number {
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

// ─── Component ────────────────────────────────────────────────────────

export function AtlasEntity({
  mode,
  audioLevel = 0,
  onReady,
}: AtlasEntityProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // All mutable runtime state goes into a ref so the main effect
  // can initialise once and mode/audio updates don't recreate the scene.
  const runtime = useRef({
    mode: "idle" as AtlasMode,
    audio: 0,
    energy: 0,
    triggerShockwaveAt: -99,
    disposed: false,
  });

  // Keep runtime.current in sync with React props every render
  runtime.current.mode = mode;
  runtime.current.audio = audioLevel;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    runtime.current.disposed = false;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(
      32,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    const entityGroup = new THREE.Group();
    entityGroup.position.y = 0.55;
    scene.add(entityGroup);

    const PR = renderer.getPixelRatio();

    // Shared uniforms — one source of truth, passed by reference.
    const uniforms = {
      uTime: { value: 0 },
      uEnergy: { value: 0 },
      uMode: { value: 0 },
      uAudio: { value: 0 },
    };

    // ── Shell ──────────────────────────────────────────────
    const shellMat = new THREE.ShaderMaterial({
      uniforms: {
        ...uniforms,
        uRadius: { value: 1.15 },
        uPxSize: { value: 1.35 * PR },
        uFlowAmp: { value: 0.18 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: SHELL_VERT,
      fragmentShader: SHELL_FRAG,
    });
    const shellGeo = makeSphereBuffer(30000, 1.0, 1.0, 1.0);
    const shellPts = new THREE.Points(shellGeo, shellMat);
    entityGroup.add(shellPts);

    // ── Core (denser, tighter) ──────────────────────────────
    const coreMat = new THREE.ShaderMaterial({
      uniforms: {
        ...uniforms,
        uRadius: { value: 0.82 },
        uPxSize: { value: 1.0 * PR },
        uFlowAmp: { value: 0.24 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: SHELL_VERT,
      fragmentShader: SHELL_FRAG,
    });
    const coreGeo = makeSphereBuffer(10000, 1.0, 1.0, 1.0);
    const corePts = new THREE.Points(coreGeo, coreMat);
    entityGroup.add(corePts);

    // ── Halo ────────────────────────────────────────────────
    const haloMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: uniforms.uTime,
        uEnergy: uniforms.uEnergy,
        uMode: uniforms.uMode,
        uRadius: { value: 1.45 },
        uPxSize: { value: 2.0 * PR },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: HALO_VERT,
      fragmentShader: HALO_FRAG,
    });
    const haloGeo = makeSphereBuffer(6500, 1.0, 1.35, 1.8);
    const haloPts = new THREE.Points(haloGeo, haloMat);
    entityGroup.add(haloPts);

    // ── Shockwave ring ─────────────────────────────────────
    const ringGeo = new THREE.RingGeometry(0.9, 1.0, 128, 1);
    const ringMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uStart: { value: -99 },
        uDuration: { value: 1.4 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: RING_VERT,
      fragmentShader: RING_FRAG,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    entityGroup.add(ring);

    // ── Starfield ──────────────────────────────────────────
    const STAR_COUNT = 1200;
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starSeed = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      starPos[i * 3 + 0] = (Math.random() - 0.5) * 60;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      starPos[i * 3 + 2] = -Math.random() * 40 - 8;
      starSeed[i] = Math.random();
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("aSeed", new THREE.BufferAttribute(starSeed, 1));
    const starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: uniforms.uTime, uPxSize: { value: 1.4 * PR } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ── Post-processing ─────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.78,
      0.7,
      0.18,
    );
    composer.addPass(bloomPass);

    const finalPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        uCA: { value: 0.0008 },
      },
      vertexShader: CA_VERT,
      fragmentShader: CA_FRAG,
    });
    composer.addPass(finalPass);
    composer.addPass(new OutputPass());

    // ── Interaction ─────────────────────────────────────────
    const mouse = new THREE.Vector2(0, 0);
    const mouseTarget = new THREE.Vector2(0, 0);
    const onPointerMove = (e: PointerEvent) => {
      mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointerMove);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      finalPass.uniforms.uResolution.value.set(
        window.innerWidth,
        window.innerHeight,
      );
    };
    window.addEventListener("resize", onResize);

    // ── Expose handle ──────────────────────────────────────
    if (onReady) {
      onReady({
        triggerShockwave: () => {
          runtime.current.triggerShockwaveAt = clock.getElapsedTime();
        },
        bumpEnergy: (amount) => {
          runtime.current.energy = Math.min(1, runtime.current.energy + amount);
        },
      });
    }

    // ── Animation loop ─────────────────────────────────────
    const clock = new THREE.Clock();
    let modeSmooth = 0;
    let animationId = 0;

    const animate = () => {
      if (runtime.current.disposed) return;
      const t = clock.getElapsedTime();

      // Mode smoothing — prevents snapping when user changes state
      const targetMode = modeIndex(runtime.current.mode);
      modeSmooth += (targetMode - modeSmooth) * 0.08;
      uniforms.uMode.value = modeSmooth;

      // Audio smoothing
      uniforms.uAudio.value =
        uniforms.uAudio.value * 0.7 + runtime.current.audio * 0.3;

      // Energy decay
      runtime.current.energy *= 0.974;
      uniforms.uEnergy.value = runtime.current.energy;
      uniforms.uTime.value = t;
      ringMat.uniforms.uTime.value = t;
      ringMat.uniforms.uStart.value = runtime.current.triggerShockwaveAt;

      // Mouse easing
      mouse.x += (mouseTarget.x - mouse.x) * 0.035;
      mouse.y += (mouseTarget.y - mouse.y) * 0.035;

      const m = runtime.current.mode;
      const modeSpeed =
        1.0 +
        (m === "typing" ? 0.35 : 0) +
        (m === "thinking" ? 1.2 : 0) +
        (m === "speaking" ? 0.4 : 0) +
        (m === "listening" ? -0.3 : 0);

      entityGroup.rotation.y =
        t * 0.08 * modeSpeed + Math.sin(t * 0.41) * 0.12 + mouse.x * 0.22;
      entityGroup.rotation.x = Math.sin(t * 0.27) * 0.28 + mouse.y * 0.15;
      entityGroup.rotation.z = Math.cos(t * 0.19) * 0.2;

      corePts.rotation.y = -t * 0.06 * modeSpeed + Math.sin(t * 0.33) * 0.15;
      corePts.rotation.x = Math.cos(t * 0.23) * 0.2;

      haloPts.rotation.y = t * 0.03;
      haloPts.rotation.x = Math.sin(t * 0.09) * 0.12;

      stars.rotation.y = mouse.x * 0.02 + t * 0.003;
      stars.rotation.x = -mouse.y * 0.015;

      camera.position.z = 8 + Math.sin(t * 0.25) * 0.08;
      camera.lookAt(0, 0.15, 0);

      bloomPass.strength =
        0.78 +
        runtime.current.energy * 0.5 +
        (m === "thinking" ? 0.25 : 0) +
        (m === "speaking" ? 0.15 : 0);

      finalPass.uniforms.uTime.value = t;
      finalPass.uniforms.uCA.value = 0.0008 + runtime.current.energy * 0.0006;

      composer.render();
      animationId = requestAnimationFrame(animate);
    };
    animate();

    // ── Cleanup ────────────────────────────────────────────
    return () => {
      runtime.current.disposed = true;
      cancelAnimationFrame(animationId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);

      [shellGeo, coreGeo, haloGeo, starGeo, ringGeo].forEach((g) =>
        g.dispose(),
      );
      [
        shellMat,
        coreMat,
        haloMat,
        starMat,
        ringMat,
        finalPass.material,
      ].forEach((m) => m.dispose());
      bloomPass.dispose();
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // onReady is intentionally not a dep — it's one-shot at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    />
  );
}
