"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * MiniOrb — small decorative Atlas signature for the top-left corner
 * of the pinboard workspace. Pure CSS (no Three.js) — running the full
 * shader entity at ~40px would waste GPU cycles and look noisy at that
 * size. The visual language — emerald core + slow pulse — is the same.
 *
 * `active` switches the pulse tempo (faster while Claude is thinking).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

interface MiniOrbProps {
  active?: boolean;
  size?: number;
}

export function MiniOrb({ active = false, size = 32 }: MiniOrbProps) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Outer glow ring — always pulsing slowly */}
      <div
        className={`absolute inset-0 rounded-full bg-emerald-400/30 blur-md ${
          active ? "animate-pulse-fast" : "animate-pulse-slow"
        }`}
      />
      {/* Core — radial gradient */}
      <div
        className="absolute inset-[15%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, rgba(16,185,129,0.95) 0%, rgba(5,150,105,0.85) 45%, rgba(4,120,87,0.5) 100%)",
          boxShadow:
            "inset 0 0 6px rgba(255,255,255,0.4), 0 0 12px rgba(16,185,129,0.4)",
        }}
      />
      {/* Specular highlight */}
      <div
        className="absolute rounded-full"
        style={{
          top: "18%",
          left: "22%",
          width: "28%",
          height: "28%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 70%)",
        }}
      />

      <style jsx>{`
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.45;
            transform: scale(1);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.08);
          }
        }
        @keyframes pulse-fast {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-pulse-fast {
          animation: pulse-fast 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
