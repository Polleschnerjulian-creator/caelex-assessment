"use client";

import { motion } from "framer-motion";
import {
  ExternalLink,
  Mail,
  Clock,
  Shield,
  Orbit,
  FileText,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type { RedactedSpaceLawResult } from "@/lib/space-law-types";

type JurisdictionResultRedacted =
  RedactedSpaceLawResult["jurisdictions"][number];

interface JurisdictionCardProps {
  jurisdiction: JurisdictionResultRedacted;
  index: number;
}

function getScoreColor(score: number) {
  if (score >= 75)
    return {
      text: "text-emerald-400",
      bg: "bg-emerald-500",
      bgFaint: "bg-emerald-500/10",
      border: "border-emerald-500/30",
    };
  if (score >= 50)
    return {
      text: "text-amber-400",
      bg: "bg-amber-500",
      bgFaint: "bg-amber-500/10",
      border: "border-amber-500/30",
    };
  return {
    text: "text-red-400",
    bg: "bg-red-500",
    bgFaint: "bg-red-500/10",
    border: "border-red-500/30",
  };
}

export default function JurisdictionCard({
  jurisdiction,
  index,
}: JurisdictionCardProps) {
  const {
    countryName,
    flagEmoji,
    isApplicable,
    applicabilityReason,
    totalRequirements,
    mandatoryRequirements,
    requirementCount,
    authority,
    estimatedTimeline,
    estimatedCost,
    insurance,
    debris,
    legislation,
    favorabilityScore,
    favorabilityFactors,
  } = jurisdiction;

  const scoreColor = getScoreColor(favorabilityScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">{flagEmoji}</span>
            <h3 className="text-xl font-semibold text-white truncate">
              {countryName}
            </h3>
          </div>
          <div className="flex items-center gap-2 ml-11">
            <span className="text-sm text-white/50">{legislation.name}</span>
            <span className="font-mono text-xs text-white/30">
              {legislation.yearEnacted}
            </span>
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                legislation.status === "enacted"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : legislation.status === "draft"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-white/[0.06] text-white/40 border border-white/[0.1]"
              }`}
            >
              {legislation.status}
            </span>
          </div>
        </div>

        {/* Score badge */}
        <div
          className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl ${scoreColor.bgFaint} border ${scoreColor.border}`}
        >
          <span className={`text-xl font-mono font-bold ${scoreColor.text}`}>
            {favorabilityScore}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-white/40">
            score
          </span>
        </div>
      </div>

      {/* Applicability warning */}
      {!isApplicable && (
        <div className="flex items-start gap-2.5 p-3 mb-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <AlertTriangle
            className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-amber-400/90 leading-relaxed">
            {applicabilityReason}
          </p>
        </div>
      )}

      {/* Score bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">
            Favorability
          </span>
          <span className={`font-mono text-xs ${scoreColor.text}`}>
            {favorabilityScore}/100
          </span>
        </div>
        <div
          className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={favorabilityScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Favorability score: ${favorabilityScore} out of 100`}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${favorabilityScore}%` }}
            transition={{
              duration: 0.8,
              delay: index * 0.1 + 0.3,
              ease: "easeOut",
            }}
            className={`h-full rounded-full ${scoreColor.bg}`}
          />
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {/* Timeline */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
              Timeline
            </span>
          </div>
          <div className="text-sm font-mono text-white font-medium">
            {estimatedTimeline.min}&ndash;{estimatedTimeline.max} weeks
          </div>
        </div>

        {/* Cost */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <FileText
              className="w-3.5 h-3.5 text-blue-400"
              aria-hidden="true"
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
              Estimated Cost
            </span>
          </div>
          <div className="text-sm font-mono text-white font-medium">
            {estimatedCost}
          </div>
        </div>

        {/* Insurance */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
              Insurance
            </span>
          </div>
          <div className="text-sm text-white font-medium">
            {insurance.mandatory ? (
              <span className="text-amber-400">Mandatory</span>
            ) : (
              <span className="text-white/60">Not mandatory</span>
            )}
          </div>
          {insurance.mandatory && insurance.minimumCoverage && (
            <div className="text-xs text-white/40 mt-0.5 font-mono">
              Min: {insurance.minimumCoverage}
            </div>
          )}
        </div>

        {/* Debris */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Orbit className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
              Debris Mitigation
            </span>
          </div>
          <div className="text-sm text-white font-medium">
            {debris.deorbitRequired ? (
              <span className="text-amber-400">Deorbit required</span>
            ) : (
              <span className="text-white/60">No deorbit mandate</span>
            )}
          </div>
          {debris.deorbitRequired && debris.deorbitTimeline && (
            <div className="text-xs text-white/40 mt-0.5 font-mono">
              {debris.deorbitTimeline}
            </div>
          )}
        </div>

        {/* Requirements */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp
              className="w-3.5 h-3.5 text-blue-400"
              aria-hidden="true"
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
              Requirements
            </span>
          </div>
          <div className="text-sm font-mono text-white font-medium">
            <span className="text-red-400">{mandatoryRequirements}</span>
            <span className="text-white/40"> mandatory</span>
            <span className="text-white/20 mx-1">/</span>
            <span>{totalRequirements}</span>
            <span className="text-white/40"> total</span>
          </div>
        </div>

        {/* Indemnification */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
              Gov. Indemnification
            </span>
          </div>
          <div className="text-sm text-white font-medium">
            {insurance.governmentIndemnification ? (
              <span className="text-emerald-400">Yes</span>
            ) : (
              <span className="text-white/40">No</span>
            )}
          </div>
        </div>
      </div>

      {/* Authority section */}
      <div className="border-t border-white/[0.06] pt-5 mb-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3">
          Licensing Authority
        </div>
        <div className="text-sm text-white font-medium mb-2">
          {authority.name}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {authority.website && (
            <a
              href={authority.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
              <span>Website</span>
            </a>
          )}
          {authority.contactEmail && (
            <a
              href={`mailto:${authority.contactEmail}`}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Mail className="w-3 h-3" aria-hidden="true" />
              <span>{authority.contactEmail}</span>
            </a>
          )}
        </div>
      </div>

      {/* Favorability factors */}
      {favorabilityFactors.length > 0 && (
        <div className="border-t border-white/[0.06] pt-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3">
            Favorability Factors
          </div>
          <div className="flex flex-wrap gap-2">
            {favorabilityFactors.map((factor, i) => (
              <span
                key={i}
                className="text-[11px] text-white/60 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1"
              >
                {factor}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
