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
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Usage</h3>

      <div className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <metric.icon className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{metric.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {metric.exceeded && (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span
                  className={`text-sm font-medium ${
                    metric.exceeded ? "text-amber-400" : "text-white"
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
            <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
              {metric.limit !== "unlimited" && (
                <div
                  className={`h-full rounded-full transition-all ${
                    metric.percentage >= 90
                      ? "bg-red-500"
                      : metric.percentage >= 70
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                />
              )}
            </div>

            {/* Warning */}
            {metric.exceeded && (
              <p className="text-xs text-amber-400 mt-1">
                You&apos;ve reached your limit. Upgrade for more.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
