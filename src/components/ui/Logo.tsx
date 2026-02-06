"use client";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export function CaelexIcon({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  // Scale factor based on size (designed at 64px base)
  const scale = size / 64;
  const strokeWidth = Math.max(4 * scale, 2);
  const dotRadius = Math.max(4 * scale, 2);

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      fill="none"
    >
      <path
        d="M 32 12 L 32 36"
        stroke="currentColor"
        strokeWidth={strokeWidth / scale}
        strokeLinecap="round"
      />
      <path
        d="M 32 36 L 52 52"
        stroke="currentColor"
        strokeWidth={strokeWidth / scale}
        strokeLinecap="round"
      />
      <path
        d="M 32 36 L 12 52"
        stroke="currentColor"
        strokeWidth={strokeWidth / scale}
        strokeLinecap="round"
      />
      <circle cx="32" cy="36" r={dotRadius / scale} fill="currentColor" />
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
