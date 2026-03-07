"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { motion } from "framer-motion";

interface TimelineDataPoint {
  month: string;
  overall: number;
  eu: number;
  us: number;
  uk: number;
}

interface ComplianceTimelineChartProps {
  data: TimelineDataPoint[];
  isDemo?: boolean;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--text-primary)]/95/95 backdrop-blur-sm border border-[var(--border-default)] rounded-lg px-4 py-3 shadow-xl">
        <p className="text-[var(--text-secondary)] text-caption uppercase tracking-wider mb-2">
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[var(--text-secondary)] text-small capitalize">
              {entry.name}:
            </span>
            <span className="text-[var(--text-primary)] text-small font-medium">
              {entry.value}%
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomLegend = ({
  payload,
}: {
  payload?: Array<{ value: string; color: string }>;
}) => {
  if (!payload) return null;
  return (
    <div className="flex justify-center gap-6 mt-2">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-caption text-[var(--text-secondary)] capitalize">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ComplianceTimelineChart({
  data,
  isDemo,
}: ComplianceTimelineChartProps) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative h-[280px] w-full"
    >
      {isDemo && (
        <div className="absolute top-0 right-0 z-10 bg-[var(--accent-warning)]/20 border border-amber-500/30 text-[var(--accent-warning)] text-micro px-2 py-1 rounded">
          SAMPLE DATA
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorEU" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorUS" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorUK" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--fill-light)" />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
            axisLine={{ stroke: "var(--fill-heavy)" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
            axisLine={{ stroke: "var(--fill-heavy)" }}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          <Area
            type="monotone"
            dataKey="overall"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#colorOverall)"
            animationBegin={0}
            animationDuration={1000}
          />
          <Area
            type="monotone"
            dataKey="eu"
            stroke="#06B6D4"
            strokeWidth={1.5}
            fill="url(#colorEU)"
            animationBegin={200}
            animationDuration={1000}
          />
          <Area
            type="monotone"
            dataKey="us"
            stroke="#22C55E"
            strokeWidth={1.5}
            fill="url(#colorUS)"
            animationBegin={400}
            animationDuration={1000}
          />
          <Area
            type="monotone"
            dataKey="uk"
            stroke="#F59E0B"
            strokeWidth={1.5}
            fill="url(#colorUK)"
            animationBegin={600}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
