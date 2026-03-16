"use client";

import {
  AlertCircle,
  AlertTriangle,
  Info,
  Wrench,
  ArrowRight,
} from "lucide-react";

interface ConsistencyFinding {
  id: string;
  category: string;
  severity: "error" | "warning" | "info";
  documentType: string;
  sectionIndex: number | null;
  title: string;
  description: string;
  autoFixable: boolean;
  autoFixDescription: string | null;
}

const SEVERITY_CONFIG = {
  error: {
    icon: AlertCircle,
    color: "text-red-600 bg-red-500/10 border-red-500/20",
    label: "Error",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    label: "Warning",
  },
  info: {
    icon: Info,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    label: "Info",
  },
};

interface ConsistencyFindingCardProps {
  finding: ConsistencyFinding;
  onAutoFix?: (findingId: string) => void;
  onGoToSection?: (sectionIndex: number) => void;
}

export function ConsistencyFindingCard({
  finding,
  onAutoFix,
  onGoToSection,
}: ConsistencyFindingCardProps) {
  const config = SEVERITY_CONFIG[finding.severity];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${config.color}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{finding.title}</p>
        <p className="text-xs opacity-80 mt-0.5">{finding.description}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {finding.autoFixable && onAutoFix && (
          <button
            onClick={() => onAutoFix(finding.id)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white/50 hover:bg-white/80 transition-colors"
            title={finding.autoFixDescription || "Auto-fix"}
          >
            <Wrench size={12} />
            Fix
          </button>
        )}
        {finding.sectionIndex !== null && onGoToSection && (
          <button
            onClick={() => onGoToSection(finding.sectionIndex!)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white/50 hover:bg-white/80 transition-colors"
            title="Go to section"
          >
            <ArrowRight size={12} />
            Go
          </button>
        )}
      </div>
    </div>
  );
}
