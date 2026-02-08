"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { PRICING_TIERS } from "@/lib/stripe/pricing";

// Module display names for the upgrade prompt
const MODULE_LABELS: Record<string, string> = {
  authorization: "Authorization & Registration",
  registration: "Registration",
  cybersecurity: "Cybersecurity & Resilience",
  debris: "Debris Mitigation",
  environmental: "Environmental Footprint",
  insurance: "Insurance",
  supervision: "Supervision & Audit",
  documents: "Document Management",
  timeline: "Timeline & Deadlines",
  "audit-center": "Audit Center",
};

const MODULE_DESCRIPTIONS: Record<string, string> = {
  authorization:
    "Manage multi-authority authorization workflows, track application status, and coordinate with National Competent Authorities.",
  registration:
    "Handle space object registration requirements across national and UN registries.",
  cybersecurity:
    "NIS2-compliant risk analysis, incident reporting, and cybersecurity resilience management.",
  debris:
    "End-of-life planning, collision avoidance documentation, and debris mitigation compliance.",
  environmental:
    "Environmental Footprint Declaration (EFD) preparation, calculation, and submission tracking.",
  insurance:
    "Insurance requirements assessment, coverage tracking, and compliance documentation.",
  supervision:
    "Compliance monitoring, audit trail management, and supervisory reporting.",
  documents:
    "Centralized document vault with 20+ categories, expiry tracking, and compliance status.",
  timeline:
    "Deadline management, configurable reminders, and regulatory milestone tracking.",
  "audit-center":
    "Centralized compliance evidence management, hash-verified audit trails, and audit-ready export packages across all regulatory modules.",
};

interface FeatureGateProps {
  module: string;
  children: ReactNode;
}

export default function FeatureGate({ module, children }: FeatureGateProps) {
  const { hasModuleAccess, requiredPlanForModule, plan, isLoading } =
    useOrganization();

  // Show loading state while org data is being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2
          size={24}
          className="animate-spin text-slate-400 dark:text-white/40"
        />
      </div>
    );
  }

  // User has access — render the module
  if (hasModuleAccess(module)) {
    return <>{children}</>;
  }

  // User doesn't have access — show upgrade prompt
  const requiredPlan = requiredPlanForModule(module);
  const requiredTier = PRICING_TIERS[requiredPlan];
  const moduleLabel = MODULE_LABELS[module] || module;
  const moduleDescription =
    MODULE_DESCRIPTIONS[module] || "Access this module to manage compliance.";

  return (
    <div className="flex items-center justify-center min-h-[400px] px-4">
      <div className="max-w-md w-full text-center">
        {/* Lock icon */}
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto mb-6">
          <Lock
            size={28}
            className="text-slate-400 dark:text-white/30"
            strokeWidth={1.5}
          />
        </div>

        {/* Heading */}
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Upgrade to unlock {moduleLabel}
        </h2>

        {/* Description */}
        <p className="text-[14px] text-slate-500 dark:text-white/50 leading-relaxed mb-6">
          {moduleDescription}
        </p>

        {/* Plan badge */}
        <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 mb-6">
          <span className="text-[12px] text-slate-500 dark:text-white/40">
            Your plan:
          </span>
          <span className="text-[12px] font-medium text-slate-700 dark:text-white/70">
            {PRICING_TIERS[plan].name}
          </span>
          <span className="text-[12px] text-slate-400 dark:text-white/20">
            →
          </span>
          <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
            {requiredTier.name}
            {requiredTier.price !== null && ` (€${requiredTier.price}/mo)`}
          </span>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/dashboard/settings/billing"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[14px] font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            View Plans & Upgrade
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/dashboard"
            className="text-[13px] text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
