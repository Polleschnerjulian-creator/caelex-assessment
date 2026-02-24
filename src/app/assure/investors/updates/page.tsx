"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Loader2,
  FileText,
  Calendar,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { csrfHeaders } from "@/lib/csrf-client";
import GlassCard from "@/components/ui/GlassCard";
import InvestorUpdateEditor from "@/components/assure/InvestorUpdateEditor";

// ─── Types ───

interface UpdateConfig {
  period: "monthly" | "quarterly";
  sections: {
    metrics: boolean;
    milestones: boolean;
    financials: boolean;
    highlights: boolean;
    asks: boolean;
  };
  customNotes: string;
}

interface KeyMetric {
  name: string;
  value: string;
}

interface MilestoneEntry {
  title: string;
  status: string;
}

interface PastUpdate {
  id: string;
  period: string;
  sentAt: string;
  recipientCount: number;
}

// ─── Component ───

export default function InvestorUpdatesPage() {
  const [keyMetrics, setKeyMetrics] = useState<KeyMetric[]>([]);
  const [milestones, setMilestones] = useState<MilestoneEntry[]>([]);
  const [pastUpdates, setPastUpdates] = useState<PastUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [metricsRes, milestonesRes, updatesRes] = await Promise.all([
          fetch("/api/assure/investors/metrics"),
          fetch("/api/assure/investors/milestones"),
          fetch("/api/assure/investors/updates"),
        ]);

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setKeyMetrics(data.metrics || []);
        }
        if (milestonesRes.ok) {
          const data = await milestonesRes.json();
          setMilestones(
            (data.milestones || []).map(
              (m: { title: string; status: string }) => ({
                title: m.title,
                status: m.status,
              }),
            ),
          );
        }
        if (updatesRes.ok) {
          const data = await updatesRes.json();
          setPastUpdates(data.updates || []);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleGenerate = async (config: UpdateConfig) => {
    setGenerating(true);
    setGenerated(false);
    try {
      const res = await fetch("/api/assure/investors/updates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setGenerated(true);
        // Refresh past updates
        const updatesRes = await fetch("/api/assure/investors/updates");
        if (updatesRes.ok) {
          const data = await updatesRes.json();
          setPastUpdates(data.updates || []);
        }
      }
    } catch (err) {
      console.error("Generate failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6" role="status">
        <div className="h-8 bg-white/5 rounded-lg w-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[500px] bg-white/5 rounded-xl" />
          <div className="h-[500px] bg-white/5 rounded-xl" />
        </div>
        <span className="sr-only">Loading updates...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/assure/investors"
        className="inline-flex items-center gap-1.5 text-small text-white/40 hover:text-white/60 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to Investor Relations
      </Link>

      {/* Header */}
      <div className="mb-10">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-display font-bold text-white mb-2"
        >
          Investor Updates
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-body-lg text-white/40"
        >
          Generate and send professional investor updates from your Assure data.
        </motion.p>
      </div>

      {/* Success banner */}
      {generated && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-8 flex items-center gap-3"
        >
          <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
          <p className="text-body text-emerald-300">
            Investor update generated successfully.
          </p>
        </motion.div>
      )}

      {/* Editor + Past Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {generating ? (
            <GlassCard hover={false} className="p-8 text-center">
              <Loader2
                size={32}
                className="text-emerald-400 animate-spin mx-auto mb-4"
              />
              <h3 className="text-heading font-semibold text-white mb-2">
                Generating Update
              </h3>
              <p className="text-body text-white/40">
                Compiling your latest metrics, milestones, and highlights...
              </p>
            </GlassCard>
          ) : (
            <InvestorUpdateEditor
              onGenerate={handleGenerate}
              keyMetrics={keyMetrics}
              milestones={milestones}
            />
          )}
        </div>

        {/* Past Updates */}
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <FileText size={16} className="text-emerald-400" />
            <h3 className="text-heading font-semibold text-white">
              Past Updates
            </h3>
          </div>

          {pastUpdates.length > 0 ? (
            <div className="space-y-3">
              {pastUpdates.map((update, index) => (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-body font-medium text-white/70 capitalize">
                      {update.period} Update
                    </span>
                    <span className="text-micro text-white/30 flex items-center gap-1">
                      <Send size={10} />
                      {update.recipientCount}
                    </span>
                  </div>
                  <span className="text-small text-white/30 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(update.sentAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Send size={24} className="text-white/15 mx-auto mb-3" />
              <p className="text-small text-white/30">
                No updates sent yet. Generate your first investor update.
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
