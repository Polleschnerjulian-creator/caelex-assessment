"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  Scale,
  Layers,
  AlertOctagon,
  GitBranch,
  Eye,
  Target,
  BarChart3,
  Users,
} from "lucide-react";

// ─── Types ───

interface GradingScaleEntry {
  grade: string;
  range: string;
  label: string;
  description: string;
}

interface MethodologyComponent {
  name: string;
  weight: number;
  dataSources: string[];
  scoringFormula: string;
}

interface Penalty {
  name: string;
  description: string;
  impact: string;
}

interface CorrelationCheck {
  condition: string;
  adjustment: string;
}

interface MethodologyData {
  version: string;
  gradingScale: GradingScaleEntry[];
  components: MethodologyComponent[];
  penalties: Penalty[];
  correlationChecks: CorrelationCheck[];
  outlookCriteria: Record<string, string>;
  watchCriteria: string[];
  confidenceCalculation: string;
  peerBenchmarking: string;
}

interface RCRMethodologyExplorerProps {
  methodology: MethodologyData;
}

// ─── Grade Color ───

function getGradeRowColor(grade: string): string {
  const g = grade.toUpperCase().replace(/[+-]/g, "");

  if (g === "AAA" || g === "AA")
    return "bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20";
  if (g === "A")
    return "bg-emerald-50/50 dark:bg-emerald-400/5 border-emerald-200/50 dark:border-emerald-400/15";
  if (g === "BBB")
    return "bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20";
  if (g === "BB")
    return "bg-amber-50/50 dark:bg-amber-400/5 border-amber-200/50 dark:border-amber-400/15";
  if (g === "B")
    return "bg-orange-50 dark:bg-orange-500/5 border-orange-200 dark:border-orange-500/20";
  if (g === "CCC")
    return "bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20";
  if (g === "CC")
    return "bg-red-50 dark:bg-red-600/5 border-red-200 dark:border-red-600/20";
  if (g === "D")
    return "bg-red-100 dark:bg-red-800/10 border-red-300 dark:border-red-800/20";

  return "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-[--glass-border-subtle]";
}

function getGradeTextColor(grade: string): string {
  const g = grade.toUpperCase().replace(/[+-]/g, "");

  if (g === "AAA" || g === "AA")
    return "text-emerald-700 dark:text-emerald-400";
  if (g === "A") return "text-emerald-600 dark:text-emerald-400";
  if (g === "BBB") return "text-amber-700 dark:text-amber-400";
  if (g === "BB") return "text-amber-600 dark:text-amber-400";
  if (g === "B") return "text-orange-700 dark:text-orange-400";
  if (g === "CCC" || g === "CC") return "text-red-700 dark:text-red-400";
  if (g === "D") return "text-red-800 dark:text-red-500";

  return "text-slate-700 dark:text-white/70";
}

// ─── Accordion Section ───

interface AccordionSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 dark:border-[--glass-border-subtle] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
            <Icon className="w-4 h-4 text-slate-600 dark:text-white/50" />
          </div>
          <span className="text-body-lg font-medium text-slate-800 dark:text-white/80">
            {title}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400 dark:text-white/30" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-white/30" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-slate-100 dark:border-white/5 pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───

