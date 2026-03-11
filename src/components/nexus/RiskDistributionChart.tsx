"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import GlassCard from "@/components/ui/GlassCard";

interface RiskDataPoint {
  criticality: string;
  count: number;
}

interface RiskDistributionChartProps {
  data: RiskDataPoint[];
}

const CRITICALITY_COLORS: Record<string, string> = {
  CRITICAL: "#EF4444",
  HIGH: "#F59E0B",
  MEDIUM: "#3B82F6",
  LOW: "#94A3B8",
};

const CRITICALITY_LABELS: Record<string, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: RiskDataPoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const entry = payload[0];
  return (
    <div className="glass-floating rounded-lg px-3 py-2 text-small border border-[var(--glass-border)]">
      <p className="text-slate-200 font-medium">
        {CRITICALITY_LABELS[entry.payload.criticality] ??
          entry.payload.criticality}
      </p>
      <p className="text-slate-400">{entry.value} assets</p>
    </div>
  );
}

export default function RiskDistributionChart({
  data,
}: RiskDistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const chartData = data.map((d) => ({
    ...d,
    name: CRITICALITY_LABELS[d.criticality] ?? d.criticality,
    fill: CRITICALITY_COLORS[d.criticality] ?? "#94A3B8",
  }));

  return (
    <GlassCard hover={false} className="p-5">
      <h3 className="text-title font-semibold text-heading mb-1">
        Risk Distribution
      </h3>
      <p className="text-small text-slate-400 mb-4">
        Assets by criticality level
      </p>

      {total === 0 ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-body">
          No asset data available
        </div>
      ) : (
        <>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-3 space-y-1.5">
            {chartData.map((entry) => (
              <div
                key={entry.criticality}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span className="text-small text-slate-400">
                    {entry.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-small font-medium text-slate-200">
                    {entry.count}
                  </span>
                  <span className="text-caption text-slate-500">
                    {total > 0 ? ((entry.count / total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--glass-border)]">
            <div className="flex items-center justify-between">
              <span className="text-small text-slate-400">Total assets</span>
              <span className="text-body font-semibold text-slate-200">
                {total}
              </span>
            </div>
          </div>
        </>
      )}
    </GlassCard>
  );
}
