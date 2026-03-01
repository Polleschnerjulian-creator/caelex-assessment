"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronRight, Clock, Info } from "lucide-react";
import {
  REGULATION_TIMELINE,
  type RegulationPhase,
} from "@/data/regulation-timeline";

// ─── Status Colors ───

const statusColors: Record<
  RegulationPhase["status"],
  {
    bg: string;
    border: string;
    dot: string;
    text: string;
    label: string;
  }
> = {
  in_force: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    text: "text-emerald-400",
    label: "In Force",
  },
  transition: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    text: "text-amber-400",
    label: "Transition",
  },
  superseded: {
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    dot: "bg-slate-500",
    text: "text-slate-400",
    label: "Superseded",
  },
  upcoming: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
    text: "text-blue-400",
    label: "Upcoming",
  },
};

// ─── Helpers ───

function formatDate(iso: string): string {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getYearFromDate(iso: string): number {
  return parseInt(iso.split("-")[0], 10);
}

function getPositionPercent(
  iso: string,
  minYear: number,
  maxYear: number,
): number {
  const date = new Date(iso + "T00:00:00");
  const totalMs =
    new Date(`${maxYear + 1}-01-01`).getTime() -
    new Date(`${minYear}-01-01`).getTime();
  const elapsedMs = date.getTime() - new Date(`${minYear}-01-01`).getTime();
  return Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));
}

// ─── Component ───

