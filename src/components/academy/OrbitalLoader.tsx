"use client";

import { motion } from "framer-motion";

// ─── Types ───

interface OrbitalLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

// ─── Size Config ───

const SIZE_CONFIG: Record<
  "sm" | "md" | "lg",
  {
    svg: number;
    orbitRadius: number;
    planetRadius: number;
    dotRadius: number;
    trailWidth: number;
  }
> = {
  sm: {
    svg: 48,
    orbitRadius: 18,
    planetRadius: 4,
    dotRadius: 3,
    trailWidth: 1.5,
  },
  md: {
    svg: 72,
    orbitRadius: 28,
    planetRadius: 5,
    dotRadius: 4,
    trailWidth: 2,
  },
  lg: {
    svg: 96,
    orbitRadius: 38,
    planetRadius: 7,
    dotRadius: 5,
    trailWidth: 2.5,
  },
};

const MESSAGE_SIZES: Record<"sm" | "md" | "lg", string> = {
  sm: "text-caption",
  md: "text-body",
  lg: "text-body-lg",
};

// ─── Component ───

export default function OrbitalLoader({
  message,
  size = "md",
}: OrbitalLoaderProps) {
  const config = SIZE_CONFIG[size];
  const center = config.svg / 2;

  return (
    <div className="inline-flex flex-col items-center gap-3">
      <div className="relative">
        <svg
          width={config.svg}
          height={config.svg}
          viewBox={`0 0 ${config.svg} ${config.svg}`}
          aria-hidden="true"
        >
          <defs>
            {/* Glow filter for the orbiting dot */}
            <filter
              id={`orbital-glow-${size}`}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
            </filter>

            {/* Gradient for the orbit trail */}
            <linearGradient
              id={`orbit-trail-${size}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Orbit ring (faint) */}
          <circle
            cx={center}
            cy={center}
            r={config.orbitRadius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={config.trailWidth}
          />

          {/* Center planet */}
          <circle
            cx={center}
            cy={center}
            r={config.planetRadius}
            className="fill-white/20"
          />
          <circle
            cx={center}
            cy={center}
            r={config.planetRadius * 0.6}
            className="fill-white/10"
          />

          {/* Orbiting dot with emerald glow */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ transformOrigin: `${center}px ${center}px` }}
          >
            {/* Glow trail */}
            <circle
              cx={center + config.orbitRadius}
              cy={center}
              r={config.dotRadius * 2.5}
              fill="#10B981"
              opacity={0.15}
              filter={`url(#orbital-glow-${size})`}
            />

            {/* Main dot */}
            <circle
              cx={center + config.orbitRadius}
              cy={center}
              r={config.dotRadius}
              fill="#10B981"
            />

            {/* Bright center of dot */}
            <circle
              cx={center + config.orbitRadius}
              cy={center}
              r={config.dotRadius * 0.4}
              fill="#34D399"
            />
          </motion.g>
        </svg>

        {/* Pulsing outer ring effect */}
        <motion.div
          className="absolute inset-0 rounded-full border border-emerald-500/10"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Loading message */}
      {message && (
        <motion.p
          className={`${MESSAGE_SIZES[size]} text-white/40`}
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
