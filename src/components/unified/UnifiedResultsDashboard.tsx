"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Building2,
  Globe,
  Shield,
  Satellite,
  Scale,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Download,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MapPin,
  Users,
  Zap,
  Target,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import { RedactedUnifiedResult } from "@/lib/unified-assessment-types";
import DisclaimerBanner from "@/components/ui/disclaimer-banner";

interface Props {
  result: RedactedUnifiedResult;
  onRestart: () => void;
}

// Risk badge colors
const RISK_COLORS = {
  low: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  medium: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  high: {
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },
  critical: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
  },
};

export default function UnifiedResultsDashboard({ result, onRestart }: Props) {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    euSpaceAct: true,
    nis2: true,
    nationalLaw: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const riskColors =
    RISK_COLORS[
      result.overallSummary.overallRisk as keyof typeof RISK_COLORS
    ] || RISK_COLORS.medium;

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <span className="inline-block text-[11px] font-medium text-emerald-400/70 uppercase tracking-[0.2em] mb-4">
            Unified Compliance Profile
          </span>
          <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-white mb-4">
            Your Regulatory Landscape
          </h1>
          <p className="text-[15px] text-white/50 max-w-2xl mx-auto">
            Complete analysis across EU Space Act, NIS2 Directive, and National
            Space Laws
          </p>
        </motion.div>

        {/* Company Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div
            className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08]"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-6">
              {/* Company Info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-[18px] font-medium text-white">
                    {result.companySummary.name || "Your Organization"}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1.5 text-[13px] text-white/50">
                      <MapPin size={12} />
                      {result.companySummary.establishment}
                      {result.companySummary.isEU && (
                        <span className="text-emerald-400/70">(EU)</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-[13px] text-white/50">
                      <Users size={12} />
                      {result.companySummary.size}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activities */}
              <div className="flex flex-wrap gap-2">
                {result.companySummary.activities.map((activity) => (
                  <span
                    key={activity}
                    className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] font-medium text-white/70 uppercase tracking-wider"
                  >
                    {activity}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Overall Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {/* Total Requirements */}
          <div
            className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08]"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
            }}
          >
            <FileText className="w-5 h-5 text-white/40 mb-3" />
            <div className="text-[28px] font-medium text-white">
              {result.overallSummary.totalRequirements}
            </div>
            <div className="text-[12px] text-white/40 uppercase tracking-wider">
              Total Requirements
            </div>
          </div>

          {/* Overall Risk */}
          <div
            className={`p-5 rounded-xl backdrop-blur-[10px] border ${riskColors.bg} ${riskColors.border}`}
            style={{
              boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
            }}
          >
            <AlertTriangle className={`w-5 h-5 ${riskColors.text} mb-3`} />
            <div
              className={`text-[28px] font-medium ${riskColors.text} capitalize`}
            >
              {result.overallSummary.overallRisk}
            </div>
            <div className="text-[12px] text-white/40 uppercase tracking-wider">
              Risk Level
            </div>
          </div>

          {/* Estimated Timeline */}
          <div
            className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08]"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
            }}
          >
            <Clock className="w-5 h-5 text-white/40 mb-3" />
            <div className="text-[28px] font-medium text-white">
              {result.overallSummary.estimatedMonths}
              <span className="text-[16px] text-white/50 ml-1">mo</span>
            </div>
            <div className="text-[12px] text-white/40 uppercase tracking-wider">
              Est. Timeline
            </div>
          </div>

          {/* Frameworks */}
          <div
            className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08]"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
            }}
          >
            <Target className="w-5 h-5 text-white/40 mb-3" />
            <div className="text-[28px] font-medium text-white">
              {
                [
                  result.euSpaceAct.applies,
                  result.nis2.applies,
                  result.nationalSpaceLaw.analyzedCount > 0,
                ].filter(Boolean).length
              }
            </div>
            <div className="text-[12px] text-white/40 uppercase tracking-wider">
              Frameworks Apply
            </div>
          </div>
        </motion.div>

        {/* Framework Sections */}
        <div className="space-y-6">
          {/* EU Space Act */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className="rounded-2xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] overflow-hidden"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
              }}
            >
              {/* Header */}
              <button
                onClick={() => toggleSection("euSpaceAct")}
                className="w-full p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      result.euSpaceAct.applies
                        ? "bg-amber-500/10 border border-amber-500/20"
                        : "bg-white/[0.06] border border-white/[0.08]"
                    }`}
                  >
                    <Satellite
                      className={`w-6 h-6 ${result.euSpaceAct.applies ? "text-amber-400" : "text-white/40"}`}
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="text-[16px] font-medium text-white">
                      EU Space Act
                    </h3>
                    <p className="text-[13px] text-white/50">
                      {result.euSpaceAct.applies
                        ? `${result.euSpaceAct.regime.charAt(0).toUpperCase() + result.euSpaceAct.regime.slice(1)} Regime • ${result.euSpaceAct.applicableArticleCount} Articles`
                        : "Not applicable"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {result.euSpaceAct.applies ? (
                    <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-medium uppercase tracking-wider">
                      Applies 2030
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-white/[0.06] text-white/40 text-[11px] font-medium uppercase tracking-wider">
                      Exempt
                    </span>
                  )}
                  {expandedSections.euSpaceAct ? (
                    <ChevronUp className="w-5 h-5 text-white/40" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  )}
                </div>
              </button>

              {/* Content */}
              {expandedSections.euSpaceAct && (
                <div className="px-5 pb-5 border-t border-white/[0.06]">
                  <div className="pt-5">
                    {result.euSpaceAct.applies ? (
                      <div className="space-y-5">
                        {/* Regime explanation */}
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <p className="text-[13px] text-white/70 leading-relaxed">
                            {result.euSpaceAct.regimeReason}
                          </p>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                            <div className="text-[20px] font-medium text-white">
                              {result.euSpaceAct.applicableArticleCount}
                            </div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wider">
                              Articles
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                            <div className="text-[20px] font-medium text-white">
                              {result.euSpaceAct.moduleCount}
                            </div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wider">
                              Modules
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                            <div className="text-[20px] font-medium text-amber-400 capitalize">
                              {result.euSpaceAct.regime}
                            </div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wider">
                              Regime
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                            <div className="text-[20px] font-medium text-white">
                              {result.euSpaceAct.operatorTypes.length}
                            </div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wider">
                              Op. Types
                            </div>
                          </div>
                        </div>

                        {/* Deadlines */}
                        {result.euSpaceAct.keyDeadlines.length > 0 && (
                          <div>
                            <h4 className="text-[12px] font-medium text-white/60 uppercase tracking-wider mb-3">
                              Key Deadlines
                            </h4>
                            <div className="space-y-2">
                              {result.euSpaceAct.keyDeadlines.map(
                                (deadline, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center gap-3 text-[13px]"
                                  >
                                    <Calendar
                                      size={14}
                                      className="text-amber-400/70"
                                    />
                                    <span className="text-white/70 font-mono">
                                      {deadline.date}
                                    </span>
                                    <span className="text-white/50">
                                      {deadline.description}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                        {/* Priority actions */}
                        {result.euSpaceAct.priorityActions.length > 0 && (
                          <div>
                            <h4 className="text-[12px] font-medium text-white/60 uppercase tracking-wider mb-3">
                              Priority Actions
                            </h4>
                            <div className="space-y-2">
                              {result.euSpaceAct.priorityActions.map(
                                (action, i) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-3 text-[13px]"
                                  >
                                    <Zap
                                      size={14}
                                      className="text-amber-400/70 mt-0.5 flex-shrink-0"
                                    />
                                    <span className="text-white/70">
                                      {action}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-[13px] text-white/50 leading-relaxed">
                          {result.euSpaceAct.regimeReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* NIS2 Directive */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div
              className="rounded-2xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] overflow-hidden"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
              }}
            >
              {/* Header */}
              <button
                onClick={() => toggleSection("nis2")}
                className="w-full p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      result.nis2.applies
                        ? "bg-emerald-500/10 border border-emerald-500/20"
                        : "bg-white/[0.06] border border-white/[0.08]"
                    }`}
                  >
                    <Shield
                      className={`w-6 h-6 ${result.nis2.applies ? "text-emerald-400" : "text-white/40"}`}
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="text-[16px] font-medium text-white">
                      NIS2 Directive
                    </h3>
                    <p className="text-[13px] text-white/50">
                      {result.nis2.applies
                        ? `${result.nis2.entityClassification.charAt(0).toUpperCase() + result.nis2.entityClassification.slice(1)} Entity • ${result.nis2.requirementCount} Requirements`
                        : "Not applicable"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {result.nis2.applies ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-medium uppercase tracking-wider">
                      In Force
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-white/[0.06] text-white/40 text-[11px] font-medium uppercase tracking-wider">
                      Out of Scope
                    </span>
                  )}
                  {expandedSections.nis2 ? (
                    <ChevronUp className="w-5 h-5 text-white/40" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  )}
                </div>
              </button>

              {/* Content */}
              {expandedSections.nis2 && (
                <div className="px-5 pb-5 border-t border-white/[0.06]">
                  <div className="pt-5">
                    {result.nis2.applies ? (
                      <div className="space-y-5">
                        {/* Classification explanation */}
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <p className="text-[13px] text-white/70 leading-relaxed">
                            {result.nis2.classificationReason}
                          </p>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                            <div className="text-[20px] font-medium text-white">
                              {result.nis2.requirementCount}
                            </div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wider">
                              Requirements
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                            <div className="text-[20px] font-medium text-red-400">
                              {result.nis2.complianceGapCount}
                            </div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wider">
                              Gaps
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                            <div className="text-[20px] font-medium text-emerald-400 capitalize">
                              {result.nis2.entityClassification}
                            </div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wider">
                              Classification
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                            <div className="text-[20px] font-medium text-white">
                              {result.nis2.estimatedReadiness}%
                            </div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wider">
                              Readiness
                            </div>
                          </div>
                        </div>

                        {/* Readiness bar */}
                        <div>
                          <div className="flex justify-between text-[12px] mb-2">
                            <span className="text-white/50">
                              Compliance Readiness
                            </span>
                            <span className="text-emerald-400">
                              {result.nis2.estimatedReadiness}%
                            </span>
                          </div>
                          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                              style={{
                                width: `${result.nis2.estimatedReadiness}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Priority actions */}
                        {result.nis2.priorityActions.length > 0 && (
                          <div>
                            <h4 className="text-[12px] font-medium text-white/60 uppercase tracking-wider mb-3">
                              Priority Actions
                            </h4>
                            <div className="space-y-2">
                              {result.nis2.priorityActions.map((action, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-3 text-[13px]"
                                >
                                  <Zap
                                    size={14}
                                    className="text-emerald-400/70 mt-0.5 flex-shrink-0"
                                  />
                                  <span className="text-white/70">
                                    {action}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-[13px] text-white/50 leading-relaxed">
                          {result.nis2.classificationReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* National Space Laws */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div
              className="rounded-2xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] overflow-hidden"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
              }}
            >
              {/* Header */}
              <button
                onClick={() => toggleSection("nationalLaw")}
                className="w-full p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      result.nationalSpaceLaw.analyzedCount > 0
                        ? "bg-blue-500/10 border border-blue-500/20"
                        : "bg-white/[0.06] border border-white/[0.08]"
                    }`}
                  >
                    <Globe
                      className={`w-6 h-6 ${result.nationalSpaceLaw.analyzedCount > 0 ? "text-blue-400" : "text-white/40"}`}
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="text-[16px] font-medium text-white">
                      National Space Laws
                    </h3>
                    <p className="text-[13px] text-white/50">
                      {result.nationalSpaceLaw.analyzedCount > 0
                        ? `${result.nationalSpaceLaw.analyzedCount} Jurisdictions Analyzed`
                        : "No jurisdictions selected"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {result.nationalSpaceLaw.recommendedJurisdiction && (
                    <span className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 text-[11px] font-medium uppercase tracking-wider">
                      {result.nationalSpaceLaw.recommendedJurisdictionName}
                    </span>
                  )}
                  {expandedSections.nationalLaw ? (
                    <ChevronUp className="w-5 h-5 text-white/40" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  )}
                </div>
              </button>

              {/* Content */}
              {expandedSections.nationalLaw && (
                <div className="px-5 pb-5 border-t border-white/[0.06]">
                  <div className="pt-5">
                    {result.nationalSpaceLaw.analyzedCount > 0 ? (
                      <div className="space-y-5">
                        {/* Recommendation */}
                        <div className="p-4 rounded-xl bg-blue-500/[0.08] border border-blue-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle size={16} className="text-blue-400" />
                            <span className="text-[13px] font-medium text-blue-400">
                              Recommendation
                            </span>
                          </div>
                          <p className="text-[13px] text-white/70 leading-relaxed">
                            {result.nationalSpaceLaw.recommendationReason}
                          </p>
                        </div>

                        {/* Jurisdiction scores */}
                        <div>
                          <h4 className="text-[12px] font-medium text-white/60 uppercase tracking-wider mb-3">
                            Jurisdiction Comparison
                          </h4>
                          <div className="space-y-3">
                            {result.nationalSpaceLaw.topScores.map((jur, i) => (
                              <div
                                key={jur.country}
                                className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-medium text-white/40 w-5">
                                      #{i + 1}
                                    </span>
                                    <span className="text-[14px] font-medium text-white">
                                      {jur.name}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[14px] font-medium ${
                                      jur.score >= 70
                                        ? "text-emerald-400"
                                        : jur.score >= 50
                                          ? "text-amber-400"
                                          : "text-red-400"
                                    }`}
                                  >
                                    {jur.score}/100
                                  </span>
                                </div>
                                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      jur.score >= 70
                                        ? "bg-emerald-500"
                                        : jur.score >= 50
                                          ? "bg-amber-500"
                                          : "bg-red-500"
                                    }`}
                                    style={{ width: `${jur.score}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-[13px] text-white/50 leading-relaxed">
                          {result.nationalSpaceLaw.recommendationReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Immediate Actions */}
        {result.overallSummary.immediateActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8"
          >
            <div
              className="p-6 rounded-2xl bg-emerald-500/[0.08] backdrop-blur-[10px] border border-emerald-500/20"
              style={{
                boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-emerald-400" />
                <h3 className="text-[15px] font-medium text-emerald-400">
                  Immediate Actions Required
                </h3>
              </div>
              <div className="space-y-3">
                {result.overallSummary.immediateActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[11px] font-medium text-emerald-400">
                        {i + 1}
                      </span>
                    </div>
                    <p className="text-[13px] text-white/70 leading-relaxed">
                      {action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Legal Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <DisclaimerBanner variant="inline" />
        </motion.div>

        {/* Primary CTA - Go to Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-10"
        >
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-3 w-full max-w-md mx-auto px-8 py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-[16px] font-medium hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all duration-300 group"
          >
            <LayoutDashboard size={20} />
            Go to Dashboard
            <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
          <p className="text-center text-[12px] text-white/40 mt-3">
            Track your compliance progress and manage all requirements
          </p>
        </motion.div>

        {/* Secondary Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex flex-wrap justify-center gap-4"
        >
          <button
            onClick={() => {
              // Export functionality
              const dataStr = JSON.stringify(result, null, 2);
              const blob = new Blob([dataStr], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `caelex-compliance-profile-${new Date().toISOString().split("T")[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.10] text-[13px] text-white/70 hover:bg-white/[0.10] hover:text-white transition-all duration-300"
          >
            <Download size={14} />
            Export JSON
          </button>
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.10] text-[13px] text-white/70 hover:bg-white/[0.10] hover:text-white transition-all duration-300"
          >
            <RotateCcw size={14} />
            Start Over
          </button>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-white/25 text-[11px] tracking-[0.05em] mt-12"
        >
          Assessment ID: {result.assessmentId} • Generated{" "}
          {new Date(result.completedAt).toLocaleDateString()}
        </motion.p>
      </div>
    </div>
  );
}
