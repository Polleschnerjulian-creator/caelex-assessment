"use client";

import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import { FORGE } from "../../../theme";
import {
  FORGE_NODE_TYPES,
  type ResultNodeData,
  type SimulationResults,
} from "../types";

/* ─── Props ───────────────────────────────────────────────────────────────── */

interface ComparisonBarProps {
  nodes: Node[];
  edges: Edge[];
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

interface CompletedResult {
  nodeId: string;
  label: string;
  result: SimulationResults;
}

function severityColor(s: string): string {
  switch (s) {
    case "LOW":
      return FORGE.nominal;
    case "MEDIUM":
      return FORGE.watch;
    case "HIGH":
      return FORGE.warning;
    case "CRITICAL":
      return FORGE.critical;
    default:
      return FORGE.textTertiary;
  }
}

function formatCost(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

function formatDays(d: number): string {
  const abs = Math.abs(d);
  if (abs === 1) return "1 day";
  return `${abs} days`;
}

const mono: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
};

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function ComparisonBar({ nodes }: ComparisonBarProps) {
  const completed = useMemo<CompletedResult[]>(() => {
    return nodes
      .filter((n) => n.type === FORGE_NODE_TYPES.RESULT)
      .map((n, i) => {
        const data = n.data as unknown as ResultNodeData;
        if (data.computeState !== "done" || !data.aggregatedResult) return null;
        return {
          nodeId: n.id,
          label: `Branch ${String.fromCharCode(65 + i)}`,
          result: data.aggregatedResult,
        };
      })
      .filter(Boolean) as CompletedResult[];
  }, [nodes]);

  if (completed.length < 2) return null;

  const a = completed[0];
  const b = completed[1];

  const deltaA = a.result.totalHorizonDelta;
  const deltaB = b.result.totalHorizonDelta;
  const costA = a.result.totalCostEstimate.financialUsd;
  const costB = b.result.totalCostEstimate.financialUsd;

  // Higher horizon delta = better (more remaining life)
  const betterDeltaIdx = deltaA >= deltaB ? 0 : 1;
  // Lower cost = better
  const betterCostIdx = costA <= costB ? 0 : 1;

  // Auto-generated insight
  const horizonDiff = Math.abs(deltaA - deltaB);
  const costDiff = Math.abs(costA - costB);
  const labels = [a.label, b.label];

  let insight = "";
  if (horizonDiff > 0) {
    insight = `${labels[betterDeltaIdx]} saves ${formatDays(horizonDiff)} vs ${labels[betterDeltaIdx === 0 ? 1 : 0]}`;
  }
  if (costDiff > 0) {
    const costInsight = `${labels[betterCostIdx]} costs ${formatCost(costDiff)} less`;
    insight = insight ? `${insight}  ·  ${costInsight}` : costInsight;
  }
  if (!insight) insight = "Both branches produce equivalent results";

  const items = [a, b];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${FORGE.nodeBorder}`,
        borderRadius: 14,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        padding: "16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 480,
        maxWidth: 640,
      }}
    >
      {/* Side-by-side comparison */}
      <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
        {items.map((item, idx) => {
          const delta = item.result.totalHorizonDelta;
          const cost = item.result.totalCostEstimate.financialUsd;
          const severity = item.result.overallSeverity;
          const isDeltaBetter = idx === betterDeltaIdx;
          const isCostBetter = idx === betterCostIdx;

          return (
            <div
              key={item.nodeId}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "10px 14px",
                borderRadius: 10,
                background: FORGE.canvasBg,
                border: `1px solid ${FORGE.nodeBorder}`,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: FORGE.textTertiary,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {item.label}
              </span>

              {/* Delta-H */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: FORGE.textMuted,
                  }}
                >
                  ΔH
                </span>
                <span
                  style={{
                    ...mono,
                    fontSize: 16,
                    fontWeight: 600,
                    color: isDeltaBetter ? FORGE.nominal : FORGE.critical,
                  }}
                >
                  {delta >= 0 ? "+" : ""}
                  {delta}d
                </span>
              </div>

              {/* Severity + Cost row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#fff",
                    background: severityColor(severity),
                    borderRadius: 4,
                    padding: "2px 6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {severity}
                </span>
                <span
                  style={{
                    ...mono,
                    fontSize: 12,
                    fontWeight: 500,
                    color: isCostBetter ? FORGE.nominal : FORGE.critical,
                  }}
                >
                  {formatCost(cost)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Insight */}
      <div
        style={{
          fontSize: 12,
          color: FORGE.textSecondary,
          textAlign: "center",
          lineHeight: 1.4,
          ...mono,
        }}
      >
        {insight}
      </div>
    </div>
  );
}
