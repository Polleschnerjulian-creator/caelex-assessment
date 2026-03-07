"use client";

import { useState } from "react";
import Link from "next/link";
import { X, AlertTriangle, ArrowRight } from "lucide-react";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import {
  PRICING_TIERS,
  isLimitExceeded,
  getUpgradePlan,
  type PlanType,
} from "@/lib/stripe/pricing";

interface UsageLimitBannerProps {
  resource: "users" | "spacecraft" | "storage";
  currentUsage: number;
  label?: string;
}

export default function UsageLimitBanner({
  resource,
  currentUsage,
  label,
}: UsageLimitBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { organization } = useOrganization();

  const plan = (organization?.plan || "FREE") as PlanType;
  const tier = PRICING_TIERS[plan];
  const limit = tier.features[resource];

  if (dismissed || limit === "unlimited") return null;

  const usagePercent = (currentUsage / (limit as number)) * 100;

  // Only show at 80%+ usage
  if (usagePercent < 80) return null;

  const isAtLimit = currentUsage >= (limit as number);
  const upgradePlan = getUpgradePlan(plan);
  const resourceLabel = label || resource;

  return (
    <div
      className={`
        relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm mb-4
        ${
          isAtLimit
            ? "bg-[var(--accent-warning-soft)] border border-[var(--accent-warning)] text-amber-800"
            : "bg-[var(--accent-info-soft)]0/10 border border-[var(--accent-primary)]/30 text-blue-800"
        }
      `}
    >
      <AlertTriangle size={16} className="flex-shrink-0" />
      <p className="flex-1">
        {isAtLimit ? (
          <>
            You've reached your {resourceLabel} limit ({currentUsage}/
            {limit as number}).{" "}
            {upgradePlan && (
              <Link
                href="/dashboard/settings/billing"
                className="font-medium underline hover:no-underline inline-flex items-center gap-1"
              >
                Upgrade to {PRICING_TIERS[upgradePlan].name}
                <ArrowRight size={14} />
              </Link>
            )}
          </>
        ) : (
          <>
            You're using {currentUsage} of {limit as number} {resourceLabel} (
            {Math.round(usagePercent)}%).{" "}
            {upgradePlan && (
              <Link
                href="/dashboard/settings/billing"
                className="font-medium underline hover:no-underline"
              >
                Upgrade for more
              </Link>
            )}
          </>
        )}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-black/5 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
