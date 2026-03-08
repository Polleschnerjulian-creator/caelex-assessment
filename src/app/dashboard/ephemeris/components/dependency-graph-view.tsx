"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useEphemerisTheme, type EphemerisColors } from "../theme";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GraphNode {
  entityId: string;
  name: string;
  operatorType: string;
  score: number | null;
  horizonDays: number | null;
  riskCategory: string;
  criticality: number;
  dependentCount: number;
  dependencyCount: number;
}

interface GraphEdge {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  dependencyType: string;
  strength: string;
  impactMultiplier: number;
}

interface GraphCluster {
  id: string;
  name: string;
  entityIds: string[];
  clusterScore: number | null;
  weakestLink: { entityId: string; name: string; score: number } | null;
  criticalPath: string[] | null;
}

interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: GraphCluster[];
}

interface SPOF {
  entityId: string;
  name: string;
  operatorType: string;
  score: number;
  criticality: number;
  dependentCount: number;
  riskScore: number;
}

interface RiskConcentration {
  clusterId: string;
  clusterName: string;
  clusterScore: number | null;
  riskLevel: string;
  reason: string;
  entityCount: number;
}

interface CascadeChain {
  entityIds: string[];
  entityNames: string[];
  weakestScore: number;
  weakestEntity: string;
  chainType: string;
}

interface CrossTypeIntelligence {
  fleetScore: number;
  entityCount: number;
  dependencyGraph: DependencyGraph;
  singlePointsOfFailure: SPOF[];
  riskConcentrations: RiskConcentration[];
  cascadeRisk: {
    maxDepth: number;
    highRiskChains: CascadeChain[];
  };
  typeCorrelation: Record<string, Record<string, number>>;
}

// ─── Operator Type Colors ────────────────────────────────────────────────────

const OP_TYPE_COLORS: Record<string, string> = {
  SCO: "#3B82F6",
  LO: "#F59E0B",
  ISOS: "#EC4899",
  LSO: "#8B5CF6",
  CAP: "#06B6D4",
  PDP: "#10B981",
  TCO: "#F97316",
};

const STRENGTH_COLORS: Record<string, string> = {
  CRITICAL: "#EF4444",
  HIGH: "#F59E0B",
  MEDIUM: "#3B82F6",
  LOW: "#6B7280",
};

// ─── Force-directed layout (simple spring simulation) ────────────────────────

