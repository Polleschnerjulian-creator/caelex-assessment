"use client";

interface RadarChartProps {
  scores: {
    timeline: number;
    cost: number;
    compliance: number;
    insurance: number;
    liability: number;
    debris: number;
  };
  size?: number;
  color?: string;
}

const AXES = [
  { key: "timeline", label: "Timeline" },
  { key: "cost", label: "Cost" },
  { key: "compliance", label: "Compliance" },
  { key: "insurance", label: "Insurance" },
  { key: "liability", label: "Liability" },
  { key: "debris", label: "Debris" },
] as const;

const GRID_LEVELS = [20, 40, 60, 80, 100];

export default function RadarChart({
  scores,
  size = 240,
  color = "#10B981",
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 30; // Leave room for labels
  const angleStep = (Math.PI * 2) / AXES.length;
  const startAngle = -Math.PI / 2;

  function getPoint(axisIndex: number, value: number) {
    const angle = startAngle + axisIndex * angleStep;
    const r = (value / 100) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  function getGridPolygon(level: number) {
    return AXES.map((_, i) => {
      const pt = getPoint(i, level);
      return `${pt.x},${pt.y}`;
    }).join(" ");
  }

  const dataPoints = AXES.map((axis, i) => getPoint(i, scores[axis.key]));
  const dataPolygon = dataPoints.map((pt) => `${pt.x},${pt.y}`).join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: "visible" }}
    >
      {/* Grid rings */}
      {GRID_LEVELS.map((level) => (
        <polygon
          key={level}
          points={getGridPolygon(level)}
          fill="none"
          className="text-slate-700"
          stroke="currentColor"
          strokeWidth={0.5}
          opacity={0.3}
        />
      ))}

      {/* Axis lines */}
      {AXES.map((_, i) => {
        const end = getPoint(i, 100);
        return (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            className="text-slate-700"
            stroke="currentColor"
            strokeWidth={0.5}
            opacity={0.3}
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={dataPolygon}
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={2}
      />

      {/* Data points */}
      {dataPoints.map((pt, i) => (
        <circle key={`point-${i}`} cx={pt.x} cy={pt.y} r={3} fill={color} />
      ))}

      {/* Labels */}
      {AXES.map((axis, i) => {
        const angle = startAngle + i * angleStep;
        const labelRadius = radius + 16;
        const lx = cx + labelRadius * Math.cos(angle);
        const ly = cy + labelRadius * Math.sin(angle);

        let textAnchor: "middle" | "start" | "end" = "middle";
        if (Math.cos(angle) > 0.1) textAnchor = "start";
        else if (Math.cos(angle) < -0.1) textAnchor = "end";

        let dy = "0.35em";
        if (Math.sin(angle) < -0.5) dy = "0em";
        else if (Math.sin(angle) > 0.5) dy = "0.7em";

        return (
          <text
            key={`label-${i}`}
            x={lx}
            y={ly}
            textAnchor={textAnchor}
            dy={dy}
            className="fill-slate-400"
            style={{
              fontSize: "10px",
              fontFamily: "IBM Plex Mono, monospace",
            }}
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}
