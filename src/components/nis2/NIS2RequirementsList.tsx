"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

interface RedactedRequirement {
  id: string;
  articleRef: string;
  category: string;
  title: string;
  severity: "critical" | "major" | "minor";
}

interface NIS2RequirementsListProps {
  requirements: RedactedRequirement[];
  totalCount: number;
  applicableCount: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  policies_risk_analysis: "Risk Analysis & Security Policies",
  incident_handling: "Incident Handling",
  business_continuity: "Business Continuity & Crisis Management",
  supply_chain: "Supply Chain Security",
  network_acquisition: "Network & System Security",
  effectiveness_assessment: "Security Effectiveness Assessment",
  cyber_hygiene: "Cyber Hygiene & Training",
  cryptography: "Cryptography & Encryption",
  hr_access_asset: "HR Security & Access Control",
  mfa_authentication: "Multi-Factor Authentication",
  governance: "Governance & Accountability",
  registration: "Registration & Notification",
  reporting: "Incident Reporting",
  information_sharing: "Information Sharing",
};

const severityConfig = {
  critical: {
    icon: AlertCircle,
    label: "Critical",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
  major: {
    icon: AlertTriangle,
    label: "Major",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  minor: {
    icon: Info,
    label: "Minor",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
};

export default function NIS2RequirementsList({
  requirements,
  totalCount,
  applicableCount,
}: NIS2RequirementsListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Group requirements by category
  const grouped = requirements.reduce(
    (acc, req) => {
      if (!acc[req.category]) {
        acc[req.category] = [];
      }
      acc[req.category].push(req);
      return acc;
    },
    {} as Record<string, RedactedRequirement[]>,
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Count by severity
  const criticalCount = requirements.filter(
    (r) => r.severity === "critical",
  ).length;
  const majorCount = requirements.filter((r) => r.severity === "major").length;
  const minorCount = requirements.filter((r) => r.severity === "minor").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            Applicable Requirements
          </h3>
          <p className="text-sm text-white/40">
            NIS2 Art. 21 cybersecurity risk-management measures
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold text-white">
            {applicableCount}
          </div>
          <div className="text-xs text-white/40">of {totalCount} total</div>
        </div>
      </div>

      {/* Severity summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2.5 text-center">
          <div className="text-lg font-mono font-semibold text-red-400">
            {criticalCount}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-red-400/60">
            Critical
          </div>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 text-center">
          <div className="text-lg font-mono font-semibold text-amber-400">
            {majorCount}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-amber-400/60">
            Major
          </div>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2.5 text-center">
          <div className="text-lg font-mono font-semibold text-blue-400">
            {minorCount}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-blue-400/60">
            Minor
          </div>
        </div>
      </div>

      {/* Grouped requirements */}
      <div className="space-y-2">
        {Object.entries(grouped).map(([category, reqs]) => {
          const isExpanded = expandedCategories.has(category);
          const categoryCritical = reqs.filter(
            (r) => r.severity === "critical",
          ).length;

          return (
            <div
              key={category}
              className="border border-white/[0.06] rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-white/40" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-white">
                      {CATEGORY_LABELS[category] || category}
                    </div>
                    <div className="text-xs text-white/40">
                      {reqs.length} requirement{reqs.length !== 1 ? "s" : ""}
                      {categoryCritical > 0 && (
                        <span className="text-red-400 ml-2">
                          {categoryCritical} critical
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {reqs.map((r) => {
                    const config = severityConfig[r.severity];
                    return (
                      <div
                        key={r.id}
                        className={`w-2 h-2 rounded-full ${config.bgColor} border ${config.borderColor}`}
                      />
                    );
                  })}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {reqs.map((req) => {
                        const config = severityConfig[req.severity];
                        const SeverityIcon = config.icon;

                        return (
                          <div
                            key={req.id}
                            className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg"
                          >
                            <SeverityIcon
                              className={`w-4 h-4 ${config.color} flex-shrink-0 mt-0.5`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white">
                                {req.title}
                              </div>
                              <div className="text-xs text-white/40 font-mono mt-1">
                                {req.articleRef}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] uppercase tracking-wider ${config.color} flex-shrink-0`}
                            >
                              {config.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* CTA for full report */}
      <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-center">
        <p className="text-sm text-blue-400 mb-1">
          Get the full NIS2 compliance report
        </p>
        <p className="text-xs text-white/40">
          Includes space-specific guidance, implementation tips, and evidence
          requirements for each measure
        </p>
      </div>
    </motion.div>
  );
}
