"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  Edit3,
  Trash2,
  AlertCircle,
  ShieldCheck,
  Clock,
  AlertTriangle,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface RiskRow {
  id: string;
  title: string;
  category: string;
  probability: number;
  impact: number;
  riskScore: number;
  mitigationStatus: "MITIGATED" | "IN_PROGRESS" | "UNMITIGATED" | "ACCEPTED";
  mitigation?: string;
}

interface RiskRegisterTableProps {
  risks: RiskRow[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

type SortField =
  | "title"
  | "category"
  | "probability"
  | "impact"
  | "riskScore"
  | "mitigationStatus";
type SortDirection = "asc" | "desc";

// ─── Helpers ───

function getMitigationBadge(status: RiskRow["mitigationStatus"]) {
  switch (status) {
    case "MITIGATED":
      return {
        label: "Mitigated",
        color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        icon: <ShieldCheck size={12} />,
      };
    case "IN_PROGRESS":
      return {
        label: "In Progress",
        color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        icon: <Clock size={12} />,
      };
    case "UNMITIGATED":
      return {
        label: "Unmitigated",
        color: "bg-red-500/10 text-red-400 border-red-500/20",
        icon: <AlertCircle size={12} />,
      };
    case "ACCEPTED":
      return {
        label: "Accepted",
        color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        icon: <AlertTriangle size={12} />,
      };
  }
}

function getScoreColor(score: number): string {
  if (score >= 16) return "text-red-400";
  if (score >= 10) return "text-orange-400";
  if (score >= 5) return "text-amber-400";
  return "text-emerald-400";
}

// ─── Component ───

export default function RiskRegisterTable({
  risks,
  onEdit,
  onDelete,
}: RiskRegisterTableProps) {
  const [sortField, setSortField] = useState<SortField>("riskScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(risks.map((r) => r.category))];
    return ["all", ...cats.sort()];
  }, [risks]);

  // Filter and sort
  const filteredRisks = useMemo(() => {
    let filtered = risks;
    if (activeCategory !== "all") {
      filtered = risks.filter((r) => r.category === activeCategory);
    }

    return [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [risks, activeCategory, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      onDelete?.(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp size={12} className="text-emerald-400" />
    ) : (
      <ChevronDown size={12} className="text-emerald-400" />
    );
  };

  return (
    <div>
      {/* Category filter tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`
              px-3 py-1.5 rounded-lg text-small font-medium capitalize whitespace-nowrap
              transition-all duration-150
              ${
                activeCategory === cat
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-white/40 hover:text-white/60 hover:bg-white/[0.04] border border-transparent"
              }
            `}
          >
            {cat === "all" ? "All" : cat}
            {cat !== "all" && (
              <span className="ml-1.5 text-micro opacity-60">
                {risks.filter((r) => r.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <GlassCard hover={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  {
                    key: "title" as SortField,
                    label: "Title",
                    align: "text-left",
                  },
                  {
                    key: "category" as SortField,
                    label: "Category",
                    align: "text-left",
                  },
                  {
                    key: "probability" as SortField,
                    label: "Prob.",
                    align: "text-center",
                  },
                  {
                    key: "impact" as SortField,
                    label: "Impact",
                    align: "text-center",
                  },
                  {
                    key: "riskScore" as SortField,
                    label: "Score",
                    align: "text-center",
                  },
                  {
                    key: "mitigationStatus" as SortField,
                    label: "Mitigation",
                    align: "text-left",
                  },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`${col.align} text-micro uppercase tracking-wider text-white/40 p-3 pb-2 font-medium cursor-pointer hover:text-white/60 transition-colors select-none`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <SortIcon field={col.key} />
                    </span>
                  </th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="text-left text-micro uppercase tracking-wider text-white/40 p-3 pb-2 font-medium">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredRisks.map((risk) => {
                  const badge = getMitigationBadge(risk.mitigationStatus);
                  return (
                    <motion.tr
                      key={risk.id}
                      layout
                      initial={false}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-3">
                        <span className="text-body font-medium text-white/80 truncate block max-w-[250px]">
                          {risk.title}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-small text-white/50 capitalize">
                          {risk.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-body text-white/60">
                          {risk.probability}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-body text-white/60">
                          {risk.impact}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-body font-bold ${getScoreColor(risk.riskScore)}`}
                        >
                          {risk.riskScore}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-micro font-medium ${badge.color}`}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>
                      {(onEdit || onDelete) && (
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            {onEdit && (
                              <button
                                onClick={() => onEdit(risk.id)}
                                className="p-1.5 rounded-md text-white/30 hover:text-emerald-400 hover:bg-white/5 transition-all"
                                title="Edit risk"
                              >
                                <Edit3 size={14} />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={() => handleDelete(risk.id)}
                                className={`p-1.5 rounded-md transition-all ${
                                  confirmDeleteId === risk.id
                                    ? "text-red-400 bg-red-500/10"
                                    : "text-white/30 hover:text-red-400 hover:bg-white/5"
                                }`}
                                title={
                                  confirmDeleteId === risk.id
                                    ? "Click again to confirm"
                                    : "Delete risk"
                                }
                              >
                                {confirmDeleteId === risk.id ? (
                                  <AlertCircle size={14} />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filteredRisks.length === 0 && (
          <div className="text-center py-10">
            <p className="text-body text-white/30">
              No risks found
              {activeCategory !== "all"
                ? ` in "${activeCategory}" category`
                : ""}
              .
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
