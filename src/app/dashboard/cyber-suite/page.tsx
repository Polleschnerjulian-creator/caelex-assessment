"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  Shield,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";

// ─── Types matching API response ───

interface RequirementAggStatus {
  total: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
}

interface ThemeScore {
  theme: string;
  label: string;
  status: "compliant" | "partial" | "gap";
  enisaStatus: RequirementAggStatus;
  nis2Status: RequirementAggStatus;
  craStatus: RequirementAggStatus;
}

interface ModuleBreakdown {
  module: "enisa" | "nis2" | "cra";
  totalRequirements: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
  score: number;
}

interface NexusModuleScore {
  score: number;
  total: number;
  compliant: number;
  partial: number;
}

interface CyberSuiteScore {
  unifiedScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  themes: ThemeScore[];
  moduleBreakdowns: ModuleBreakdown[];
  moduleScores: {
    enisa: ModuleBreakdown | null;
    nis2: ModuleBreakdown | null;
    cra: ModuleBreakdown | null;
    nexus: NexusModuleScore | null;
  };
  evidenceCoverage: {
    totalRequirements: number;
    withEvidence: number;
    coveragePercent: number;
  };
  crossRegulationSynergies: number;
  lastCalculated: string;
}

interface SmartAction {
  action: string;
  description: string;
  modulesImpacted: number;
  requirementsSatisfied: Array<{
    module: "enisa" | "nis2" | "cra";
    requirementId: string;
    currentStatus: string;
  }>;
  estimatedScoreImpact: number;
  link?: string;
}

interface CyberSuiteData {
  score: CyberSuiteScore;
  actions: SmartAction[];
  lastCalculated: string;
}

// ─── Constants ───

const MODULE_META: Record<
  string,
  {
    label: string;
    accent: string;
    badgeBg: string;
    badgeText: string;
    href: string;
  }
> = {
  enisa: {
    label: "ENISA",
    accent: "border-blue-500/30",
    badgeBg: "bg-blue-500/15",
    badgeText: "text-blue-400",
    href: "/dashboard/modules/cybersecurity",
  },
  nis2: {
    label: "NIS2",
    accent: "border-cyan-500/30",
    badgeBg: "bg-cyan-500/15",
    badgeText: "text-cyan-400",
    href: "/dashboard/modules/nis2",
  },
  cra: {
    label: "CRA",
    accent: "border-purple-500/30",
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-400",
    href: "/dashboard/modules/cra",
  },
};

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

function gradeClasses(grade: string): string {
  if (grade === "A" || grade === "B") {
    return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
  }
  if (grade === "C") {
    return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
  }
  return "bg-red-500/20 text-red-400 border border-red-500/30";
}

function statusDot(status: string | null): React.ReactNode {
  if (status === null) return <span className="w-2.5 h-2.5" />;
  if (status === "compliant")
    return (
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
    );
  if (status === "partial")
    return (
      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
    );
  if (status === "gap" || status === "non_compliant")
    return (
      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
    );
  return <span className="w-2.5 h-2.5 rounded-full bg-white/20 inline-block" />;
}

function themeModuleStatus(agg: RequirementAggStatus): string | null {
  if (agg.total === 0) return null;
  if (agg.compliant === agg.total) return "compliant";
  if (agg.compliant > 0 || agg.partial > 0) return "partial";
  if (agg.nonCompliant > 0) return "non_compliant";
  return "not_assessed";
}

// ─── Component ───

