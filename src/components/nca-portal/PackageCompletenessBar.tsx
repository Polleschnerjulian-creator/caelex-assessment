"use client";

interface PackageCompletenessBarProps {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function PackageCompletenessBar({
  score,
  showLabel = true,
  size = "md",
}: PackageCompletenessBarProps) {
  const getColor = (s: number) => {
    if (s >= 80) return "bg-emerald-500";
    if (s >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getTextColor = (s: number) => {
    if (s >= 80) return "text-emerald-400";
    if (s >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const heightClass = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Package Completeness
          </span>
          <span className={`text-xs font-medium ${getTextColor(score)}`}>
            {score}%
          </span>
        </div>
      )}
      <div
        className={`w-full ${heightClass} bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden`}
      >
        <div
          className={`${heightClass} ${getColor(score)} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}
