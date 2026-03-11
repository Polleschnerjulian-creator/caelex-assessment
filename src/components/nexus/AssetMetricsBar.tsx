"use client";

import { motion } from "framer-motion";
import { Layers, CheckCircle2, AlertTriangle, Bug } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { glassItemVariants } from "@/components/ui/GlassMotion";

interface AssetMetrics {
  totalAssets: number;
  avgComplianceScore: number;
  criticalRiskCount: number;
  openVulnerabilities: number;
}

interface AssetMetricsBarProps {
  metrics: AssetMetrics;
}

interface MetricCardConfig {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor: string;
  trend?: { value: number; direction: "up" | "down" | "neutral" };
}

export default function AssetMetricsBar({ metrics }: AssetMetricsBarProps) {
  const cards: MetricCardConfig[] = [
    {
      label: "Total Assets",
      value: metrics.totalAssets,
      icon: <Layers size={20} strokeWidth={1.5} />,
      iconColor: "text-emerald-500",
    },
    {
      label: "Avg Compliance Score",
      value: `${metrics.avgComplianceScore.toFixed(1)}%`,
      icon: <CheckCircle2 size={20} strokeWidth={1.5} />,
      iconColor:
        metrics.avgComplianceScore >= 80
          ? "text-emerald-500"
          : metrics.avgComplianceScore >= 60
            ? "text-amber-500"
            : "text-red-500",
      trend:
        metrics.avgComplianceScore >= 80
          ? { value: metrics.avgComplianceScore, direction: "up" }
          : metrics.avgComplianceScore < 60
            ? { value: metrics.avgComplianceScore, direction: "down" }
            : { value: metrics.avgComplianceScore, direction: "neutral" },
    },
    {
      label: "Critical Risk Assets",
      value: metrics.criticalRiskCount,
      icon: <AlertTriangle size={20} strokeWidth={1.5} />,
      iconColor:
        metrics.criticalRiskCount > 0 ? "text-red-500" : "text-slate-400",
      trend:
        metrics.criticalRiskCount > 0
          ? { value: metrics.criticalRiskCount, direction: "down" }
          : undefined,
    },
    {
      label: "Open Vulnerabilities",
      value: metrics.openVulnerabilities,
      icon: <Bug size={20} strokeWidth={1.5} />,
      iconColor:
        metrics.openVulnerabilities > 0 ? "text-amber-500" : "text-slate-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div key={card.label} variants={glassItemVariants} custom={i}>
          <GlassCard hover className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-caption text-slate-400 uppercase tracking-wider truncate">
                  {card.label}
                </p>
                <p className="text-display-sm font-semibold text-white mt-1">
                  {card.value}
                </p>
                {card.trend && (
                  <p
                    className={`text-small mt-1 ${
                      card.trend.direction === "up"
                        ? "text-emerald-500"
                        : card.trend.direction === "down"
                          ? "text-red-500"
                          : "text-slate-400"
                    }`}
                  >
                    {card.trend.direction === "up"
                      ? "Good standing"
                      : card.trend.direction === "down"
                        ? "Needs attention"
                        : "Moderate"}
                  </p>
                )}
              </div>
              <div className={`ml-3 flex-shrink-0 ${card.iconColor}`}>
                {card.icon}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}
