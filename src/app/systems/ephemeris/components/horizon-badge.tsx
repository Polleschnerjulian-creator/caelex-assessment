"use client";

import AnimatedCounter from "./animated-counter";

interface HorizonBadgeProps {
  days: number;
  className?: string;
}

function getColor(days: number) {
  if (days < 90) return { text: "#EF4444", glow: "rgba(239,68,68,0.15)" };
  if (days < 365) return { text: "#F59E0B", glow: "rgba(245,158,11,0.15)" };
  return { text: "#10B981", glow: "rgba(16,185,129,0.12)" };
}

export default function HorizonBadge({
  days,
  className = "",
}: HorizonBadgeProps) {
  const color = getColor(days);

  return (
    <div
      className={`inline-flex items-baseline gap-4 ${className}`}
      style={{
        background: color.glow,
        borderRadius: "12px",
        padding: "16px 28px",
        border: `1px solid ${color.text}20`,
      }}
    >
      <AnimatedCounter
        target={days}
        duration={2500}
        className="font-mono font-bold tracking-tight"
        style={{
          fontSize: "clamp(48px, 8vw, 72px)",
          color: color.text,
          lineHeight: 1,
        }}
      />
      <span
        className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em]"
        style={{ color: `${color.text}99` }}
      >
        Days to First Breach
      </span>
    </div>
  );
}
