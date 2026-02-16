"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ArrowRight, Sparkles } from "lucide-react";
import {
  PRICING_TIERS,
  getRequiredPlan,
  getUpgradePlan,
  type PlanType,
} from "@/lib/stripe/pricing";

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName?: string;
  currentPlan: PlanType;
  feature?: string;
}

export default function UpgradePrompt({
  isOpen,
  onClose,
  moduleName,
  currentPlan,
  feature,
}: UpgradePromptProps) {
  const router = useRouter();
  const requiredPlan = moduleName
    ? getRequiredPlan(moduleName)
    : getUpgradePlan(currentPlan) || "PROFESSIONAL";
  const requiredTier = PRICING_TIERS[requiredPlan];
  const currentTier = PRICING_TIERS[currentPlan];

  const handleUpgrade = () => {
    onClose();
    router.push("/dashboard/settings/billing");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="w-full max-w-lg bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Upgrade to {requiredTier.name}
                    </h2>
                    <p className="text-sm text-white/70">
                      {feature
                        ? `Unlock ${feature}`
                        : moduleName
                          ? `Access the ${moduleName} module`
                          : "Unlock more features"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Plan Comparison */}
              <div className="px-6 py-5">
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {/* Current Plan */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Current Plan
                    </p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {currentTier.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {currentTier.price === 0
                        ? "Free"
                        : `€${currentTier.price}/mo`}
                    </p>
                  </div>

                  {/* Recommended Plan */}
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                      Recommended
                    </p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {requiredTier.name}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      {requiredTier.price
                        ? `€${requiredTier.price}/mo`
                        : "Custom pricing"}
                    </p>
                  </div>
                </div>

                {/* Feature highlights */}
                <div className="space-y-2.5 mb-6">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    What you get with {requiredTier.name}:
                  </p>
                  {[
                    `${requiredTier.features.users === "unlimited" ? "Unlimited" : requiredTier.features.users} team members`,
                    `${requiredTier.features.spacecraft === "unlimited" ? "Unlimited" : requiredTier.features.spacecraft} spacecraft`,
                    requiredTier.features.modules === "all"
                      ? "All compliance modules"
                      : `${(requiredTier.features.modules as string[]).length} modules`,
                    `${requiredTier.features.storage === "unlimited" ? "Unlimited" : `${requiredTier.features.storage}GB`} storage`,
                    `${requiredTier.features.support.charAt(0).toUpperCase() + requiredTier.features.support.slice(1)} support`,
                    ...(requiredTier.features.api ? ["API access"] : []),
                    ...(requiredTier.features.sso ? ["SSO integration"] : []),
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Check
                        size={14}
                        className="text-green-500 flex-shrink-0"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="flex gap-3">
                  <button
                    onClick={handleUpgrade}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-6 py-3 rounded-lg transition-colors"
                  >
                    Upgrade Now
                    <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
