"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * AtlasEntityMini — small WebGL orb sharing shaders + geometry with
 * the full AI-Mode AtlasEntity. Used as the brand-icon in the Astra
 * chat (Atlas-side + Dashboard-side widgets) so the lawyer / operator
 * sees the same particle-sphere identity at every scale.
 *
 * Differences vs. the full AtlasEntity:
 *   - Container-sized canvas via ResizeObserver, not window-sized.
 *   - No starfield (invisible at 24-40px anyway).
 *   - No EffectComposer / bloom / chromatic aberration — direct
 *     renderer.render(). Bloom-on-pixels-of-3 is just blur and the
 *     compositor cost is wasted at this size.
 *   - No mouse-follow (a tiny orb tracking the cursor is uncanny).
 *   - Reduced particle counts (shell 7k / core 2.4k / halo 1.6k —
 *     ~26% of the full version's 30k/10k/6.5k). At 24px the rendered
 *     particle count stays well below the pixel count of the canvas
 *     so the silhouette stays dense.
 *
 * Shared exactly with AtlasEntity:
 *   - All vertex + fragment shaders (SHELL/HALO via shared module).
 *   - The simplex-noise flow field and uMode/uEnergy/uAudio uniforms.
 *   - Mode-smoothing + energy-decay loop logic.
 *
 * Result: same orb pose, same flow, same breathing — at 1/15th the
 * physical size with a fraction of the GPU cost.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  type AtlasMode,
  SHELL_VERT,
  SHELL_FRAG,
  HALO_VERT,
  HALO_FRAG,
  makeSphereBuffer,
  modeIndex,
} from "./ai-mode/atlas-entity-shaders";

interface AtlasEntityMiniProps {
  /** Reactive mode for the orb. Active states (typing/thinking/
   *  speaking) speed up the flow + brighten the surface. Default
   *  "idle". */
  mode?: AtlasMode;
  /** Audio amplitude 0..1 (only meaningful for "listening" mode).
   *  The mini orb supports it for completeness even though the
   *  primary use case is non-audio chat. */
  audioLevel?: number;
  /** Optional one-shot energy bump (0..1). Useful for submit
   *  feedback in the future. Decays automatically. */
  energy?: number;
  /** ARIA label override; defaults to "Astra". */
  ariaLabel?: string;
  /** Extra className — the canvas itself is square and fills the
   *  container, so layout sizing is the parent's responsibility. */
  className?: string;
}

