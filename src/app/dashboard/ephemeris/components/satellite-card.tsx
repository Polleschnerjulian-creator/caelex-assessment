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
  if (score >= 70) return "text-[#111827]";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-[#F1F3F5]";
  if (score >= 50) return "bg-amber-50";
  return "bg-red-50";
}

function freshnessColor(freshness: string): string {
  switch (freshness) {
    case "LIVE":
      return "text-[#111827]";
    case "RECENT":
      return "text-[#4B5563]";
    case "STALE":
      return "text-amber-500";
    default:
      return "text-red-500";
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
          <h3 className="text-title font-medium text-[#111827]">
            {satellite.satelliteName}
          </h3>
          <p className="text-caption text-[#9CA3AF]">
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
        <Clock className="w-3.5 h-3.5 text-[#D1D5DB]" />
        {complianceHorizon.daysUntilFirstBreach !== null ? (
          <span
            className={
              complianceHorizon.daysUntilFirstBreach < 90
                ? "text-red-500"
                : complianceHorizon.daysUntilFirstBreach < 365
                  ? "text-amber-500"
                  : "text-[#4B5563]"
            }
          >
            {complianceHorizon.daysUntilFirstBreach} days to breach
          </span>
        ) : (
          <span className="text-[#9CA3AF]">No breach forecasted</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
        <div className="flex items-center gap-1.5">
          <Radio className={`w-3 h-3 ${freshnessColor(dataFreshness)}`} />
          <span className={`text-caption ${freshnessColor(dataFreshness)}`}>
            {dataFreshness}
          </span>
        </div>
        {criticalAlerts > 0 && (
          <div className="flex items-center gap-1 text-caption text-red-500">
            <AlertTriangle className="w-3 h-3" />
            {criticalAlerts} critical
          </div>
        )}
      </div>
    </GlassCard>
  );
}
