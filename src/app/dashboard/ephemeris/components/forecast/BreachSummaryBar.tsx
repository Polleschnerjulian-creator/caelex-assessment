"use client";

import type { EphemerisColors } from "../../theme";

interface BreachSummaryBarProps {
  horizonDays: number | null;
  horizonRegulation: string | null;
  horizonConfidence: string;
  C: EphemerisColors;
}

function getSeverity(days: number | null): {
  level: string;
  label: string;
} {
  if (days === null) return { level: "NOMINAL", label: "NOMINAL" };
  if (days <= 30) return { level: "CRITICAL", label: "CRITICAL" };
  if (days <= 90) return { level: "HIGH", label: "HIGH" };
  if (days <= 180) return { level: "MEDIUM", label: "MEDIUM" };
  return { level: "LOW", label: "LOW" };
}

export default function BreachSummaryBar({
  horizonDays,
  horizonRegulation,
  horizonConfidence,
  C,
}: BreachSummaryBarProps) {
  const hasBreach = horizonDays !== null;
  const severity = getSeverity(horizonDays);

  const severityColor = (() => {
    switch (severity.level) {
      case "CRITICAL":
        return C.critical;
      case "HIGH":
        return C.warning;
      case "MEDIUM":
        return C.watch;
      default:
        return C.nominal;
    }
  })();

  const bgColor = hasBreach ? `${severityColor}08` : `${C.nominal}08`;

  const borderColor = hasBreach ? `${severityColor}20` : `${C.nominal}20`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
        borderRadius: 12,
        background: bgColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Status indicator */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: hasBreach ? severityColor : C.nominal,
            boxShadow: `0 0 8px ${hasBreach ? severityColor : C.nominal}40`,
            flexShrink: 0,
          }}
        />

        {hasBreach ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: C.textSecondary,
              }}
            >
              Predicted breach in
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 20,
                fontWeight: 700,
                color: severityColor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {horizonDays}
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: C.textSecondary,
              }}
            >
              days
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: C.textMuted,
                marginLeft: 8,
              }}
            >
              · {horizonRegulation}
            </span>
          </div>
        ) : (
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              color: C.nominal,
              fontWeight: 500,
            }}
          >
            No breaches predicted within forecast horizon
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Confidence badge */}
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.06em",
            color: C.textMuted,
            padding: "3px 8px",
            borderRadius: 6,
            background: `${C.textMuted}10`,
          }}
        >
          {horizonConfidence} CONF.
        </span>

        {/* Severity badge */}
        {hasBreach && (
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: severityColor,
              padding: "3px 10px",
              borderRadius: 6,
              background: `${severityColor}12`,
            }}
          >
            {severity.label}
          </span>
        )}
      </div>
    </div>
  );
}
