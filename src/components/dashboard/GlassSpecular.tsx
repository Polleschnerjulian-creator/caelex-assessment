"use client";

import { useEffect } from "react";

/**
 * GlassSpecular — attaches a single global mousemove listener to the
 * dashboard container and updates CSS custom properties on every .glass
 * and .glass-elevated element so their ::after pseudo-element renders
 * a specular highlight that follows the cursor.
 *
 * Mount this once inside the dashboard layout. It self-cleans on unmount.
 * On touch-only devices the effect is disabled entirely.
 */
export default function GlassSpecular() {
  useEffect(() => {
    // Only enable on devices with a fine pointer (mouse/trackpad)
    if (!window.matchMedia("(hover: hover)").matches) return;

    const container = document.querySelector(".caelex-v2");
    if (!container) return;

    let rafId: number | null = null;
    let mouseX = 0;
    let mouseY = 0;
    let rects: { el: HTMLElement; rect: DOMRect }[] = [];

    function cacheRects() {
      const els = container!.querySelectorAll(
        ".glass, .glass-elevated, .glass-card",
      );
      rects = Array.from(els).map((el) => ({
        el: el as HTMLElement,
        rect: el.getBoundingClientRect(),
      }));
    }

    let cacheTimer: ReturnType<typeof setTimeout>;
    function debouncedCache() {
      clearTimeout(cacheTimer);
      cacheTimer = setTimeout(cacheRects, 100);
    }

    function onMouseMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (rafId === null) {
        rafId = requestAnimationFrame(updateSpecular);
      }
    }

    function updateSpecular() {
      rafId = null;
      for (const { el, rect } of rects) {
        const relX = mouseX - rect.left;
        const relY = mouseY - rect.top;
        const isNear =
          relX > -100 &&
          relX < rect.width + 100 &&
          relY > -100 &&
          relY < rect.height + 100;

        if (isNear) {
          const pctX = (relX / rect.width) * 100;
          const pctY = (relY / rect.height) * 100;
          el.style.setProperty("--specular-x", `${pctX}%`);
          el.style.setProperty("--specular-y", `${pctY}%`);
          el.style.setProperty("--specular-opacity", "1");
        } else {
          el.style.setProperty("--specular-opacity", "0");
        }
      }
    }

    function onMouseLeave() {
      for (const { el } of rects) {
        el.style.setProperty("--specular-opacity", "0");
      }
    }

    cacheRects();
    container.addEventListener("mousemove", onMouseMove, { passive: true });
    container.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("scroll", debouncedCache, { passive: true });
    window.addEventListener("resize", debouncedCache);

    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("scroll", debouncedCache);
      window.removeEventListener("resize", debouncedCache);
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearTimeout(cacheTimer);
    };
  }, []);

  return null; // Render nothing — pure side-effect component
}
