"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { motion } from "framer-motion";

interface RadarDataPoint {
  category: string;
  value: number;
  fullMark: number;
}

interface RegulatoryRadarChartProps {
  data: RadarDataPoint[];
  isDemo?: boolean;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: RadarDataPoint }>;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[var(--text-primary)]/95/95 backdrop-blur-sm border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-xl">
        <p className="text-[var(--text-primary)] text-body font-medium">
          {data.category}
        </p>
        <p className="text-[var(--text-secondary)] text-small">
          {data.value}% coverage
        </p>
      </div>
    );
  }
  return null;
};

export default function RegulatoryRadarChart({
  data,
  isDemo,
}: RegulatoryRadarChartProps) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative h-[280px] w-full"
    >
      {isDemo && (
        <div className="absolute top-0 right-0 z-10 bg-[var(--accent-warning)]/20 border border-amber-500/30 text-[var(--accent-warning)] text-micro px-2 py-1 rounded">
          SAMPLE DATA
        </div>
      )}

      <div role="img" aria-label="Regulatory coverage radar chart">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="var(--fill-heavy)" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "var(--text-tertiary)", fontSize: 9 }}
              tickFormatter={(value) => `${value}%`}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Target (100%) ring */}
            <Radar
              name="Target"
              dataKey="fullMark"
              stroke="var(--fill-heavy)"
              fill="transparent"
              strokeDasharray="4 4"
            />
            {/* Actual coverage */}
            <Radar
              name="Coverage"
              dataKey="value"
              stroke="#10B981"
              strokeWidth={2}
              fill="#10B981"
              fillOpacity={0.25}
              animationBegin={0}
              animationDuration={800}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
