"use client";

import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface MetricComparison {
  name: string;
  value: number;
  benchmarkMin: number;
  benchmarkMedian: number;
  benchmarkMax: number;
  unit: string;
}

interface MetricComparisonBarsProps {
  metrics: MetricComparison[];
}

// ─── Helpers ───

function getPositionColor(
  value: number,
  benchmarkMedian: number,
  benchmarkMax: number,
): string {
  if (value >= benchmarkMax) return "text-emerald-400";
  if (value >= benchmarkMedian) return "text-emerald-400/80";
  return "text-amber-400";
}

function getDotColor(value: number, benchmarkMedian: number): string {
  if (value >= benchmarkMedian) return "bg-emerald-400";
  return "bg-amber-400";
}

// ─── Component ───

export default function MetricComparisonBars({
  metrics,
}: MetricComparisonBarsProps) {
  return (
    <GlassCard hover={false} className="p-6">
      <h3 className="text-heading font-semibold text-white mb-6">
        Metric Comparison
      </h3>

      <div className="space-y-6">
        {metrics.map((metric, index) => {
          // Determine the range for positioning
          const totalRange = metric.benchmarkMax * 1.2;
          const minPct = (metric.benchmarkMin / totalRange) * 100;
          const maxPct = (metric.benchmarkMax / totalRange) * 100;
          const medianPct = (metric.benchmarkMedian / totalRange) * 100;
          const valuePct = Math.min((metric.value / totalRange) * 100, 100);

          return (
            <motion.div
              key={metric.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              {/* Label row */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-body font-medium text-white/70">
                  {metric.name}
                </span>
                <span
                  className={`text-body-lg font-bold ${getPositionColor(metric.value, metric.benchmarkMedian, metric.benchmarkMax)}`}
                >
                  {metric.value}
                  {metric.unit}
                </span>
              </div>

              {/* Bar visualization */}
              <div className="relative h-6 bg-white/[0.03] rounded-lg overflow-visible">
                {/* Benchmark range (min to max) */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${maxPct - minPct}%`,
                    left: `${minPct}%`,
                  }}
                  transition={{ duration: 0.6, delay: 0.1 + index * 0.06 }}
                  className="absolute top-1 bottom-1 bg-white/5 rounded border border-white/10"
                />

                {/* Median marker */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.06 }}
                  className="absolute top-0 bottom-0 w-px"
                  style={{ left: `${medianPct}%` }}
                >
                  <div className="h-full border-l border-dashed border-white/20" />
                </motion.div>

                {/* Value dot */}
                <motion.div
                  initial={{ left: "0%", opacity: 0 }}
                  animate={{ left: `${valuePct}%`, opacity: 1 }}
                  transition={{
                    duration: 0.8,
                    ease: "easeOut",
                    delay: 0.2 + index * 0.06,
                  }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${getDotColor(metric.value, metric.benchmarkMedian)} shadow-lg`}
                  />
                </motion.div>
              </div>

              {/* Range labels */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-micro text-white/25">
                  Min: {metric.benchmarkMin}
                  {metric.unit}
                </span>
                <span className="text-micro text-white/30">
                  Median: {metric.benchmarkMedian}
                  {metric.unit}
                </span>
                <span className="text-micro text-white/25">
                  Max: {metric.benchmarkMax}
                  {metric.unit}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {metrics.length === 0 && (
        <div className="text-center py-6">
          <p className="text-body text-white/30">No metrics to compare.</p>
        </div>
      )}
    </GlassCard>
  );
}
