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

// Risk badge colors (light mode)
const RISK_COLORS = {
  low: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  medium: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  high: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  critical: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
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
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <span className="inline-block text-caption font-medium text-emerald-600 uppercase tracking-[0.2em] mb-4">
            Unified Compliance Profile
          </span>
          <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-gray-900 mb-4">
            Your Regulatory Landscape
          </h1>
          <p className="text-subtitle text-gray-500 max-w-2xl mx-auto">
            Complete analysis across EU Space Act, NIS2 Directive, and National
            Space Laws
          </p>
        </motion.div>

        {/* Company Summary Card */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div
            className="p-6 rounded-xl bg-white border border-gray-200"
            style={{
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-6">
              {/* Company Info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-heading font-medium text-gray-900">
                    {result.companySummary.name || "Your Organization"}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1.5 text-body text-gray-500">
                      <MapPin size={12} />
                      {result.companySummary.establishment}
                      {result.companySummary.isEU && (
                        <span className="text-emerald-600">(EU)</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-body text-gray-500">
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
                    className="px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-caption font-medium text-gray-700 uppercase tracking-wider"
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
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {/* Total Requirements */}
          <div
            className="p-5 rounded-xl bg-white border border-gray-200"
            style={{
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <FileText className="w-5 h-5 text-gray-400 mb-3" />
            <div className="text-[28px] font-medium text-gray-900">
              {result.overallSummary.totalRequirements}
            </div>
            <div className="text-small text-gray-500 uppercase tracking-wider">
              Total Requirements
            </div>
          </div>

          {/* Overall Risk */}
          <div
            className={`p-5 rounded-xl border ${riskColors.bg} ${riskColors.border}`}
            style={{
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <AlertTriangle className={`w-5 h-5 ${riskColors.text} mb-3`} />
            <div
              className={`text-[28px] font-medium ${riskColors.text} capitalize`}
            >
              {result.overallSummary.overallRisk}
            </div>
            <div className="text-small text-gray-500 uppercase tracking-wider">
              Risk Level
            </div>
          </div>

          {/* Estimated Timeline */}
          <div
            className="p-5 rounded-xl bg-white border border-gray-200"
            style={{
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <Clock className="w-5 h-5 text-gray-400 mb-3" />
            <div className="text-[28px] font-medium text-gray-900">
              {result.overallSummary.estimatedMonths}
              <span className="text-title text-gray-500 ml-1">mo</span>
            </div>
            <div className="text-small text-gray-500 uppercase tracking-wider">
              Est. Timeline
            </div>
          </div>

          {/* Frameworks */}
          <div
            className="p-5 rounded-xl bg-white border border-gray-200"
            style={{
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <Target className="w-5 h-5 text-gray-400 mb-3" />
            <div className="text-[28px] font-medium text-gray-900">
              {
                [
                  result.euSpaceAct.applies,
                  result.nis2.applies,
                  result.nationalSpaceLaw.analyzedCount > 0,
                ].filter(Boolean).length
              }
            </div>
            <div className="text-small text-gray-500 uppercase tracking-wider">
              Frameworks Apply
            </div>
          </div>
        </motion.div>

        {/* Framework Sections */}
        <div className="space-y-6">
          {/* EU Space Act */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className="rounded-xl bg-white border border-gray-200 overflow-hidden"
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              {/* Header */}
              <button
                onClick={() => toggleSection("euSpaceAct")}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      result.euSpaceAct.applies
                        ? "bg-amber-50 border border-amber-200"
                        : "bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <Satellite
                      className={`w-6 h-6 ${result.euSpaceAct.applies ? "text-amber-600" : "text-gray-400"}`}
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="text-title font-medium text-gray-900">
                      EU Space Act
                    </h3>
                    <p className="text-body text-gray-500">
                      {result.euSpaceAct.applies
                        ? `${result.euSpaceAct.regime.charAt(0).toUpperCase() + result.euSpaceAct.regime.slice(1)} Regime • ${result.euSpaceAct.applicableArticleCount} Articles`
                        : "Not applicable"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {result.euSpaceAct.applies ? (
                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-caption font-medium uppercase tracking-wider border border-amber-200">
                      Applies 2030
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-caption font-medium uppercase tracking-wider border border-gray-200">
                      Exempt
                    </span>
                  )}
                  {expandedSections.euSpaceAct ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Content */}
              {expandedSections.euSpaceAct && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="pt-5">
                    {result.euSpaceAct.applies ? (
                      <div className="space-y-5">
                        {/* Regime explanation */}
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                          <p className="text-body text-gray-700 leading-relaxed">
                            {result.euSpaceAct.regimeReason}
                          </p>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
                            <div className="text-heading-lg font-medium text-gray-900">
                              {result.euSpaceAct.applicableArticleCount}
                            </div>
                            <div className="text-micro text-gray-500 uppercase tracking-wider">
                              Articles
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
                            <div className="text-heading-lg font-medium text-gray-900">
                              {result.euSpaceAct.moduleCount}
                            </div>
                            <div className="text-micro text-gray-500 uppercase tracking-wider">
                              Modules
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
                            <div className="text-heading-lg font-medium text-amber-600 capitalize">
                              {result.euSpaceAct.regime}
                            </div>
                            <div className="text-micro text-gray-500 uppercase tracking-wider">
                              Regime
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
                            <div className="text-heading-lg font-medium text-gray-900">
                              {result.euSpaceAct.operatorTypes.length}
                            </div>
                            <div className="text-micro text-gray-500 uppercase tracking-wider">
                              Op. Types
                            </div>
                          </div>
                        </div>

                        {/* Deadlines */}
                        {result.euSpaceAct.keyDeadlines.length > 0 && (
                          <div>
                            <h4 className="text-small font-medium text-gray-500 uppercase tracking-wider mb-3">
                              Key Deadlines
                            </h4>
                            <div className="space-y-2">
                              {result.euSpaceAct.keyDeadlines.map(
                                (deadline, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center gap-3 text-body"
                                  >
                                    <Calendar
                                      size={14}
                                      className="text-amber-600"
                                    />
                                    <span className="text-gray-700">
                                      {deadline.date}
                                    </span>
                                    <span className="text-gray-500">
                                      {deadline.description}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                        {/* Module Statuses */}
                        {result.euSpaceAct.moduleStatuses &&
                          result.euSpaceAct.moduleStatuses.length > 0 && (
                            <div>
                              <h4 className="text-small font-medium text-gray-500 uppercase tracking-wider mb-3">
                                Module Breakdown
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {result.euSpaceAct.moduleStatuses.map((mod) => (
                                  <div
                                    key={mod.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`inline-block w-2 h-2 rounded-full ${
                                          mod.status === "required"
                                            ? "bg-emerald-500"
                                            : mod.status === "simplified"
                                              ? "bg-amber-500"
                                              : "bg-gray-300"
                                        }`}
                                      />
                                      <span className="text-body text-gray-700">
                                        {mod.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-caption text-gray-500">
                                        {mod.articleCount} art.
                                      </span>
                                      <span
                                        className={`text-micro px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                          mod.status === "required"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : mod.status === "simplified"
                                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                                              : "bg-gray-100 text-gray-500 border border-gray-200"
                                        }`}
                                      >
                                        {mod.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Applicable Articles */}
                        {result.euSpaceAct.applicableArticles &&
                          result.euSpaceAct.applicableArticles.length > 0 && (
                            <div>
                              <h4 className="text-small font-medium text-gray-500 uppercase tracking-wider mb-3">
                                Applicable Articles (
                                {result.euSpaceAct.applicableArticles.length})
                              </h4>
                              <div className="overflow-hidden rounded-lg border border-gray-200">
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="bg-gray-50">
                                      <th className="px-3 py-2 text-micro text-gray-500 uppercase tracking-wider font-medium">
                                        Article
                                      </th>
                                      <th className="px-3 py-2 text-micro text-gray-500 uppercase tracking-wider font-medium">
                                        Title
                                      </th>
                                      <th className="px-3 py-2 text-micro text-gray-500 uppercase tracking-wider font-medium">
                                        Type
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {result.euSpaceAct.applicableArticles
                                      .slice(
                                        0,
                                        expandedSections.articles
                                          ? undefined
                                          : 10,
                                      )
                                      .map((article) => (
                                        <tr
                                          key={article.number}
                                          className="border-t border-gray-100 hover:bg-gray-50"
                                        >
                                          <td className="px-3 py-2 text-body text-emerald-600 font-mono">
                                            Art. {article.number}
                                          </td>
                                          <td className="px-3 py-2 text-body text-gray-700">
                                            {article.title}
                                          </td>
                                          <td className="px-3 py-2 text-caption text-gray-500">
                                            {article.relevance}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                                {result.euSpaceAct.applicableArticles.length >
                                  10 &&
                                  !expandedSections.articles && (
                                    <button
                                      onClick={() => toggleSection("articles")}
                                      className="w-full py-2 text-center text-caption text-emerald-600 hover:text-emerald-700 transition-colors bg-gray-50"
                                    >
                                      Show all{" "}
                                      {
                                        result.euSpaceAct.applicableArticles
                                          .length
                                      }{" "}
                                      articles
                                    </button>
                                  )}
                              </div>
                            </div>
                          )}

                        {/* Priority actions */}
                        {result.euSpaceAct.priorityActions.length > 0 && (
                          <div>
                            <h4 className="text-small font-medium text-gray-500 uppercase tracking-wider mb-3">
                              Priority Actions
                            </h4>
                            <div className="space-y-2">
                              {result.euSpaceAct.priorityActions.map(
                                (action, i) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-3 text-body"
                                  >
                                    <Zap
                                      size={14}
                                      className="text-amber-600 mt-0.5 flex-shrink-0"
                                    />
                                    <span className="text-gray-700">
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
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <p className="text-body text-gray-500 leading-relaxed">
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
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div
              className="rounded-xl bg-white border border-gray-200 overflow-hidden"
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              {/* Header */}
              <button
                onClick={() => toggleSection("nis2")}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      result.nis2.applies
                        ? "bg-emerald-50 border border-emerald-200"
                        : "bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <Shield
                      className={`w-6 h-6 ${result.nis2.applies ? "text-emerald-600" : "text-gray-400"}`}
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="text-title font-medium text-gray-900">
                      NIS2 Directive
                    </h3>
                    <p className="text-body text-gray-500">
                      {result.nis2.applies
                        ? `${result.nis2.entityClassification.charAt(0).toUpperCase() + result.nis2.entityClassification.slice(1)} Entity • ${result.nis2.requirementCount} Requirements`
                        : "Not applicable"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {result.nis2.applies ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-caption font-medium uppercase tracking-wider border border-emerald-200">
                      In Force
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-caption font-medium uppercase tracking-wider border border-gray-200">
                      Out of Scope
                    </span>
                  )}
                  {expandedSections.nis2 ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Content */}
              {expandedSections.nis2 && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="pt-5">
                    {result.nis2.applies ? (
                      <div className="space-y-5">
                        {/* Classification explanation */}
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                          <p className="text-body text-gray-700 leading-relaxed">
                            {result.nis2.classificationReason}
                          </p>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
                            <div className="text-heading-lg font-medium text-gray-900">
                              {result.nis2.requirementCount}
                            </div>
                            <div className="text-micro text-gray-500 uppercase tracking-wider">
                              Requirements
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
                            <div className="text-heading-lg font-medium text-red-600">
                              {result.nis2.complianceGapCount}
                            </div>
                            <div className="text-micro text-gray-500 uppercase tracking-wider">
                              Gaps
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
                            <div className="text-heading-lg font-medium text-emerald-600 capitalize">
                              {result.nis2.entityClassification}
                            </div>
                            <div className="text-micro text-gray-500 uppercase tracking-wider">
                              Classification
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
                            <div className="text-heading-lg font-medium text-gray-900">
                              {result.nis2.estimatedReadiness}%
                            </div>
                            <div className="text-micro text-gray-500 uppercase tracking-wider">
                              Readiness
                            </div>
                          </div>
                        </div>

                        {/* Readiness bar */}
                        <div>
                          <div className="flex justify-between text-small mb-2">
                            <span className="text-gray-500">
                              Compliance Readiness
                            </span>
                            <span className="text-emerald-600">
                              {result.nis2.estimatedReadiness}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                              style={{
                                width: `${result.nis2.estimatedReadiness}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* NIS2 Incident Timeline */}
                        {result.nis2.incidentTimeline &&
                          result.nis2.incidentTimeline.length > 0 && (
                            <div>
                              <h4 className="text-small font-medium text-gray-500 uppercase tracking-wider mb-3">
                                Incident Reporting Timeline
                              </h4>
                              <div className="relative">
                                {/* Timeline line */}
                                <div className="absolute left-4 top-4 bottom-4 w-px bg-emerald-200" />
                                <div className="space-y-4">
                                  {result.nis2.incidentTimeline.map(
                                    (phase, i) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-4 relative"
                                      >
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 z-10">
                                          <Clock
                                            size={14}
                                            className="text-emerald-600"
                                          />
                                        </div>
                                        <div className="flex-1 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-body font-medium text-gray-800">
                                              {phase.phase}
                                            </span>
                                            <span className="text-caption font-medium text-emerald-600">
                                              {phase.deadline}
                                            </span>
                                          </div>
                                          <p className="text-small text-gray-500">
                                            {phase.description}
                                          </p>
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                        {/* Priority actions */}
                        {result.nis2.priorityActions.length > 0 && (
                          <div>
                            <h4 className="text-small font-medium text-gray-500 uppercase tracking-wider mb-3">
                              Priority Actions
                            </h4>
                            <div className="space-y-2">
                              {result.nis2.priorityActions.map((action, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-3 text-body"
                                >
                                  <Zap
                                    size={14}
                                    className="text-emerald-600 mt-0.5 flex-shrink-0"
                                  />
                                  <span className="text-gray-700">
                                    {action}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <p className="text-body text-gray-500 leading-relaxed">
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
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div
              className="rounded-xl bg-white border border-gray-200 overflow-hidden"
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              {/* Header */}
              <button
                onClick={() => toggleSection("nationalLaw")}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      result.nationalSpaceLaw.analyzedCount > 0
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <Globe
                      className={`w-6 h-6 ${result.nationalSpaceLaw.analyzedCount > 0 ? "text-blue-600" : "text-gray-400"}`}
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="text-title font-medium text-gray-900">
                      National Space Laws
                    </h3>
                    <p className="text-body text-gray-500">
                      {result.nationalSpaceLaw.analyzedCount > 0
                        ? `${result.nationalSpaceLaw.analyzedCount} Jurisdictions Analyzed`
                        : "No jurisdictions selected"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {result.nationalSpaceLaw.recommendedJurisdiction && (
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-caption font-medium uppercase tracking-wider border border-blue-200">
                      {result.nationalSpaceLaw.recommendedJurisdictionName}
                    </span>
                  )}
                  {expandedSections.nationalLaw ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Content */}
              {expandedSections.nationalLaw && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="pt-5">
                    {result.nationalSpaceLaw.analyzedCount > 0 ? (
                      <div className="space-y-5">
                        {/* Recommendation */}
                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle size={16} className="text-blue-600" />
                            <span className="text-body font-medium text-blue-700">
                              Recommendation
                            </span>
                          </div>
                          <p className="text-body text-gray-700 leading-relaxed">
                            {result.nationalSpaceLaw.recommendationReason}
                          </p>
                        </div>

                        {/* Jurisdiction scores */}
                        <div>
                          <h4 className="text-small font-medium text-gray-500 uppercase tracking-wider mb-3">
                            Jurisdiction Comparison
                          </h4>
                          <div className="space-y-3">
                            {result.nationalSpaceLaw.topScores.map((jur, i) => (
                              <div
                                key={jur.country}
                                className="p-4 rounded-xl bg-gray-50 border border-gray-200"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <span className="text-caption font-medium text-gray-400 w-5">
                                      #{i + 1}
                                    </span>
                                    <span className="text-body-lg font-medium text-gray-900">
                                      {jur.name}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-body-lg font-medium ${
                                      jur.score >= 70
                                        ? "text-emerald-600"
                                        : jur.score >= 50
                                          ? "text-amber-600"
                                          : "text-red-600"
                                    }`}
                                  >
                                    {jur.score}/100
                                  </span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <p className="text-body text-gray-500 leading-relaxed">
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

        {/* Cross-Framework Overlap */}
        {result.crossFrameworkOverlap &&
          result.crossFrameworkOverlap.length > 0 && (
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="mt-6"
            >
              <div
                className="p-5 rounded-xl bg-white border border-gray-200"
                style={{
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <h3 className="text-small font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Cross-Framework Overlap
                </h3>
                <p className="text-caption text-gray-400 mb-3">
                  Requirements shared between EU Space Act and NIS2 — implement
                  once, satisfy both
                </p>
                <div className="space-y-2">
                  {result.crossFrameworkOverlap.map((overlap, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200"
                    >
                      <span className="text-body text-gray-700 flex-1">
                        {overlap.area}
                      </span>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-caption text-amber-600 font-mono">
                          {overlap.euSpaceActRef}
                        </span>
                        <span className="text-caption text-gray-300">/</span>
                        <span className="text-caption text-emerald-600 font-mono">
                          {overlap.nis2Ref}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        {/* Confidence Score */}
        {result.confidenceScore !== undefined && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34 }}
            className="mt-4"
          >
            <div
              className="p-4 rounded-xl bg-white border border-gray-200 flex items-center justify-between"
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-200"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${result.confidenceScore}, 100`}
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-micro font-medium text-emerald-600">
                    {result.confidenceScore}
                  </span>
                </div>
                <div>
                  <span className="text-body text-gray-700">
                    Assessment Confidence
                  </span>
                  {result.confidenceScore < 80 && (
                    <p className="text-caption text-gray-400">
                      Answer more questions to improve accuracy
                    </p>
                  )}
                </div>
              </div>
              <span
                className={`text-body-lg font-medium ${
                  result.confidenceScore >= 80
                    ? "text-emerald-600"
                    : result.confidenceScore >= 50
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
              >
                {result.confidenceScore}%
              </span>
            </div>
          </motion.div>
        )}

        {/* Immediate Actions */}
        {result.overallSummary.immediateActions.length > 0 && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8"
          >
            <div
              className="p-6 rounded-xl bg-emerald-50 border border-emerald-200"
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-emerald-600" />
                <h3 className="text-subtitle font-medium text-emerald-700">
                  Immediate Actions Required
                </h3>
              </div>
              <div className="space-y-3">
                {result.overallSummary.immediateActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-caption font-medium text-emerald-700">
                        {i + 1}
                      </span>
                    </div>
                    <p className="text-body text-gray-700 leading-relaxed">
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
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <DisclaimerBanner variant="inline" />
        </motion.div>

        {/* Primary CTA - Go to Dashboard */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-10"
        >
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-3 w-full max-w-md mx-auto px-8 py-5 rounded-xl bg-[#111827] text-white text-title font-medium hover:bg-[#374151] transition-all duration-300 group"
          >
            <LayoutDashboard size={20} />
            Go to Dashboard
            <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
          <p className="text-center text-small text-gray-500 mt-3">
            Track your compliance progress and manage all requirements
          </p>
        </motion.div>

        {/* Secondary Actions */}
        <motion.div
          initial={false}
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-body text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-300"
          >
            <Download size={14} />
            Export JSON
          </button>
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-body text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-300"
          >
            <RotateCcw size={14} />
            Start Over
          </button>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-gray-400 text-caption tracking-[0.05em] mt-12"
        >
          Assessment ID: {result.assessmentId} • Generated{" "}
          {new Date(result.completedAt).toLocaleDateString()}
        </motion.p>
      </div>
    </div>
  );
}
