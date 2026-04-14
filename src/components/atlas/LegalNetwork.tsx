"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  LEGAL_SOURCES_DE,
  LEGAL_SOURCES_FR,
  LEGAL_SOURCES_UK,
  LEGAL_SOURCES_IT,
  LEGAL_SOURCES_LU,
  LEGAL_SOURCES_NL,
  LEGAL_SOURCES_BE,
  LEGAL_SOURCES_ES,
  LEGAL_SOURCES_NO,
  LEGAL_SOURCES_SE,
  LEGAL_SOURCES_FI,
  LEGAL_SOURCES_DK,
  LEGAL_SOURCES_AT,
  getTranslatedSource,
} from "@/data/legal-sources";
import type { LegalSource, LegalSourceType } from "@/data/legal-sources";

// ─── Constants ──────────────────────────────────────────────────────

const ALL_SOURCES: LegalSource[] = [
  ...LEGAL_SOURCES_DE,
  ...LEGAL_SOURCES_FR,
  ...LEGAL_SOURCES_UK,
  ...LEGAL_SOURCES_IT,
  ...LEGAL_SOURCES_LU,
  ...LEGAL_SOURCES_NL,
  ...LEGAL_SOURCES_BE,
  ...LEGAL_SOURCES_ES,
  ...LEGAL_SOURCES_NO,
  ...LEGAL_SOURCES_SE,
  ...LEGAL_SOURCES_FI,
  ...LEGAL_SOURCES_DK,
  ...LEGAL_SOURCES_AT,
];

/** Map jurisdiction codes to cluster labels */
const CLUSTER_LABELS: Record<string, string> = {
  DE: "DE",
  FR: "FR",
  UK: "UK",
  IT: "IT",
  LU: "LU",
  NL: "NL",
  BE: "BE",
  ES: "ES",
  NO: "NO",
  SE: "SE",
  FI: "FI",
  DK: "DK",
  AT: "AT",
  INT: "INT",
  EU: "EU",
};

/** Cluster order for layout (left to right) */
const CLUSTER_ORDER = [
  "INT",
  "EU",
  "DE",
  "FR",
  "UK",
  "IT",
  "LU",
  "NL",
  "BE",
  "ES",
  "NO",
  "SE",
  "FI",
  "DK",
  "AT",
];

/** Monochrome node fills by source type */
const TYPE_FILLS: Record<LegalSourceType, string> = {
  international_treaty: "#1a1a1a",
  federal_law: "#333333",
  federal_regulation: "#555555",
  technical_standard: "#888888",
  eu_regulation: "#444444",
  eu_directive: "#666666",
  policy_document: "#aaaaaa",
  draft_legislation: "#bbbbbb",
};

// ─── Graph computation ──────────────────────────────────────────────

interface GraphNode {
  id: string;
  source: LegalSource;
  x: number;
  y: number;
  r: number;
  cluster: string;
  connectionCount: number;
}

interface GraphEdge {
  from: string;
  to: string;
}

