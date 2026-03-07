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
  if (score >= 70) return "text-[var(--text-primary)]";
  if (score >= 50) return "text-[var(--accent-warning)]";
  return "text-[var(--accent-danger)]";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-[var(--fill-light)]";
  if (score >= 50) return "bg-[var(--accent-warning-soft)]";
  return "bg-[var(--accent-danger-soft)]";
}

function freshnessColor(freshness: string): string {
  switch (freshness) {
    case "LIVE":
      return "text-[var(--text-primary)]";
    case "RECENT":
      return "text-[var(--text-secondary)]";
    case "STALE":
      return "text-[var(--accent-warning)]";
    default:
      return "text-[var(--accent-danger)]";
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
          <h3 className="text-title font-medium text-[var(--text-primary)]">
            {satellite.satelliteName}
          </h3>
          <p className="text-caption text-[var(--text-tertiary)]">
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
        <Clock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        {complianceHorizon.daysUntilFirstBreach !== null ? (
          <span
            className={
              complianceHorizon.daysUntilFirstBreach < 90
                ? "text-[var(--accent-danger)]"
                : complianceHorizon.daysUntilFirstBreach < 365
                  ? "text-[var(--accent-warning)]"
                  : "text-[var(--text-secondary)]"
            }
          >
            {complianceHorizon.daysUntilFirstBreach} days to breach
          </span>
        ) : (
          <span className="text-[var(--text-tertiary)]">
            No breach forecasted
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--separator-strong)]">
        <div className="flex items-center gap-1.5">
          <Radio className={`w-3 h-3 ${freshnessColor(dataFreshness)}`} />
          <span className={`text-caption ${freshnessColor(dataFreshness)}`}>
            {dataFreshness}
          </span>
        </div>
        {criticalAlerts > 0 && (
          <div className="flex items-center gap-1 text-caption text-[var(--accent-danger)]">
            <AlertTriangle className="w-3 h-3" />
            {criticalAlerts} critical
          </div>
        )}
      </div>
    </GlassCard>
  );
}