export default function RegulationTimeline() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const phases = REGULATION_TIMELINE;

  // Compute timeline bounds
  const { minYear, maxYear, nowPercent } = useMemo(() => {
    const years = phases.map((p) => getYearFromDate(p.effectiveDate));
    const endYears = phases
      .filter((p) => p.transitionEndDate)
      .map((p) => getYearFromDate(p.transitionEndDate!));
    const allYears = [...years, ...endYears];
    const mn = Math.min(...allYears);
    const mx = Math.max(...allYears, new Date().getFullYear() + 1);
    const now = new Date();
    const totalMs =
      new Date(`${mx + 1}-01-01`).getTime() - new Date(`${mn}-01-01`).getTime();
    const elapsedMs = now.getTime() - new Date(`${mn}-01-01`).getTime();
    const np = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));
    return { minYear: mn, maxYear: mx, nowPercent: np };
  }, [phases]);

  // Generate year markers
  const yearMarkers = useMemo(() => {
    const markers: { year: number; percent: number }[] = [];
    for (let y = minYear; y <= maxYear + 1; y++) {
      markers.push({
        year: y,
        percent: getPositionPercent(`${y}-01-01`, minYear, maxYear),
      });
    }
    return markers;
  }, [minYear, maxYear]);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white border border-slate-200 dark:bg-[--glass-bg-surface] dark:border-[--glass-border-subtle] rounded-xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <h2 className="text-caption uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">
            Regulatory Timeline
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {(["in_force", "transition", "upcoming", "superseded"] as const).map(
            (status) => (
              <div key={status} className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${statusColors[status].dot}`}
                />
                <span className="text-micro text-slate-500 dark:text-white/45">
                  {statusColors[status].label}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Desktop: Horizontal Timeline */}
      <div className="hidden lg:block">
        <div className="relative">
          {/* Year axis */}
          <div className="relative h-8 mb-2">
            {yearMarkers.map((m) => (
              <div
                key={m.year}
                className="absolute top-0 text-micro text-slate-500 dark:text-white/30"
                style={{ left: `${m.percent}%`, transform: "translateX(-50%)" }}
              >
                {m.year}
              </div>
            ))}
          </div>

          {/* Timeline bar */}
          <div className="relative h-2 bg-slate-100 dark:bg-white/5 rounded-full mb-4">
            {/* Year tick marks */}
            {yearMarkers.map((m) => (
              <div
                key={m.year}
                className="absolute top-0 w-px h-2 bg-slate-300 dark:bg-white/10"
                style={{ left: `${m.percent}%` }}
              />
            ))}

            {/* Current date marker */}
            <div
              className="absolute top-[-6px] w-0.5 h-[20px] bg-red-500 z-20"
              style={{ left: `${nowPercent}%` }}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-micro text-red-400 font-medium">
                Today
              </div>
            </div>
          </div>

          {/* Phase markers on timeline */}
          <div className="relative h-64">
            {phases.map((phase, idx) => {
              const leftPercent = getPositionPercent(
                phase.effectiveDate,
                minYear,
                maxYear,
              );
              const colors = statusColors[phase.status];
              const isHovered = hoveredId === phase.id;
              // Stagger rows to avoid overlap
              const row = idx % 4;
              const topOffset = row * 58;

              return (
                <div
                  key={phase.id}
                  className="absolute"
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topOffset}px`,
                  }}
                >
                  {/* Connector line */}
                  <div
                    className={`absolute left-0 w-px ${colors.dot} opacity-30`}
                    style={{
                      top: `-${topOffset + 20}px`,
                      height: `${topOffset + 16}px`,
                    }}
                  />

                  {/* Phase dot */}
                  <div
                    className={`absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full ${colors.dot} ring-2 ring-white dark:ring-navy-900 z-10 cursor-pointer transition-transform ${
                      isHovered ? "scale-150" : ""
                    }`}
                    onMouseEnter={() => setHoveredId(phase.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />

                  {/* Phase label */}
                  <div
                    className={`ml-4 max-w-[200px] cursor-pointer transition-all ${
                      isHovered ? "opacity-100" : "opacity-80"
                    }`}
                    onMouseEnter={() => setHoveredId(phase.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <p
                      className={`text-small font-medium ${colors.text} truncate leading-tight`}
                    >
                      {phase.regulation}
                    </p>
                    <p className="text-micro text-slate-500 dark:text-white/30 mt-0.5">
                      {formatDate(phase.effectiveDate)}
                    </p>
                  </div>

                  {/* Hover tooltip */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={false}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute left-4 top-12 z-30 w-72 ${colors.bg} ${colors.border} border rounded-lg p-3 shadow-xl`}
                      >
                        <p className="text-small font-medium text-slate-800 dark:text-white/90 mb-1">
                          {phase.regulation}
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-micro uppercase px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}
                          >
                            {statusColors[phase.status].label}
                          </span>
                          <span className="text-micro text-slate-500 dark:text-white/30">
                            {formatDate(phase.effectiveDate)}
                            {phase.transitionEndDate &&
                              ` \u2013 ${formatDate(phase.transitionEndDate)}`}
                          </span>
                        </div>
                        <p className="text-caption text-slate-600 dark:text-white/45 leading-relaxed">
                          {phase.notes}
                        </p>
                        {phase.supersededBy && (
                          <p className="text-micro text-amber-400 mt-2">
                            Superseded by: {phase.supersededBy}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile: Vertical List */}
      <div className="lg:hidden space-y-3">
        {phases.map((phase) => {
          const colors = statusColors[phase.status];
          const isExpanded = expandedId === phase.id;

          return (
            <motion.div
              key={phase.id}
              layout
              className={`${colors.bg} border ${colors.border} rounded-lg overflow-hidden`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : phase.id)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${colors.dot} flex-shrink-0`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-small font-medium text-slate-800 dark:text-white/90 truncate">
                    {phase.regulation}
                  </p>
                  <p className="text-micro text-slate-500 dark:text-white/30 mt-0.5">
                    {formatDate(phase.effectiveDate)}
                  </p>
                </div>
                <span
                  className={`text-micro uppercase px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border} flex-shrink-0`}
                >
                  {statusColors[phase.status].label}
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 dark:text-white/30 transition-transform flex-shrink-0 ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
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
                    <div className="px-3 pb-3 pt-0 border-t border-slate-200/50 dark:border-white/5">
                      <div className="flex items-start gap-2 mt-3">
                        <Info className="w-3 h-3 text-slate-400 dark:text-white/30 mt-0.5 flex-shrink-0" />
                        <p className="text-caption text-slate-600 dark:text-white/45 leading-relaxed">
                          {phase.notes}
                        </p>
                      </div>
                      {phase.transitionEndDate && (
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3 h-3 text-slate-400 dark:text-white/30" />
                          <p className="text-micro text-slate-500 dark:text-white/30">
                            Transition ends:{" "}
                            {formatDate(phase.transitionEndDate)}
                          </p>
                        </div>
                      )}
                      {phase.supersededBy && (
                        <p className="text-micro text-amber-400 mt-2">
                          Superseded by: {phase.supersededBy}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {phase.applicableTo.map((scope) => (
                          <span
                            key={scope}
                            className="text-micro bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/30 px-1.5 py-0.5 rounded"
                          >
                            {scope.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
