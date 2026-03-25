"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import { useForgeTheme } from "../../../theme";
import type { EdgeSeverity, ForgeEdgeData } from "../types";

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
  const { forge } = useForgeTheme();

  // Severity → color (resolved inside component for dark mode)
  function edgeColor(severity: EdgeSeverity): string {
    const map: Record<string, string> = {
      nominal: forge.edgeNominal,
      warning: forge.edgeWarning,
      critical: forge.edgeCritical,
      computing: forge.edgeComputing,
      idle: forge.edgeIdle,
    };
    return map[severity ?? "idle"] ?? forge.edgeIdle;
  }

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
        <circle r={6} fill={forge.edgeCritical} opacity={0.7}>
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
