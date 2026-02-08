"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  ShieldCheck,
  Plus,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Shield,
  ShieldAlert,
  ShieldOff,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

interface NIS2Assessment {
  id: string;
  assessmentName: string | null;
  entityClassification: string | null;
  classificationReason: string | null;
  sector: string | null;
  subSector: string | null;
  organizationSize: string | null;
  memberStateCount: number;
  complianceScore: number | null;
  maturityScore: number | null;
  riskLevel: string | null;
  euSpaceActOverlapCount: number | null;
  hasISO27001: boolean;
  hasExistingCSIRT: boolean;
  requirements: {
    id: string;
    requirementId: string;
    status: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

const classificationConfig: Record<
  string,
  { icon: typeof Shield; label: string; color: string; bgColor: string }
> = {
  essential: {
    icon: ShieldAlert,
    label: "Essential Entity",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  important: {
    icon: Shield,
    label: "Important Entity",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  out_of_scope: {
    icon: ShieldOff,
    label: "Out of Scope",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
  },
};

export default function NIS2ModulePage() {
  const [assessments, setAssessments] = useState<NIS2Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchAssessments = useCallback(async () => {
    try {
      const res = await fetch("/api/nis2");
      if (!res.ok) throw new Error("Failed to fetch assessments");
      const data = await res.json();
      setAssessments(data.assessments || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load assessments",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleCreateAssessment = async () => {
    setCreating(true);
    try {
      // Check if there's a pending assessment from the public flow
      let pendingData: Record<string, unknown> | null = null;
      try {
        const stored = localStorage.getItem("caelex-pending-nis2-assessment");
        if (stored) {
          pendingData = JSON.parse(stored);
          localStorage.removeItem("caelex-pending-nis2-assessment");
        }
      } catch {
        // ignore
      }

      const res = await fetch("/api/nis2", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          assessmentName: `NIS2 Assessment ${new Date().toLocaleDateString()}`,
          sector: (pendingData?.sector as string) || "space",
          subSector: pendingData?.subSector || null,
          entitySize: (pendingData?.organizationSize as string) || "medium",
        }),
      });

      if (!res.ok) throw new Error("Failed to create assessment");

      await fetchAssessments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create assessment",
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <FeatureGate module="nis2">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-white/40" />
        </div>
      </FeatureGate>
    );
  }

  return (
    <FeatureGate module="nis2">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                  NIS2 Directive
                </h1>
                <p className="text-sm text-slate-500 dark:text-white/40">
                  (EU) 2022/2555 — Space sector cybersecurity compliance
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/assessment/nis2"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-lg transition-colors"
            >
              Public Assessment
              <ExternalLink size={14} />
            </a>
            <button
              onClick={handleCreateAssessment}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {creating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              New Assessment
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {assessments.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-12 text-center"
          >
            <ShieldCheck className="w-12 h-12 text-cyan-400/40 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No NIS2 assessments yet
            </h3>
            <p className="text-sm text-slate-500 dark:text-white/40 max-w-md mx-auto mb-6">
              Create a NIS2 Directive assessment to determine your entity
              classification and applicable cybersecurity requirements under the
              NIS2 Directive for the space sector.
            </p>
            <button
              onClick={handleCreateAssessment}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {creating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Create First Assessment
            </button>
          </motion.div>
        )}

        {/* Assessments list */}
        {assessments.length > 0 && (
          <div className="space-y-4">
            {assessments.map((assessment, index) => {
              const config =
                classificationConfig[
                  assessment.entityClassification || "out_of_scope"
                ] || classificationConfig.out_of_scope;
              const ClassIcon = config.icon;

              const totalReqs = assessment.requirements.length;
              const compliantReqs = assessment.requirements.filter(
                (r) => r.status === "compliant",
              ).length;
              const progress =
                totalReqs > 0
                  ? Math.round((compliantReqs / totalReqs) * 100)
                  : 0;

              return (
                <motion.a
                  key={assessment.id}
                  href={`/dashboard/modules/nis2/${assessment.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="block bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5 hover:border-slate-300 dark:hover:border-white/[0.15] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center`}
                      >
                        <ClassIcon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                          {assessment.assessmentName || "Untitled Assessment"}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className={`text-xs font-medium ${config.color}`}
                          >
                            {config.label}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-white/30">
                            {assessment.sector?.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-white/30">
                            {new Date(
                              assessment.createdAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Requirements progress */}
                      <div className="text-right">
                        <div className="text-sm font-mono font-medium text-slate-900 dark:text-white">
                          {compliantReqs}/{totalReqs}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-white/30 uppercase">
                          Requirements
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-24">
                        <div className="h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-white/30 text-right mt-1">
                          {progress}%
                        </div>
                      </div>

                      {/* EU Space Act overlap */}
                      {assessment.euSpaceActOverlapCount != null &&
                        assessment.euSpaceActOverlapCount > 0 && (
                          <div className="text-right">
                            <div className="text-sm font-mono font-medium text-green-400">
                              {assessment.euSpaceActOverlapCount}
                            </div>
                            <div className="text-[10px] text-green-400/60 uppercase">
                              Overlaps
                            </div>
                          </div>
                        )}

                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20" />
                    </div>
                  </div>
                </motion.a>
              );
            })}
          </div>
        )}

        {/* Info card */}
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-5">
          <h4 className="text-sm font-medium text-cyan-400 mb-2">
            About NIS2 for Space Operators
          </h4>
          <p className="text-xs text-slate-500 dark:text-white/40 leading-relaxed">
            The NIS2 Directive (EU) 2022/2555 lists Space as a sector of high
            criticality in Annex I (Sector 11). Space operators must comply with
            Art. 21 cybersecurity risk-management measures and Art. 23 incident
            reporting obligations. The upcoming EU Space Act will act as{" "}
            <em>lex specialis</em>, superseding NIS2 for space-specific
            requirements from 2030.
          </p>
        </div>
      </div>
    </FeatureGate>
  );
}