function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Initialize in a circle
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.35;

  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    positions.set(node.entityId, {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  });

  // Simple force simulation (50 iterations)
  const iterations = 50;
  const repulsion = 8000;
  const attraction = 0.01;
  const damping = 0.85;

  const velocities = new Map<string, { vx: number; vy: number }>();
  nodes.forEach((n) => velocities.set(n.entityId, { vx: 0, vy: 0 }));

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = positions.get(nodes[i]!.entityId)!;
        const b = positions.get(nodes[j]!.entityId)!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        const va = velocities.get(nodes[i]!.entityId)!;
        const vb = velocities.get(nodes[j]!.entityId)!;
        va.vx += fx;
        va.vy += fy;
        vb.vx -= fx;
        vb.vy -= fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = positions.get(edge.sourceEntityId);
      const b = positions.get(edge.targetEntityId);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      const va = velocities.get(edge.sourceEntityId)!;
      const vb = velocities.get(edge.targetEntityId)!;
      va.vx += fx;
      va.vy += fy;
      vb.vx -= fx;
      vb.vy -= fy;
    }

    // Apply velocities with damping
    for (const node of nodes) {
      const pos = positions.get(node.entityId)!;
      const vel = velocities.get(node.entityId)!;
      pos.x += vel.vx;
      pos.y += vel.vy;
      vel.vx *= damping;
      vel.vy *= damping;

      // Keep within bounds
      pos.x = Math.max(60, Math.min(width - 60, pos.x));
      pos.y = Math.max(60, Math.min(height - 60, pos.y));
    }
  }

  return positions;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DependencyGraphView() {
  const COLORS = useEphemerisTheme();
  const [data, setData] = useState<CrossTypeIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<
    "graph" | "spofs" | "risk" | "cascade"
  >("graph");

  const mono = { fontFamily: '"IBM Plex Mono", "Fira Code", monospace' };
  const sans = { fontFamily: '"Inter", -apple-system, sans-serif' };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/ephemeris/fleet/cross-type", {
        headers: csrfHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data ?? json);
      } else {
        setError("Failed to load cross-type intelligence");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute layout positions
  const graphWidth = 700;
  const graphHeight = 500;
  const positions = useMemo(() => {
    if (!data?.dependencyGraph) return new Map();
    return computeLayout(
      data.dependencyGraph.nodes,
      data.dependencyGraph.edges,
      graphWidth,
      graphHeight,
    );
  }, [data]);

  const scoreColor = useCallback(
    (score: number | null) => {
      if (score === null) return COLORS.textMuted;
      if (score >= 85) return COLORS.nominal;
      if (score >= 70) return COLORS.watch;
      if (score >= 50) return COLORS.warning;
      return COLORS.critical;
    },
    [COLORS],
  );

  const riskBadgeColor = useCallback(
    (level: string) => {
      switch (level) {
        case "CRITICAL":
          return COLORS.critical;
        case "HIGH":
          return COLORS.warning;
        case "MEDIUM":
          return COLORS.watch;
        default:
          return COLORS.nominal;
      }
    },
    [COLORS],
  );

  if (loading) {
    return (
      <div
        style={{
          padding: 64,
          textAlign: "center",
          color: COLORS.textMuted,
          ...sans,
        }}
      >
        Loading cross-type intelligence...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          color: COLORS.textMuted,
          ...sans,
        }}
      >
        {error ??
          "No dependency data available. Add entity dependencies to enable this view."}
      </div>
    );
  }

  const {
    dependencyGraph,
    singlePointsOfFailure,
    riskConcentrations,
    cascadeRisk,
  } = data;

  return (
    <div style={{ marginTop: 16 }}>
      {/* Sub-tab bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${COLORS.border}`,
          marginBottom: 16,
        }}
      >
        {(
          [
            { key: "graph", label: `Graph (${dependencyGraph.nodes.length})` },
            { key: "spofs", label: `SPOFs (${singlePointsOfFailure.length})` },
            { key: "risk", label: `Risk (${riskConcentrations.length})` },
            {
              key: "cascade",
              label: `Cascades (${cascadeRisk.highRiskChains.length})`,
            },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActivePanel(key)}
            style={{
              padding: "8px 16px",
              fontSize: 11,
              fontWeight: 500,
              color:
                activePanel === key ? COLORS.textPrimary : COLORS.textMuted,
              borderBottom:
                activePanel === key
                  ? `2px solid ${COLORS.brand}`
                  : "2px solid transparent",
              background: "none",
              border: "none",
              cursor: "pointer",
              ...sans,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* GRAPH PANEL */}
      {activePanel === "graph" && (
        <div style={{ display: "flex", gap: 16 }}>
          {/* SVG Graph */}
          <div
            style={{
              flex: 1,
              background: COLORS.sunken,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {dependencyGraph.nodes.length === 0 ? (
              <div
                style={{
                  padding: 64,
                  textAlign: "center",
                  color: COLORS.textMuted,
                  ...sans,
                }}
              >
                No entities with dependencies found. Create dependencies to
                visualize the network.
              </div>
            ) : (
              <svg
                width={graphWidth}
                height={graphHeight}
                viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                style={{ display: "block", width: "100%", height: "auto" }}
              >
                {/* Cluster regions */}
                {dependencyGraph.clusters.map((cluster) => {
                  const clusterPositions = cluster.entityIds
                    .map((id) => positions.get(id))
                    .filter(Boolean) as { x: number; y: number }[];
                  if (clusterPositions.length < 2) return null;

                  const minX =
                    Math.min(...clusterPositions.map((p) => p.x)) - 30;
                  const minY =
                    Math.min(...clusterPositions.map((p) => p.y)) - 30;
                  const maxX =
                    Math.max(...clusterPositions.map((p) => p.x)) + 30;
                  const maxY =
                    Math.max(...clusterPositions.map((p) => p.y)) + 30;

                  return (
                    <g key={cluster.id}>
                      <rect
                        x={minX}
                        y={minY}
                        width={maxX - minX}
                        height={maxY - minY}
                        rx={8}
                        fill={`${COLORS.brand}08`}
                        stroke={`${COLORS.brand}20`}
                        strokeDasharray="4 4"
                      />
                      <text
                        x={minX + 6}
                        y={minY + 12}
                        fontSize={9}
                        fill={COLORS.textMuted}
                        fontFamily="Inter, sans-serif"
                      >
                        {cluster.name}
                      </text>
                    </g>
                  );
                })}

                {/* Edges */}
                {dependencyGraph.edges.map((edge) => {
                  const from = positions.get(edge.sourceEntityId);
                  const to = positions.get(edge.targetEntityId);
                  if (!from || !to) return null;

                  const isHighlighted =
                    hoveredNode === edge.sourceEntityId ||
                    hoveredNode === edge.targetEntityId;
                  const edgeColor =
                    STRENGTH_COLORS[edge.strength] ?? COLORS.textMuted;

                  return (
                    <g key={edge.id}>
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={edgeColor}
                        strokeWidth={isHighlighted ? 2.5 : 1.5}
                        strokeOpacity={isHighlighted ? 1 : 0.4}
                        strokeDasharray={
                          edge.strength === "LOW" ? "4 4" : undefined
                        }
                      />
                      {/* Arrow */}
                      <circle
                        cx={to.x + (from.x - to.x) * 0.15}
                        cy={to.y + (from.y - to.y) * 0.15}
                        r={3}
                        fill={edgeColor}
                        opacity={isHighlighted ? 1 : 0.5}
                      />
                    </g>
                  );
                })}

                {/* Nodes */}
                {dependencyGraph.nodes.map((node) => {
                  const pos = positions.get(node.entityId);
                  if (!pos) return null;

                  const nodeColor =
                    OP_TYPE_COLORS[node.operatorType] ?? COLORS.textMuted;
                  const isHovered = hoveredNode === node.entityId;
                  const isSelected = selectedNode === node.entityId;
                  const nodeRadius = Math.max(
                    16,
                    Math.min(30, 16 + node.criticality * 0.12),
                  );

                  return (
                    <g
                      key={node.entityId}
                      onMouseEnter={() => setHoveredNode(node.entityId)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() =>
                        setSelectedNode(
                          selectedNode === node.entityId ? null : node.entityId,
                        )
                      }
                      style={{ cursor: "pointer" }}
                    >
                      {/* Glow ring for at-risk nodes */}
                      {node.score !== null && node.score < 70 && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={nodeRadius + 4}
                          fill="none"
                          stroke={scoreColor(node.score)}
                          strokeWidth={2}
                          strokeOpacity={0.3}
                        >
                          <animate
                            attributeName="stroke-opacity"
                            values="0.3;0.6;0.3"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}

                      {/* Node circle */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isHovered ? nodeRadius + 3 : nodeRadius}
                        fill={COLORS.elevated}
                        stroke={isSelected ? COLORS.brand : nodeColor}
                        strokeWidth={isSelected ? 3 : 2}
                      />

                      {/* Operator type label */}
                      <text
                        x={pos.x}
                        y={pos.y - 3}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight={700}
                        fill={nodeColor}
                        fontFamily="IBM Plex Mono, monospace"
                      >
                        {node.operatorType}
                      </text>

                      {/* Score */}
                      <text
                        x={pos.x}
                        y={pos.y + 8}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        fill={scoreColor(node.score)}
                        fontFamily="IBM Plex Mono, monospace"
                      >
                        {node.score ?? "—"}
                      </text>

                      {/* Name label below */}
                      <text
                        x={pos.x}
                        y={pos.y + nodeRadius + 14}
                        textAnchor="middle"
                        fontSize={8}
                        fill={COLORS.textTertiary}
                        fontFamily="Inter, sans-serif"
                      >
                        {node.name.length > 18
                          ? node.name.slice(0, 15) + "..."
                          : node.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Legend */}
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                display: "flex",
                gap: 12,
                fontSize: 9,
                color: COLORS.textMuted,
                ...sans,
              }}
            >
              {Object.entries(OP_TYPE_COLORS).map(([type, color]) => (
                <span
                  key={type}
                  style={{ display: "flex", alignItems: "center", gap: 3 }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: color,
                      display: "inline-block",
                    }}
                  />
                  {type}
                </span>
              ))}
            </div>
          </div>

          {/* Node detail sidebar */}
          <div
            style={{
              width: 260,
              background: COLORS.elevated,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              padding: 16,
            }}
          >
            {selectedNode ? (
              <NodeDetail
                node={
                  dependencyGraph.nodes.find(
                    (n) => n.entityId === selectedNode,
                  )!
                }
                edges={dependencyGraph.edges}
                nodes={dependencyGraph.nodes}
                COLORS={COLORS}
              />
            ) : (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: COLORS.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 12,
                    ...sans,
                  }}
                >
                  Network Summary
                </div>
                <MetricRow
                  label="Entities"
                  value={String(dependencyGraph.nodes.length)}
                  COLORS={COLORS}
                />
                <MetricRow
                  label="Dependencies"
                  value={String(dependencyGraph.edges.length)}
                  COLORS={COLORS}
                />
                <MetricRow
                  label="Clusters"
                  value={String(dependencyGraph.clusters.length)}
                  COLORS={COLORS}
                />
                <MetricRow
                  label="SPOFs"
                  value={String(singlePointsOfFailure.length)}
                  COLORS={COLORS}
                  valueColor={
                    singlePointsOfFailure.length > 0
                      ? COLORS.warning
                      : COLORS.nominal
                  }
                />
                <MetricRow
                  label="Cascade Depth"
                  value={String(cascadeRisk.maxDepth)}
                  COLORS={COLORS}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* SPOFs PANEL */}
      {activePanel === "spofs" && (
        <SPOFsPanel
          spofs={singlePointsOfFailure}
          COLORS={COLORS}
          scoreColor={scoreColor}
        />
      )}

      {/* RISK CONCENTRATION PANEL */}
      {activePanel === "risk" && (
        <RiskConcentrationPanel
          concentrations={riskConcentrations}
          clusters={dependencyGraph.clusters}
          COLORS={COLORS}
          riskBadgeColor={riskBadgeColor}
        />
      )}

      {/* CASCADE PANEL */}
      {activePanel === "cascade" && (
        <CascadePanel
          cascadeRisk={cascadeRisk}
          COLORS={COLORS}
          scoreColor={scoreColor}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricRow({
  label,
  value,
  COLORS,
  valueColor,
}: {
  label: string;
  value: string;
  COLORS: EphemerisColors;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 8,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: COLORS.textTertiary,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: valueColor ?? COLORS.textPrimary,
          fontFamily: '"IBM Plex Mono", monospace',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function NodeDetail({
  node,
  edges,
  nodes,
  COLORS,
}: {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  COLORS: EphemerisColors;
}) {
  const inbound = edges.filter((e) => e.sourceEntityId === node.entityId);
  const outbound = edges.filter((e) => e.targetEntityId === node.entityId);
  const nodeMap = new Map(nodes.map((n) => [n.entityId, n]));

  const sans = { fontFamily: '"Inter", sans-serif' };
  const mono = { fontFamily: '"IBM Plex Mono", monospace' };

  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: COLORS.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 4,
          ...sans,
        }}
      >
        Entity Detail
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.textPrimary,
          marginBottom: 4,
          ...sans,
        }}
      >
        {node.name}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <span
          style={{
            padding: "2px 6px",
            fontSize: 9,
            fontWeight: 600,
            borderRadius: 3,
            background: `${OP_TYPE_COLORS[node.operatorType] ?? COLORS.textMuted}20`,
            color: OP_TYPE_COLORS[node.operatorType] ?? COLORS.textMuted,
          }}
        >
          {node.operatorType}
        </span>
        <span
          style={{
            padding: "2px 6px",
            fontSize: 9,
            borderRadius: 3,
            background: `${COLORS.textMuted}20`,
            color: COLORS.textTertiary,
          }}
        >
          Criticality: {node.criticality}
        </span>
      </div>

      <MetricRow
        label="Score"
        value={node.score !== null ? String(node.score) : "—"}
        COLORS={COLORS}
      />
      <MetricRow
        label="Horizon"
        value={node.horizonDays !== null ? `${node.horizonDays}d` : "—"}
        COLORS={COLORS}
      />
      <MetricRow
        label="Depends On"
        value={String(inbound.length)}
        COLORS={COLORS}
      />
      <MetricRow
        label="Depended By"
        value={String(outbound.length)}
        COLORS={COLORS}
      />

      {inbound.length > 0 && (
        <>
          <div
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginTop: 12,
              marginBottom: 6,
              ...sans,
            }}
          >
            Depends On
          </div>
          {inbound.map((e) => {
            const target = nodeMap.get(e.targetEntityId);
            return (
              <div
                key={e.id}
                style={{
                  fontSize: 10,
                  color: COLORS.textSecondary,
                  marginBottom: 4,
                  display: "flex",
                  justifyContent: "space-between",
                  ...sans,
                }}
              >
                <span>{target?.name ?? e.targetEntityId.slice(0, 8)}</span>
                <span
                  style={{
                    color: STRENGTH_COLORS[e.strength] ?? COLORS.textMuted,
                    ...mono,
                    fontSize: 9,
                  }}
                >
                  {e.strength}
                </span>
              </div>
            );
          })}
        </>
      )}

      {outbound.length > 0 && (
        <>
          <div
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginTop: 12,
              marginBottom: 6,
              ...sans,
            }}
          >
            Depended By
          </div>
          {outbound.map((e) => {
            const source = nodeMap.get(e.sourceEntityId);
            return (
              <div
                key={e.id}
                style={{
                  fontSize: 10,
                  color: COLORS.textSecondary,
                  marginBottom: 4,
                  display: "flex",
                  justifyContent: "space-between",
                  ...sans,
                }}
              >
                <span>{source?.name ?? e.sourceEntityId.slice(0, 8)}</span>
                <span
                  style={{
                    color: STRENGTH_COLORS[e.strength] ?? COLORS.textMuted,
                    ...mono,
                    fontSize: 9,
                  }}
                >
                  {e.strength}
                </span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function SPOFsPanel({
  spofs,
  COLORS,
  scoreColor,
}: {
  spofs: SPOF[];
  COLORS: EphemerisColors;
  scoreColor: (score: number | null) => string;
}) {
  const sans = { fontFamily: '"Inter", sans-serif' };
  const mono = { fontFamily: '"IBM Plex Mono", monospace' };

  if (spofs.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          color: COLORS.textMuted,
          ...sans,
        }}
      >
        No single points of failure detected. Your dependency network has good
        redundancy.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: COLORS.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 12,
          ...sans,
        }}
      >
        Single Points of Failure — entities with high criticality and low scores
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {spofs.map((spof) => (
          <div
            key={spof.entityId}
            style={{
              background: COLORS.elevated,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {/* Score indicator */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: `2px solid ${scoreColor(spof.score)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: scoreColor(spof.score),
                ...mono,
              }}
            >
              {spof.score}
            </div>

            {/* Details */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  marginBottom: 2,
                  ...sans,
                }}
              >
                {spof.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: COLORS.textTertiary,
                  ...sans,
                }}
              >
                {spof.operatorType} · {spof.dependentCount} dependents ·
                criticality {spof.criticality}
              </div>
            </div>

            {/* Risk score */}
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 10,
                  color: COLORS.textMuted,
                  ...sans,
                }}
              >
                Risk Score
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: COLORS.critical,
                  ...mono,
                }}
              >
                {spof.riskScore.toFixed(0)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskConcentrationPanel({
  concentrations,
  clusters,
  COLORS,
  riskBadgeColor,
}: {
  concentrations: RiskConcentration[];
  clusters: GraphCluster[];
  COLORS: EphemerisColors;
  riskBadgeColor: (level: string) => string;
}) {
  const sans = { fontFamily: '"Inter", sans-serif' };
  const mono = { fontFamily: '"IBM Plex Mono", monospace' };

  if (concentrations.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          color: COLORS.textMuted,
          ...sans,
        }}
      >
        No risk concentrations detected.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: COLORS.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 12,
          ...sans,
        }}
      >
        Risk Concentrations — clusters with elevated risk levels
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {concentrations.map((rc) => {
          const cluster = clusters.find((c) => c.id === rc.clusterId);
          return (
            <div
              key={rc.clusterId}
              style={{
                background: COLORS.elevated,
                border: `1px solid ${COLORS.border}`,
                borderLeft: `3px solid ${riskBadgeColor(rc.riskLevel)}`,
                borderRadius: 4,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                    ...sans,
                  }}
                >
                  {rc.clusterName}
                </span>
                <span
                  style={{
                    padding: "2px 8px",
                    fontSize: 9,
                    fontWeight: 600,
                    borderRadius: 3,
                    background: `${riskBadgeColor(rc.riskLevel)}20`,
                    color: riskBadgeColor(rc.riskLevel),
                  }}
                >
                  {rc.riskLevel}
                </span>
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: COLORS.textTertiary,
                  marginBottom: 8,
                  ...sans,
                }}
              >
                {rc.reason}
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div>
                  <div
                    style={{ fontSize: 9, color: COLORS.textMuted, ...sans }}
                  >
                    Entities
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: COLORS.textPrimary,
                      ...mono,
                    }}
                  >
                    {rc.entityCount}
                  </div>
                </div>
                <div>
                  <div
                    style={{ fontSize: 9, color: COLORS.textMuted, ...sans }}
                  >
                    Cluster Score
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: COLORS.textPrimary,
                      ...mono,
                    }}
                  >
                    {rc.clusterScore ?? "—"}
                  </div>
                </div>
                {cluster?.weakestLink && (
                  <div>
                    <div
                      style={{ fontSize: 9, color: COLORS.textMuted, ...sans }}
                    >
                      Weakest
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: COLORS.warning,
                        ...sans,
                      }}
                    >
                      {cluster.weakestLink.name} ({cluster.weakestLink.score})
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CascadePanel({
  cascadeRisk,
  COLORS,
  scoreColor,
}: {
  cascadeRisk: { maxDepth: number; highRiskChains: CascadeChain[] };
  COLORS: EphemerisColors;
  scoreColor: (score: number | null) => string;
}) {
  const sans = { fontFamily: '"Inter", sans-serif' };
  const mono = { fontFamily: '"IBM Plex Mono", monospace' };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            ...sans,
          }}
        >
          Cascade Risk Analysis
        </div>
        <div style={{ fontSize: 11, color: COLORS.textTertiary, ...sans }}>
          Max cascade depth:{" "}
          <strong style={{ color: COLORS.textPrimary }}>
            {cascadeRisk.maxDepth}
          </strong>
        </div>
      </div>

      {cascadeRisk.highRiskChains.length === 0 ? (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            color: COLORS.textMuted,
            ...sans,
          }}
        >
          No high-risk cascade chains detected.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {cascadeRisk.highRiskChains.map((chain, idx) => (
            <div
              key={idx}
              style={{
                background: COLORS.elevated,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 4,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: COLORS.textMuted,
                    textTransform: "uppercase",
                    ...sans,
                  }}
                >
                  {chain.chainType}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: scoreColor(chain.weakestScore),
                    fontWeight: 600,
                    ...mono,
                  }}
                >
                  Weakest: {chain.weakestScore}
                </span>
              </div>

              {/* Chain visualization */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  flexWrap: "wrap",
                }}
              >
                {chain.entityNames.map((name, i) => (
                  <span
                    key={i}
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <span
                      style={{
                        padding: "3px 8px",
                        fontSize: 10,
                        borderRadius: 3,
                        background:
                          name === chain.weakestEntity
                            ? `${COLORS.critical}20`
                            : `${COLORS.textMuted}15`,
                        color:
                          name === chain.weakestEntity
                            ? COLORS.critical
                            : COLORS.textSecondary,
                        fontWeight: name === chain.weakestEntity ? 600 : 400,
                        ...sans,
                      }}
                    >
                      {name}
                    </span>
                    {i < chain.entityNames.length - 1 && (
                      <span
                        style={{
                          fontSize: 10,
                          color: COLORS.textMuted,
                        }}
                      >
                        →
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
