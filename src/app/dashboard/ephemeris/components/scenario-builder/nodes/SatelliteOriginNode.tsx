"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Satellite } from "lucide-react";
import { useForgeTheme, MONO_FONT } from "../../../theme";
import type { SatelliteOriginData } from "../types";

function getScoreColor(score: number, forge: any): string {
  if (score >= 85) return forge.nominal;
  if (score >= 70) return forge.watch;
  if (score >= 50) return forge.warning;
  return forge.critical;
}

function getScoreLabel(score: number): string {
  if (score >= 85) return "NOMINAL";
  if (score >= 70) return "WATCH";
  if (score >= 50) return "WARNING";
  return "CRITICAL";
}

// ─── Score Ring (dark mode glassmorphism) ─────────────────────────────────────

function ScoreRing({
  score,
  status,
  color,
}: {
  score: number;
  status: string;
  color: string;
}) {
  const circumference = 2 * Math.PI * 54;
  const progress = (score / 100) * circumference;

  return (
    <div style={{ position: "relative", width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="6"
        />
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{
            transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)",
            filter: `drop-shadow(0 0 8px ${color}50)`,
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 36,
            fontWeight: 700,
            color,
            fontFamily: MONO_FONT,
            letterSpacing: -1,
            lineHeight: 1,
          }}
        >
          {score}
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 2.5,
            color,
            marginTop: 4,
            textTransform: "uppercase",
          }}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

function SatelliteOriginNode({ data }: NodeProps) {
  const { forge, glass, isDark } = useForgeTheme();

  const d = data as unknown as SatelliteOriginData;
  const score = d.overallScore;
  const scoreColor =
    score !== null ? getScoreColor(score, forge) : forge.textMuted;
  const scoreLabel = score !== null ? getScoreLabel(score) : "—";
  const horizonText = d.horizonDays !== null ? `${d.horizonDays}d` : "—";
  const weakestText = d.weakestModule ?? "—";

  const borderSep = isDark
    ? "1px solid rgba(255,255,255,0.04)"
    : "1px solid rgba(0,0,0,0.06)";

  return (
    <div
      className="forge-node-spawn"
      style={{
        width: isDark ? 320 : 280,
        background: glass.bg,
        backdropFilter: `blur(${glass.blur}px)`,
        WebkitBackdropFilter: `blur(${glass.blur}px)`,
        border: `2px solid ${forge.originBorder}`,
        borderRadius: glass.nodeRadius,
        boxShadow: `${forge.originGlow}, ${glass.shadow}`,
        position: "relative",
        transition: "box-shadow 200ms ease, border-color 200ms ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: borderSep,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          {isDark ? (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: forge.originBorder,
                boxShadow: "0 0 10px rgba(0,212,170,0.4)",
                flexShrink: 0,
              }}
            />
          ) : (
            <Satellite
              size={14}
              color={forge.originBorder}
              strokeWidth={2}
              style={{ flexShrink: 0 }}
            />
          )}
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: isDark ? 13 : 12,
              fontWeight: isDark ? 600 : 700,
              color: forge.textPrimary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {d.satelliteName}
          </span>
        </div>
        <span
          style={{
            fontFamily: MONO_FONT,
            fontSize: isDark ? 11 : 10,
            color: isDark ? "rgba(255,255,255,0.25)" : forge.textMuted,
            flexShrink: 0,
            marginLeft: 8,
            ...(isDark
              ? {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 6,
                  padding: "2px 8px",
                }
              : {}),
          }}
        >
          {d.noradId}
        </span>
      </div>

      {/* Score section */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: isDark ? "28px 16px 20px" : "8px 16px 12px",
        }}
      >
        {isDark && score !== null ? (
          <ScoreRing score={score} status={scoreLabel} color={scoreColor} />
        ) : (
          <>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 36,
                fontWeight: 700,
                lineHeight: 1,
                color: scoreColor,
              }}
            >
              {score !== null ? score : "—"}
            </span>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.05em",
                color: scoreColor,
                marginTop: 4,
              }}
            >
              {scoreLabel}
            </span>
          </>
        )}
      </div>

      {/* Metrics row */}
      {isDark ? (
        <div
          style={{
            display: "flex",
            width: "100%",
            gap: 1,
            borderTop: borderSep,
          }}
        >
          {[
            {
              label: "Horizon",
              value: horizonText,
              sub: "prediction window",
            },
            {
              label: "Weakest",
              value: weakestText,
              sub: d.horizonDays !== null ? `${d.horizonDays}d horizon` : "",
            },
          ].map((item, i) => (
            <div
              key={item.label}
              style={{
                flex: 1,
                padding: "12px 14px",
                background: "rgba(255,255,255,0.02)",
                borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
            >
              <div
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  color: "rgba(255,255,255,0.25)",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 16,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                {item.value}
              </div>
              {item.sub && (
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.2)",
                    marginTop: 2,
                  }}
                >
                  {item.sub}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: borderSep,
            padding: "10px 16px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: forge.textMuted,
              }}
            >
              HORIZON
            </span>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 12,
                fontWeight: 600,
                color: forge.textSecondary,
              }}
            >
              {horizonText}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              alignItems: "flex-end",
            }}
          >
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: forge.textMuted,
              }}
            >
              WEAKEST
            </span>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 12,
                fontWeight: 600,
                color: forge.textSecondary,
              }}
            >
              {weakestText}
            </span>
          </div>
        </div>
      )}

      {/* Live tracking status bar — dark mode only */}
      {isDark && (
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#00D4AA",
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
              }}
            >
              Live tracking
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.15)",
              fontFamily: MONO_FONT,
            }}
          >
            synced
          </span>
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: isDark ? 12 : 10,
          height: isDark ? 12 : 10,
          background: forge.originBorder,
          border: isDark
            ? "2px solid #0A0A0F"
            : "2px solid rgba(255,255,255,0.9)",
          outline: isDark ? undefined : `2px solid ${forge.originBorder}`,
          borderRadius: "50%",
          ...(isDark ? { boxShadow: "0 0 6px rgba(0,212,170,0.25)" } : {}),
        }}
      />

      {/* Hint text — below the node, fades when nodes are added */}
      {d.showHint && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: 20,
            textAlign: "center",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: isDark ? "rgba(255,255,255,0.2)" : "#9CA3AF",
              fontWeight: 500,
            }}
          >
            Right-click or drag a block to start building
          </div>
          <div
            style={{
              fontSize: 11,
              color: isDark ? "rgba(255,255,255,0.1)" : "#9CA3AF",
              marginTop: 4,
              opacity: isDark ? 1 : 0.7,
            }}
          >
            Press{" "}
            <kbd
              style={{
                padding: "1px 5px",
                background: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(255,255,255,0.6)",
                borderRadius: 3,
                fontSize: 11,
                fontFamily: MONO_FONT,
                border: isDark
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid rgba(0,0,0,0.08)",
              }}
            >
              /
            </kbd>{" "}
            for quick search
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(SatelliteOriginNode);
