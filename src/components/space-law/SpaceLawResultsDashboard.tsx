"use client";

import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw, ExternalLink } from "lucide-react";
import Link from "next/link";
import JurisdictionCard from "./JurisdictionCard";
import ComparisonMatrix from "./ComparisonMatrix";
import EUSpaceActCrossRef from "./EUSpaceActCrossRef";
import SpaceLawRecommendations from "./SpaceLawRecommendations";
import type { RedactedSpaceLawResult } from "@/lib/space-law-types";

interface SpaceLawResultsDashboardProps {
  result: RedactedSpaceLawResult;
  onRestart: () => void;
}

export default function SpaceLawResultsDashboard({
  result,
  onRestart,
}: SpaceLawResultsDashboardProps) {
  const jurisdictionSubtitle = result.jurisdictions
    .map((j) => `${j.flagEmoji} ${j.countryName}`)
    .join(" \u00B7 ");

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-black/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/assessment"
            className="flex items-center gap-2 text-[13px] text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>All assessments</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              National Space Laws
            </span>
            <button
              onClick={onRestart}
              className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white transition-colors"
            >
              <RotateCcw size={12} />
              Restart
            </button>
          </div>
        </div>
      </div>

      {/* Results content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-light tracking-[-0.02em] text-white mb-2">
            Your National Space Law Compliance Profile
          </h1>
          <p className="text-sm text-white/40">
            Selected: {jurisdictionSubtitle}
          </p>
        </motion.div>

        {/* Content sections */}
        <div className="space-y-8">
          {/* Jurisdiction Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className={`grid gap-6 ${
              result.jurisdictions.length === 1
                ? "grid-cols-1"
                : result.jurisdictions.length === 2
                  ? "md:grid-cols-2"
                  : "md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {result.jurisdictions.map((jurisdiction, index) => (
              <JurisdictionCard
                key={jurisdiction.countryCode}
                jurisdiction={jurisdiction}
                index={index}
              />
            ))}
          </motion.div>

          {/* Comparison Matrix (only if more than 1 jurisdiction) */}
          {result.jurisdictions.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <ComparisonMatrix
                matrix={result.comparisonMatrix}
                jurisdictions={result.jurisdictions.map((j) => ({
                  countryCode: j.countryCode,
                  countryName: j.countryName,
                  flagEmoji: j.flagEmoji,
                }))}
              />
            </motion.div>
          )}

          {/* EU Space Act Cross-Reference */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <EUSpaceActCrossRef
              preview={result.euSpaceActPreview}
              jurisdictions={result.jurisdictions.map((j) => ({
                countryCode: j.countryCode,
                countryName: j.countryName,
                flagEmoji: j.flagEmoji,
              }))}
            />
          </motion.div>

          {/* Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <SpaceLawRecommendations recommendations={result.recommendations} />
          </motion.div>

          {/* Disclaimer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 mt-6"
          >
            <p className="text-xs text-white/30 leading-relaxed">
              <strong className="text-white/40">Disclaimer:</strong> This
              assessment is based on currently enacted national space
              legislation, which is subject to amendment and revision by
              respective national governments. The EU Space Act (COM(2025) 335)
              is subject to amendments during the legislative process and may
              supersede or modify national licensing regimes for EU Member
              States. This does not constitute legal advice. Consult qualified
              legal counsel for definitive compliance determinations.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="text-center py-8"
          >
            <p className="text-white/40 text-sm mb-4">
              Want to track national space law compliance?
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/signup"
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create Free Account
              </Link>
              <Link
                href="/assessment/eu-space-act"
                className="flex items-center gap-2 px-6 py-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white rounded-lg text-sm transition-colors"
              >
                Assess EU Space Act
                <ExternalLink size={14} />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