function buildGraph(sources: LegalSource[]): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  sourceMap: Map<string, GraphNode>;
} {
  const sourceById = new Map(sources.map((s) => [s.id, s]));

  // Build edge list (only for sources that exist in our dataset)
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();
  const connectionCounts = new Map<string, number>();

  for (const source of sources) {
    for (const relId of source.related_sources) {
      if (!sourceById.has(relId)) continue;
      const key = [source.id, relId].sort().join("|");
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({ from: source.id, to: relId });
      connectionCounts.set(
        source.id,
        (connectionCounts.get(source.id) ?? 0) + 1,
      );
      connectionCounts.set(relId, (connectionCounts.get(relId) ?? 0) + 1);
    }
  }

  // Filter to sources with at least one connection
  const connectedSources = sources.filter(
    (s) => (connectionCounts.get(s.id) ?? 0) > 0,
  );

  // Group by cluster (jurisdiction, but merge INT+EU)
  const clusters = new Map<string, LegalSource[]>();
  for (const s of connectedSources) {
    const cluster = s.jurisdiction;
    if (!clusters.has(cluster)) clusters.set(cluster, []);
    clusters.get(cluster)!.push(s);
  }

  // Layout: clusters arranged in columns across the SVG
  // viewBox is 1000 x 400
  const VB_W = 1000;
  const VB_H = 380;
  const PADDING_X = 60;
  const PADDING_Y = 50;

  const orderedClusters = CLUSTER_ORDER.filter((c) => clusters.has(c));
  const clusterWidth =
    (VB_W - PADDING_X * 2) / Math.max(orderedClusters.length, 1);

  const nodes: GraphNode[] = [];
  const sourceMap = new Map<string, GraphNode>();

  for (let ci = 0; ci < orderedClusters.length; ci++) {
    const clusterKey = orderedClusters[ci];
    const clusterSources = clusters.get(clusterKey) ?? [];

    // Sort by connection count descending for more interesting layout
    clusterSources.sort(
      (a, b) =>
        (connectionCounts.get(b.id) ?? 0) - (connectionCounts.get(a.id) ?? 0),
    );

    const cx = PADDING_X + clusterWidth * ci + clusterWidth / 2;
    const count = clusterSources.length;

    // Arrange nodes in a vertical column with slight horizontal jitter
    // to create an organic feel
    for (let ni = 0; ni < count; ni++) {
      const s = clusterSources[ni];
      const conns = connectionCounts.get(s.id) ?? 0;

      // Vertical distribution
      const verticalSpacing = Math.min(
        (VB_H - PADDING_Y * 2) / Math.max(count - 1, 1),
        28,
      );
      const totalHeight = verticalSpacing * (count - 1);
      const startY = (VB_H - totalHeight) / 2;
      const y = count === 1 ? VB_H / 2 : startY + verticalSpacing * ni;

      // Deterministic horizontal jitter based on index
      const jitterSeed = ((ni * 7 + 3) % 11) / 11;
      const jitterRange = clusterWidth * 0.25;
      const x = cx + (jitterSeed - 0.5) * jitterRange;

      // Node radius scaled by connections (min 3, max 8)
      const r = Math.min(3 + conns * 0.8, 8);

      const node: GraphNode = {
        id: s.id,
        source: s,
        x,
        y,
        r,
        cluster: clusterKey,
        connectionCount: conns,
      };
      nodes.push(node);
      sourceMap.set(s.id, node);
    }
  }

  return { nodes, edges, sourceMap };
}

// ─── Component ──────────────────────────────────────────────────────

