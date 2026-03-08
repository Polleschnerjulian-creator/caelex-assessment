"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import { FORGE } from "../../../theme";
import type { EdgeSeverity, ForgeEdgeData } from "../types";

// ─── Severity → Color ────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<NonNullable<EdgeSeverity> | "idle", string> = {
  nominal: FORGE.edgeNominal,
  warning: FORGE.edgeWarning,
  critical: FORGE.edgeCritical,
  computing: FORGE.edgeComputing,
  idle: FORGE.edgeIdle,
};

function edgeColor(severity: EdgeSeverity): string {
  return SEVERITY_COLOR[severity ?? "idle"];
}

// ─── ForgeEdge ───────────────────────────────────────────────────────────────

export default function ForgeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const { severity = null } = (data as ForgeEdgeData | undefined) ?? {};
  const color = edgeColor(severity);
  const isComputing = severity === "computing";
  const isCritical = severity === "critical";

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const strokeWidth = selected ? 3 : 2;
  const gradientId = `forge-shimmer-${id}`;
  const pathId = `forge-path-${id}`;

  return (
    <>
      {/* Shimmer gradient definition for computing state */}
      {isComputing && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="50%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.3} />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              from="-1 0"
              to="1 0"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>
      )}

      {/* Hidden path for animateMotion reference */}
      <path id={pathId} d={edgePath} fill="none" />

      {/* Base edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: isComputing ? `url(#${gradientId})` : color,
          strokeWidth,
          transition: "stroke 0.3s ease, stroke-width 0.15s ease",
        }}
      />

      {/* Forward pulse particle — always shown except idle */}
      {severity && (
        <circle r={4} fill={color} opacity={0.9}>
          <animateMotion dur="2s" repeatCount="indefinite" rotate="auto">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      )}

      {/* Reverse pulse for CRITICAL severity */}
      {isCritical && (
        <circle r={6} fill={FORGE.edgeCritical} opacity={0.7}>
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            rotate="auto"
            keyPoints="1;0"
            keyTimes="0;1"
            calcMode="linear"
          >
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      )}
    </>
  );
}
