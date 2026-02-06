"use client";

import { useState } from "react";
import { Check, Zap, Building2, Rocket } from "lucide-react";
import { PRICING_TIERS, PlanType } from "@/lib/stripe/pricing";

interface PricingTableProps {
  currentPlan: PlanType;
  onSelectPlan: (plan: PlanType, priceId: string, isYearly: boolean) => void;
  isLoading?: boolean;
}

export default function PricingTable({
  currentPlan,
  onSelectPlan,
  isLoading,
}: PricingTableProps) {
  const [isYearly, setIsYearly] = useState(false);

  const planIcons: Record<PlanType, React.ReactNode> = {
    FREE: <Zap className="w-5 h-5" />,
    STARTER: <Rocket className="w-5 h-5" />,
    PROFESSIONAL: <Building2 className="w-5 h-5" />,
    ENTERPRISE: <Building2 className="w-5 h-5" />,
  };

  const formatFeatureValue = (value: number | string | "unlimited") => {
    if (value === "unlimited") return "Unlimited";
    if (typeof value === "number") return value.toString();
    return value;
  };

  return (
    <div className="space-y-6">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <span
          className={`text-[13px] ${!isYearly ? "text-slate-900 dark:text-white font-medium" : "text-slate-400 dark:text-white/40"}`}
        >
          Monthly
        </span>
        <button
          onClick={() => setIsYearly(!isYearly)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            isYearly ? "bg-emerald-500" : "bg-slate-200 dark:bg-white/[0.1]"
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
              isYearly ? "left-7" : "left-1"
            }`}
          />
        </button>
        <span
          className={`text-[13px] ${isYearly ? "text-slate-900 dark:text-white font-medium" : "text-slate-400 dark:text-white/40"}`}
        >
          Yearly
          <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
            Save 17%
          </span>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(
          Object.entries(PRICING_TIERS) as [
            PlanType,
            typeof PRICING_TIERS.FREE,
          ][]
        ).map(([plan, config]) => {
          const isCurrent = plan === currentPlan;
          const isPopular = config.popular;
          const price = isYearly ? config.yearlyPrice : config.price;
          const priceId = isYearly ? config.yearlyPriceId : config.priceId;

          return (
            <div
              key={plan}
              className={`relative bg-white dark:bg-white/[0.04] border rounded-xl p-6 transition-all ${
                isPopular
                  ? "border-emerald-500 dark:border-emerald-500/50 ring-1 ring-emerald-500/20"
                  : "border-slate-200 dark:border-white/10"
              } ${isCurrent ? "bg-slate-50 dark:bg-white/[0.06]" : ""}`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-[10px] font-medium uppercase tracking-wider rounded-full">
                  Most Popular
                </span>
              )}

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`p-2 rounded-lg ${
                    isPopular
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/50"
                  }`}
                >
                  {planIcons[plan]}
                </div>
                <div>
                  <h3 className="text-[15px] font-medium text-slate-900 dark:text-white">
                    {config.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-white/40">
                    {config.description}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                {price === null ? (
                  <div className="text-[24px] font-semibold text-slate-900 dark:text-white">
                    Custom
                  </div>
                ) : price === 0 ? (
                  <div className="text-[24px] font-semibold text-slate-900 dark:text-white">
                    Free
                  </div>
                ) : (
                  <div>
                    <span className="text-[28px] font-semibold text-slate-900 dark:text-white">
                      €{isYearly ? Math.round(price / 12) : price}
                    </span>
                    <span className="text-slate-400 dark:text-white/40 text-[13px]">
                      /month
                    </span>
                    {isYearly && (
                      <p className="text-[11px] text-slate-400 dark:text-white/30 mt-1">
                        €{price} billed annually
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6">
                <li className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-white/60">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                  <span>
                    {formatFeatureValue(config.features.users)}{" "}
                    {config.features.users === 1 ? "user" : "users"}
                  </span>
                </li>
                <li className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-white/60">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                  <span>
                    {formatFeatureValue(config.features.spacecraft)} spacecraft
                  </span>
                </li>
                <li className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-white/60">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                  <span>
                    {config.features.modules === "all"
                      ? "All modules"
                      : `${config.features.modules.length} modules`}
                  </span>
                </li>
                {(config.features.storage === "unlimited" ||
                  config.features.storage > 0) && (
                  <li className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-white/60">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                    <span>
                      {formatFeatureValue(config.features.storage)}{" "}
                      {config.features.storage !== "unlimited" && "GB"} storage
                    </span>
                  </li>
                )}
                {config.features.api && (
                  <li className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-white/60">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                    <span>API access</span>
                  </li>
                )}
                {config.features.sso && (
                  <li className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-white/60">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                    <span>SSO integration</span>
                  </li>
                )}
                <li className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-white/60">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                  <span className="capitalize">
                    {config.features.support} support
                  </span>
                </li>
              </ul>

              {/* CTA Button */}
              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/30 rounded-lg text-[13px] font-medium cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : plan === "ENTERPRISE" ? (
                <a
                  href="mailto:sales@caelex.eu?subject=Enterprise%20Plan%20Inquiry"
                  className="block w-full py-2.5 px-4 border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-white/60 rounded-lg text-[13px] font-medium text-center hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
                >
                  Contact Sales
                </a>
              ) : (
                <button
                  onClick={() =>
                    priceId && onSelectPlan(plan, priceId, isYearly)
                  }
                  disabled={isLoading || !priceId}
                  className={`w-full py-2.5 px-4 rounded-lg text-[13px] font-medium transition-all ${
                    isPopular
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-white/90"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? "Loading..." : "Upgrade"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
