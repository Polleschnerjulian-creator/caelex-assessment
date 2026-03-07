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
    badge: "bg-[var(--accent-danger-soft)] border-[var(--accent-danger)/30]",
    badgeText: "text-[var(--accent-danger)]",
    icon: "text-[var(--accent-danger)]",
    label: "High",
  },
  medium: {
    border: "border-l-amber-500",
    badge: "bg-[var(--accent-warning)]/20 border-amber-500/30",
    badgeText: "text-[var(--accent-warning)]",
    icon: "text-[var(--accent-warning)]",
    label: "Medium",
  },
  low: {
    border: "border-l-blue-500",
    badge: "bg-[var(--accent-info-soft)]0/20 border-[var(--accent-primary)]/30",
    badgeText: "text-[var(--accent-primary)]",
    icon: "text-[var(--accent-primary)]",
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
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="glass-elevated rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[var(--accent-primary)]" />
          <h2 className="text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Cross-Regulation Alerts
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <Shield className="w-8 h-8 text-[var(--accent-primary)]/30 mb-3" />
          <p className="text-body text-[var(--text-secondary)]">
            No cross-regulation conflicts detected
          </p>
          <p className="text-caption text-[var(--text-tertiary)] mt-1">
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
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-elevated rounded-xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--accent-warning)]" />
          <h2 className="text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Cross-Regulation Alerts
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {severityCounts.high && (
            <span className="text-micro bg-[var(--accent-danger-soft)] text-[var(--accent-danger)] border border-[var(--accent-danger)/30] px-1.5 py-0.5 rounded">
              {severityCounts.high} High
            </span>
          )}
          {severityCounts.medium && (
            <span className="text-micro bg-[var(--accent-warning)]/20 text-[var(--accent-warning)] border border-amber-500/30 px-1.5 py-0.5 rounded">
              {severityCounts.medium} Medium
            </span>
          )}
          {severityCounts.low && (
            <span className="text-micro bg-[var(--accent-info-soft)]0/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 px-1.5 py-0.5 rounded">
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
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: index * 0.03 }}
                className={`bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] border-l-[3px] ${style.border} rounded-lg overflow-hidden`}
              >
                {/* Card header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                  className="w-full flex items-start gap-3 p-3 text-left hover:bg-[rgba(255,255,255,0.03)] transition-colors"
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
                          className="text-micro bg-[rgba(255,255,255,0.06)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded"
                        >
                          {reg}
                        </span>
                      ))}
                    </div>
                    <p className="text-small font-medium text-[var(--text-primary)] leading-snug">
                      {alert.title}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 mt-1 transition-transform ${
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
                      <div className="px-3 pb-3 pt-0 border-t border-[var(--border-default)] space-y-3">
                        {/* Description */}
                        <div className="flex items-start gap-2 mt-3">
                          <Info className="w-3 h-3 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
                          <p className="text-caption text-[var(--text-secondary)] leading-relaxed">
                            {alert.description}
                          </p>
                        </div>

                        {/* Resolution */}
                        <div className="bg-[var(--accent-success-soft)]0/5 border border-[var(--accent-primary)/20] rounded-md p-2.5">
                          <p className="text-micro font-medium uppercase tracking-wider text-[var(--accent-primary)] mb-1">
                            Resolution
                          </p>
                          <p className="text-caption text-[var(--text-secondary)] leading-relaxed">
                            {alert.resolution}
                          </p>
                        </div>

                        {/* Affected modules */}
                        <div>
                          <p className="text-micro font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
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
                                className="inline-flex items-center gap-1 text-caption text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors bg-[var(--accent-success-soft)]0/5 border border-[var(--accent-primary)/20] px-2 py-0.5 rounded"
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
          className="mt-3 w-full text-center text-caption text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors py-2"
        >
          {showAll
            ? "Show fewer alerts"
            : `Show ${hiddenCount} more alert${hiddenCount === 1 ? "" : "s"}`}
        </button>
      )}
    </motion.div>
  );
}
