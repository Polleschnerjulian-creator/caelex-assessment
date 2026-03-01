"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, TrendingUp } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import BenchmarkRadarChart from "@/components/assure/BenchmarkRadarChart";
import MetricComparisonBars from "@/components/assure/MetricComparisonBars";
import BenchmarkTrafficLights from "@/components/assure/BenchmarkTrafficLights";

// ─── Types ───

type RAGStatus = "ABOVE" | "AT" | "BELOW";

interface MetricComparison {
  name: string;
  value: number;
  benchmarkMin: number;
  benchmarkMedian: number;
  benchmarkMax: number;
  unit: string;
}

interface TrafficLightItem {
  metric: string;
  status: RAGStatus;
  value: string;
  benchmark: string;
}

interface BenchmarkData {
  companyScores: Record<string, number>;
  benchmarkScores: Record<string, number>;
  labels: string[];
  metrics: MetricComparison[];
  trafficLights: TrafficLightItem[];
  lastUpdated?: string;
}

// ─── Component ───

export default function BenchmarksPage() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function fetchBenchmarks() {
      try {
        const res = await fetch("/api/assure/benchmarks");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch benchmarks:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBenchmarks();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/assure/benchmarks/position");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-8" role="status">
        <div className="h-10 bg-white/5 rounded-lg w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[400px] bg-white/5 rounded-xl" />
          <div className="h-[400px] bg-white/5 rounded-xl" />
        </div>
        <div className="h-[200px] bg-white/5 rounded-xl" />
        <span className="sr-only">Loading benchmarks...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-display font-bold text-white mb-2"
          >
            Benchmark Intelligence
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-body-lg text-white/40"
          >
            Compare your investment readiness against peer companies in the
            space industry.
            {data?.lastUpdated && (
              <span className="text-white/25 ml-2">
                Last updated{" "}
                {new Date(data.lastUpdated).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </motion.p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-medium text-body px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {refreshing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh
        </button>
      </div>

      {data ? (
        <>
          {/* Radar Chart + Traffic Lights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            <GlassCard hover={false} className="p-6">
              <h2 className="text-heading font-semibold text-white mb-5 text-center">
                Readiness Radar
              </h2>
              <div className="flex justify-center">
                <BenchmarkRadarChart
                  companyScores={data.companyScores}
                  benchmarkScores={data.benchmarkScores}
                  labels={data.labels}
                />
              </div>
            </GlassCard>

            <GlassCard hover={false} className="p-6">
              <h2 className="text-heading font-semibold text-white mb-5">
                Performance Summary
              </h2>
              <BenchmarkTrafficLights items={data.trafficLights} />
            </GlassCard>
          </div>

          {/* Metric Comparison */}
          <div className="mb-6">
            <MetricComparisonBars metrics={data.metrics} />
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <TrendingUp size={32} className="text-white/15 mx-auto mb-4" />
          <h3 className="text-heading font-semibold text-white mb-2">
            No Benchmark Data
          </h3>
          <p className="text-body text-white/40 mb-6">
            Complete your profile to generate benchmark comparisons against peer
            companies.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-6 py-2.5 rounded-lg transition-all disabled:opacity-50 inline-flex items-center gap-2"
          >
            {refreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Generate Benchmarks
          </button>
        </div>
      )}
    </div>
  );
}
