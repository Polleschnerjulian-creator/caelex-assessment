"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos LightBars — animated amber light streaks for the stage
 * background. Identical algorithm to the Atlas-login bars (seeded
 * LCG so SSR/CSR parity holds and bars don't jump on hydration),
 * but tuned to fewer + warmer for the regulatory "lighthouse" feel.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef } from "react";
import styles from "./pharos-stage.module.css";

export function LightBars() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Fewer bars than Atlas (60 vs 100) — Pharos wants a calmer,
    // more deliberate atmosphere; the regulatory beacon is steady,
    // not a starfield.
    const COUNT = 60;
    const W_MIN = 1;
    const W_MAX = 2.4;
    const H_MIN = 12;
    const H_MAX = 50;
    const O_MIN = 0.2;
    const O_MAX = 0.78;
    const HEIGHT_DUR_MIN = 5;
    const HEIGHT_DUR_MAX = 11;
    const LIFE_DUR_MIN = 12;
    const LIFE_DUR_MAX = 24;
    const DELAY_MAX = 18;

    let seed = 17;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    container.innerHTML = "";
    for (let i = 0; i < COUNT; i++) {
      const bar = document.createElement("span");
      bar.className = styles.bar;

      const w = W_MIN + rnd() * (W_MAX - W_MIN);
      const h = H_MIN + rnd() * (H_MAX - H_MIN);
      const t = rnd() * (100 - h);
      const l = rnd() * 100;
      const o = O_MIN + rnd() * (O_MAX - O_MIN);
      const heightDur =
        HEIGHT_DUR_MIN + rnd() * (HEIGHT_DUR_MAX - HEIGHT_DUR_MIN);
      const lifeDur = LIFE_DUR_MIN + rnd() * (LIFE_DUR_MAX - LIFE_DUR_MIN);
      const delay = rnd() * DELAY_MAX;

      bar.style.setProperty("--w", `${w.toFixed(2)}px`);
      bar.style.setProperty("--h", `${h.toFixed(1)}%`);
      bar.style.setProperty("--t", `${t.toFixed(1)}%`);
      bar.style.setProperty("--l", `${l.toFixed(2)}%`);
      bar.style.setProperty("--o", o.toFixed(3));
      bar.style.setProperty("--dur", `${heightDur.toFixed(2)}s`);
      bar.style.setProperty("--life", `${lifeDur.toFixed(2)}s`);
      bar.style.setProperty("--delay", `-${delay.toFixed(2)}s`);

      container.appendChild(bar);
    }

    return () => {
      if (container) container.innerHTML = "";
    };
  }, []);

  return <div ref={containerRef} className={styles.bars} />;
}
