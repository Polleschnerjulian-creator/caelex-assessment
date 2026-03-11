"use client";

interface GraphNode {
  id: string;
  name: string;
  type: string;
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

const STRENGTH_COLORS: Record<string, string> = {
  HARD: "#EF4444",
  SOFT: "#F59E0B",
  REDUNDANT: "#22C55E",
};

const NODE_RADIUS = 28;
const CENTER_X = 200;
const CENTER_Y = 200;
const ORBIT_RADIUS = 130;

function truncate(str: string, max = 12): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

export default function DependencyGraph({
  nodes,
  edges,
}: DependencyGraphProps) {
  const currentNode = nodes.find((n) => n.isCurrent);
  const peripheralNodes = nodes.filter((n) => !n.isCurrent);

  const positioned = peripheralNodes.map((node, i) => {
    const angle =
      (2 * Math.PI * i) / Math.max(peripheralNodes.length, 1) - Math.PI / 2;
    return {
      ...node,
      x: CENTER_X + ORBIT_RADIUS * Math.cos(angle),
      y: CENTER_Y + ORBIT_RADIUS * Math.sin(angle),
    };
  });

  const nodePositions = new Map<string, { x: number; y: number }>();
  nodePositions.set(currentNode?.id ?? "", { x: CENTER_X, y: CENTER_Y });
  positioned.forEach((n) => nodePositions.set(n.id, { x: n.x, y: n.y }));

  const viewSize = 400;

  return (
    <svg
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      width="100%"
      height="100%"
      className="overflow-visible"
      style={{ minHeight: 260 }}
    >
      <defs>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
        </radialGradient>
        <marker
          id="arrowHARD"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill={STRENGTH_COLORS.HARD} />
        </marker>
        <marker
          id="arrowSOFT"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill={STRENGTH_COLORS.SOFT} />
        </marker>
        <marker
          id="arrowREDUNDANT"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill={STRENGTH_COLORS.REDUNDANT} />
        </marker>
      </defs>

      {/* Center glow */}
      <circle cx={CENTER_X} cy={CENTER_Y} r={50} fill="url(#centerGlow)" />

      {/* Orbit ring */}
      <circle
        cx={CENTER_X}
        cy={CENTER_Y}
        r={ORBIT_RADIUS}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      {/* Edges */}
      {edges.map((edge, i) => {
        const src = nodePositions.get(edge.source);
        const tgt = nodePositions.get(edge.target);
        if (!src || !tgt) return null;

        // Shorten the line so it doesn't overlap node circles
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pad = NODE_RADIUS + 2;
        const ex = tgt.x - (dx / dist) * pad;
        const ey = tgt.y - (dy / dist) * pad;
        const sx = src.x + (dx / dist) * pad;
        const sy = src.y + (dy / dist) * pad;

        const color = STRENGTH_COLORS[edge.strength] ?? "#94A3B8";
        const markerId = `arrow${edge.strength}`;

        return (
          <line
            key={i}
            x1={sx}
            y1={sy}
            x2={ex}
            y2={ey}
            stroke={color}
            strokeWidth={1.5}
            strokeOpacity={0.7}
            markerEnd={`url(#${markerId})`}
          />
        );
      })}

      {/* Peripheral nodes */}
      {positioned.map((node) => (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r={NODE_RADIUS}
            fill="rgba(30,41,59,0.9)"
            stroke="rgba(148,163,184,0.3)"
            strokeWidth={1.5}
          />
          <text
            x={node.x}
            y={node.y - 4}
            textAnchor="middle"
            fill="#94A3B8"
            fontSize={8}
            fontWeight={500}
          >
            {truncate(node.name, 10)}
          </text>
          <text
            x={node.x}
            y={node.y + 8}
            textAnchor="middle"
            fill="#64748B"
            fontSize={7}
          >
            {node.type.replace(/_/g, " ").slice(0, 11)}
          </text>
        </g>
      ))}

      {/* Center node */}
      {currentNode && (
        <g>
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={NODE_RADIUS + 4}
            fill="rgba(16,185,129,0.15)"
            stroke="rgba(16,185,129,0.5)"
            strokeWidth={2}
          />
          <text
            x={CENTER_X}
            y={CENTER_Y - 4}
            textAnchor="middle"
            fill="#10B981"
            fontSize={9}
            fontWeight={600}
          >
            {truncate(currentNode.name, 10)}
          </text>
          <text
            x={CENTER_X}
            y={CENTER_Y + 8}
            textAnchor="middle"
            fill="#6EE7B7"
            fontSize={7}
          >
            {currentNode.type.replace(/_/g, " ").slice(0, 14)}
          </text>
        </g>
      )}

      {/* Legend */}
      {["HARD", "SOFT", "REDUNDANT"].map((s, i) => (
        <g key={s} transform={`translate(${8 + i * 95}, ${viewSize - 16})`}>
          <line
            x1={0}
            y1={4}
            x2={14}
            y2={4}
            stroke={STRENGTH_COLORS[s]}
            strokeWidth={2}
          />
          <text x={18} y={8} fill="#64748B" fontSize={8}>
            {s}
          </text>
        </g>
      ))}
    </svg>
  );
}
