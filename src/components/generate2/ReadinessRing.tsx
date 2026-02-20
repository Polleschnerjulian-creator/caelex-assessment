"use client";

interface ReadinessRingProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ReadinessRing({
  score,
  size = 40,
  strokeWidth = 3,
  className = "",
}: ReadinessRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? "text-green-500"
      : score >= 40
        ? "text-amber-500"
        : "text-red-500";

  const bgColor =
    score >= 80
      ? "text-green-500/20"
      : score >= 40
        ? "text-amber-500/20"
        : "text-red-500/20";

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={`stroke-current ${bgColor}`}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`stroke-current ${color} transition-all duration-500`}
        />
      </svg>
      <span
        className={`absolute text-micro font-semibold ${color}`}
        style={{ fontSize: size < 36 ? 8 : 10 }}
      >
        {score}
      </span>
    </div>
  );
}
