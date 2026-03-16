"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getGenerationSnapshot,
  subscribeGeneration,
} from "@/lib/generation-store";

/** Inject keyframe once into <head> */
let injected = false;
function injectKeyframes() {
  if (injected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes gen-ring-pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
    @keyframes gen-ring-appear {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  injected = true;
}

/**
 * Animated progress ring that wraps around the Astra FAB button.
 * Shows generation progress as a circular arc with percentage text.
 *
 * Uses SVG stroke-dashoffset for the arc and CSS transitions for smooth animation.
 * The ring only renders when a generation is active.
 */
export function GenerationProgressRing({
  children,
  size = 68,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  const gen = useSyncExternalStore(
    subscribeGeneration,
    getGenerationSnapshot,
    // SSR snapshot — never active on server
    () => ({ ...getGenerationSnapshot(), active: false }),
  );

  useEffect(() => {
    if (gen.active) injectKeyframes();
  }, [gen.active]);

  if (!gen.active) {
    return <>{children}</>;
  }

  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (gen.progress / 100) * circumference;

  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
        animation: "gen-ring-appear 0.3s ease-out",
      }}
    >
      {/* Track (background circle) */}
      <svg
        className="absolute inset-0"
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gen-ring-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
        <defs>
          <linearGradient
            id="gen-ring-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
      </svg>

      {/* Pulsing glow when active */}
      <div
        className="absolute inset-0 rounded-[18px]"
        style={{
          boxShadow: "0 0 12px rgba(16, 185, 129, 0.25)",
          animation: "gen-ring-pulse 2s ease-in-out infinite",
        }}
      />

      {/* The actual button (centered) */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          top: (size - 56) / 2,
          left: (size - 56) / 2,
          width: 56,
          height: 56,
        }}
      >
        {children}
      </div>

      {/* Percentage badge */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          top: -4,
          right: -4,
          width: 24,
          height: 24,
          borderRadius: 12,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          fontSize: 9,
          fontWeight: 700,
          color: "#059669",
          letterSpacing: "-0.02em",
        }}
      >
        {gen.progress}%
      </div>
    </div>
  );
}
