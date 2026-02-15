"use client";

import { motion } from "framer-motion";
import { Shield, ShieldAlert, ShieldOff, Info } from "lucide-react";

interface NIS2ClassificationCardProps {
  classification: "essential" | "important" | "out_of_scope";
  reason: string;
  articleRef: string;
  sector: string;
  organizationSize: string;
}

const classificationConfig = {
  essential: {
    icon: ShieldAlert,
    label: "Essential Entity",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    badgeBg: "bg-red-500/20",
    description:
      "Subject to full NIS2 obligations including ex-ante supervisory measures, on-site inspections, and targeted audits.",
  },
  important: {
    icon: Shield,
    label: "Important Entity",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    badgeBg: "bg-amber-500/20",
    description:
      "Subject to NIS2 cybersecurity obligations with ex-post supervision. Same measures as essential but lighter oversight.",
  },
  out_of_scope: {
    icon: ShieldOff,
    label: "Out of Scope",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30",
    badgeBg: "bg-slate-500/20",
    description:
      "Not currently in scope for NIS2 obligations. Consider voluntary compliance for supply chain requirements.",
  },
};

export default function NIS2ClassificationCard({
  classification,
  reason,
  articleRef,
  sector,
  organizationSize,
}: NIS2ClassificationCardProps) {
  const config = classificationConfig[classification];
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border ${config.borderColor} ${config.bgColor} p-6`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl ${config.badgeBg} flex items-center justify-center`}
            aria-hidden="true"
          >
            <IconComponent className={`w-6 h-6 ${config.color}`} />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 mb-1">
              NIS2 Entity Classification
            </div>
            <h3 className={`text-xl font-semibold ${config.color}`}>
              {config.label}
            </h3>
          </div>
        </div>
        <span className="font-mono text-[11px] text-white/30">
          {articleRef}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-white/60 mb-4">{config.description}</p>

      {/* Reason */}
      <div className="bg-white/[0.04] rounded-xl p-4 mb-4">
        <div className="flex items-start gap-2">
          <Info
            className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-white/70 leading-relaxed">{reason}</p>
        </div>
      </div>

      {/* Profile summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.03] rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
            Sector
          </div>
          <div className="text-sm text-white font-medium capitalize">
            {sector.replace(/_/g, " ")}
          </div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
            Organization Size
          </div>
          <div className="text-sm text-white font-medium capitalize">
            {organizationSize} Enterprise
          </div>
        </div>
      </div>
    </motion.div>
  );
}
