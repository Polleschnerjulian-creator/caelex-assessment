"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Shield,
  Info,
} from "lucide-react";
import type { CrossRegulationAlert } from "@/lib/services/cross-regulation-alert-service";

// ─── Severity Styling ───

const severityStyles: Record<
  CrossRegulationAlert["severity"],
  {
    border: string;
    badge: string;
    badgeText: string;
    icon: string;
    label: string;
  }
> = {
  high: {
    border: "border-l-red-500",
    badge: "bg-red-500/20 border-red-500/30",
    badgeText: "text-red-400",
    icon: "text-red-400",
    label: "High",
  },
  medium: {
    border: "border-l-amber-500",
    badge: "bg-amber-500/20 border-amber-500/30",
    badgeText: "text-amber-400",
    icon: "text-amber-400",
    label: "Medium",
  },
  low: {
    border: "border-l-blue-500",
    badge: "bg-blue-500/20 border-blue-500/30",
    badgeText: "text-blue-400",
    icon: "text-blue-400",
    label: "Low",
  },
};

// ─── Module link mapping ───

const moduleLinks: Record<string, string> = {
  authorization: "/dashboard/modules/authorization",
  cybersecurity: "/dashboard/modules/cybersecurity",
  debris: "/dashboard/modules/debris",
  insurance: "/dashboard/modules/insurance",
  environmental: "/dashboard/modules/environmental",
  registration: "/dashboard/modules/registration",
  nis2: "/dashboard/modules/nis2",
  supervision: "/dashboard/modules/supervision",
};

// ─── Props ───

interface CrossRegulationAlertsProps {
  alerts: CrossRegulationAlert[];
  maxVisible?: number;
}

// ─── Component ───

export default function CrossRegulationAlerts({
  alerts,
  maxVisible = 5,
}: CrossRegulationAlertsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visibleAlerts = showAll ? alerts : alerts.slice(0, maxVisible);
  const hiddenCount = alerts.length - maxVisible;

  if (alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 dark:bg-white/5 dark:backdrop-blur-sm dark:border-white/10 rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h2 className="text-caption uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">
            Cross-Regulation Alerts
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <Shield className="w-8 h-8 text-emerald-400/30 mb-3" />
          <p className="text-body text-slate-500 dark:text-white/45">
            No cross-regulation conflicts detected
          </p>
          <p className="text-caption text-slate-400 dark:text-white/30 mt-1">
            All regulatory interactions are aligned.
          </p>
        </div>
      </motion.div>
    );
  }

  // Count by severity
  const severityCounts = alerts.reduce(
    (acc, a) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white border border-slate-200 dark:bg-white/5 dark:backdrop-blur-sm dark:border-white/10 rounded-xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h2 className="text-caption uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">
            Cross-Regulation Alerts
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {severityCounts.high && (
            <span className="text-micro bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
              {severityCounts.high} High
            </span>
          )}
          {severityCounts.medium && (
            <span className="text-micro bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
              {severityCounts.medium} Medium
            </span>
          )}
          {severityCounts.low && (
            <span className="text-micro bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded">
              {severityCounts.low} Low
            </span>
          )}
        </div>
      </div>

      {/* Alert cards */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleAlerts.map((alert, index) => {
            const style = severityStyles[alert.severity];
            const isExpanded = expandedId === alert.id;

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: index * 0.03 }}
                className={`bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] border-l-[3px] ${style.border} rounded-lg overflow-hidden`}
              >
                {/* Card header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                  className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
                >
                  <AlertTriangle
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${style.icon}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[8px] uppercase px-1.5 py-0.5 rounded border ${style.badge} ${style.badgeText}`}
                      >
                        {style.label}
                      </span>
                      {alert.regulations.map((reg) => (
                        <span
                          key={reg}
                          className="text-micro bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-white/30 px-1.5 py-0.5 rounded"
                        >
                          {reg}
                        </span>
                      ))}
                    </div>
                    <p className="text-small font-medium text-slate-800 dark:text-white/80 leading-snug">
                      {alert.title}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0 mt-1 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-0 border-t border-slate-200 dark:border-white/5 space-y-3">
                        {/* Description */}
                        <div className="flex items-start gap-2 mt-3">
                          <Info className="w-3 h-3 text-slate-400 dark:text-white/30 mt-0.5 flex-shrink-0" />
                          <p className="text-caption text-slate-600 dark:text-white/45 leading-relaxed">
                            {alert.description}
                          </p>
                        </div>

                        {/* Resolution */}
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md p-2.5">
                          <p className="text-micro font-medium uppercase tracking-wider text-emerald-400 mb-1">
                            Resolution
                          </p>
                          <p className="text-caption text-slate-600 dark:text-white/45 leading-relaxed">
                            {alert.resolution}
                          </p>
                        </div>

                        {/* Affected modules */}
                        <div>
                          <p className="text-micro font-medium uppercase tracking-wider text-slate-500 dark:text-white/30 mb-1.5">
                            Affected Modules
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {alert.affectedModules.map((mod) => (
                              <a
                                key={mod}
                                href={
                                  moduleLinks[mod] ||
                                  `/dashboard/modules/${mod}`
                                }
                                className="inline-flex items-center gap-1 text-caption text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/5 border border-emerald-500/20 px-2 py-0.5 rounded"
                              >
                                <span className="capitalize">{mod}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show more/less */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full text-center text-caption text-slate-500 dark:text-white/30 hover:text-slate-700 dark:hover:text-white/60 transition-colors py-2"
        >
          {showAll
            ? "Show fewer alerts"
            : `Show ${hiddenCount} more alert${hiddenCount === 1 ? "" : "s"}`}
        </button>
      )}
    </motion.div>
  );
}
