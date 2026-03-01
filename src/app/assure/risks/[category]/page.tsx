"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import RiskRegisterTable from "@/components/assure/RiskRegisterTable";

// ─── Types ───

interface Risk {
  id: string;
  title: string;
  category: string;
  probability: number;
  impact: number;
  riskScore: number;
  mitigationStatus: "MITIGATED" | "IN_PROGRESS" | "UNMITIGATED" | "ACCEPTED";
  mitigation?: string;
}

// ─── Component ───

export default function RiskCategoryPage() {
  const params = useParams();
  const category = params.category as string;
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRisks() {
      try {
        const res = await fetch("/api/assure/risks");
        if (res.ok) {
          const data = await res.json();
          const allRisks: Risk[] = data.risks || data || [];
          setRisks(
            allRisks.filter(
              (r) => r.category.toLowerCase() === category.toLowerCase(),
            ),
          );
        }
      } catch (err) {
        console.error("Failed to fetch risks:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRisks();
  }, [category]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6" role="status">
        <div className="h-8 bg-white/5 rounded-lg w-1/4" />
        <div className="h-[400px] bg-white/5 rounded-xl" />
        <span className="sr-only">Loading risks...</span>
      </div>
    );
  }

  // Category stats
  const avgScore =
    risks.length > 0
      ? (risks.reduce((s, r) => s + r.riskScore, 0) / risks.length).toFixed(1)
      : "0";
  const highRisks = risks.filter((r) => r.riskScore >= 15).length;
  const mitigatedCount = risks.filter(
    (r) => r.mitigationStatus === "MITIGATED",
  ).length;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/assure/risks"
        className="inline-flex items-center gap-1.5 text-small text-white/40 hover:text-white/60 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to Risk Intelligence
      </Link>

      {/* Header */}
      <div className="mb-8">
        <motion.h1
          initial={false}
          animate={{ opacity: 1 }}
          className="text-display font-bold text-white capitalize mb-2"
        >
          {category} Risks
        </motion.h1>
        <motion.p
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-body-lg text-white/40"
        >
          {risks.length} risks in the {category} category.
        </motion.p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <GlassCard hover={false} className="p-5 text-center">
          <p className="text-display-sm font-bold text-white">{risks.length}</p>
          <p className="text-caption text-white/40 uppercase tracking-wider mt-1">
            Total Risks
          </p>
        </GlassCard>
        <GlassCard hover={false} className="p-5 text-center">
          <p className="text-display-sm font-bold text-amber-400">{avgScore}</p>
          <p className="text-caption text-white/40 uppercase tracking-wider mt-1">
            Avg Score
          </p>
        </GlassCard>
        <GlassCard hover={false} className="p-5 text-center">
          <p className="text-display-sm font-bold text-red-400">{highRisks}</p>
          <p className="text-caption text-white/40 uppercase tracking-wider mt-1">
            High Risk
          </p>
        </GlassCard>
      </div>

      {/* Insights */}
      <GlassCard hover={false} className="p-6 mb-8">
        <h2 className="text-heading font-semibold text-white mb-3">
          Category Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
            <p className="text-small text-white/40 mb-1">Mitigation Coverage</p>
            <p className="text-body-lg font-semibold text-white">
              {risks.length > 0
                ? Math.round((mitigatedCount / risks.length) * 100)
                : 0}
              %
            </p>
            <p className="text-micro text-white/25">
              {mitigatedCount} of {risks.length} risks mitigated
            </p>
          </div>
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
            <p className="text-small text-white/40 mb-1">Risk Distribution</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-micro text-red-400">
                Critical: {risks.filter((r) => r.riskScore >= 20).length}
              </span>
              <span className="text-micro text-amber-400">
                High:{" "}
                {
                  risks.filter((r) => r.riskScore >= 10 && r.riskScore < 20)
                    .length
                }
              </span>
              <span className="text-micro text-emerald-400">
                Low: {risks.filter((r) => r.riskScore < 10).length}
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Risk Table */}
      <RiskRegisterTable risks={risks} />
    </div>
  );
}