export default function CyberSuitePage() {
  const [data, setData] = useState<CyberSuiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuite = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cyber-suite");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || `Failed to fetch cyber suite (${res.status})`,
        );
      }
      const json = await res.json();
      // createSuccessResponse wraps as { data: { ... } }
      setData(json.data as CyberSuiteData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load cyber suite",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuite();
  }, [fetchSuite]);

  // ─── Loading state ───

  if (loading) {
    return (
      <FeatureGate module="cybersecurity">
        <div
          className="flex items-center justify-center min-h-[400px]"
          role="status"
        >
          <Loader2
            size={24}
            className="animate-spin text-slate-400"
            aria-hidden="true"
          />
          <span className="sr-only">Loading Cybersecurity Suite...</span>
        </div>
      </FeatureGate>
    );
  }

  // ─── Error state ───

  if (error) {
    return (
      <FeatureGate module="cybersecurity">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="glass-elevated rounded-xl p-8 max-w-md text-center space-y-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={fetchSuite}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </FeatureGate>
    );
  }

  // ─── Empty state ───

  if (!data || data.score.themes.length === 0) {
    return (
      <FeatureGate module="cybersecurity">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="glass-elevated rounded-xl p-8 max-w-md text-center space-y-4">
            <div className="w-12 h-12 rounded-lg bg-slate-500/20 flex items-center justify-center mx-auto">
              <Shield size={24} className="text-slate-400" />
            </div>
            <h3 className="text-body-lg font-semibold text-slate-200">
              Noch keine Cyber-Assessments
            </h3>
            <p className="text-small text-slate-400">
              Starte mit einem der 3 Module, um deinen Cybersecurity Suite Score
              zu berechnen.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              {(["enisa", "nis2", "cra"] as const).map((mod) => (
                <Link
                  key={mod}
                  href={MODULE_META[mod].href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-small font-medium rounded-lg ${MODULE_META[mod].badgeBg} ${MODULE_META[mod].badgeText} hover:opacity-80 transition-opacity`}
                >
                  {MODULE_META[mod].label}
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </FeatureGate>
    );
  }

  const { score, actions } = data;

  // ─── Main render ───

  return (
    <FeatureGate module="cybersecurity">
      <div className="space-y-6">
        {/* ── 1. Header ── */}
        <motion.div {...fadeIn} className="flex items-start justify-between">
          <div>
            <h1 className="text-display-sm font-bold text-white">
              Cybersecurity Suite
            </h1>
            <p className="text-body text-slate-400 mt-1">
              Unified compliance across ENISA, NIS2 &amp; CRA
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-micro uppercase tracking-wider text-slate-400">
                Score
              </p>
              <p className="text-display-sm font-bold text-white">
                {score.unifiedScore}%
              </p>
            </div>
            <span
              className={`px-3 py-1.5 text-subtitle font-bold rounded-lg ${gradeClasses(score.grade)}`}
            >
              {score.grade}
            </span>
          </div>
        </motion.div>

        {/* ── 2. Smart Actions ── */}
        {actions.length > 0 && (
          <motion.div
            {...fadeIn}
            transition={{ ...fadeIn.transition, delay: 0.05 }}
            className="glass-elevated rounded-xl border border-emerald-500/30 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" />
              <h2 className="text-title font-semibold text-white">
                Nachste Aktionen (Highest Impact)
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {actions.map((action, i) => {
                const modules = new Set(
                  action.requirementsSatisfied.map((r) => r.module),
                );
                return (
                  <div
                    key={i}
                    className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-body-lg font-medium text-slate-200">
                          {action.action}
                        </p>
                        {(["enisa", "nis2", "cra"] as const)
                          .filter((m) => modules.has(m))
                          .map((m) => (
                            <span
                              key={m}
                              className={`px-2 py-0.5 text-micro font-medium rounded ${MODULE_META[m].badgeBg} ${MODULE_META[m].badgeText}`}
                            >
                              {MODULE_META[m].label}
                            </span>
                          ))}
                      </div>
                      <p className="text-small text-slate-400 mt-1 line-clamp-2">
                        {action.description}
                      </p>
                      <p className="text-caption text-slate-500 mt-1">
                        {action.requirementsSatisfied.length} Requirements
                        betroffen &middot; ~+{action.estimatedScoreImpact}{" "}
                        Impact
                      </p>
                    </div>
                    {action.link && (
                      <Link
                        href={action.link}
                        className="shrink-0 flex items-center gap-1 text-small font-medium text-emerald-400 hover:text-emerald-300 transition-colors mt-1"
                      >
                        Starten
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── 3. Module Cards ── */}
        <div
          className={`grid grid-cols-1 gap-4 ${score.moduleScores?.nexus ? "md:grid-cols-4" : "md:grid-cols-3"}`}
        >
          {score.moduleBreakdowns.map((mod, i) => {
            const meta = MODULE_META[mod.module];
            const compliantPct =
              mod.totalRequirements > 0
                ? Math.round((mod.compliant / mod.totalRequirements) * 100)
                : 0;
            const partialPct =
              mod.totalRequirements > 0
                ? Math.round((mod.partial / mod.totalRequirements) * 100)
                : 0;

            return (
              <motion.div
                key={mod.module}
                {...fadeIn}
                transition={{ ...fadeIn.transition, delay: 0.1 + i * 0.05 }}
              >
                <Link
                  href={meta.href}
                  className={`glass-elevated rounded-xl border ${meta.accent} p-5 block hover:bg-white/[0.02] transition-colors group`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-2.5 py-1 text-small font-semibold rounded-lg ${meta.badgeBg} ${meta.badgeText}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-display-sm font-bold text-white">
                      {mod.score}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-3">
                    <div className="h-full flex">
                      <div
                        className="bg-emerald-500 transition-all"
                        style={{ width: `${compliantPct}%` }}
                      />
                      <div
                        className="bg-amber-500 transition-all"
                        style={{ width: `${partialPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-caption text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {mod.compliant} Compliant
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      {mod.partial} Partial
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {mod.nonCompliant} Non-Compliant
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white/20" />
                      {mod.notAssessed} Not Assessed
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1 text-small font-medium text-slate-400 group-hover:text-emerald-400 transition-colors">
                    Zum Modul
                    <ArrowRight
                      size={14}
                      className="group-hover:translate-x-0.5 transition-transform"
                    />
                  </div>
                </Link>
              </motion.div>
            );
          })}

          {/* NEXUS Assets module card */}
          {score.moduleScores?.nexus && (
            <motion.div
              {...fadeIn}
              transition={{ ...fadeIn.transition, delay: 0.25 }}
            >
              <Link
                href="/dashboard/nexus"
                className="glass-elevated rounded-xl border border-emerald-500/30 p-5 block hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 text-small font-semibold rounded-lg bg-emerald-500/15 text-emerald-400">
                    NEXUS
                  </span>
                  <span className="text-display-sm font-bold text-white">
                    {score.moduleScores.nexus.score}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-3">
                  <div className="h-full flex">
                    <div
                      className="bg-emerald-500 transition-all"
                      style={{
                        width: `${score.moduleScores.nexus.total > 0 ? Math.round((score.moduleScores.nexus.compliant / score.moduleScores.nexus.total) * 100) : 0}%`,
                      }}
                    />
                    <div
                      className="bg-amber-500 transition-all"
                      style={{
                        width: `${score.moduleScores.nexus.total > 0 ? Math.round((score.moduleScores.nexus.partial / score.moduleScores.nexus.total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-caption text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {score.moduleScores.nexus.compliant} Compliant
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {score.moduleScores.nexus.partial} Partial
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <span className="w-2 h-2 rounded-full bg-white/20" />
                    {score.moduleScores.nexus.total} Assets tracked
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1 text-small font-medium text-slate-400 group-hover:text-emerald-400 transition-colors">
                  Zum Modul
                  <ArrowRight
                    size={14}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </div>
              </Link>
            </motion.div>
          )}
        </div>

        {/* ── 4. Cross-Regulation Matrix ── */}
        <motion.div
          {...fadeIn}
          transition={{ ...fadeIn.transition, delay: 0.25 }}
          className="glass-elevated rounded-xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <h2 className="text-title font-semibold text-white">
              Cross-Regulation Matrix
            </h2>
            <span className="ml-auto text-caption text-slate-500">
              {score.crossRegulationSynergies} Synergien erkannt
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-small">
              <thead>
                <tr className="glass-surface text-caption uppercase tracking-wider text-slate-500">
                  <th className="text-left px-5 py-3 font-medium">Theme</th>
                  <th className="text-center px-4 py-3 font-medium">ENISA</th>
                  <th className="text-center px-4 py-3 font-medium">NIS2</th>
                  <th className="text-center px-4 py-3 font-medium">CRA</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {score.themes.map((theme) => (
                  <tr
                    key={theme.theme}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3 text-slate-200 font-medium">
                      {theme.label}
                    </td>
                    <td className="text-center px-4 py-3">
                      {statusDot(themeModuleStatus(theme.enisaStatus))}
                    </td>
                    <td className="text-center px-4 py-3">
                      {statusDot(themeModuleStatus(theme.nis2Status))}
                    </td>
                    <td className="text-center px-4 py-3">
                      {statusDot(themeModuleStatus(theme.craStatus))}
                    </td>
                    <td className="text-center px-4 py-3">
                      {statusDot(theme.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ── 5. Evidence Coverage ── */}
        <motion.div
          {...fadeIn}
          transition={{ ...fadeIn.transition, delay: 0.3 }}
          className="glass-elevated rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-400" />
              <h2 className="text-title font-semibold text-white">
                Evidence Coverage
              </h2>
            </div>
            <span className="text-body-lg font-bold text-white">
              {score.evidenceCoverage.coveragePercent}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${score.evidenceCoverage.coveragePercent}%` }}
            />
          </div>
          <p className="text-caption text-slate-500 mt-2">
            {score.evidenceCoverage.withEvidence} von{" "}
            {score.evidenceCoverage.totalRequirements} Requirements mit Evidence
            belegt
          </p>
        </motion.div>

        <div className="flex justify-end">
          <a
            href="/legal-network"
            className="inline-flex items-center gap-1.5 text-small text-[#9ca3af] hover:text-[#111827] transition-colors"
          >
            Rechtliche Beratung benötigt? Anwalt finden →
          </a>
        </div>
      </div>
    </FeatureGate>
  );
}
