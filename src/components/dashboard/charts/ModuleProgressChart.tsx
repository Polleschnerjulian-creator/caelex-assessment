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
      <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-white text-[13px] font-medium">{data.name}</p>
        <p className="text-white/70 text-[12px]">{data.progress}% complete</p>
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="relative h-[280px] w-full"
    >
      {isDemo && (
        <div className="absolute top-0 right-0 z-10 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-mono px-2 py-1 rounded">
          SAMPLE DATA
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 45, left: 0, bottom: 5 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            width={80}
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
          />
          <Bar
            dataKey="progress"
            radius={[0, 4, 4, 0]}
            animationBegin={0}
            animationDuration={800}
            label={{
              position: "right",
              fill: "rgba(255,255,255,0.7)",
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
    </motion.div>
  );
}
