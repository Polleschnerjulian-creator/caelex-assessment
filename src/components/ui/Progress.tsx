"use client";

interface ProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showValue?: boolean;
  color?: "emerald" | "blue" | "amber" | "red" | "white";
  label?: string;
  className?: string;
}

const colors = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  white: "bg-white",
};

const heights = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

export function Progress({
  value,
  max = 100,
  size = "md",
  showLabel = false,
  showValue = false,
  color = "emerald",
  label = "Progress",
  className = "",
}: ProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`space-y-1.5 ${className}`}>
      {(showLabel || showValue) && (
        <div className="flex justify-between items-center text-[12px]">
          {showLabel && <span className="text-white/60">{label}</span>}
          {showValue && (
            <span className="text-white/80 font-medium tabular-nums">
              {Math.round(percent)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full bg-white/10 rounded-full overflow-hidden ${heights[size]}`}
      >
        <div
          className={`
            ${colors[color]} ${heights[size]}
            rounded-full
            transition-all duration-500 ease-out
          `}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}

// Circular Progress
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: "emerald" | "blue" | "amber" | "red";
  showValue?: boolean;
  className?: string;
}

const circleColors = {
  emerald: "stroke-emerald-500",
  blue: "stroke-blue-500",
  amber: "stroke-amber-500",
  red: "stroke-red-500",
};

export function CircularProgress({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  color = "emerald",
  showValue = true,
  className = "",
}: CircularProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-white/10 fill-none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={`${circleColors[color]} fill-none transition-all duration-500 ease-out`}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      {showValue && (
        <span className="absolute text-[12px] font-medium text-white tabular-nums">
          {Math.round(percent)}%
        </span>
      )}
    </div>
  );
}
