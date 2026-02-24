"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2, X, ArrowLeft, Target } from "lucide-react";
import Link from "next/link";
import { csrfHeaders } from "@/lib/csrf-client";
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

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: "",
    targetDate: "",
    category: "product",
    status: "ON_TRACK",
  });

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await fetch("/api/assure/investors/milestones");
      if (res.ok) {
        const data = await res.json();
        setMilestones(data.milestones || []);
      }
    } catch (err) {
      console.error("Failed to fetch milestones:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const handleAdd = async () => {
    if (!newMilestone.title.trim() || !newMilestone.targetDate) return;
    setAdding(true);
    try {
      const res = await fetch("/api/assure/investors/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(newMilestone),
      });
      if (res.ok) {
        await fetchMilestones();
        setShowAddModal(false);
        setNewMilestone({
          title: "",
          targetDate: "",
          category: "product",
          status: "ON_TRACK",
        });
      }
    } catch (err) {
      console.error("Add milestone failed:", err);
    } finally {
      setAdding(false);
    }
  };

  const inputClasses =
    "w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-body-lg text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 transition-all";

  // Stats
  const onTrack = milestones.filter(
    (m) => m.status.toUpperCase() === "ON_TRACK",
  ).length;
  const completed = milestones.filter(
    (m) =>
      m.status.toUpperCase() === "COMPLETED" ||
      m.status.toUpperCase() === "COMPLETED_M",
  ).length;
  const atRisk = milestones.filter(
    (m) => m.status.toUpperCase() === "AT_RISK",
  ).length;
  const delayed = milestones.filter(
    (m) => m.status.toUpperCase() === "DELAYED",
  ).length;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6" role="status">
        <div className="h-8 bg-white/5 rounded-lg w-1/4" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-[400px] bg-white/5 rounded-xl" />
        <span className="sr-only">Loading milestones...</span>
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
      <div className="flex items-start justify-between mb-10">
        <div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-display font-bold text-white mb-2"
          >
            Milestone Tracker
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-body-lg text-white/40"
          >
            {milestones.length} milestones tracked. {completed} completed.
          </motion.p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2.5 rounded-lg transition-all flex items-center gap-2"
        >
          <Plus size={16} />
          Add Milestone
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        <GlassCard hover={false} className="p-4 text-center">
          <p className="text-display-sm font-bold text-emerald-400">
            {onTrack}
          </p>
          <p className="text-caption text-white/40 uppercase tracking-wider mt-1">
            On Track
          </p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <p className="text-display-sm font-bold text-blue-400">{completed}</p>
          <p className="text-caption text-white/40 uppercase tracking-wider mt-1">
            Completed
          </p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <p className="text-display-sm font-bold text-amber-400">{atRisk}</p>
          <p className="text-caption text-white/40 uppercase tracking-wider mt-1">
            At Risk
          </p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <p className="text-display-sm font-bold text-red-400">{delayed}</p>
          <p className="text-caption text-white/40 uppercase tracking-wider mt-1">
            Delayed
          </p>
        </GlassCard>
      </div>

      {/* Timeline */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Target size={16} className="text-emerald-400" />
          <h2 className="text-heading font-semibold text-white">Timeline</h2>
        </div>
        {milestones.length > 0 ? (
          <MilestoneTimeline milestones={milestones} />
        ) : (
          <div className="text-center py-12">
            <Target size={28} className="text-white/15 mx-auto mb-3" />
            <h3 className="text-body-lg font-semibold text-white/70 mb-1">
              No Milestones Yet
            </h3>
            <p className="text-body text-white/30">
              Add milestones to track your progress towards key objectives.
            </p>
          </div>
        )}
      </GlassCard>

      {/* Add Milestone Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-navy-900 border border-white/10 rounded-xl p-8 max-w-lg w-full shadow-2xl"
              role="dialog"
              aria-label="Add milestone"
              aria-modal="true"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-heading font-semibold text-white">
                  Add Milestone
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-body font-medium text-white/60 mb-1.5">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newMilestone.title}
                    onChange={(e) =>
                      setNewMilestone({
                        ...newMilestone,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g., Complete Series A fundraise"
                    className={inputClasses}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-body font-medium text-white/60 mb-1.5">
                    Target Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={newMilestone.targetDate}
                    onChange={(e) =>
                      setNewMilestone({
                        ...newMilestone,
                        targetDate: e.target.value,
                      })
                    }
                    className={inputClasses}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-body font-medium text-white/60 mb-1.5">
                      Category
                    </label>
                    <select
                      value={newMilestone.category}
                      onChange={(e) =>
                        setNewMilestone({
                          ...newMilestone,
                          category: e.target.value,
                        })
                      }
                      className={inputClasses}
                    >
                      {[
                        "product",
                        "fundraise",
                        "regulatory",
                        "team",
                        "revenue",
                        "partnership",
                        "technology",
                        "operations",
                      ].map((c) => (
                        <option key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-body font-medium text-white/60 mb-1.5">
                      Status
                    </label>
                    <select
                      value={newMilestone.status}
                      onChange={(e) =>
                        setNewMilestone({
                          ...newMilestone,
                          status: e.target.value,
                        })
                      }
                      className={inputClasses}
                    >
                      <option value="ON_TRACK">On Track</option>
                      <option value="AT_RISK">At Risk</option>
                      <option value="DELAYED">Delayed</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-white/10 text-white/45 py-2.5 rounded-lg hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={
                    !newMilestone.title.trim() ||
                    !newMilestone.targetDate ||
                    adding
                  }
                  className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {adding && <Loader2 size={14} className="animate-spin" />}
                  Add Milestone
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
