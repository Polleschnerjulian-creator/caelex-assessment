"use client";

/**
 * Lineage Graph (Sprint C1.3 — client visualization)
 *
 * Renders a LineageGraphResult as a @xyflow/react canvas. Nodes are
 * placed in vertical columns by kind:
 *
 *   enrichment-source   derivation-trace          (left columns)
 *           │                  │
 *           └───────┐  ┌───────┘
 *                   ▼  ▼
 *                 SUBJECT                          (center)
 *                   ▲  ▲
 *           ┌───────┘  └───────┐
 *           │                  │
 *   astra-proposal       audit-log                 (right columns)
 *
 * No drag-to-edit, no node creation — read-only viewer.
 */

import React, { useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  type Node as RFNode,
  type Edge as RFEdge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type {
  LineageGraphResult,
  LineageNode,
  LineageNodeKind,
  LineageEdge,
} from "@/lib/lineage/build-lineage-graph";

interface LineageGraphClientProps {
  graph: LineageGraphResult;
}

// Layout constants
const COL_WIDTH = 280;
const ROW_HEIGHT = 110;
const COLS = {
  "enrichment-source": -2,
  "derivation-trace": -1,
  subject: 0,
  "astra-proposal": 1,
  "audit-log": 2,
  "ontology-obligation": -1,
  "operator-profile": -2,
};

const STYLE_BY_KIND: Record<
  LineageNodeKind,
  { bg: string; border: string; label: string }
> = {
  subject: {
    bg: "#064E3B",
    border: "#10B981",
    label: "#A7F3D0",
  },
  "derivation-trace": {
    bg: "#0E3A5C",
    border: "#06B6D4",
    label: "#A5F3FC",
  },
  "astra-proposal": {
    bg: "#3B1F66",
    border: "#A78BFA",
    label: "#DDD6FE",
  },
  "audit-log": {
    bg: "#1E293B",
    border: "#64748B",
    label: "#CBD5E1",
  },
  "enrichment-source": {
    bg: "#4A2C0E",
    border: "#F59E0B",
    label: "#FED7AA",
  },
  "ontology-obligation": {
    bg: "#1E293B",
    border: "#475569",
    label: "#CBD5E1",
  },
  "operator-profile": {
    bg: "#1E293B",
    border: "#475569",
    label: "#CBD5E1",
  },
};

const EDGE_COLOR_BY_KIND: Record<LineageEdge["kind"], string> = {
  "derives-from": "#06B6D4",
  "proposed-by": "#A78BFA",
  "audited-by": "#94A3B8",
  "sources-from": "#F59E0B",
  "matched-from-ontology": "#94A3B8",
};

export function LineageGraphClient({ graph }: LineageGraphClientProps) {
  const { nodes, edges } = useMemo(() => layoutGraph(graph), [graph]);

  if (graph.nodes.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg border border-slate-800 overflow-hidden"
      style={{ height: 520 }}
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.25}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#1E293B"
          />
          <Controls
            position="bottom-right"
            showInteractive={false}
            style={{
              background: "#0F172A",
              border: "1px solid #1E293B",
              borderRadius: 6,
            }}
          />
          <MiniMap
            position="top-right"
            nodeColor={(n) => {
              const kind = (n.data as { kind?: LineageNodeKind })?.kind;
              return kind ? STYLE_BY_KIND[kind].border : "#475569";
            }}
            maskColor="rgba(15, 23, 42, 0.7)"
            style={{
              background: "#0F172A",
              border: "1px solid #1E293B",
            }}
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────────

function layoutGraph(graph: LineageGraphResult): {
  nodes: RFNode[];
  edges: RFEdge[];
} {
  // Group nodes by kind to compute per-column y-offset.
  const counters = new Map<LineageNodeKind, number>();
  const nodes: RFNode[] = graph.nodes.map((n) => {
    const col = COLS[n.kind] ?? 0;
    const rowIndex = counters.get(n.kind) ?? 0;
    counters.set(n.kind, rowIndex + 1);

    const style = STYLE_BY_KIND[n.kind];
    return {
      id: n.id,
      data: { label: renderNodeLabel(n), kind: n.kind },
      position: {
        x: col * COL_WIDTH,
        y: rowIndex * ROW_HEIGHT,
      },
      style: {
        background: style.bg,
        border: `1.5px solid ${style.border}`,
        color: style.label,
        borderRadius: 8,
        padding: 10,
        width: COL_WIDTH - 40,
        fontSize: 12,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      },
    };
  });

  const edges: RFEdge[] = graph.edges.map((e, i) => ({
    id: `edge-${i}`,
    source: e.fromId,
    target: e.toId,
    label: e.kind,
    type: "smoothstep",
    animated: false,
    style: {
      stroke: EDGE_COLOR_BY_KIND[e.kind],
      strokeWidth: 1.4,
    },
    labelStyle: {
      fill: EDGE_COLOR_BY_KIND[e.kind],
      fontSize: 10,
      fontFamily: "ui-monospace, SFMono-Regular, monospace",
    },
    labelBgStyle: { fill: "#0F172A", fillOpacity: 0.9 },
    labelBgPadding: [4, 2],
    labelBgBorderRadius: 4,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: EDGE_COLOR_BY_KIND[e.kind],
      width: 12,
      height: 12,
    },
  }));

  return { nodes, edges };
}

function renderNodeLabel(n: LineageNode): string {
  const lines: string[] = [n.label];
  if (n.confidence !== undefined) {
    lines.push(`conf=${n.confidence.toFixed(2)}`);
  }
  if (n.verificationTier) {
    lines.push(n.verificationTier);
  }
  return lines.join("\n");
}
