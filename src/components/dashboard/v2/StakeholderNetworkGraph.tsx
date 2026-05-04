import {
  Building2,
  Scale,
  Shield,
  ClipboardCheck,
  Truck,
  Landmark,
  Users,
  Rocket,
  UserCircle2,
  Network,
} from "lucide-react";
import type { StakeholderType } from "@prisma/client";

import type {
  StakeholderNetworkGraph as GraphData,
  StakeholderNode,
  StakeholderEdge,
} from "@/lib/comply-v2/stakeholder-graph.server";

/**
 * StakeholderNetworkGraph — Sprint 10E (Wow-Pattern #11)
 *
 * Radial SVG visualization. Server-rendered (no "use client") since
 * the layout is deterministic + static — the only interactivity is
 * the hover-title tooltips, which work with native SVG <title>.
 *
 * # Layout
 *
 *   - Operator at viewport centre (cx, cy)
 *   - Internal members on a tight inner ring (radius = innerR)
 *   - External stakeholders on a wider outer ring (radius = outerR)
 *   - Each ring's nodes evenly spaced by angular position; small
 *     per-type rotation offset clusters same-type stakeholders
 *
 * # Why no D3 / force simulation
 *
 * Force-directed layouts add ~50KB of dep weight + a hydration
 * cost per page view. For ≤30-stakeholder operators (typical
 * Caelex scale) a deterministic radial layout is more readable
 * AND zero-cost. We can swap in a force layout later if a
 * real-world operator hits the limit.
 *
 * # Why server component
 *
 * The graph data is fully snapshot at request time; no SSE, no
 * client state. Server-rendering keeps the bundle smaller and
 * lets this page deep-link cleanly into Sprint 8C/10C verify
 * surfaces if we add edge-level "view attestations" links later.
 */

export interface StakeholderNetworkGraphProps {
  graph: GraphData;
}

const VIEW_W = 720;
const VIEW_H = 580;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const INNER_R = 110;
const OUTER_R = 230;

// ─── Type metadata ───────────────────────────────────────────────────────

const TYPE_META: Record<
  StakeholderType,
  {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    fill: string; // SVG-compatible colour string
    ring: string; // tailwind ring colour for badges
  }
> = {
  LEGAL_COUNSEL: {
    label: "Legal Counsel",
    Icon: Scale,
    fill: "rgb(96 165 250)", // blue-400
    ring: "ring-blue-500/30",
  },
  INSURER: {
    label: "Insurer",
    Icon: Shield,
    fill: "rgb(167 139 250)", // violet-400
    ring: "ring-violet-500/30",
  },
  AUDITOR: {
    label: "Auditor",
    Icon: ClipboardCheck,
    fill: "rgb(244 114 182)", // pink-400
    ring: "ring-pink-500/30",
  },
  SUPPLIER: {
    label: "Supplier",
    Icon: Truck,
    fill: "rgb(251 146 60)", // orange-400
    ring: "ring-orange-500/30",
  },
  NCA: {
    label: "NCA",
    Icon: Landmark,
    fill: "rgb(252 211 77)", // amber-300
    ring: "ring-amber-500/30",
  },
  CONSULTANT: {
    label: "Consultant",
    Icon: Users,
    fill: "rgb(156 163 175)", // slate-400
    ring: "ring-slate-500/30",
  },
  LAUNCH_PROVIDER: {
    label: "Launch Provider",
    Icon: Rocket,
    fill: "rgb(34 211 238)", // cyan-400
    ring: "ring-cyan-500/30",
  },
};

const OPERATOR_FILL = "rgb(52 211 153)"; // emerald-400
const INTERNAL_FILL = "rgb(229 231 235)"; // slate-200

// ─── Public component ────────────────────────────────────────────────────

