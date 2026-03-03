"use client";

import { AlertTriangle, Clock, Radio } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

interface SatelliteCardProps {
  satellite: {
    noradId: string;
    satelliteName: string;
    overallScore: number;
    dataFreshness: string;
    complianceHorizon: {
      daysUntilFirstBreach: number | null;
      firstBreachRegulation: string | null;
      confidence: string;
    };
    activeAlerts: Array<{
      id: string;
      severity: string;
    }>;
  };
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-emerald-500/10";
  if (score >= 50) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function freshnessColor(freshness: string): string {
  switch (freshness) {
    case "LIVE":
      return "text-emerald-400";
    case "RECENT":
      return "text-blue-400";
    case "STALE":
      return "text-amber-400";
    default:
      return "text-red-400";
  }
}

export default function SatelliteCard({ satellite }: SatelliteCardProps) {
  const { overallScore, complianceHorizon, activeAlerts, dataFreshness } =
    satellite;
  const criticalAlerts = activeAlerts.filter(
    (a) => a.severity === "CRITICAL",
  ).length;

  return (
    <GlassCard
      hover
      highlighted={overallScore < 50}
      className="p-5 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-title font-medium text-white">
            {satellite.satelliteName}
          </h3>
          <p className="text-caption text-white/40">
            NORAD {satellite.noradId}
          </p>
        </div>
        <div
          className={`px-3 py-1.5 rounded-lg text-heading font-bold ${scoreColor(overallScore)} ${scoreBg(overallScore)}`}
        >
          {overallScore}
        </div>
      </div>

      {/* Compliance Horizon */}
      <div className="flex items-center gap-2 mb-3 text-small">
        <Clock className="w-3.5 h-3.5 text-white/30" />
        {complianceHorizon.daysUntilFirstBreach !== null ? (
          <span
            className={
              complianceHorizon.daysUntilFirstBreach < 90
                ? "text-red-400"
                : complianceHorizon.daysUntilFirstBreach < 365
                  ? "text-amber-400"
                  : "text-white/60"
            }
          >
            {complianceHorizon.daysUntilFirstBreach} days to breach
          </span>
        ) : (
          <span className="text-emerald-400/70">No breach forecasted</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <Radio className={`w-3 h-3 ${freshnessColor(dataFreshness)}`} />
          <span className={`text-caption ${freshnessColor(dataFreshness)}`}>
            {dataFreshness}
          </span>
        </div>
        {criticalAlerts > 0 && (
          <div className="flex items-center gap-1 text-caption text-red-400">
            <AlertTriangle className="w-3 h-3" />
            {criticalAlerts} critical
          </div>
        )}
      </div>
    </GlassCard>
  );
}
