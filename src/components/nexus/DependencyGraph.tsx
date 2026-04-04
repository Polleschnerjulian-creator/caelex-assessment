"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

interface GraphNode {
  id: string;
  name: string;
  type: string;
  criticality?: string;
  isCurrent: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  strength: string;
  type: string;
}

interface DependencyGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ── Force-directed layout simulation ────────────────────────

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  name: string;
  type: string;
  criticality: string;
  isCurrent: boolean;
}

function simulateForces(
  nodes: SimNode[],
  edges: GraphEdge[],
  iterations = 50,
): void {
  for (let i = 0; i < iterations; i++) {
    // Repulsion between all nodes
    for (const a of nodes) {
      for (const b of nodes) {
        if (a === b) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = 5000 / (dist * dist);
        a.vx += (dx / dist) * force;
        a.vy += (dy / dist) * force;
      }
    }
    // Attraction along edges
    for (const edge of edges) {
      const source = nodes.find((n) => n.id === edge.source);
      const target = nodes.find((n) => n.id === edge.target);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (dist - 120) * 0.01;
      source.vx += (dx / dist) * force;
      source.vy += (dy / dist) * force;
      target.vx -= (dx / dist) * force;
      target.vy -= (dy / dist) * force;
    }
    // Apply velocity with damping
    for (const node of nodes) {
      node.x += node.vx * 0.3;
      node.y += node.vy * 0.3;
      node.vx *= 0.8;
      node.vy *= 0.8;
    }
  }
}

// ── Visual constants ────────────────────────────────────────

const CRITICALITY_COLORS: Record<string, string> = {
  CRITICAL: "#EF4444",
  HIGH: "#F59E0B",
  MEDIUM: "#FACC15",
  LOW: "#94A3B8",
};

const STRENGTH_COLORS: Record<string, string> = {
  HARD: "#EF4444",
  SOFT: "#F59E0B",
  REDUNDANT: "#22C55E",
};

const NODE_RADIUS = 28;
const CURRENT_NODE_RADIUS = 36;

function truncate(str: string, max = 12): string {
  return str.length > max ? str.slice(0, max - 1) + "\u2026" : str;
}

function critColor(criticality: string): string {
  return CRITICALITY_COLORS[criticality] ?? "#94A3B8";
}

// ── Component ───────────────────────────────────────────────

