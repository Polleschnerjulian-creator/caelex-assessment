"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * AtlasEntityMini — visually identical to the full AI-Mode
 * AtlasEntity, just rendered into a container-sized canvas instead
 * of fullscreen. Same shell/core/halo particle layers, same simplex-
 * noise flow, same bloom + chromatic-aberration post-processing
 * stack. Used as the Astra brand-icon so users see the *exact* same
 * orb at every scale — no slimmed-down CSS approximation.
 *
 * Differences vs. AtlasEntity:
 *   - Container-sized canvas via ResizeObserver, not window-sized.
 *   - No starfield (the orb already brings its own halo of glow; the
 *     stars only make sense as a stage backdrop, not inside a 64px
 *     button).
 *   - No mouse-tracking (a tiny orb following the cursor reads as
 *     glitchy).
 *   - No shockwave-ring (no submit affordance at this size).
 *
 * Everything else — particle counts, shaders, bloom strength,
 * chromatic aberration — matches the full version 1:1.
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
  CA_VERT,
  CA_FRAG,
  makeSphereBuffer,
  modeIndex,
} from "./ai-mode/atlas-entity-shaders";

interface AtlasEntityMiniProps {
  /** Reactive mode. typing/thinking/speaking speed up the flow +
   *  brighten the surface. Default "idle". */
  mode?: AtlasMode;
  /** Audio amplitude 0..1 for "listening" mode. */
  audioLevel?: number;
  /** ARIA label override; defaults to "Astra". */
  ariaLabel?: string;
  /** Extra className for layout. */
  className?: string;
}

export function AtlasEntityMini({
  mode = "idle",
  audioLevel = 0,
  ariaLabel = "Astra",
  className = "",
}: AtlasEntityMiniProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtime = useRef({
    mode: "idle" as AtlasMode,
    audio: 0,
    energy: 0,
    disposed: false,
  });

  runtime.current.mode = mode;
  runtime.current.audio = audioLevel;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    runtime.current.disposed = false;

    // Initial sizing — square 1:1. ResizeObserver below keeps it in
    // sync with the container.
    const initialSize = Math.max(
      32,
      Math.min(container.clientWidth, container.clientHeight) || 64,
    );

    const scene = new THREE.Scene();
    // Opaque black background — same as the full AtlasEntity. The
    // mini orb gets clipped to a circle by its parent CSS, so the
    // black square becomes a black "mini stage" in the corner that
    // visually matches the AI-Mode orb-in-its-stage look.
    //
    // We tried alpha:true earlier but UnrealBloomPass + EffectComposer
    // don't propagate alpha reliably at small canvas sizes — the
    // result is a solid white block instead of a transparent
    // background. Opaque-black + parent-clip is the robust path.
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    // Tighter than the full entity (z=8) so the orb fills the small
    // viewport. Halo just kisses the edge with a soft glow margin.
    camera.position.set(0, 0, 4.6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false, // opaque — see scene.background note above
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initialSize, initialSize, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const entityGroup = new THREE.Group();
    scene.add(entityGroup);

    const PR = renderer.getPixelRatio();

    // Shared uniforms — same shape as the full AtlasEntity.
    const uniforms = {
      uTime: { value: 0 },
      uEnergy: { value: 0 },
      uMode: { value: 0 },
      uAudio: { value: 0 },
    };

    // ── Shell — main particle body. Same particle count as full
    // version (30k) so density at small size matches the AI-Mode look.
    // Three.js can absolutely handle 30k particles in a 64px canvas
    // — the GPU cost is per-pixel, not per-particle, and we have
    // plenty of headroom.
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

    // ── Core — denser, tighter. 10k particles, same as full version.
    const coreMat = new THREE.ShaderMaterial({
      uniforms: {
        ...uniforms,
        uRadius: { value: 0.82 },
        uPxSize: { value: 1.0 * PR },
        uFlowAmp: { value: 0.18 },
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

    // ── Halo — soft outer cloud. 6.5k particles, same as full.
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

    // ── Post-processing — UnrealBloomPass + chromatic-aberration
    // ShaderPass + OutputPass. THIS is what gives the AI-Mode orb its
    // luminous "lit-from-inside" look. Without it the particles just
    // sit there — with it, they bleed into a soft glow.
    const composer = new EffectComposer(renderer);
    composer.setSize(initialSize, initialSize);
    composer.setPixelRatio(PR);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(initialSize, initialSize),
      0.78, // strength — same as full version
      0.7, // radius
      0.18, // threshold
    );
    composer.addPass(bloomPass);

    const finalPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uResolution: {
          value: new THREE.Vector2(initialSize, initialSize),
        },
        uCA: { value: 0.0008 },
      },
      vertexShader: CA_VERT,
      fragmentShader: CA_FRAG,
    });
    composer.addPass(finalPass);
    composer.addPass(new OutputPass());

    // ── Container resize tracking ─────────────────────────────────
    const observer = new ResizeObserver(() => {
      if (runtime.current.disposed) return;
      const size = Math.max(
        32,
        Math.min(container.clientWidth, container.clientHeight) || 64,
      );
      renderer.setSize(size, size, false);
      composer.setSize(size, size);
      bloomPass.resolution.set(size, size);
      finalPass.uniforms.uResolution.value.set(size, size);
    });
    observer.observe(container);

    // ── Animation loop — mirrors AtlasEntity but no mouse / no
    // stars / no shockwave / no starfield-fade ─────────────────────
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

      // Same rotation logic as AtlasEntity, mouse terms zeroed.
      entityGroup.rotation.y = t * 0.08 * modeSpeed + Math.sin(t * 0.41) * 0.12;
      entityGroup.rotation.x = Math.sin(t * 0.27) * 0.28;
      entityGroup.rotation.z = Math.cos(t * 0.19) * 0.2;

      corePts.rotation.y = -t * 0.06 * modeSpeed + Math.sin(t * 0.33) * 0.15;
      corePts.rotation.x = Math.cos(t * 0.23) * 0.2;

      haloPts.rotation.y = t * 0.03;
      haloPts.rotation.x = Math.sin(t * 0.09) * 0.12;

      camera.position.z = 4.6 + Math.sin(t * 0.25) * 0.05;
      camera.lookAt(0, 0, 0);

      // Bloom strength reactive to mode + energy — same formula as
      // the full version.
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

    return () => {
      runtime.current.disposed = true;
      cancelAnimationFrame(animationId);
      observer.disconnect();

      [shellGeo, coreGeo, haloGeo].forEach((g) => g.dispose());
      [shellMat, coreMat, haloMat, finalPass.material].forEach((m) =>
        m.dispose(),
      );
      bloomPass.dispose();
      composer.dispose();
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
        width: "100%",
        height: "100%",
        aspectRatio: "1 / 1",
        position: "relative",
        // Clip the canvas to a circle. The Three.js canvas is opaque-
        // black square; the round clip turns it into a "stage circle"
        // matching the AI-Mode look. Without this you'd see a black
        // square corner.
        borderRadius: "50%",
        overflow: "hidden",
      }}
    />
  );
}

export default AtlasEntityMini;
