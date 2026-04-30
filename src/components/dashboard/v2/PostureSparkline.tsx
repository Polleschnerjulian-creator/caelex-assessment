"use client";

import * as React from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

/**
 * V2 Posture sparkline — minimal line chart for KPI tiles.
 *
 * Sized to fit inside a Posture KPI card (h-8). No axes, no tooltip,
 * no legend — just the trajectory of one number over time. The
 * delta-vs-first label below the sparkline carries the quantitative
 * information; the line carries the shape.
 *
 * Tone-driven color (emerald for positive trend, amber for stagnant,
 * red for declining) computed from the first vs last value.
 */

export interface PostureSparklineProps {
  data: Array<{ date: string; value: number }>;
  /** Higher-is-better (score, attested) vs lower-is-better (open
   *  proposals, open triage). Drives the trend tone. */
  direction?: "up" | "down";
  /** When true, paints emerald regardless of trend — used for purely
   *  informational sparklines where direction isn't a "good/bad"
   *  signal. */
  neutral?: boolean;
  className?: string;
}

export function PostureSparkline({
  data,
  direction = "up",
  neutral = false,
  className,
}: PostureSparklineProps) {
  if (data.length < 2) {
    // Need at least 2 points to draw a line. Render a flat
    // placeholder so the layout reserves the same height — avoids
    // jank when the second snapshot lands tomorrow.
    return (
      <div
        className={`flex h-8 items-center font-mono text-[9px] uppercase tracking-wider text-slate-600 ${className ?? ""}`}
      >
        {data.length === 0 ? "// no history yet" : "// 1-day window"}
      </div>
    );
  }

  const first = data[0].value;
  const last = data[data.length - 1].value;
  const delta = last - first;

  // Color picks: emerald = improving in the desired direction,
  // amber = ~flat, red = moving against desired direction.
  let stroke = "#34d399"; // emerald-400
  if (!neutral) {
    if (Math.abs(delta) < 1) {
      stroke = "#fbbf24"; // amber-400
    } else if (
      (direction === "up" && delta < 0) ||
      (direction === "down" && delta > 0)
    ) {
      stroke = "#f87171"; // red-400
    }
  }

  const sign = delta > 0 ? "+" : "";
  const deltaLabel =
    Math.abs(delta) < 0.01
      ? "FLAT"
      : `${sign}${delta.toFixed(delta % 1 === 0 ? 0 : 1)}`;

  // Compute padded YAxis domain so flat-ish series don't render a
  // perfectly horizontal line at the top of the chart area.
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(1, (max - min) * 0.15);

  return (
    <div className={`flex flex-col gap-0.5 ${className ?? ""}`}>
      <div className="h-6 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
          >
            <YAxis domain={[min - pad, max + pad]} hide />
            <Line
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div
        className="font-mono text-[9px] uppercase tracking-wider tabular-nums"
        style={{ color: stroke }}
      >
        {deltaLabel} · {data.length}d
      </div>
    </div>
  );
}
