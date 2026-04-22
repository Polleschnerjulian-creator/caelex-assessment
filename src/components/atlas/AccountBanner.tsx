"use client";

import { useEffect, useState } from "react";
import { Building2, Copy, CheckCircle2, ShieldCheck } from "lucide-react";

/**
 * Atlas account banner — persistent identity panel at the top of the
 * settings page. Shows the signed-in user, their current organisation,
 * the role they hold in that org, and the organisation's active plan /
 * license tier. Fetched via /api/atlas/settings/context on mount.
 *
 * Kept self-contained (own fetch, own loading state) so it can be
 * dropped at the top of any Atlas page without touching parent state.
 */

type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
type PlanTier = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

interface Context {
  user: { id: string; name: string | null; email: string | null };
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    isActive: boolean;
  };
  role: Role;
  isPlatformAdmin: boolean;
  plan: {
    tier: PlanTier;
    expiresAt: string | null;
    maxUsers: number;
    maxSpacecraft: number;
    memberCount: number;
  };
}

const ROLE_STYLE: Record<Role, { label: string; className: string }> = {
  OWNER: {
    label: "Owner",
    className: "bg-gray-900 text-white border-gray-900",
  },
  ADMIN: {
    label: "Admin",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  MEMBER: {
    label: "Member",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  VIEWER: {
    label: "Viewer",
    className: "bg-gray-50 text-gray-500 border-gray-200",
  },
};

const PLAN_STYLE: Record<PlanTier, { label: string; className: string }> = {
  FREE: {
    label: "Free",
    className: "bg-gray-50 text-gray-500 border-gray-200",
  },
  STARTER: {
    label: "Starter",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PROFESSIONAL: {
    label: "Professional",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  ENTERPRISE: {
    label: "Enterprise",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

function initials(input: string | null | undefined): string {
  if (!input) return "·";
  const parts = input.split(/\s+|@/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "·";
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export function AccountBanner() {
  const [ctx, setCtx] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/atlas/settings/context")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Context | null) => {
        if (!cancelled && data) setCtx(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mb-6 rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-5 h-[88px] animate-pulse" />
    );
  }

  if (!ctx) {
    return null;
  }

  const role = ROLE_STYLE[ctx.role] ?? ROLE_STYLE.MEMBER;
  const plan = PLAN_STYLE[ctx.plan.tier] ?? PLAN_STYLE.FREE;
  const expiresLabel = formatDate(ctx.plan.expiresAt);

  const copyOrgId = async () => {
    try {
      await navigator.clipboard.writeText(ctx.organization.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can fail on iOS without a user gesture — silent */
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-5">
      <div className="flex items-start gap-4 flex-wrap">
        {/* Avatar */}
        <div className="flex items-center justify-center h-11 w-11 rounded-full bg-gray-900 text-white text-[13px] font-semibold flex-shrink-0">
          {initials(ctx.user.name || ctx.user.email)}
        </div>

        {/* User block */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-[var(--atlas-text-primary)] truncate">
              {ctx.user.name || ctx.user.email || "Unknown user"}
            </span>
            {ctx.isPlatformAdmin && (
              <span
                className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200"
                title="Platform admin — access to internal Caelex tools"
              >
                <ShieldCheck size={9} strokeWidth={2.5} />
                Caelex staff
              </span>
            )}
          </div>
          {ctx.user.email && (
            <div className="text-[11px] text-[var(--atlas-text-muted)] mt-0.5 truncate">
              {ctx.user.email}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px self-stretch bg-[var(--atlas-border-subtle)]" />

        {/* Org block */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Building2
              size={13}
              className="text-[var(--atlas-text-muted)] flex-shrink-0"
              strokeWidth={1.5}
            />
            <span className="text-[14px] font-semibold text-[var(--atlas-text-primary)] truncate">
              {ctx.organization.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="text-[10px] font-mono text-[var(--atlas-text-faint)] truncate"
              title={ctx.organization.id}
            >
              {ctx.organization.id}
            </span>
            <button
              onClick={copyOrgId}
              className="flex items-center justify-center h-4 w-4 rounded text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-primary)] transition-colors flex-shrink-0"
              title="Copy organisation ID"
              aria-label="Copy organisation ID"
            >
              {copied ? (
                <CheckCircle2 size={10} className="text-emerald-600" />
              ) : (
                <Copy size={10} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {/* Pills — role + plan + seat count */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <span
            className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded border ${role.className}`}
            title={`Your role in ${ctx.organization.name}`}
          >
            {role.label}
          </span>
          <span
            className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded border ${plan.className}`}
            title={
              expiresLabel
                ? `${plan.label} plan, valid until ${expiresLabel}`
                : `${plan.label} plan`
            }
          >
            {plan.label}
          </span>
          <span
            className="text-[10px] font-medium text-[var(--atlas-text-muted)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded px-2 py-1"
            title="Members in this organisation vs. seat cap"
          >
            {ctx.plan.memberCount}
            {ctx.plan.maxUsers > 0 ? ` / ${ctx.plan.maxUsers}` : ""} seats
          </span>
        </div>
      </div>
    </div>
  );
}
