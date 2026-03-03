"use client";

import { Clock, Shield, AlertTriangle } from "lucide-react";

interface ComplianceHorizonDisplayProps {
  horizon: {
    daysUntilFirstBreach: number | null;
    firstBreachRegulation: string | null;
    firstBreachType?: string | null;
    confidence: string;
  };
}

export default function ComplianceHorizonDisplay({
  horizon,
}: ComplianceHorizonDisplayProps) {
  const days = horizon.daysUntilFirstBreach;
  const isUrgent = days !== null && days < 90;
  const isWarning = days !== null && days < 365;

  return (
    <div
      className={`p-6 rounded-xl border ${
        isUrgent
          ? "bg-red-500/5 border-red-500/20"
          : isWarning
            ? "bg-amber-500/5 border-amber-500/20"
            : "bg-emerald-500/5 border-emerald-500/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock
              className={`w-5 h-5 ${
                isUrgent
                  ? "text-red-400"
                  : isWarning
                    ? "text-amber-400"
                    : "text-emerald-400"
              }`}
            />
            <span className="text-small font-medium text-white/60 uppercase tracking-wider">
              Compliance Horizon
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span
              className={`text-[48px] font-bold leading-none ${
                isUrgent
                  ? "text-red-400"
                  : isWarning
                    ? "text-amber-400"
                    : "text-emerald-400"
              }`}
            >
              {days !== null ? days.toLocaleString() : "∞"}
            </span>
            <span className="text-body-lg text-white/40">
              {days !== null
                ? "days until first breach"
                : "No breach forecasted"}
            </span>
          </div>
        </div>

        {days !== null && horizon.firstBreachRegulation && (
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end mb-1">
              {isUrgent ? (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              ) : (
                <Shield className="w-4 h-4 text-white/30" />
              )}
              <span className="text-small text-white/50">First breach</span>
            </div>
            <p className="text-body font-mono text-white/70">
              {horizon.firstBreachRegulation}
            </p>
            <p className="text-caption text-white/30 mt-0.5">
              Confidence: {horizon.confidence}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
