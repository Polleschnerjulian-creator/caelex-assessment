"use client";

import { useState } from "react";

interface ScoreSignal {
  key: string;
  label: string;
  points: number;
  reason?: string;
}

interface ScoreBreakdown {
  total: number;
  grade: "A" | "B" | "C" | "D" | "F";
  signals: ScoreSignal[];
  computedAt?: string;
}

interface LeadScoreBadgeProps {
  score: number;
  breakdown?: ScoreBreakdown | null;
  size?: "sm" | "md";
}

function getColorForScore(score: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (score >= 85)
    return {
      bg: "var(--accent-success-soft)",
      text: "var(--accent-success)",
      border: "var(--accent-success)",
    };
  if (score >= 70)
    return {
      bg: "var(--accent-primary-soft)",
      text: "var(--accent-primary)",
      border: "var(--accent-primary)",
    };
  if (score >= 50)
    return {
      bg: "var(--accent-info-soft)",
      text: "var(--accent-info)",
      border: "var(--accent-info)",
    };
  if (score >= 30)
    return {
      bg: "var(--accent-warning-soft)",
      text: "var(--accent-warning)",
      border: "var(--accent-warning)",
    };
  return {
    bg: "var(--surface-sunken)",
    text: "var(--text-tertiary)",
    border: "var(--border-default)",
  };
}

export default function LeadScoreBadge({
  score,
  breakdown,
  size = "md",
}: LeadScoreBadgeProps) {
  const [showPopover, setShowPopover] = useState(false);
  const colors = getColorForScore(score);
  const sizeClass =
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-small";

  const handleClick = (e: React.MouseEvent) => {
    if (breakdown?.signals?.length) {
      e.stopPropagation();
      e.preventDefault();
      setShowPopover((v) => !v);
    }
  };

  return (
    <span className="relative inline-flex">
      <span
        onClick={handleClick}
        className={`inline-flex items-center gap-1 rounded-full font-semibold border ${sizeClass} ${
          breakdown?.signals?.length ? "cursor-help" : ""
        }`}
        style={{
          background: colors.bg,
          color: colors.text,
          borderColor: `${colors.border}33`,
        }}
      >
        <span>{score}</span>
        {breakdown?.grade && (
          <span className="opacity-60">· {breakdown.grade}</span>
        )}
      </span>

      {showPopover && breakdown?.signals && breakdown.signals.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPopover(false)}
          />
          <div
            className="absolute z-50 left-0 top-full mt-2 w-[280px] rounded-xl border shadow-lg p-3"
            style={{
              background: "var(--surface-raised)",
              borderColor: "var(--border-default)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mb-2 pb-2 border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Score breakdown
                </p>
                <p className="text-small font-semibold text-[var(--text-primary)]">
                  {breakdown.total} / 100 ({breakdown.grade})
                </p>
              </div>
            </div>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {breakdown.signals.map((sig) => (
                <div
                  key={sig.key}
                  className="flex items-start justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-small text-[var(--text-primary)] truncate">
                      {sig.label}
                    </p>
                    {sig.reason && (
                      <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                        {sig.reason}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-small font-semibold flex-shrink-0 ${
                      sig.points >= 0
                        ? "text-[var(--accent-success)]"
                        : "text-[var(--accent-danger)]"
                    }`}
                  >
                    {sig.points >= 0 ? "+" : ""}
                    {sig.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </span>
  );
}
