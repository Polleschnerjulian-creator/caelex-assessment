"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface ForgeNode {
  id: string;
  type: string;
  x: number;
  y: number;
  status: string;
  statusColor: string;
}

interface NodeTemplate {
  title: string;
  color: string;
  icon: string;
  params: Array<{ k: string; v: string }>;
  status: string;
  statusColor: string;
}

const NODE_TEMPLATES: Record<string, NodeTemplate> = {
  launch: {
    title: "Launch Event",
    color: "#30E8A0",
    icon: "\uD83D\uDE80",
    params: [
      { k: "Vehicle", v: "Ariane 6" },
      { k: "Payload", v: "4x SAR Satellite" },
      { k: "Orbit", v: "LEO 520km" },
      { k: "Date", v: "2026-Q3" },
    ],
    status: "READY",
    statusColor: "var(--accent)",
  },
  constellation: {
    title: "Constellation",
    color: "#5BA8E8",
    icon: "\u25CE",
    params: [
      { k: "Satellites", v: "12" },
      { k: "Planes", v: "3" },
      { k: "Phase", v: "Walker Delta" },
      { k: "Alt", v: "550 km" },
    ],
    status: "CONFIG",
    statusColor: "var(--warning)",
  },
  conjunction: {
    title: "Conjunction Check",
    color: "#E8A838",
    icon: "\u26A0",
    params: [
      { k: "Window", v: "72 hours" },
      { k: "Threshold", v: "< 1 km" },
      { k: "Objects", v: "All tracked" },
      { k: "Method", v: "Monte Carlo" },
    ],
    status: "PENDING",
    statusColor: "var(--text-dim)",
  },
  compliance: {
    title: "Compliance Gate",
    color: "#30E8A0",
    icon: "\u2713",
    params: [
      { k: "Framework", v: "EU Space Act" },
      { k: "Articles", v: "7, 12, 15" },
      { k: "NIS2", v: "Enabled" },
      { k: "Verity", v: "Required" },
    ],
    status: "PENDING",
    statusColor: "var(--text-dim)",
  },
  deorbit: {
    title: "Deorbit Plan",
    color: "#E84848",
    icon: "\u2193",
    params: [
      { k: "Method", v: "Controlled" },
      { k: "Target", v: "SPOUA" },
      { k: "Timeline", v: "25 years" },
      { k: "Fuel", v: "12.4 kg" },
    ],
    status: "PENDING",
    statusColor: "var(--text-dim)",
  },
  maneuver: {
    title: "Orbit Maneuver",
    color: "#C07AE8",
    icon: "\u2197",
    params: [
      { k: "Type", v: "Hohmann" },
      { k: "Delta-V", v: "142 m/s" },
      { k: "Duration", v: "45 min" },
      { k: "Fuel", v: "8.2 kg" },
    ],
    status: "PENDING",
    statusColor: "var(--text-dim)",
  },
};

const LIBRARY_ITEMS: Array<{
  type: string;
  icon: string;
  title: string;
  desc: string;
}> = [
  {
    type: "launch",
    icon: "\uD83D\uDE80",
    title: "Launch Event",
    desc: "Define a new satellite launch with payload config",
  },
  {
    type: "constellation",
    icon: "\u25CE",
    title: "Constellation",
    desc: "Deploy a satellite constellation in formation",
  },
  {
    type: "conjunction",
    icon: "\u26A0",
    title: "Conjunction Check",
    desc: "Evaluate collision risk with tracked objects",
  },
  {
    type: "compliance",
    icon: "\u2713",
    title: "Compliance Gate",
    desc: "Validate against EU Space Act & NIS2",
  },
  {
    type: "deorbit",
    icon: "\u2193",
    title: "Deorbit Plan",
    desc: "Plan controlled deorbit & disposal",
  },
  {
    type: "maneuver",
    icon: "\u2197",
    title: "Orbit Maneuver",
    desc: "Hohmann transfer & station-keeping burns",
  },
];

