"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import { motion } from "framer-motion";

interface ModuleData {
  name: string;
  shortName: string;
  progress: number;
  status: "complete" | "in-progress" | "at-risk" | "not-started";
}

interface ModuleProgressChartProps {
  data: ModuleData[];
  isDemo?: boolean;
}

const getStatusColor = (status: string, progress: number): string => {
  if (status === "not-started" || progress === 0) return "#4B5563"; // Gray
  if (progress >= 75) return "#22C55E"; // Green
  if (progress >= 25) return "#F59E0B"; // Amber
  return "#EF4444"; // Red
};

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ModuleData }>;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[var(--text-primary)]/95/95 backdrop-blur-sm border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-xl">
        <p className="text-[var(--text-primary)] text-body font-medium">
          {data.name}
        </p>
        <p className="text-[var(--text-secondary)] text-small">
          {data.progress}% complete
        </p>
      </div>
    );
  }
  return null;
};

export default function ModuleProgressChart({
  data,
  isDemo,
}: ModuleProgressChartProps) {
  // Sort by progress descending
  const sortedData = [...data].sort((a, b) => b.progress - a.progress);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="relative h-[280px] w-full"
    >
      {isDemo && (
        <div className="absolute top-0 right-0 z-10 bg-[var(--accent-warning)]/20 border border-amber-500/30 text-[var(--accent-warning)] text-micro px-2 py-1 rounded">
          SAMPLE DATA
        </div>
      )}

      <div role="img" aria-label="Module compliance progress chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 45, left: 0, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
              axisLine={{ stroke: "var(--fill-heavy)" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              width={80}
              tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "var(--fill-light)" }}
            />
            <Bar
              dataKey="progress"
              radius={[0, 4, 4, 0]}
              animationBegin={0}
              animationDuration={800}
              label={{
                position: "right",
                fill: "var(--text-tertiary)",
                fontSize: 11,
                formatter: (value) => `${value}%`,
              }}
            >
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getStatusColor(entry.status, entry.progress)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
