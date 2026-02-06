"use client";

import { Users, Rocket, HardDrive, AlertTriangle } from "lucide-react";

interface UsageMetric {
  current: number;
  limit: number | "unlimited";
  exceeded: boolean;
  percentage: number;
}

interface UsageMetricsProps {
  users: UsageMetric;
  spacecraft: UsageMetric;
  storage?: UsageMetric;
}

export default function UsageMetrics({
  users,
  spacecraft,
  storage,
}: UsageMetricsProps) {
  const metrics = [
    {
      label: "Team Members",
      icon: Users,
      ...users,
    },
    {
      label: "Spacecraft",
      icon: Rocket,
      ...spacecraft,
    },
    ...(storage
      ? [
          {
            label: "Storage",
            icon: HardDrive,
            ...storage,
            suffix: "GB",
          },
        ]
      : []),
  ];

  const formatLimit = (limit: number | "unlimited") => {
    return limit === "unlimited" ? "\u221E" : limit.toString();
  };

  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-white/70 mb-5">
        Usage
      </h3>

      <div className="space-y-5">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <metric.icon className="w-4 h-4 text-slate-400 dark:text-white/40" />
                <span className="text-[13px] text-slate-600 dark:text-white/60">
                  {metric.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {metric.exceeded && (
                  <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                )}
                <span
                  className={`text-[13px] font-medium ${
                    metric.exceeded
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-900 dark:text-white"
                  }`}
                >
                  {metric.current}
                  {"suffix" in metric ? ` ${metric.suffix}` : ""} /{" "}
                  {formatLimit(metric.limit)}
                  {"suffix" in metric ? ` ${metric.suffix}` : ""}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
              {metric.limit !== "unlimited" && (
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    metric.percentage >= 90
                      ? "bg-red-500"
                      : metric.percentage >= 70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                />
              )}
            </div>

            {/* Warning */}
            {metric.exceeded && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">
                You&apos;ve reached your limit. Upgrade for more.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
