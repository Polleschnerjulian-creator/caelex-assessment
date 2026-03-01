"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2, Wand2, X, ShieldAlert } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import GlassCard from "@/components/ui/GlassCard";
import RiskHeatMap from "@/components/assure/RiskHeatMap";
import RiskRegisterTable from "@/components/assure/RiskRegisterTable";
import RiskCategoryBreakdown from "@/components/assure/RiskCategoryBreakdown";
import MitigationCoverageGauge from "@/components/assure/MitigationCoverageGauge";

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

export default function AssureRisksPage() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRisk, setNewRisk] = useState({
    title: "",
    category: "operational",
    probability: 3,
    impact: 3,
    mitigation: "",
  });
  const [addingRisk, setAddingRisk] = useState(false);

  const fetchRisks = useCallback(async () => {
    try {
      const res = await fetch("/api/assure/risks");
      if (res.ok) {
        const data = await res.json();
        setRisks(data.risks || data || []);
      }
    } catch (err) {
      console.error("Failed to fetch risks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  const handleAutoPopulate = async () => {
    setAutoPopulating(true);
    try {
      const res = await fetch("/api/assure/risks/auto-populate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
      });
      if (res.ok) {
        await fetchRisks();
      }
    } catch (err) {
      console.error("Auto-populate failed:", err);
    } finally {
      setAutoPopulating(false);
    }
  };

  const handleAddRisk = async () => {
    if (!newRisk.title.trim()) return;
    setAddingRisk(true);
    try {
      const res = await fetch("/api/assure/risks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(newRisk),
      });
      if (res.ok) {
        await fetchRisks();
        setShowAddModal(false);
        setNewRisk({
          title: "",
          category: "operational",
          probability: 3,
          impact: 3,
          mitigation: "",
        });
      }
    } catch (err) {
      console.error("Add risk failed:", err);
    } finally {
      setAddingRisk(false);
    }
  };

  const handleDeleteRisk = async (id: string) => {
    try {
      const res = await fetch(`/api/assure/risks/${id}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (res.ok) {
        setRisks((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Delete risk failed:", err);
    }
  };

  // Calculate mitigation stats
  const mitigated = risks.filter(
    (r) => r.mitigationStatus === "MITIGATED",
  ).length;
  const inProgress = risks.filter(
    (r) => r.mitigationStatus === "IN_PROGRESS",
  ).length;

  const inputClasses =
    "w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-body-lg text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 transition-all";

  if (loading) {
    return (
      <div className="animate-pulse space-y-8" role="status">
        <div className="h-10 bg-white/5 rounded-lg w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[400px] bg-white/5 rounded-xl" />
          <div className="h-[400px] bg-white/5 rounded-xl" />
        </div>
        <div className="h-[300px] bg-white/5 rounded-xl" />
        <span className="sr-only">Loading risks...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <motion.h1
            initial={false}
            animate={{ opacity: 1 }}
            className="text-display font-bold text-white mb-2"
          >
            Risk Intelligence
          </motion.h1>
          <motion.p
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-body-lg text-white/40"
          >
            {risks.length} risks tracked across your risk register.
          </motion.p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAutoPopulate}
            disabled={autoPopulating}
            className="border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-medium text-body px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {autoPopulating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Wand2 size={16} />
            )}
            {autoPopulating ? "Populating..." : "Auto-populate"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2.5 rounded-lg transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Add Risk
          </button>
        </div>
      </div>

      {/* Heat Map + Mitigation Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2">
          <GlassCard hover={false} className="p-6">
            <h2 className="text-heading font-semibold text-white mb-5">
              Risk Heat Map
            </h2>
            {risks.length > 0 ? (
              <RiskHeatMap risks={risks} />
            ) : (
              <div className="text-center py-10">
                <ShieldAlert size={24} className="text-white/15 mx-auto mb-3" />
                <p className="text-body text-white/30">
                  No risks to display. Add or auto-populate risks.
                </p>
              </div>
            )}
          </GlassCard>
        </div>

        <GlassCard hover={false} className="p-6">
          <h2 className="text-heading font-semibold text-white mb-5 text-center">
            Mitigation Coverage
          </h2>
          <div className="flex justify-center">
            <MitigationCoverageGauge
              total={risks.length}
              mitigated={mitigated}
              inProgress={inProgress}
            />
          </div>
        </GlassCard>
      </div>

      {/* Category Breakdown */}
      <div className="mb-10">
        <RiskCategoryBreakdown risks={risks} />
      </div>

      {/* Risk Register Table */}
      <div className="mb-6">
        <h2 className="text-caption uppercase tracking-[0.2em] text-white/40 mb-4">
          Risk Register
        </h2>
        <RiskRegisterTable risks={risks} onDelete={handleDeleteRisk} />
      </div>

      {/* Add Risk Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={false}
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
              aria-label="Add custom risk"
              aria-modal="true"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-heading font-semibold text-white">
                  Add Custom Risk
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
                    Risk Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRisk.title}
                    onChange={(e) =>
                      setNewRisk({ ...newRisk, title: e.target.value })
                    }
                    placeholder="e.g., Regulatory delay in authorization"
                    className={inputClasses}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-body font-medium text-white/60 mb-1.5">
                    Category
                  </label>
                  <select
                    value={newRisk.category}
                    onChange={(e) =>
                      setNewRisk({ ...newRisk, category: e.target.value })
                    }
                    className={inputClasses}
                  >
                    {[
                      "regulatory",
                      "financial",
                      "operational",
                      "market",
                      "technology",
                      "legal",
                      "strategic",
                    ].map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-body font-medium text-white/60 mb-1.5">
                      Probability (1-5)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={newRisk.probability}
                      onChange={(e) =>
                        setNewRisk({
                          ...newRisk,
                          probability: Number(e.target.value),
                        })
                      }
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block text-body font-medium text-white/60 mb-1.5">
                      Impact (1-5)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={newRisk.impact}
                      onChange={(e) =>
                        setNewRisk({
                          ...newRisk,
                          impact: Number(e.target.value),
                        })
                      }
                      className={inputClasses}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-body font-medium text-white/60 mb-1.5">
                    Mitigation Plan
                  </label>
                  <textarea
                    value={newRisk.mitigation}
                    onChange={(e) =>
                      setNewRisk({ ...newRisk, mitigation: e.target.value })
                    }
                    placeholder="How do you plan to mitigate this risk?"
                    rows={3}
                    className={`${inputClasses} resize-none`}
                  />
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
                  onClick={handleAddRisk}
                  disabled={!newRisk.title.trim() || addingRisk}
                  className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingRisk && <Loader2 size={14} className="animate-spin" />}
                  Add Risk
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
