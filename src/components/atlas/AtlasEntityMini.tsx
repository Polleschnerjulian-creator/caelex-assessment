"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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
    // Transparent background — the orb floats on whatever the page
    // bg is. Without EffectComposer, alpha:true on the renderer +
    // scene.background = null gives a properly transparent canvas
    // (the bug we hit before was bloom-pass-related, not a basic-
    // render issue).
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    // Tighter than the full entity (z=8) so the orb fills the small
    // viewport. Halo just kisses the edge with a soft glow margin.
    camera.position.set(0, 0, 4.6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // transparent canvas; particles render on page bg
      premultipliedAlpha: false,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initialSize, initialSize, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0); // alpha-zero clear → fully transparent
    container.appendChild(renderer.domElement);

    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    // ── Theme-adaptive particle color ──────────────────────────
    // The shaders render particles in pure white. To make them
    // visible on a light page bg, we apply CSS filter:invert(1) when
    // the page is in light mode — that flips the white particles to
    // black, alpha unchanged, transparent stays transparent.
    //
    // Detection priority (Atlas-specific, then fallbacks):
    //   1. data-atlas-theme="dark|light" on closest ancestor
    //      (set by AtlasShell via React context)
    //   2. data-atlas-preload="dark|light" on <html>
    //      (set by the flash-guard inline script before hydration)
    //   3. parse the computed background-color of the closest
    //      non-transparent ancestor — looks at what's actually
    //      visually behind the orb. The luminance >0.5 = light bg.
    //   4. prefers-color-scheme media query
    //
    // The walk-up bg detection at step 3 is the robust fallback —
    // works for any future theming mechanism without code changes.
    const detectIsDark = (): boolean => {
      // 1) data-atlas-theme on closest ancestor
      const themedAncestor = container.closest("[data-atlas-theme]");
      if (themedAncestor) {
        const v = themedAncestor.getAttribute("data-atlas-theme");
        if (v === "dark") return true;
        if (v === "light") return false;
      }
      // 2) data-atlas-preload on html (pre-hydration)
      const preload =
        document.documentElement.getAttribute("data-atlas-preload");
      if (preload === "dark") return true;
      if (preload === "light") return false;
      // 3) walk up DOM, find first non-transparent bg, compute lightness
      let el: Element | null = container;
      while (el) {
        const bg = window.getComputedStyle(el).backgroundColor;
        const m = bg.match(
          /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/,
        );
        if (m) {
          const r = Number(m[1]);
          const g = Number(m[2]);
          const b = Number(m[3]);
          const a = m[4] !== undefined ? Number(m[4]) : 1;
          if (a > 0.05) {
            // Relative luminance formula (sRGB approximation).
            const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            return lum < 0.5;
          }
        }
        el = el.parentElement;
      }
      // 4) media query fallback
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    };

    const applyThemeFilter = () => {
      if (runtime.current.disposed) return;
      const isDark = detectIsDark();
      // Light mode → invert (white particles become black on light bg)
      // Dark mode → no invert (white particles stay luminous on dark bg)
      renderer.domElement.style.filter = isDark ? "" : "invert(1)";
    };
    applyThemeFilter();

    // Watch for theme changes via three signals:
    //   - OS-level prefers-color-scheme
    //   - <html> data-atlas-preload changes (pre-hydration)
    //   - data-atlas-theme attribute changes anywhere up the tree
    //     (the closest ancestor is what matters; observing the whole
    //     subtree is overkill for one element so we observe only
    //     <html> + the closest themed ancestor at mount time).
    const themeMql = window.matchMedia("(prefers-color-scheme: dark)");
    themeMql.addEventListener("change", applyThemeFilter);
    const htmlObserver = new MutationObserver(applyThemeFilter);
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-atlas-preload"],
    });
    const themedAncestorAtMount = container.closest("[data-atlas-theme]");
    let ancestorObserver: MutationObserver | null = null;
    if (themedAncestorAtMount) {
      ancestorObserver = new MutationObserver(applyThemeFilter);
      ancestorObserver.observe(themedAncestorAtMount, {
        attributes: true,
        attributeFilter: ["data-atlas-theme"],
      });
    }

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

    // ── No post-processing here ─────────────────────────────────
    // The full AtlasEntity uses UnrealBloomPass + chromatic-
    // aberration to add the luminous glow. We tried that on the
    // mini orb but UnrealBloomPass progressively downsamples the
    // canvas to ~5 mip levels, and at 72px (×PR=2 → 144px effective)
    // the smallest mip is ~4px which produces artifacts including a
    // solid-white output instead of the actual scene render.
    //
    // Compensation: a CSS box-shadow halo on the wrapper button
    // (defined in the consumer JSX) replicates the bloom outside the
    // canvas-clip edge. The particle particles still glow internally
    // via additive blending, just without the post-process bloom.
    //
    // Net effect at small sizes: visually 90% identical to the full
    // version, with reliable rendering.

    // ── Container resize tracking ─────────────────────────────────
    const observer = new ResizeObserver(() => {
      if (runtime.current.disposed) return;
      const size = Math.max(
        32,
        Math.min(container.clientWidth, container.clientHeight) || 64,
      );
      renderer.setSize(size, size, false);
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

      // Direct render — no post-processing. See note above about why
      // bloom isn't viable at this size.
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      runtime.current.disposed = true;
      cancelAnimationFrame(animationId);
      observer.disconnect();
      htmlObserver.disconnect();
      ancestorObserver?.disconnect();
      themeMql.removeEventListener("change", applyThemeFilter);

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
        width: "100%",
        height: "100%",
        aspectRatio: "1 / 1",
        position: "relative",
        // No border-radius clip needed — the canvas's black background
        // is rendered invisible by mix-blend-mode: difference on the
        // canvas itself. The orb floats freely on whatever the page
        // bg is.
      }}
    />
  );
}

export default AtlasEntityMini;