export default function DependencyGraph({
  nodes,
  edges,
}: DependencyGraphProps) {
  // -- Force simulation (run once) --
  const simNodes = useMemo<SimNode[]>(() => {
    const WIDTH = 500;
    const HEIGHT = 400;
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    const sn: SimNode[] = nodes.map((n, i) => {
      // Spread initial positions in a noisy circle so the simulation converges
      const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1);
      const jitter = 40 + Math.random() * 60;
      return {
        id: n.id,
        x: n.isCurrent ? cx : cx + jitter * Math.cos(angle),
        y: n.isCurrent ? cy : cy + jitter * Math.sin(angle),
        vx: 0,
        vy: 0,
        name: n.name,
        type: n.type,
        criticality: n.criticality ?? "MEDIUM",
        isCurrent: n.isCurrent,
      };
    });

    simulateForces(sn, edges, 50);
    return sn;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // -- Zoom & pan state --
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 500, h: 400 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ mx: 0, my: 0, vx: 0, vy: 0 });

  // Centre viewBox on the computed layout
  useEffect(() => {
    if (simNodes.length === 0) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of simNodes) {
      const r = n.isCurrent ? CURRENT_NODE_RADIUS : NODE_RADIUS;
      if (n.x - r < minX) minX = n.x - r;
      if (n.y - r < minY) minY = n.y - r;
      if (n.x + r > maxX) maxX = n.x + r;
      if (n.y + r > maxY) maxY = n.y + r;
    }
    const pad = 60;
    setViewBox({
      x: minX - pad,
      y: minY - pad,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
    });
  }, [simNodes]);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox((vb) => {
      const newW = vb.w * factor;
      const newH = vb.h * factor;
      return {
        x: vb.x + (vb.w - newW) / 2,
        y: vb.y + (vb.h - newH) / 2,
        w: newW,
        h: newH,
      };
    });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Only pan on background clicks (not node clicks)
      if ((e.target as SVGElement).closest("[data-node-id]")) return;
      setIsPanning(true);
      panStart.current = {
        mx: e.clientX,
        my: e.clientY,
        vx: viewBox.x,
        vy: viewBox.y,
      };
    },
    [viewBox.x, viewBox.y],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isPanning || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = viewBox.w / rect.width;
      const scaleY = viewBox.h / rect.height;
      const dx = (e.clientX - panStart.current.mx) * scaleX;
      const dy = (e.clientY - panStart.current.my) * scaleY;
      setViewBox((vb) => ({
        ...vb,
        x: panStart.current.vx - dx,
        y: panStart.current.vy - dy,
      }));
    },
    [isPanning, viewBox.w, viewBox.h],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // -- Selection --
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = simNodes.find((n) => n.id === selectedId) ?? null;

  // Build position map for edges
  const posMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const n of simNodes) m.set(n.id, { x: n.x, y: n.y });
    return m;
  }, [simNodes]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: 300 }}>
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        width="100%"
        height="100%"
        className="overflow-visible"
        style={{ minHeight: 260, cursor: isPanning ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          {Object.entries(STRENGTH_COLORS).map(([key, color]) => (
            <marker
              key={key}
              id={`arrow-${key}`}
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill={color} />
            </marker>
          ))}
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const src = posMap.get(edge.source);
          const tgt = posMap.get(edge.target);
          if (!src || !tgt) return null;

          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

          const srcNode = simNodes.find((n) => n.id === edge.source);
          const tgtNode = simNodes.find((n) => n.id === edge.target);
          const srcR = srcNode?.isCurrent ? CURRENT_NODE_RADIUS : NODE_RADIUS;
          const tgtR = tgtNode?.isCurrent ? CURRENT_NODE_RADIUS : NODE_RADIUS;

          const sx = src.x + (dx / dist) * (srcR + 2);
          const sy = src.y + (dy / dist) * (srcR + 2);
          const ex = tgt.x - (dx / dist) * (tgtR + 2);
          const ey = tgt.y - (dy / dist) * (tgtR + 2);

          const color = STRENGTH_COLORS[edge.strength] ?? "#94A3B8";
          const isHighlighted =
            selectedId === edge.source || selectedId === edge.target;

          // Edge label position (midpoint)
          const mx = (sx + ex) / 2;
          const my = (sy + ey) / 2;

          return (
            <g key={i}>
              <line
                x1={sx}
                y1={sy}
                x2={ex}
                y2={ey}
                stroke={color}
                strokeWidth={isHighlighted ? 2.5 : 1.5}
                strokeOpacity={isHighlighted ? 1 : 0.6}
                markerEnd={`url(#arrow-${edge.strength})`}
              />
              {/* Edge label: dependency type */}
              <text
                x={mx}
                y={my - 5}
                textAnchor="middle"
                fill="var(--text-secondary, #94A3B8)"
                fontSize={7}
                opacity={0.8}
              >
                {edge.type.replace(/_/g, " ")}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {simNodes.map((node) => {
          const r = node.isCurrent ? CURRENT_NODE_RADIUS : NODE_RADIUS;
          const isSelected = selectedId === node.id;
          const fillColor = critColor(node.criticality);

          return (
            <g
              key={node.id}
              data-node-id={node.id}
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId((prev) => (prev === node.id ? null : node.id));
              }}
            >
              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 6}
                  fill="none"
                  stroke={fillColor}
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  opacity={0.7}
                />
              )}

              {/* Current-node glow */}
              {node.isCurrent && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 10}
                  fill={fillColor}
                  opacity={0.1}
                />
              )}

              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill="rgba(30,41,59,0.9)"
                stroke={fillColor}
                strokeWidth={node.isCurrent ? 2.5 : 1.5}
                strokeOpacity={node.isCurrent ? 0.9 : 0.5}
              />

              {/* Node label */}
              <text
                x={node.x}
                y={node.y - 4}
                textAnchor="middle"
                fill="var(--text-primary, #E2E8F0)"
                fontSize={node.isCurrent ? 9 : 8}
                fontWeight={node.isCurrent ? 600 : 500}
              >
                {truncate(node.name, node.isCurrent ? 14 : 10)}
              </text>

              {/* Node type */}
              <text
                x={node.x}
                y={node.y + 8}
                textAnchor="middle"
                fill="var(--text-secondary, #64748B)"
                fontSize={7}
              >
                {node.type
                  .replace(/_/g, " ")
                  .slice(0, node.isCurrent ? 14 : 11)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend: criticality colors */}
      <div
        className="absolute bottom-2 left-2 flex flex-wrap gap-3"
        style={{ pointerEvents: "none" }}
      >
        {Object.entries(CRITICALITY_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: color,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: "var(--text-secondary, #94A3B8)",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Legend: edge strength */}
      <div
        className="absolute bottom-2 right-2 flex flex-wrap gap-3"
        style={{ pointerEvents: "none" }}
      >
        {Object.entries(STRENGTH_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1">
            <span
              style={{
                width: 14,
                height: 2,
                backgroundColor: color,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: "var(--text-secondary, #94A3B8)",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Selected node detail panel */}
      {selectedNode && (
        <div
          className="absolute top-2 right-2 glass-elevated rounded-lg p-3"
          style={{
            maxWidth: 200,
            fontSize: 11,
            color: "var(--text-primary, #E2E8F0)",
            pointerEvents: "auto",
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-xs">{selectedNode.name}</span>
            <button
              className="text-xs opacity-60 hover:opacity-100"
              onClick={() => setSelectedId(null)}
              style={{ color: "var(--text-secondary, #94A3B8)" }}
            >
              &times;
            </button>
          </div>
          <div
            className="text-micro uppercase mb-1"
            style={{ color: "var(--text-secondary, #94A3B8)" }}
          >
            {selectedNode.type.replace(/_/g, " ")}
          </div>
          <div className="flex items-center gap-1 mb-1">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: critColor(selectedNode.criticality),
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 10 }}>{selectedNode.criticality}</span>
          </div>
          {selectedNode.isCurrent && (
            <div
              className="text-micro mt-1"
              style={{ color: "var(--text-secondary, #94A3B8)" }}
            >
              Current asset
            </div>
          )}
          <div
            className="text-micro mt-1"
            style={{ color: "var(--text-secondary, #94A3B8)" }}
          >
            {
              edges.filter(
                (e) =>
                  e.source === selectedNode.id || e.target === selectedNode.id,
              ).length
            }{" "}
            connection(s)
          </div>
        </div>
      )}
    </div>
  );
}