export function StakeholderNetworkGraph({
  graph,
}: StakeholderNetworkGraphProps) {
  const operatorNode = graph.nodes.find((n) => n.kind === "operator");
  const internalNodes = graph.nodes.filter((n) => n.kind === "internal");
  const externalNodes = graph.nodes.filter((n) => n.kind === "external");

  // Sort externals by type so same-type clusters land adjacent on
  // the ring. Within a type, order by weight desc so the busiest
  // engagement is most prominent.
  const sortedExternals = [...externalNodes].sort((a, b) => {
    if (a.type !== b.type) return (a.type ?? "").localeCompare(b.type ?? "");
    return b.weight - a.weight;
  });

  const positions = computePositions(
    internalNodes,
    sortedExternals,
    operatorNode?.id ?? null,
  );

  const maxWeight = Math.max(1, ...graph.nodes.map((n) => n.weight));

  return (
    <div data-testid="stakeholder-graph" className="space-y-4">
      <SummaryBar graph={graph} />

      <div className="palantir-surface rounded-md p-4">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-[560px] w-full"
          aria-label={`Stakeholder network graph with ${graph.nodes.length} nodes`}
        >
          {/* Background rings — give the eye a frame */}
          <circle
            cx={CX}
            cy={CY}
            r={INNER_R}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
          <circle
            cx={CX}
            cy={CY}
            r={OUTER_R}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />

          {/* Edges — drawn before nodes so nodes sit on top */}
          {graph.edges.map((edge) => {
            const fromPos = positions.get(edge.from);
            const toPos = positions.get(edge.to);
            if (!fromPos || !toPos) return null;
            return (
              <Edge
                key={`${edge.from}-${edge.to}`}
                edge={edge}
                from={fromPos}
                to={toPos}
              />
            );
          })}

          {/* Nodes */}
          {graph.nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            return (
              <NodeDot
                key={node.id}
                node={node}
                pos={pos}
                maxWeight={maxWeight}
              />
            );
          })}

          {/* Labels — drawn last so they win over node strokes */}
          {graph.nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            return <NodeLabel key={`label-${node.id}`} node={node} pos={pos} />;
          })}
        </svg>
      </div>

      <Legend />
    </div>
  );
}

// ─── Layout math ─────────────────────────────────────────────────────────

interface NodePosition {
  x: number;
  y: number;
  /** True when the node is "below the centreline" — labels render
   *  above the dot in that case to avoid clashing with the
   *  bottom-of-svg edge. */
  belowCentreLine: boolean;
}

