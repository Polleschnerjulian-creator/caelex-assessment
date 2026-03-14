"use client";

import type { EphemerisColors } from "../../theme";
import type { TimeRange } from "./types";

interface ForecastHeaderProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  onRecalculate: () => void;
  isRecalculating: boolean;
  calculatedAt: string | null;
  C: EphemerisColors;
}

const RANGES: TimeRange[] = ["30D", "90D", "180D", "1Y", "5Y"];

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ForecastHeader({
  selectedRange,
  onRangeChange,
  onRecalculate,
  isRecalculating,
  calculatedAt,
  C,
}: ForecastHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
      }}
    >
      {/* Time Range Segmented Control */}
      <div
        style={{
          display: "flex",
          background: C.sunken,
          borderRadius: 10,
          padding: 3,
          gap: 2,
        }}
      >
        {RANGES.map((range) => {
          const isActive = selectedRange === range;
          return (
            <button
              key={range}
              onClick={() => onRangeChange(range)}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                padding: "6px 14px",
                borderRadius: 8,
                border: "none",
                background: isActive ? C.bg : "transparent",
                color: isActive ? C.textPrimary : C.textMuted,
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {range}
            </button>
          );
        })}
      </div>

      {/* Right side: timestamp + recalculate */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {calculatedAt && (
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: C.textMuted,
              letterSpacing: "0.04em",
            }}
          >
            Calculated {formatTimeAgo(calculatedAt)}
          </span>
        )}
        <button
          onClick={onRecalculate}
          disabled={isRecalculating}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            fontWeight: 500,
            padding: "7px 14px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: C.bg,
            color: isRecalculating ? C.textMuted : C.textSecondary,
            cursor: isRecalculating ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              animation: isRecalculating ? "spin 1s linear infinite" : "none",
            }}
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          {isRecalculating ? "Calculating..." : "Recalculate"}
        </button>
      </div>
    </div>
  );
}
