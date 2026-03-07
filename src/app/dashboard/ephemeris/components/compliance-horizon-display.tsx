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
          ? "bg-[var(--accent-danger-soft)] border-[var(--accent-danger)]"
          : isWarning
            ? "bg-[var(--accent-warning-soft)] border-[var(--accent-warning)]"
            : "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)]"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock
              className={`w-5 h-5 ${
                isUrgent
                  ? "text-[var(--accent-danger)]"
                  : isWarning
                    ? "text-[var(--accent-warning)]"
                    : "text-[var(--text-primary)]"
              }`}
            />
            <span className="text-small font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Compliance Horizon
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span
              className={`text-[48px] font-bold leading-none ${
                isUrgent
                  ? "text-[var(--accent-danger)]"
                  : isWarning
                    ? "text-[var(--accent-warning)]"
                    : "text-[var(--text-primary)]"
              }`}
            >
              {days !== null ? days.toLocaleString() : "\u221E"}
            </span>
            <span className="text-body-lg text-[var(--text-tertiary)]">
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
                <AlertTriangle className="w-4 h-4 text-[var(--accent-danger)]" />
              ) : (
                <Shield className="w-4 h-4 text-[var(--text-tertiary)]" />
              )}
              <span className="text-small text-[var(--text-secondary)]">
                First breach
              </span>
            </div>
            <p className="text-body font-mono text-[var(--text-secondary)]">
              {horizon.firstBreachRegulation}
            </p>
            <p className="text-caption text-[var(--text-tertiary)] mt-0.5">
              Confidence: {horizon.confidence}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