export default function LegalNetwork() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const { nodes, edges, sourceMap } = useMemo(
    () => buildGraph(ALL_SOURCES),
    [],
  );

  // Compute stats
  const stats = useMemo(() => {
    const jurisdictions = new Set(nodes.map((n) => n.cluster));
    return {
      sources: nodes.length,
      connections: edges.length,
      jurisdictions: jurisdictions.size,
    };
  }, [nodes, edges]);

  // Highlighted edges + nodes when hovering
  const highlighted = useMemo(() => {
    if (!hoveredId)
      return { nodes: new Set<string>(), edges: new Set<number>() };
    const nodeSet = new Set<string>([hoveredId]);
    const edgeSet = new Set<number>();
    edges.forEach((e, i) => {
      if (e.from === hoveredId || e.to === hoveredId) {
        edgeSet.add(i);
        nodeSet.add(e.from);
        nodeSet.add(e.to);
      }
    });
    return { nodes: nodeSet, edges: edgeSet };
  }, [hoveredId, edges]);

  // Cluster label positions
  const clusterLabels = useMemo(() => {
    const labels: Array<{ label: string; x: number }> = [];
    const clusterXs = new Map<string, number[]>();
    for (const node of nodes) {
      if (!clusterXs.has(node.cluster)) clusterXs.set(node.cluster, []);
      clusterXs.get(node.cluster)!.push(node.x);
    }
    for (const [cluster, xs] of clusterXs) {
      const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
      labels.push({ label: CLUSTER_LABELS[cluster] ?? cluster, x: avg });
    }
    labels.sort((a, b) => a.x - b.x);
    return labels;
  }, [nodes]);

  const handleNodeClick = useCallback(
    (id: string) => {
      router.push(`/atlas/sources/${id}`);
    },
    [router],
  );

  const handleMouseEnter = useCallback(
    (id: string, svgX: number, svgY: number) => {
      setHoveredId(id);
      setTooltipPos({ x: svgX, y: svgY });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
    setTooltipPos(null);
  }, []);

  if (nodes.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-mono text-gray-400 tracking-wide">
          {stats.sources} {language === "de" ? "Quellen" : "sources"}
          {" · "}
          {stats.connections}{" "}
          {language === "de" ? "Verknüpfungen" : "connections"}
          {" · "}
          {stats.jurisdictions} {t("atlas.jurisdictions").toLowerCase()}
        </span>
      </div>

      {/* SVG network visualization */}
      <div
        className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-white/50"
        style={{ maxHeight: 400 }}
      >
        <svg
          viewBox="0 0 1000 380"
          className="w-full h-auto"
          style={{ maxHeight: 400 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Cluster labels at top */}
          {clusterLabels.map((cl) => (
            <text
              key={cl.label}
              x={cl.x}
              y={22}
              textAnchor="middle"
              className="select-none pointer-events-none"
              fill="#9CA3AF"
              fontSize="10"
              fontWeight="600"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"
              letterSpacing="0.1em"
            >
              {cl.label}
            </text>
          ))}

          {/* Edges */}
          {edges.map((edge, i) => {
            const fromNode = sourceMap.get(edge.from);
            const toNode = sourceMap.get(edge.to);
            if (!fromNode || !toNode) return null;

            const isHighlighted = highlighted.edges.has(i);
            const isDimmed = hoveredId !== null && !isHighlighted;

            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={isHighlighted ? "#374151" : "#D1D5DB"}
                strokeWidth={isHighlighted ? 1 : 0.5}
                opacity={isDimmed ? 0.08 : isHighlighted ? 0.6 : 0.2}
                style={{
                  transition: "opacity 200ms ease, stroke-width 200ms ease",
                }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isHovered = hoveredId === node.id;
            const isConnected = highlighted.nodes.has(node.id);
            const isDimmed = hoveredId !== null && !isConnected;

            return (
              <circle
                key={node.id}
                cx={node.x}
                cy={node.y}
                r={isHovered ? node.r + 2 : node.r}
                fill={TYPE_FILLS[node.source.type]}
                opacity={isDimmed ? 0.15 : isHovered ? 1 : 0.7}
                className="cursor-pointer"
                style={{
                  transition: "opacity 200ms ease, r 150ms ease",
                }}
                onMouseEnter={() => handleMouseEnter(node.id, node.x, node.y)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleNodeClick(node.id)}
              />
            );
          })}

          {/* Tooltip */}
          {hoveredId &&
            tooltipPos &&
            (() => {
              const node = sourceMap.get(hoveredId);
              if (!node) return null;
              const title = getTranslatedSource(node.source, language).title;
              const truncated =
                title.length > 60 ? title.slice(0, 57) + "..." : title;

              // Position tooltip above the node
              const tx = tooltipPos.x;
              const ty = tooltipPos.y - node.r - 10;

              // Measure rough text width (6px per char for 10px font)
              const textWidth = Math.min(truncated.length * 5.2, 280);
              const padH = 8;
              const padV = 5;
              const rectW = textWidth + padH * 2;
              const rectH = 26 + padV * 2;

              // Keep tooltip within viewBox bounds
              let rx = tx - rectW / 2;
              if (rx < 4) rx = 4;
              if (rx + rectW > 996) rx = 996 - rectW;
              let ry = ty - rectH;
              if (ry < 4) ry = tooltipPos.y + node.r + 6;

              return (
                <g className="pointer-events-none">
                  <rect
                    x={rx}
                    y={ry}
                    width={rectW}
                    height={rectH}
                    rx={4}
                    fill="#111827"
                    opacity={0.92}
                  />
                  <text
                    x={rx + padH}
                    y={ry + padV + 12}
                    fill="#F3F4F6"
                    fontSize="9.5"
                    fontFamily="Inter, system-ui, -apple-system, sans-serif"
                  >
                    {truncated}
                  </text>
                  {/* Jurisdiction + type badge */}
                  <text
                    x={rx + padH}
                    y={ry + padV + 22}
                    fill="#9CA3AF"
                    fontSize="8"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"
                  >
                    {node.cluster} · {node.source.type.replace(/_/g, " ")} ·{" "}
                    {node.connectionCount}{" "}
                    {node.connectionCount === 1 ? "link" : "links"}
                  </text>
                </g>
              );
            })()}
        </svg>
      </div>
    </div>
  );
}
