"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";

interface ComplianceSegment {
  name: string;
  value: number;
  color: string;
}

interface ComplianceDonutChartProps {
  data: ComplianceSegment[];
  totalScore: number;
  isDemo?: boolean;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--text-primary)]/95/95 backdrop-blur-sm border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-xl">
        <p className="text-[var(--text-primary)] text-body font-medium">
          {payload[0].name}
        </p>
        <p className="text-[var(--text-secondary)] text-small">
          {payload[0].value}% compliant
        </p>
      </div>
    );
  }
  return null;
};

export default function ComplianceDonutChart({
  data,
  totalScore,
  isDemo,
}: ComplianceDonutChartProps) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative h-[280px] w-full"
    >
      <div role="img" aria-label="Overall compliance score donut chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Center Score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.span
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-[42px] font-bold text-[var(--text-primary)]"
        >
          {totalScore}%
        </motion.span>
        <motion.span
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-caption uppercase tracking-wider text-[var(--text-secondary)]"
        >
          Overall
        </motion.span>
      </div>

      {/* Demo Badge */}
      {isDemo && (
        <div className="absolute top-0 right-0 bg-[var(--accent-warning)]/20 border border-amber-500/30 text-[var(--accent-warning)] text-micro px-2 py-1 rounded">
          SAMPLE DATA
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 flex-wrap px-4">
        {data.map((segment, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-caption text-[var(--text-secondary)]">
              {segment.name}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
