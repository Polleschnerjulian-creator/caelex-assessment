"use client";

import type { EphemerisColors } from "../../theme";
import type { ComplianceEvent, SatelliteAlert } from "./types";

interface ComplianceTimelineProps {
  events: ComplianceEvent[];
  alerts: SatelliteAlert[];
  C: EphemerisColors;
}

function severityColor(sev: string, C: EphemerisColors): string {
  switch (sev) {
    case "CRITICAL":
      return C.critical;
    case "HIGH":
      return C.warning;
    case "MEDIUM":
      return C.watch;
    default:
      return C.textTertiary;
  }
}

interface TimelineItem {
  id: string;
  date: string;
  daysFromNow: number;
  severity: string;
  title: string;
  description: string;
  detail: string;
  regulationRef: string;
  kind: "event" | "alert";
}

export default function ComplianceTimeline({
  events,
  alerts,
  C,
}: ComplianceTimelineProps) {
  // Merge events + alerts into a unified sorted list
  const items: TimelineItem[] = [
    ...events.map((ev) => ({
      id: ev.id,
      date: ev.date,
      daysFromNow: ev.daysFromNow,
      severity: ev.severity,
      title: ev.regulationName,
      description: ev.description,
      detail: ev.recommendedAction,
      regulationRef: ev.regulationRef,
      kind: "event" as const,
    })),
    ...alerts.map((al) => ({
      id: al.id,
      date: al.triggeredAt,
      daysFromNow: Math.max(
        0,
        Math.round(
          (new Date(al.triggeredAt).getTime() - Date.now()) / 86400000,
        ),
      ),
      severity: al.severity,
      title: al.title,
      description: al.description,
      detail: al.regulationRef ?? "",
      regulationRef: al.regulationRef ?? "",
      kind: "alert" as const,
    })),
  ].sort((a, b) => a.daysFromNow - b.daysFromNow);

  if (items.length === 0) {
    return (
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: "40px 20px",
          textAlign: "center",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: 11,
            color: C.textMuted,
            letterSpacing: "0.06em",
          }}
        >
          NO UPCOMING EVENTS
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: C.textPrimary,
          }}
        >
          Timeline
        </span>
        <span
          style={{
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: 10,
            color: C.textMuted,
            padding: "2px 8px",
            borderRadius: 6,
            background: C.sunken,
          }}
        >
          {items.length}
        </span>
      </div>

      {/* Scrollable list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 0",
        }}
      >
        {items.map((item) => {
          const sevColor = severityColor(item.severity, C);
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                gap: 12,
                padding: "12px 18px",
                borderBottom: `1px solid ${C.border}`,
                transition: "background 0.12s ease",
                cursor: "default",
                position: "relative",
              }}
            >
              {/* Timeline dot + connector */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  paddingTop: 4,
                  gap: 0,
                  flexShrink: 0,
                  width: 12,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: sevColor,
                    boxShadow: `0 0 6px ${sevColor}30`,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    width: 1,
                    flex: 1,
                    background: C.border,
                    marginTop: 4,
                    minHeight: 12,
                  }}
                />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Top row: days + severity */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontSize: 13,
                      fontWeight: 700,
                      color: sevColor,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {item.daysFromNow}d
                  </span>
                  <span
                    style={{
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      color: sevColor,
                      padding: "1px 6px",
                      borderRadius: 4,
                      background: `${sevColor}10`,
                    }}
                  >
                    {item.severity}
                  </span>
                  {item.kind === "alert" && (
                    <span
                      style={{
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: "0.04em",
                        color: C.accent,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: `${C.accent}10`,
                      }}
                    >
                      ALERT
                    </span>
                  )}
                </div>

                {/* Title */}
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: C.textPrimary,
                    lineHeight: 1.35,
                    marginBottom: 2,
                  }}
                >
                  {item.title}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: 11,
                    color: C.textTertiary,
                    lineHeight: 1.4,
                  }}
                >
                  {item.description}
                </div>

                {/* Detail / recommended action */}
                {item.detail && (
                  <div
                    style={{
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontSize: 10,
                      color: C.textMuted,
                      marginTop: 4,
                    }}
                  >
                    {item.detail}
                  </div>
                )}

                {/* Date */}
                <div
                  style={{
                    fontFamily:
                      "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontSize: 9,
                    color: C.textMuted,
                    marginTop: 4,
                  }}
                >
                  {new Date(item.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
