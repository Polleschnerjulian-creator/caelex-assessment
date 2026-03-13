"use client";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

// Triskelion arm — three parallel bezier curves that taper from center to tip
const ARM_PATHS = [
  "M 29 36 C 24 25, 27.5 13, 30.5 4",
  "M 32 36 C 27 25, 30 13, 32 4",
  "M 35 36 C 30 25, 32.5 13, 33.5 4",
];

export function CaelexIcon({
  size = 24,
  className = "",
  "aria-hidden": ariaHidden,
}: {
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      fill="none"
      aria-hidden={ariaHidden ?? "true"}
    >
      {[0, 120, 240].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 32 36)`}>
          {ARM_PATHS.map((d, i) => (
            <path
              key={i}
              d={d}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export default function Logo({
  size = 24,
  showWordmark = true,
  className = "",
}: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <CaelexIcon size={size} className="text-current" />
      {showWordmark && (
        <span
          className="font-medium tracking-[-0.02em]"
          style={{ fontSize: size * 0.9 }}
        >
          caelex
        </span>
      )}
    </div>
  );
}