function computePositions(
  internals: StakeholderNode[],
  externals: StakeholderNode[],
  operatorId: string | null,
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();

  if (operatorId) {
    positions.set(operatorId, {
      x: CX,
      y: CY,
      belowCentreLine: false,
    });
  }

  // Internals on inner ring, evenly spaced. Start angle at -π/2
  // (top of ring) so the layout always feels stable.
  const innerCount = internals.length;
  for (let i = 0; i < innerCount; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / innerCount;
    const x = CX + INNER_R * Math.cos(angle);
    const y = CY + INNER_R * Math.sin(angle);
    positions.set(internals[i].id, { x, y, belowCentreLine: y > CY });
  }

  // Externals on outer ring, evenly spaced. Same start angle —
  // visually pairs an internal node radially-outward with an
  // external node when counts roughly match.
  const externalCount = externals.length;
  for (let i = 0; i < externalCount; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / externalCount;
    const x = CX + OUTER_R * Math.cos(angle);
    const y = CY + OUTER_R * Math.sin(angle);
    positions.set(externals[i].id, { x, y, belowCentreLine: y > CY });
  }

  return positions;
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function NodeDot({
  node,
  pos,
  maxWeight,
}: {
  node: StakeholderNode;
  pos: NodePosition;
  maxWeight: number;
}) {
  const baseR =
    node.kind === "operator" ? 24 : node.kind === "internal" ? 6 : 9;
  const weightR =
    node.weight > 0 ? Math.min(8, (node.weight / maxWeight) * 8) : 0;
  const r = baseR + weightR;

  const fill =
    node.kind === "operator"
      ? OPERATOR_FILL
      : node.kind === "internal"
        ? INTERNAL_FILL
        : node.type
          ? TYPE_META[node.type].fill
          : "rgb(148 163 184)";

  const title =
    node.kind === "operator"
      ? `Operator · ${node.label}`
      : node.kind === "internal"
        ? `Team · ${node.label} (${node.subLabel ?? "member"})`
        : `${node.type ? TYPE_META[node.type].label : "Stakeholder"} · ${node.label}${node.weight > 0 ? ` · ${node.weight} engagements` : ""}`;

  return (
    <g data-testid="stakeholder-node" data-kind={node.kind}>
      <circle
        cx={pos.x}
        cy={pos.y}
        r={r}
        fill={fill}
        opacity={0.95}
        stroke="rgba(15, 23, 42, 0.8)"
        strokeWidth={2}
      >
        <title>{title}</title>
      </circle>
    </g>
  );
}

function NodeLabel({
  node,
  pos,
}: {
  node: StakeholderNode;
  pos: NodePosition;
}) {
  if (node.kind === "operator") {
    return (
      <text
        x={pos.x}
        y={pos.y + 5}
        textAnchor="middle"
        fontSize={11}
        fontFamily="monospace"
        fontWeight={700}
        fill="rgb(15 23 42)"
        pointerEvents="none"
      >
        {truncate(node.label, 14)}
      </text>
    );
  }

  // External + internal — draw label OUTSIDE the dot toward the
  // ring radius (push outward by 14px). Below-centreline labels
  // sit below the dot; above sit above.
  const angle = Math.atan2(pos.y - CY, pos.x - CX);
  const labelX = pos.x + 14 * Math.cos(angle);
  const labelY = pos.y + 14 * Math.sin(angle);
  const anchor =
    Math.cos(angle) > 0.3 ? "start" : Math.cos(angle) < -0.3 ? "end" : "middle";

  return (
    <text
      x={labelX}
      y={labelY}
      textAnchor={anchor}
      fontSize={9}
      fontFamily="monospace"
      fontWeight={500}
      fill="rgb(226 232 240)"
      pointerEvents="none"
    >
      {truncate(node.label, 18)}
    </text>
  );
}

function Edge({
  edge,
  from,
  to,
}: {
  edge: StakeholderEdge;
  from: NodePosition;
  to: NodePosition;
}) {
  const opacity = Math.min(0.7, 0.2 + edge.weight * 0.08);
  const strokeWidth = Math.max(0.5, Math.min(2.5, 0.5 + edge.weight * 0.25));
  return (
    <line
      data-testid="stakeholder-edge"
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke="rgb(52 211 153)"
      strokeOpacity={opacity}
      strokeWidth={strokeWidth}
    />
  );
}

function SummaryBar({ graph }: { graph: GraphData }) {
  const types = Object.entries(graph.totals.perType).filter(([, n]) => n > 0);
  return (
    <div className="palantir-surface flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md p-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">
      <span className="inline-flex items-center gap-1.5 text-emerald-300">
        <Building2 className="h-3 w-3" />
        {graph.operatorName}
      </span>
      <span className="inline-flex items-center gap-1.5 text-slate-300">
        <UserCircle2 className="h-3 w-3" />
        {graph.totals.internal} internal
      </span>
      <span className="inline-flex items-center gap-1.5 text-slate-300">
        <Network className="h-3 w-3" />
        {graph.totals.external} external
      </span>
      {types.map(([type, count]) => {
        const meta = TYPE_META[type as StakeholderType];
        const Icon = meta.Icon;
        return (
          <span
            key={type}
            data-testid="stakeholder-type-count"
            className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 ring-1 ring-inset ${meta.ring}`}
          >
            <Icon className="h-3 w-3" />
            {meta.label} · {count}
          </span>
        );
      })}
    </div>
  );
}

function Legend() {
  return (
    <div className="palantir-surface rounded-md p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
        Legend
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        <LegendDot color={OPERATOR_FILL} label="Operator (centre)" />
        <LegendDot color={INTERNAL_FILL} label="Team member (inner ring)" />
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <LegendDot key={type} color={meta.fill} label={meta.label} />
        ))}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
