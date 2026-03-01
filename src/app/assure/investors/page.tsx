"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Target,
  TrendingUp,
  Calendar,
  Send,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import MilestoneTimeline from "@/components/assure/MilestoneTimeline";

// ─── Types ───

interface Milestone {
  id: string;
  title: string;
  targetDate: string;
  completedDate?: string;
  status: string;
  category: string;
}

// ─── Component ───

export default function InvestorsPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/assure/milestones");
        if (res.ok) {
          const data = await res.json();
          setMilestones(data.milestones || []);
        }
      } catch (err) {
        console.error("Failed to fetch investor data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-8" role="status">
        <div className="h-10 bg-white/5 rounded-lg w-1/3" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-[400px] bg-white/5 rounded-xl" />
        <span className="sr-only">Loading investor relations...</span>
      </div>
    );
  }

  const completedCount = milestones.filter(
    (m) =>
      m.status.toUpperCase() === "COMPLETED" ||
      m.status.toUpperCase() === "COMPLETED_M",
  ).length;
  const onTrackCount = milestones.filter(
    (m) => m.status.toUpperCase() === "ON_TRACK",
  ).length;
  const atRiskCount = milestones.filter(
    (m) => m.status.toUpperCase() === "AT_RISK",
  ).length;
  const delayedCount = milestones.filter(
    (m) => m.status.toUpperCase() === "DELAYED",
  ).length;

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
            Investor Relations
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-body-lg text-white/40"
          >
            Track milestones and communicate progress to investors.
          </motion.p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/assure/investors/updates"
            className="border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-medium text-body px-4 py-2.5 rounded-lg transition-all flex items-center gap-2"
          >
            <Send size={16} />
            Updates
          </Link>
          <Link
            href="/assure/investors/milestones"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2.5 rounded-lg transition-all flex items-center gap-2"
          >
            <Target size={16} />
            Milestones
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <GlassCard hover={false} className="p-5 text-center">
            <p className="text-display-sm font-bold text-white">
              {milestones.length}
            </p>
            <p className="text-caption text-white/40 uppercase tracking-wider mt-1">
              Total Milestones
            </p>
          </GlassCard>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <GlassCard hover={false} className="p-5 text-center">
            <p className="text-display-sm font-bold text-emerald-400">
              {onTrackCount}
            </p>
            <p className="text-caption text-white/40 uppercase tracking-wider mt-1">
              On Track
            </p>
          </GlassCard>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard hover={false} className="p-5 text-center">
            <p className="text-display-sm font-bold text-amber-400">
              {atRiskCount}
            </p>
            <p className="text-caption text-white/40 uppercase tracking-wider mt-1">
              At Risk
            </p>
          </GlassCard>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <GlassCard hover={false} className="p-5 text-center">
            <p className="text-display-sm font-bold text-red-400">
              {delayedCount}
            </p>
            <p className="text-caption text-white/40 uppercase tracking-wider mt-1">
              Delayed
            </p>
          </GlassCard>
        </motion.div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <Link href="/assure/investors/milestones">
          <GlassCard className="p-5 cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Target size={18} className="text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-body-lg font-semibold text-white mb-0.5">
                  Milestone Tracker
                </h3>
                <p className="text-small text-white/40">
                  {completedCount} completed,{" "}
                  {milestones.length - completedCount} remaining
                </p>
              </div>
              <ArrowUpRight size={16} className="text-white/20" />
            </div>
          </GlassCard>
        </Link>
        <Link href="/assure/investors/updates">
          <GlassCard className="p-5 cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Send size={18} className="text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-body-lg font-semibold text-white mb-0.5">
                  Investor Updates
                </h3>
                <p className="text-small text-white/40">
                  Send updates to investors
                </p>
              </div>
              <ArrowUpRight size={16} className="text-white/20" />
            </div>
          </GlassCard>
        </Link>
      </div>

      {/* Milestone Timeline */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp size={16} className="text-emerald-400" />
          <h2 className="text-heading font-semibold text-white">
            Recent Milestones
          </h2>
        </div>
        {milestones.length > 0 ? (
          <MilestoneTimeline milestones={milestones.slice(0, 8)} />
        ) : (
          <div className="text-center py-10">
            <Calendar size={24} className="text-white/15 mx-auto mb-3" />
            <p className="text-body text-white/30">
              No milestones defined yet. Add milestones to track your progress.
            </p>
            <Link
              href="/assure/investors/milestones"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2.5 rounded-lg transition-all mt-4"
            >
              <Target size={16} />
              Add Milestones
            </Link>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
