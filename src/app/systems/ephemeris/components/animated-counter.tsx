"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "../lib/use-in-view";

interface AnimatedCounterProps {
  target: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function AnimatedCounter({
  target,
  duration = 2000,
  className = "",
  style,
}: AnimatedCounterProps) {
  const { ref, inView } = useInView({ threshold: 0.5 });
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return (
    <span
      ref={ref}
      className={className}
      style={{ fontVariantNumeric: "tabular-nums", ...style }}
    >
      {value}
    </span>
  );
}
