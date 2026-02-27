"use client";

import { motion } from "framer-motion";
import {
  Package,
  Download,
  Eye,
  Loader2,
  FileText,
  Calendar,
  TrendingUp,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

export interface DDPackage {
  id: string;
  title: string;
  rrsScore: number;
  grade: string;
  status: string;
  generatedAt: string;
}

interface DDPackageGeneratorProps {
  onGenerate: () => Promise<void>;
  packages: DDPackage[];
  isGenerating: boolean;
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "text-green-500 dark:text-green-400";
    case "B":
      return "text-emerald-500 dark:text-emerald-400";
    case "C":
      return "text-amber-500 dark:text-amber-400";
    case "D":
      return "text-orange-500 dark:text-orange-400";
    default:
      return "text-red-500 dark:text-red-400";
  }
}

function getScoreBadgeColors(score: number): string {
  if (score >= 80)
    return "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20";
  if (score >= 60)
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
  return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
}

export default function DDPackageGenerator({
  onGenerate,
  packages,
  isGenerating,
}: DDPackageGeneratorProps) {
  return (
    <div>
      {/* Header + Generate action */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-heading font-medium text-slate-900 dark:text-white">
            Due Diligence Packages
          </h2>
          <p className="text-body text-slate-500 dark:text-white/45 mt-1 max-w-lg">
            Generate point-in-time snapshots of your compliance posture for
            investor due diligence. Each package captures the current RRS score
            and all component details.
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 bg-emerald-500 text-white text-body font-medium px-5 py-2.5 rounded-lg hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Package className="w-4 h-4" />
          )}
          {isGenerating ? "Generating..." : "Generate Package"}
        </button>
      </div>

      {/* Generating state */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <GlassCard highlighted className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              </div>
              <div>
                <p className="text-body-lg font-medium text-slate-800 dark:text-white">
                  Generating Due Diligence Package
                </p>
                <p className="text-small text-slate-500 dark:text-white/45 mt-0.5">
                  Computing latest RRS, compiling evidence, and creating
                  snapshot...
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Packages list */}
      {packages.length > 0 ? (
        <div className="space-y-3">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <GlassCard hover className="p-0 overflow-hidden">
                <div className="flex items-center p-4 gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-500 dark:text-white/45" />
                  </div>

                  {/* Title + date */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body font-medium text-slate-800 dark:text-white/80 truncate">
                      {pkg.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-micro text-slate-400 dark:text-white/30">
                        <Calendar className="w-3 h-3" />
                        {new Date(pkg.generatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Score at time of generation */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-slate-400 dark:text-white/30" />
                        <span className="text-body-lg font-semibold text-slate-800 dark:text-white">
                          {pkg.rrsScore}
                        </span>
                        <span
                          className={`text-body-lg font-semibold ${getGradeColor(pkg.grade)}`}
                        >
                          ({pkg.grade})
                        </span>
                      </div>
                      <span
                        className={`inline-block text-micro px-1.5 py-0.5 rounded border mt-0.5 ${getScoreBadgeColors(pkg.rrsScore)}`}
                      >
                        RRS at generation
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 border-l border-slate-100 dark:border-[--glass-border-subtle] pl-3 ml-1">
                      <a
                        href={`/api/assure/dd-package/${pkg.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-md text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        title="View package"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <a
                        href={`/api/assure/dd-package/${pkg.id}/download`}
                        className="p-2 rounded-md text-slate-400 dark:text-white/30 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        title="Download package"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      ) : (
        !isGenerating && (
          <GlassCard hover={false} className="p-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-slate-400 dark:text-white/30" />
              </div>
              <h3 className="text-body-lg font-medium text-slate-700 dark:text-white/70 mb-1">
                No Packages Generated
              </h3>
              <p className="text-small text-slate-500 dark:text-white/45 mb-4 max-w-sm">
                Generate your first Due Diligence package to create a verifiable
                snapshot of your regulatory readiness for investors.
              </p>
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 bg-emerald-500 text-white text-small font-medium px-4 py-2 rounded-lg hover:bg-emerald-600 transition-all"
              >
                <Package className="w-4 h-4" />
                Generate First Package
              </button>
            </div>
          </GlassCard>
        )
      )}
    </div>
  );
}