export function AtlasEntityMini({
  mode = "idle",
  audioLevel = 0,
  energy = 0,
  ariaLabel = "Astra",
  className = "",
}: AtlasEntityMiniProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtime = useRef({
    mode: "idle" as AtlasMode,
    audio: 0,
    energy: 0,
    energyTarget: 0,
    disposed: false,
  });

  // Sync props into the runtime ref every render. The animate-loop
  // reads from this ref so prop changes apply on the next frame
  // without recreating the WebGL scene.
  runtime.current.mode = mode;
  runtime.current.audio = audioLevel;
  runtime.current.energyTarget = Math.max(runtime.current.energyTarget, energy);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    runtime.current.disposed = false;

    // Size to the container, not the window. Square 1:1 — orb is
    // intrinsically circular so any non-square framing wastes pixels.
    const initialSize = Math.max(
      24,
      Math.min(container.clientWidth, container.clientHeight) || 32,
    );

    const scene = new THREE.Scene();
    scene.background = null; // transparent — let parent disc show through

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    // Closer than full AtlasEntity (z=8) so the orb fills the viewport.
    // 4.6 chosen so the halo just kisses the canvas edge with a soft
    // glow margin.
    camera.position.set(0, 0, 4.6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: "low-power", // tiny canvas, low-power GPU is fine
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initialSize, initialSize, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Square canvas centered in the container. Layout via inline style
    // so it doesn't depend on consumer CSS.
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const entityGroup = new THREE.Group();
    scene.add(entityGroup);

    const PR = renderer.getPixelRatio();

    const uniforms = {
      uTime: { value: 0 },
      uEnergy: { value: 0 },
      uMode: { value: 0 },
      uAudio: { value: 0 },
    };

    // ── Shell — main particle body. 7k particles is enough density
    // at 24-40px (full version has 30k for a fullscreen canvas). ──
    const shellMat = new THREE.ShaderMaterial({
      uniforms: {
        ...uniforms,
        uRadius: { value: 1.15 },
        uPxSize: { value: 1.2 * PR },
        uFlowAmp: { value: 0.18 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: SHELL_VERT,
      fragmentShader: SHELL_FRAG,
    });
    const shellGeo = makeSphereBuffer(7000, 1.0, 1.0, 1.0);
    const shellPts = new THREE.Points(shellGeo, shellMat);
    entityGroup.add(shellPts);

    // ── Core — 2.4k particles. Same shaders as the full version. ──
    const coreMat = new THREE.ShaderMaterial({
      uniforms: {
        ...uniforms,
        uRadius: { value: 0.82 },
        uPxSize: { value: 0.95 * PR },
        uFlowAmp: { value: 0.18 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: SHELL_VERT,
      fragmentShader: SHELL_FRAG,
    });
    const coreGeo = makeSphereBuffer(2400, 1.0, 1.0, 1.0);
    const corePts = new THREE.Points(coreGeo, coreMat);
    entityGroup.add(corePts);

    // ── Halo — soft outer cloud, 1.6k particles. ──
    const haloMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: uniforms.uTime,
        uEnergy: uniforms.uEnergy,
        uMode: uniforms.uMode,
        uRadius: { value: 1.45 },
        uPxSize: { value: 1.7 * PR },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: HALO_VERT,
      fragmentShader: HALO_FRAG,
    });
    const haloGeo = makeSphereBuffer(1600, 1.0, 1.35, 1.8);
    const haloPts = new THREE.Points(haloGeo, haloMat);
    entityGroup.add(haloPts);

    // Container-resize observer — re-sizes the renderer when the
    // parent disc changes size (e.g. responsive layout). Camera
    // aspect stays 1:1 since we always render square.
    const observer = new ResizeObserver(() => {
      if (runtime.current.disposed) return;
      const size = Math.max(
        24,
        Math.min(container.clientWidth, container.clientHeight) || 32,
      );
      renderer.setSize(size, size, false);
    });
    observer.observe(container);

    // ── Animation loop — same logic as AtlasEntity but no mouse,
    // no stars, no shockwave-ring, and we render the scene
    // directly instead of through the post-processing composer.
    const clock = new THREE.Clock();
    let modeSmooth = 0;
    let animationId = 0;

    const animate = () => {
      if (runtime.current.disposed) return;
      const t = clock.getElapsedTime();

      const targetMode = modeIndex(runtime.current.mode);
      modeSmooth += (targetMode - modeSmooth) * 0.08;
      uniforms.uMode.value = modeSmooth;

      uniforms.uAudio.value =
        uniforms.uAudio.value * 0.7 + runtime.current.audio * 0.3;

      // Energy ramp + decay
      runtime.current.energy +=
        (runtime.current.energyTarget - runtime.current.energy) * 0.15;
      runtime.current.energyTarget *= 0.92;
      runtime.current.energy *= 0.974;
      uniforms.uEnergy.value = runtime.current.energy;
      uniforms.uTime.value = t;

      const m = runtime.current.mode;
      const modeSpeed =
        1.0 +
        (m === "typing" ? 0.35 : 0) +
        (m === "thinking" ? 1.2 : 0) +
        (m === "speaking" ? 0.4 : 0) +
        (m === "listening" ? -0.3 : 0);

      // Same rotation logic as AtlasEntity but mouse-terms zeroed
      // out — a tiny orb tracking the cursor reads as glitchy.
      entityGroup.rotation.y = t * 0.08 * modeSpeed + Math.sin(t * 0.41) * 0.12;
      entityGroup.rotation.x = Math.sin(t * 0.27) * 0.28;
      entityGroup.rotation.z = Math.cos(t * 0.19) * 0.2;

      corePts.rotation.y = -t * 0.06 * modeSpeed + Math.sin(t * 0.33) * 0.15;
      corePts.rotation.x = Math.cos(t * 0.23) * 0.2;

      haloPts.rotation.y = t * 0.03;
      haloPts.rotation.x = Math.sin(t * 0.09) * 0.12;

      camera.position.z = 4.6 + Math.sin(t * 0.25) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      runtime.current.disposed = true;
      cancelAnimationFrame(animationId);
      observer.disconnect();

      [shellGeo, coreGeo, haloGeo].forEach((g) => g.dispose());
      [shellMat, coreMat, haloMat].forEach((m) => m.dispose());
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{
        // Square aspect — the orb is circular so non-square framing
        // wastes pixels and confuses the renderer's perspective.
        width: "100%",
        height: "100%",
        aspectRatio: "1 / 1",
        position: "relative",
        overflow: "hidden",
      }}
    />
  );
}

export default AtlasEntityMini;
