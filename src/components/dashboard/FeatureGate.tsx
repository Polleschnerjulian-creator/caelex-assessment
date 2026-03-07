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
  "regulatory-feed": "Regulatory Feed",
  incidents: "Incident Command Center",
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
  "regulatory-feed":
    "Automated monitoring of EUR-Lex for new EU legislation affecting space compliance, with severity classification and module impact analysis.",
  incidents:
    "NIS2 Art. 23 incident response with live deadline tracking, workflow state machine, NCA notification drafting, and auto-escalation.",
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
          className="animate-spin text-[var(--text-tertiary)]"
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
        <div className="w-16 h-16 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mx-auto mb-6">
          <Lock
            size={28}
            className="text-[var(--text-tertiary)]"
            strokeWidth={1.5}
          />
        </div>

        {/* Heading */}
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Upgrade to unlock {moduleLabel}
        </h2>

        {/* Description */}
        <p className="text-body-lg text-[var(--text-secondary)] leading-relaxed mb-6">
          {moduleDescription}
        </p>

        {/* Plan badge */}
        <div className="inline-flex items-center gap-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-1.5 mb-6">
          <span className="text-small text-[var(--text-secondary)]">
            Your plan:
          </span>
          <span className="text-small font-medium text-[var(--text-secondary)]">
            {PRICING_TIERS[plan].name}
          </span>
          <span className="text-small text-[var(--text-tertiary)]">→</span>
          <span className="text-small font-medium text-[var(--accent-success)]">
            {requiredTier.name}
            {requiredTier.price !== null && ` (€${requiredTier.price}/mo)`}
          </span>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/dashboard/settings/billing"
            className="inline-flex items-center gap-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-body-lg font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            View Plans & Upgrade
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/dashboard"
            className="text-body text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
