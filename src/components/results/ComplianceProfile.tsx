"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { ComplianceResult } from "@/lib/types";

interface ComplianceProfileProps {
  result: ComplianceResult;
}

export default function ComplianceProfile({ result }: ComplianceProfileProps) {
  const profileItems = [
    { label: "Operator Type", value: result.operatorTypeLabel },
    { label: "Regime", value: result.regimeLabel },
    { label: "Entity Size", value: result.entitySizeLabel },
    { label: "Constellation", value: result.constellationTierLabel || "N/A" },
    { label: "Primary Orbit", value: result.orbitLabel },
    { label: "EU Services", value: result.offersEUServices ? "Yes" : "No" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="bg-white/[0.05] border border-white/[0.12] rounded-xl p-6 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 block mb-2">
            EU Space Act Compliance Profile
          </span>
          <div className="h-px bg-white/[0.12]" />
        </div>

        {/* Profile grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {profileItems.map((item, index) => (
            <div
              key={index}
              className="bg-white/[0.04] border border-white/[0.10] rounded-lg p-4"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 mb-1">
                {item.label}
              </div>
              <div className="text-[15px] text-white">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Article count */}
        <div className="bg-white/[0.04] border border-white/[0.10] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] text-white/70">
              Articles with obligations
            </span>
            <span className="font-mono text-[15px] text-white font-medium">
              {result.applicableCount} of {result.totalArticles}
            </span>
          </div>
          <div className="h-[4px] bg-white/[0.12] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white/70 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${result.applicablePercentage}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
          <div className="text-right mt-2">
            <span className="font-mono text-[12px] text-white/50">
              {result.applicablePercentage}%
            </span>
          </div>
        </div>

        {/* Authorization info */}
        <div className="mt-6 pt-6 border-t border-white/[0.12] grid sm:grid-cols-2 gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 mb-1">
              Authorization Path
            </div>
            <div className="text-[14px] text-white/80">
              {result.authorizationPath}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 mb-1">
              Estimated Authorization Cost
            </div>
            <div className="text-[14px] text-white/80">
              {result.estimatedAuthorizationCost}
            </div>
          </div>
        </div>

        {/* Key deadline */}
        <div className="mt-6 p-4 bg-white/[0.04] border border-white/[0.15] rounded-lg">
          <div className="flex items-center gap-4">
            <div className="font-mono text-[20px] font-light text-white">
              1 Jan 2030
            </div>
            <div className="text-[13px] text-white/70">
              Application date — prepare now
            </div>
          </div>
        </div>

        {/* Regime note */}
        {result.regime === "light" && (
          <div className="mt-4 p-4 bg-white/[0.04] border border-white/[0.15] rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Check size={12} className="text-white" />
              </div>
              <div>
                <p className="text-[14px] text-white font-medium">
                  Light Regime Eligible
                </p>
                <p className="text-[13px] text-white/70 mt-1">
                  {result.regimeReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Third country note */}
        {result.isThirdCountry && (
          <div className="mt-4 p-4 bg-white/[0.04] border border-white/[0.15] rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-bold">!</span>
              </div>
              <div>
                <p className="text-[14px] text-white font-medium">
                  Third Country Operator Requirements
                </p>
                <p className="text-[13px] text-white/70 mt-1">
                  You must designate an EU legal representative (Art. 16) and
                  register with EUSPA
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
