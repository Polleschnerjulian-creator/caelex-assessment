"use client";

import { motion } from "framer-motion";
import { ArrowUp, Minus, ArrowDown } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

type RAGStatus = "ABOVE" | "AT" | "BELOW";

interface TrafficLightItem {
  metric: string;
  status: RAGStatus;
  value: string;
  benchmark: string;
}

interface BenchmarkTrafficLightsProps {
  items: TrafficLightItem[];
}

// ─── Helpers ───

function getStatusConfig(status: RAGStatus) {
  switch (status) {
    case "ABOVE":
      return {
        color: "bg-emerald-500",
        glow: "shadow-emerald-500/30",
        text: "text-emerald-400",
        label: "Above",
        icon: <ArrowUp size={12} />,
        bgTint: "bg-emerald-500/5",
        borderTint: "border-emerald-500/10",
      };
    case "AT":
      return {
        color: "bg-amber-500",
        glow: "shadow-amber-500/30",
        text: "text-amber-400",
        label: "At Benchmark",
        icon: <Minus size={12} />,
        bgTint: "bg-amber-500/5",
        borderTint: "border-amber-500/10",
      };
    case "BELOW":
      return {
        color: "bg-red-500",
        glow: "shadow-red-500/30",
        text: "text-red-400",
        label: "Below",
        icon: <ArrowDown size={12} />,
        bgTint: "bg-red-500/5",
        borderTint: "border-red-500/10",
      };
  }
}

// ─── Component ───

export default function BenchmarkTrafficLights({
  items,
}: BenchmarkTrafficLightsProps) {
  const aboveCount = items.filter((i) => i.status === "ABOVE").length;
  const atCount = items.filter((i) => i.status === "AT").length;
  const belowCount = items.filter((i) => i.status === "BELOW").length;

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-micro text-white/50">Above ({aboveCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-micro text-white/50">At ({atCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-micro text-white/50">Below ({belowCount})</span>
        </div>
      </div>

      {/* Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, index) => {
          const config = getStatusConfig(item.status);

          return (
            <motion.div
              key={item.metric}
              initial={false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 }}
            >
              <GlassCard
                hover={false}
                className={`p-4 ${config.bgTint} border ${config.borderTint}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-body font-medium text-white/70 flex-1">
                    {item.metric}
                  </span>
                  {/* Traffic light dot */}
                  <div
                    className={`w-3 h-3 rounded-full ${config.color} shadow-md ${config.glow} flex-shrink-0`}
                  />
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-display-sm font-bold text-white block leading-none">
                      {item.value}
                    </span>
                    <span className="text-micro text-white/30 mt-0.5 block">
                      Benchmark: {item.benchmark}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-0.5 text-micro font-medium ${config.text}`}
                  >
                    {config.icon}
                    {config.label}
                  </span>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {items.length === 0 && (
        <GlassCard hover={false} className="p-8">
          <div className="text-center">
            <p className="text-body text-white/30">
              No benchmark data available.
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