interface EphemerisForgeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EphemerisForgeOverlay({
  isOpen,
  onClose,
}: EphemerisForgeOverlayProps) {
  const [nodes, setNodes] = useState<ForgeNode[]>([]);
  const [simBadge, setSimBadge] = useState<{
    text: string;
    bg: string;
    color: string;
  }>({
    text: "LIVE",
    bg: "rgba(48,232,160,0.1)",
    color: "var(--accent)",
  });
  const [running, setRunning] = useState(false);
  const nodeIdCounter = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    nodeId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Seed default nodes on first open
  useEffect(() => {
    if (isOpen && nodes.length === 0) {
      const defaults: Array<{ type: string; x: number; y: number }> = [
        { type: "launch", x: 80, y: 120 },
        { type: "constellation", x: 350, y: 80 },
        { type: "conjunction", x: 620, y: 160 },
        { type: "compliance", x: 890, y: 120 },
      ];
      const newNodes = defaults.map((d) => {
        const id = `fn-${nodeIdCounter.current++}`;
        const tmpl = NODE_TEMPLATES[d.type];
        return {
          id,
          type: d.type,
          x: d.x,
          y: d.y,
          status: tmpl.status,
          statusColor: tmpl.statusColor,
        };
      });
      setNodes(newNodes);
    }
  }, [isOpen, nodes.length]);

  const addNode = useCallback((type: string) => {
    const id = `fn-${nodeIdCounter.current++}`;
    const tmpl = NODE_TEMPLATES[type];
    if (!tmpl) return;
    setNodes((prev) => [
      ...prev,
      {
        id,
        type,
        x: 100 + Math.random() * 400,
        y: 60 + Math.random() * 200,
        status: tmpl.status,
        statusColor: tmpl.statusColor,
      },
    ]);
  }, []);

  const clearForge = useCallback(() => {
    setNodes([]);
    setSimBadge({
      text: "LIVE",
      bg: "rgba(48,232,160,0.1)",
      color: "var(--accent)",
    });
  }, []);

  const runSimulation = useCallback(() => {
    if (running || nodes.length === 0) return;
    setRunning(true);

    nodes.forEach((_, i) => {
      setTimeout(() => {
        setNodes((prev) =>
          prev.map((n, idx) =>
            idx === i
              ? { ...n, status: "PROCESSING", statusColor: "var(--warning)" }
              : n,
          ),
        );
        setTimeout(() => {
          setNodes((prev) =>
            prev.map((n, idx) => {
              if (idx !== i) return n;
              const isWarning = n.type === "conjunction" && Math.random() > 0.5;
              return {
                ...n,
                status: isWarning ? "WARNING" : "PASSED",
                statusColor: isWarning ? "var(--warning)" : "var(--nominal)",
              };
            }),
          );
        }, 800);
      }, i * 1200);
    });

    setTimeout(
      () => {
        setRunning(false);
        setSimBadge({
          text: "SIMULATED",
          bg: "rgba(232,168,56,0.15)",
          color: "var(--warning)",
        });
      },
      nodes.length * 1200 + 1000,
    );
  }, [running, nodes]);

  // Drag handling
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if ((e.target as HTMLElement).classList.contains("eph-fn-port")) return;
      e.stopPropagation();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      dragRef.current = {
        nodeId,
        startX: e.clientX,
        startY: e.clientY,
        origX: node.x,
        origY: node.y,
      };
    },
    [nodes],
  );

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === dragRef.current!.nodeId
            ? {
                ...n,
                x: dragRef.current!.origX + dx,
                y: dragRef.current!.origY + dy,
              }
            : n,
        ),
      );
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Build SVG connection paths
  const connections = nodes.slice(0, -1).map((a, i) => {
    const b = nodes[i + 1];
    const ax = a.x + 180;
    const ay = a.y + 50;
    const bx = b.x;
    const by = b.y + 50;
    const midX = (ax + bx) / 2;
    return {
      key: `${a.id}-${b.id}`,
      d: `M${ax},${ay} C${midX},${ay} ${midX},${by} ${bx},${by}`,
      delay: i,
    };
  });

  return (
    <div className={`eph-forge-overlay ${isOpen ? "open" : ""}`}>
      <div className="eph-forge-topbar">
        <div className="eph-forge-title">
          Ephemeris Forge
          <span className="eph-ft-badge">Simulation</span>
        </div>
        <div className="eph-forge-actions">
          <button className="eph-forge-btn" onClick={clearForge}>
            Clear
          </button>
          <button className="eph-forge-btn" onClick={() => addNode("launch")}>
            + Add Node
          </button>
          <button
            className="eph-forge-btn primary"
            onClick={runSimulation}
            style={running ? { opacity: 0.6 } : undefined}
          >
            {running ? "\u23F3 Running..." : "\u25B6 Run Simulation"}
          </button>
          <button className="eph-forge-btn" onClick={onClose}>
            \u2715 Close
          </button>
        </div>
      </div>

      <div className="eph-forge-body">
        <svg className="eph-forge-connections" ref={svgRef}>
          {connections.map((c) => (
            <g key={c.key}>
              <path
                d={c.d}
                stroke="rgba(48,232,160,0.2)"
                strokeWidth="1.5"
                fill="none"
                strokeDasharray="4,4"
              />
              <circle r="3" fill="#30E8A0" opacity="0.6">
                <animateMotion
                  dur={`${2 + c.delay * 0.5}s`}
                  repeatCount="indefinite"
                  path={c.d}
                />
              </circle>
            </g>
          ))}
        </svg>

        <div className="eph-forge-canvas" ref={canvasRef}>
          {/* Mini globe preview */}
          <div className="eph-forge-mini-globe">
            <div className="eph-fmg-label">PREVIEW</div>
            <div
              className="eph-fmg-badge"
              style={{ background: simBadge.bg, color: simBadge.color }}
            >
              {simBadge.text}
            </div>
          </div>

          {/* Nodes */}
          {nodes.map((node) => {
            const tmpl = NODE_TEMPLATES[node.type];
            if (!tmpl) return null;
            return (
              <div
                key={node.id}
                className={`eph-forge-node ${node.status === "PROCESSING" ? "active" : ""}`}
                style={{ left: node.x, top: node.y }}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
              >
                <div className="eph-fn-port in" />
                <div className="eph-fn-port out" />
                <div className="eph-fn-header">
                  <div
                    className="eph-fn-type"
                    style={{
                      background: tmpl.color,
                      boxShadow: `0 0 6px ${tmpl.color}`,
                    }}
                  />
                  <div className="eph-fn-title">{tmpl.title}</div>
                </div>
                <div className="eph-fn-body">
                  {tmpl.params.map((p) => (
                    <div key={p.k} className="eph-fn-param">
                      <span>{p.k}</span>
                      <span className="eph-fnv">{p.v}</span>
                    </div>
                  ))}
                </div>
                <div className="eph-fn-footer">
                  <div
                    className="eph-fn-status"
                    style={{
                      background: `${tmpl.color}15`,
                      color: node.statusColor,
                    }}
                  >
                    {node.status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar */}
        <div className="eph-forge-sidebar">
          <div className="eph-fs-title">Node Library</div>
          {LIBRARY_ITEMS.map((item) => (
            <div
              key={item.type}
              className="eph-fs-item"
              onClick={() => addNode(item.type)}
            >
              <div className="eph-fs-item-icon">{item.icon}</div>
              <div className="eph-fs-item-title">{item.title}</div>
              <div className="eph-fs-item-desc">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
