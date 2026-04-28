"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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
import {
  type AtlasMode,
  SHELL_VERT,
  SHELL_FRAG,
  HALO_VERT,
  HALO_FRAG,
  STAR_VERT,
  STAR_FRAG,
  RING_VERT,
  RING_FRAG,
  CA_VERT,
  CA_FRAG,
  makeSphereBuffer,
  modeIndex,
} from "./atlas-entity-shaders";

// ─── Types ────────────────────────────────────────────────────────────

// Re-export so existing consumers (AIMode etc.) keep working without
// changing their import paths.
export type { AtlasMode };

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
  /** When true, the starfield fades out (used when the orb shrinks
   *  into the corner during an active conversation — a tiny corner-
   *  orb on a full starfield looks visually inconsistent). */
  starsHidden?: boolean;
  /** Fired once with a handle exposing imperative hooks. */
  onReady?: (handle: AtlasEntityHandle) => void;
}

// ─── Component ────────────────────────────────────────────────────────

export function AtlasEntity({
  mode,
  audioLevel = 0,
  starsHidden = false,
  onReady,
}: AtlasEntityProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // All mutable runtime state goes into a ref so the main effect
  // can initialise once and mode/audio updates don't recreate the scene.
  const runtime = useRef({
    mode: "idle" as AtlasMode,
    audio: 0,
    energy: 0,
    starsTargetAlpha: 1, // 1 = visible, 0 = faded out
    starsAlpha: 1,
    triggerShockwaveAt: -99,
    disposed: false,
  });

  // Keep runtime.current in sync with React props every render
  runtime.current.mode = mode;
  runtime.current.audio = audioLevel;
  runtime.current.starsTargetAlpha = starsHidden ? 0 : 1;

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
      uniforms: {
        uTime: uniforms.uTime,
        uPxSize: { value: 1.4 * PR },
        uStarsAlpha: { value: 1.0 },
      },
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

      // Starfield-fade: smooth interpolation zum zielwert. 0.08 pro
      // frame → ~0.8s für einen vollen 0↔1 übergang, matched damit
      // die CSS-transition des entity-wrappers ungefähr zeitlich.
      runtime.current.starsAlpha +=
        (runtime.current.starsTargetAlpha - runtime.current.starsAlpha) * 0.08;
      starMat.uniforms.uStarsAlpha.value = runtime.current.starsAlpha;

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
