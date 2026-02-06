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
    FREE: <Zap className="w-6 h-6" />,
    STARTER: <Rocket className="w-6 h-6" />,
    PROFESSIONAL: <Building2 className="w-6 h-6" />,
    ENTERPRISE: <Building2 className="w-6 h-6" />,
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
          className={`text-sm ${!isYearly ? "text-white font-medium" : "text-slate-400"}`}
        >
          Monthly
        </span>
        <button
          onClick={() => setIsYearly(!isYearly)}
          className={`relative w-14 h-7 rounded-full transition-colors ${
            isYearly ? "bg-blue-600" : "bg-navy-700"
          }`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
              isYearly ? "left-8" : "left-1"
            }`}
          />
        </button>
        <span
          className={`text-sm ${isYearly ? "text-white font-medium" : "text-slate-400"}`}
        >
          Yearly
          <span className="ml-1 text-green-400 text-xs">(Save 17%)</span>
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
              className={`relative bg-navy-800 border rounded-xl p-6 ${
                isPopular
                  ? "border-blue-500 ring-2 ring-blue-500/20"
                  : "border-navy-700"
              } ${isCurrent ? "bg-navy-700/50" : ""}`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                  Most Popular
                </span>
              )}

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`p-2 rounded-lg ${
                    isPopular
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-navy-700 text-slate-400"
                  }`}
                >
                  {planIcons[plan]}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{config.name}</h3>
                  <p className="text-xs text-slate-400">{config.description}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                {price === null ? (
                  <div className="text-2xl font-bold text-white">Custom</div>
                ) : price === 0 ? (
                  <div className="text-2xl font-bold text-white">Free</div>
                ) : (
                  <div>
                    <span className="text-3xl font-bold text-white">
                      €{isYearly ? Math.round(price / 12) : price}
                    </span>
                    <span className="text-slate-400 text-sm">/month</span>
                    {isYearly && (
                      <p className="text-xs text-slate-500 mt-1">
                        €{price} billed annually
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>
                    {formatFeatureValue(config.features.users)}{" "}
                    {config.features.users === 1 ? "user" : "users"}
                  </span>
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>
                    {formatFeatureValue(config.features.spacecraft)} spacecraft
                  </span>
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>
                    {config.features.modules === "all"
                      ? "All modules"
                      : `${config.features.modules.length} modules`}
                  </span>
                </li>
                {(config.features.storage === "unlimited" ||
                  config.features.storage > 0) && (
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span>
                      {formatFeatureValue(config.features.storage)}{" "}
                      {config.features.storage !== "unlimited" && "GB"} storage
                    </span>
                  </li>
                )}
                {config.features.api && (
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span>API access</span>
                  </li>
                )}
                {config.features.sso && (
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span>SSO integration</span>
                  </li>
                )}
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="capitalize">
                    {config.features.support} support
                  </span>
                </li>
              </ul>

              {/* CTA Button */}
              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2 px-4 bg-navy-600 text-slate-400 rounded-lg text-sm font-medium"
                >
                  Current Plan
                </button>
              ) : plan === "ENTERPRISE" ? (
                <a
                  href="mailto:sales@caelex.eu?subject=Enterprise%20Plan%20Inquiry"
                  className="block w-full py-2 px-4 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm font-medium text-center transition-colors"
                >
                  Contact Sales
                </a>
              ) : (
                <button
                  onClick={() =>
                    priceId && onSelectPlan(plan, priceId, isYearly)
                  }
                  disabled={isLoading || !priceId}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    isPopular
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-navy-700 hover:bg-navy-600 text-white"
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
