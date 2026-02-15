"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const EntityScene = dynamic(() => import("./EntityScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="w-32 h-32 rounded-full animate-pulse"
        style={{
          background:
            "radial-gradient(circle, rgba(139, 159, 255, 0.1) 0%, transparent 70%)",
        }}
      />
    </div>
  ),
});

// Article references that orbit the entity
const DATA_FRAGMENTS = [
  "Art.4 Authorization",
  "Art.18 Debris",
  "Art.27 Cyber",
  "Art.31 Data",
  "Art.45 Insurance",
  "Art.52 Spectrum",
  "Art.67 Penalties",
  "Annex II",
  "Art.12 Supervision",
  "Art.38 EFD",
  "Art.71 Fees",
  "Art.9 Obligations",
  "COM(2025)335",
  "Annex IV",
  "Art.55 Coordination",
  "Art.62 Registry",
  "Art.22 Notification",
  "Art.33 Encryption",
  "Art.48 Liability",
  "Art.74 Review",
  "Art.6 Scope",
  "Art.15 Transfer",
  "Art.29 Incident",
  "Art.41 Reporting",
];

interface DataStreamProps {
  text: string;
  index: number;
  total: number;
}

function DataStream({ text, index, total }: DataStreamProps) {
  const [isFlashing, setIsFlashing] = useState(false);

  // Random flash effect - very rare
  useEffect(() => {
    const flashInterval = setInterval(() => {
      if (Math.random() < 0.01) {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 400);
      }
    }, 2000);

    return () => clearInterval(flashInterval);
  }, []);

  // Calculate orbit parameters - responsive radii
  const radiusBase = 140 + (index % 5) * 35; // 140-280px (smaller for mobile)
  const duration = 25 + ((index * 1.5) % 35); // 25-60s (slower)
  const delay = -(index / total) * duration;
  // Nearly invisible: 0.01 to 0.05 max
  const baseOpacity = 0.01 + Math.random() * 0.04;

  return (
    <span
      className="absolute whitespace-nowrap font-mono text-[10px] text-white transition-opacity duration-500"
      style={{
        opacity: isFlashing ? 0.06 : baseOpacity,
        left: "50%",
        top: "50%",
        animation: `orbit${index % 4} ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        ["--radius" as string]: `${radiusBase}px`,
        ["--radius-y" as string]: `${radiusBase * 0.4}px`,
      }}
    >
      {text}
    </span>
  );
}

// NO MOUSE INTERACTION - Entity is autonomous
export default function Entity() {
  return (
    <div
      className="relative w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] md:w-[400px] md:h-[400px] lg:w-[700px] lg:h-[700px]"
      role="img"
      aria-label="Decorative 3D visualization of the EU Space Act regulatory framework, showing articles organized as orbiting data nodes within a rotating particle cube structure"
    >
      {/* Inline styles for orbit animations */}
      <style jsx>{`
        @keyframes orbit0 {
          from {
            transform: translate(-50%, -50%) rotateX(60deg) rotate(0deg)
              translateX(var(--radius)) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotateX(60deg) rotate(360deg)
              translateX(var(--radius)) rotate(-360deg);
          }
        }
        @keyframes orbit1 {
          from {
            transform: translate(-50%, -50%) rotateX(65deg) rotate(90deg)
              translateX(var(--radius)) rotate(-90deg);
          }
          to {
            transform: translate(-50%, -50%) rotateX(65deg) rotate(450deg)
              translateX(var(--radius)) rotate(-450deg);
          }
        }
        @keyframes orbit2 {
          from {
            transform: translate(-50%, -50%) rotateX(55deg) rotate(180deg)
              translateX(var(--radius)) rotate(-180deg);
          }
          to {
            transform: translate(-50%, -50%) rotateX(55deg) rotate(540deg)
              translateX(var(--radius)) rotate(-540deg);
          }
        }
        @keyframes orbit3 {
          from {
            transform: translate(-50%, -50%) rotateX(70deg) rotate(270deg)
              translateX(var(--radius)) rotate(-270deg);
          }
          to {
            transform: translate(-50%, -50%) rotateX(70deg) rotate(630deg)
              translateX(var(--radius)) rotate(-630deg);
          }
        }
        @keyframes pulseRing {
          0% {
            transform: translate(-50%, -50%) scale(0.3);
            opacity: 0.06;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.8);
            opacity: 0;
          }
        }
        @keyframes scanLine {
          0%,
          100% {
            transform: translateX(-50%) translateY(-250px);
          }
          50% {
            transform: translateX(-50%) translateY(250px);
          }
        }
        @keyframes auraPulse {
          0%,
          100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>

      {/* AURA — Massive ambient glow behind everything */}
      <div
        className="absolute pointer-events-none"
        aria-hidden="true"
        style={{
          inset: "-300px",
          background: `
            radial-gradient(circle at 50% 50%, rgba(139,159,255,0.08) 0%, transparent 30%),
            radial-gradient(circle at 50% 50%, rgba(139,159,255,0.04) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 70%)
          `,
          animation: "auraPulse 4s ease-in-out infinite",
        }}
      />

      {/* Three.js Canvas — Autonomous particle cube */}
      <div className="absolute inset-0 z-10" aria-hidden="true">
        <EntityScene />
      </div>

      {/* DATA STREAMS — Orbiting text fragments (very subtle) */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        aria-hidden="true"
        style={{ perspective: "1000px" }}
      >
        {DATA_FRAGMENTS.map((text, index) => (
          <DataStream
            key={text}
            text={text}
            index={index}
            total={DATA_FRAGMENTS.length}
          />
        ))}
      </div>

      {/* ENERGY PULSES — Expanding rings */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        aria-hidden="true"
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 w-[250px] h-[250px] rounded-full"
            style={{
              border: "1px solid rgba(255,255,255,0.025)",
              animation: "pulseRing 5s ease-out infinite",
              animationDelay: `${i * 1.25}s`,
            }}
          />
        ))}
      </div>

      {/* SCAN LINE — Horizontal sweeping line */}
      <div
        className="absolute left-1/2 top-1/2 w-[50%] h-[1px] pointer-events-none z-20"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
          animation: "scanLine 10s ease-in-out infinite",
        }}
      />
    </div>
  );
}
