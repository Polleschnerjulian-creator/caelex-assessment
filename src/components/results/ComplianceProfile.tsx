"use client";

import { motion } from "framer-motion";
import { ComplianceResult } from "@/lib/types";
import Card from "@/components/ui/Card";

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
      <Card variant="elevated" padding="lg">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-sm font-mono text-blue-400 uppercase tracking-wider mb-2">
            Your EU Space Act Compliance Profile
          </h2>
          <div className="h-px bg-gradient-to-r from-blue-500/50 to-transparent" />
        </div>

        {/* Profile grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {profileItems.map((item, index) => (
            <div key={index} className="bg-navy-900 rounded-lg p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                {item.label}
              </div>
              <div className="text-slate-200 font-medium">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Article count */}
        <div className="bg-navy-900 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400">Articles with obligations</span>
            <span className="text-white font-mono font-semibold">
              {result.applicableCount} of {result.totalArticles}
            </span>
          </div>
          <div className="h-3 bg-navy-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${result.applicablePercentage}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
          <div className="text-right mt-2">
            <span className="text-sm font-mono text-slate-500">
              {result.applicablePercentage}%
            </span>
          </div>
        </div>

        {/* Authorization info */}
        <div className="mt-6 pt-6 border-t border-navy-700 grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Authorization Path
            </div>
            <div className="text-slate-300 text-sm">
              {result.authorizationPath}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Estimated Authorization Cost
            </div>
            <div className="text-slate-300 text-sm">
              {result.estimatedAuthorizationCost}
            </div>
          </div>
        </div>

        {/* Key deadline */}
        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-amber-400 font-mono">
              1 Jan 2030
            </div>
            <div className="text-sm text-amber-300/80">
              Application date — prepare now
            </div>
          </div>
        </div>

        {/* Regime note */}
        {result.regime === "light" && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg
                  className="w-3 h-3 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-green-400 font-medium text-sm">
                  Light Regime Eligible
                </p>
                <p className="text-green-500/70 text-xs mt-1">
                  {result.regimeReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Third country note */}
        {result.isThirdCountry && (
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div>
                <p className="text-blue-400 font-medium text-sm">
                  Third Country Operator Requirements
                </p>
                <p className="text-blue-500/70 text-xs mt-1">
                  You must designate an EU legal representative (Art. 16) and
                  register with EUSPA
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