export default function RCRMethodologyExplorer({
  methodology,
}: RCRMethodologyExplorerProps) {
  const maxWeight = Math.max(...methodology.components.map((c) => c.weight), 1);

  return (
    <div className="space-y-4">
      {/* Version Header */}
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-5 h-5 text-emerald-500" />
        <div>
          <h2 className="text-heading font-medium text-slate-900 dark:text-white">
            RCR Methodology
          </h2>
          <p className="text-small text-slate-400 dark:text-white/30">
            Version {methodology.version}
          </p>
        </div>
      </div>

      {/* Grading Scale */}
      <AccordionSection title="Grading Scale" icon={Scale} defaultOpen>
        <div className="space-y-1.5">
          {methodology.gradingScale.map((entry) => (
            <div
              key={entry.grade}
              className={`flex items-center gap-4 p-3 rounded-lg border ${getGradeRowColor(entry.grade)}`}
            >
              <span
                className={`text-body-lg font-bold w-12 ${getGradeTextColor(entry.grade)}`}
              >
                {entry.grade}
              </span>
              <span className="text-small text-slate-500 dark:text-white/40 w-20 text-center font-mono">
                {entry.range}
              </span>
              <span className="text-body font-medium text-slate-700 dark:text-white/70 w-32">
                {entry.label}
              </span>
              <span className="text-small text-slate-600 dark:text-white/50 flex-1">
                {entry.description}
              </span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* Component Weights */}
      <AccordionSection title="Component Weights" icon={Layers}>
        <div className="space-y-4">
          {methodology.components.map((comp, index) => {
            const barWidth = (comp.weight / maxWeight) * 100;
            return (
              <div key={comp.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-body font-medium text-slate-700 dark:text-white/70">
                    {comp.name}
                  </span>
                  <span className="text-body font-semibold text-slate-800 dark:text-white/80">
                    {Math.round(comp.weight * 100)}%
                  </span>
                </div>

                {/* Weight bar */}
                <div className="relative h-3 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.6, delay: index * 0.08 }}
                  />
                </div>

                {/* Data Sources */}
                <div className="flex flex-wrap gap-1.5">
                  {comp.dataSources.map((source) => (
                    <span
                      key={source}
                      className="text-micro px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 border border-slate-200 dark:border-[--glass-border-subtle]"
                    >
                      {source}
                    </span>
                  ))}
                </div>

                {/* Scoring formula */}
                <p className="text-small text-slate-400 dark:text-white/30 font-mono bg-slate-50 dark:bg-white/5 rounded-lg px-3 py-2">
                  {comp.scoringFormula}
                </p>
              </div>
            );
          })}
        </div>
      </AccordionSection>

      {/* Penalties */}
      <AccordionSection title="Penalties & Adjustments" icon={AlertOctagon}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {methodology.penalties.map((penalty) => (
            <div
              key={penalty.name}
              className="p-4 rounded-xl bg-red-50/50 dark:bg-red-500/5 border border-red-200/50 dark:border-red-500/10"
            >
              <h4 className="text-body font-medium text-red-700 dark:text-red-400 mb-1">
                {penalty.name}
              </h4>
              <p className="text-small text-slate-600 dark:text-white/50 mb-2">
                {penalty.description}
              </p>
              <span className="text-micro font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 px-2 py-0.5 rounded">
                Impact: {penalty.impact}
              </span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* Correlation Checks */}
      <AccordionSection title="Correlation Checks" icon={GitBranch}>
        <div className="space-y-2">
          {methodology.correlationChecks.map((check, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5"
            >
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-micro font-bold text-blue-600 dark:text-blue-400">
                  {i + 1}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-body text-slate-700 dark:text-white/70">
                  {check.condition}
                </p>
                <p className="text-small text-slate-500 dark:text-white/40 mt-1">
                  Adjustment: {check.adjustment}
                </p>
              </div>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* Outlook Criteria */}
      <AccordionSection title="Outlook Criteria" icon={Eye}>
        <div className="space-y-2">
          {Object.entries(methodology.outlookCriteria).map(([key, value]) => {
            const outlookColors: Record<string, string> = {
              POSITIVE:
                "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400",
              STABLE:
                "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-[--glass-border-subtle] text-slate-700 dark:text-white/70",
              NEGATIVE:
                "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400",
              DEVELOPING:
                "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400",
            };
            const color =
              outlookColors[key.toUpperCase()] || outlookColors.STABLE;

            return (
              <div key={key} className={`p-3 rounded-lg border ${color}`}>
                <span className="text-body font-medium">{key}</span>
                <p className="text-small mt-1 opacity-80">{value}</p>
              </div>
            );
          })}
        </div>
      </AccordionSection>

      {/* Watch Criteria */}
      <AccordionSection title="Watch Criteria" icon={Target}>
        <ul className="space-y-2">
          {methodology.watchCriteria.map((criterion, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-body text-slate-700 dark:text-white/70"
            >
              <span className="text-amber-500 mt-0.5 flex-shrink-0">
                &#x2022;
              </span>
              {criterion}
            </li>
          ))}
        </ul>
      </AccordionSection>

      {/* Confidence Calculation */}
      <AccordionSection title="Confidence Calculation" icon={BarChart3}>
        <p className="text-body text-slate-600 dark:text-white/60 leading-relaxed">
          {methodology.confidenceCalculation}
        </p>
      </AccordionSection>

      {/* Peer Benchmarking */}
      <AccordionSection title="Peer Benchmarking" icon={Users}>
        <p className="text-body text-slate-600 dark:text-white/60 leading-relaxed">
          {methodology.peerBenchmarking}
        </p>
      </AccordionSection>
    </div>
  );
}
