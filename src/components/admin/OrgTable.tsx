"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin — organizations management table.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Modernized to the project standards (P2 of the world-class admin concept):
 *   - No `window.alert()` — mutation outcomes surface through the shared
 *     {@link useToast} system (error toast on failure, success toast on apply).
 *   - No hardcoded `dark:bg-white/[…]` / `dark:border-white/…` glass hacks —
 *     structural surfaces, borders, and muted text use the v2 design tokens
 *     (`--surface-raised`, `--surface-sunken`, `--border-default`,
 *     `--text-secondary`, …) + the `glass-surface` utility, matching the v2
 *     admin cockpit. Light-mode classes are preserved; the glass token/class is
 *     layered on top per the CLAUDE.md guidance.
 *
 * Behaviour and props are unchanged: the only mutation is an inline plan change
 * (PATCH /api/admin/organizations/:id), and `onRefresh` is invoked on success.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import { Building2, Users, Rocket, Check } from "lucide-react";
import type { OrganizationPlan } from "@prisma/client";
import { csrfHeaders } from "@/lib/csrf-client";
import { useToast } from "@/components/ui/Toast";

interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  maxUsers: number;
  maxSpacecraft: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    members: number;
    spacecraft: number;
  };
  members: Array<{
    user: {
      email: string | null;
      name: string | null;
    };
  }>;
}

interface Props {
  organizations: AdminOrg[];
  onRefresh: () => void;
}

// Colored plan pills are legitimate light+dark sentiment pairs (amber/purple/
// blue accents), NOT the banned white-opacity glass hacks. The neutral FREE
// tier reads from the surface/border/text tokens so it tracks the v2 palette.
const PLAN_STYLES: Record<string, { bg: string; text: string }> = {
  ENTERPRISE: {
    bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
  },
  PROFESSIONAL: {
    bg: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20",
    text: "text-purple-700 dark:text-purple-400",
  },
  STARTER: {
    bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
    text: "text-blue-700 dark:text-blue-400",
  },
  FREE: {
    bg: "bg-slate-50 dark:bg-[var(--surface-sunken)] border-slate-200 dark:border-[var(--border-subtle)]",
    text: "text-slate-600 dark:text-[var(--text-secondary)]",
  },
};

const PLANS: OrganizationPlan[] = [
  "FREE",
  "STARTER",
  "PROFESSIONAL",
  "ENTERPRISE",
];

// Column-header cell shared by the head row — uppercase micro-label in the
// secondary token colour, matching the v2 admin table language.
const TH_CLASS =
  "px-4 py-3 text-caption uppercase tracking-[0.15em] text-slate-500 dark:text-[var(--text-secondary)]";

export default function OrgTable({ organizations, onRefresh }: Props) {
  const toast = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  async function updateOrgPlan(orgId: string, plan: OrganizationPlan) {
    setLoadingId(orgId);
    setSuccessId(null);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ plan }),
      });

      if (res.ok) {
        setSuccessId(orgId);
        toast.success("Plan updated", `Set to ${plan}.`);
        onRefresh();
        setTimeout(() => setSuccessId(null), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(
          "Could not update plan",
          data.error || "The change was not saved. Please try again.",
        );
      }
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error(
        "Could not update plan",
        "A network error occurred. Please try again.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  if (organizations.length === 0) {
    return (
      <div
        className="glass-surface bg-white dark:bg-[var(--surface-raised)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl p-12 text-center"
        role="status"
      >
        <p className="text-body-lg text-slate-500 dark:text-[var(--text-secondary)]">
          No organizations found matching your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-surface bg-white dark:bg-[var(--surface-raised)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" aria-label="Organizations">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[var(--border-default)] bg-slate-50 dark:bg-[var(--surface-sunken)]">
              <th scope="col" className={`text-left ${TH_CLASS}`}>
                Organization
              </th>
              <th scope="col" className={`text-left ${TH_CLASS}`}>
                Owner
              </th>
              <th scope="col" className={`text-left ${TH_CLASS}`}>
                Plan
              </th>
              <th scope="col" className={`text-center ${TH_CLASS}`}>
                Members
              </th>
              <th scope="col" className={`text-center ${TH_CLASS}`}>
                Spacecraft
              </th>
              <th scope="col" className={`text-left ${TH_CLASS}`}>
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => {
              const ownerEmail = org.members[0]?.user?.email || "—";
              const ownerName = org.members[0]?.user?.name || null;
              const planStyle = PLAN_STYLES[org.plan] || PLAN_STYLES.FREE;

              return (
                <tr
                  key={org.id}
                  className="border-b border-slate-100 dark:border-[var(--border-subtle)] last:border-0 hover:bg-slate-50/50 dark:hover:bg-[var(--surface-sunken)] transition-colors"
                >
                  {/* Organization */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[var(--surface-sunken)] dark:to-[var(--surface-base)] flex items-center justify-center flex-shrink-0">
                        <Building2
                          size={14}
                          className="text-slate-500 dark:text-[var(--text-secondary)]"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-body font-medium text-slate-900 dark:text-[var(--text-primary)] truncate">
                          {org.name}
                        </p>
                        <p className="text-caption text-slate-500 dark:text-[var(--text-secondary)] font-mono">
                          {org.slug}
                        </p>
                        <p className="text-micro text-slate-400 dark:text-[var(--text-tertiary)] font-mono truncate">
                          {org.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Owner */}
                  <td className="px-4 py-3.5">
                    <div className="min-w-0">
                      {ownerName && (
                        <p className="text-body text-slate-700 dark:text-[var(--text-primary)] truncate">
                          {ownerName}
                        </p>
                      )}
                      <p className="text-small text-slate-500 dark:text-[var(--text-secondary)] truncate">
                        {ownerEmail}
                      </p>
                    </div>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Plan for ${org.name}`}
                        value={org.plan}
                        onChange={(e) =>
                          updateOrgPlan(
                            org.id,
                            e.target.value as OrganizationPlan,
                          )
                        }
                        disabled={loadingId === org.id}
                        className={`px-2 py-1 border rounded-lg text-small font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 ${planStyle.bg} ${planStyle.text}`}
                      >
                        {PLANS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      {successId === org.id && (
                        <Check
                          size={14}
                          className="text-emerald-500 animate-in fade-in"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </td>

                  {/* Members */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Users
                        size={13}
                        className="text-slate-400 dark:text-[var(--text-secondary)]"
                        aria-hidden="true"
                      />
                      <span className="text-body tabular-nums text-slate-700 dark:text-[var(--text-primary)]">
                        {org._count.members}
                      </span>
                      <span className="text-caption tabular-nums text-slate-400 dark:text-[var(--text-tertiary)]">
                        / {org.maxUsers}
                      </span>
                    </div>
                  </td>

                  {/* Spacecraft */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Rocket
                        size={13}
                        className="text-slate-400 dark:text-[var(--text-secondary)]"
                        aria-hidden="true"
                      />
                      <span className="text-body tabular-nums text-slate-700 dark:text-[var(--text-primary)]">
                        {org._count.spacecraft}
                      </span>
                      <span className="text-caption tabular-nums text-slate-400 dark:text-[var(--text-tertiary)]">
                        / {org.maxSpacecraft}
                      </span>
                    </div>
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3.5">
                    <time
                      dateTime={org.createdAt}
                      className="text-small tabular-nums text-slate-500 dark:text-[var(--text-secondary)]"
                    >
                      {new Date(org.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
