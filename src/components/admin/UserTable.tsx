"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin — users management table.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Modernized to the project standards (P2 of the world-class admin concept):
 *   - No `window.alert()` / `window.confirm()`. Mutation outcomes surface
 *     through the shared {@link useToast} system (error toast on failure,
 *     success toast on apply). The one destructive action — deactivating a
 *     user — now uses an inline, fully accessible two-step confirm (the
 *     "Deactivate" button flips to a "Confirm" + "Cancel" pair) instead of a
 *     blocking `window.confirm` dialog.
 *   - No hardcoded `dark:bg-white/[…]` / `dark:border-white/…` glass hacks —
 *     structural surfaces, borders, and muted text use the v2 design tokens
 *     (`--surface-raised`, `--surface-sunken`, `--border-default`,
 *     `--text-secondary`, …) + the `glass-surface` utility, matching the v2
 *     admin cockpit. Light-mode classes are preserved.
 *
 * Props are unchanged: `users` + `onRefresh` (invoked on every successful
 * mutation). Mutations hit PATCH /api/admin/users/:id and
 * PATCH /api/admin/organizations/:id.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import { User, UserX, Check } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useToast } from "@/components/ui/Toast";

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
  organization: string | null;
  operatorType: string | null;
  createdAt: string;
  updatedAt: string;
  organizationMemberships?: Array<{
    role: string;
    organization: {
      id: string;
      name: string;
      plan: string;
    };
  }>;
}

interface Props {
  users: AdminUser[];
  onRefresh: () => void;
}

// Colored role/plan pills are legitimate light+dark sentiment pairs, NOT the
// banned white-opacity glass hacks. The neutral default tier reads from the
// surface/border/text tokens so it tracks the v2 palette.
const ROLE_STYLES: Record<string, string> = {
  admin:
    "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  auditor:
    "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
  user: "bg-slate-50 dark:bg-[var(--surface-sunken)] text-slate-600 dark:text-[var(--text-secondary)] border-slate-200 dark:border-[var(--border-subtle)]",
};

const PLAN_STYLES: Record<string, string> = {
  ENTERPRISE:
    "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  PROFESSIONAL:
    "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20",
  STARTER:
    "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
  FREE: "bg-slate-50 dark:bg-[var(--surface-sunken)] text-slate-600 dark:text-[var(--text-secondary)] border-slate-200 dark:border-[var(--border-subtle)]",
};

// Column-header cell shared by the head row — uppercase micro-label in the
// secondary token colour, matching the v2 admin table language.
const TH_CLASS =
  "px-4 py-3 text-caption uppercase tracking-[0.15em] text-slate-500 dark:text-[var(--text-secondary)]";

export default function UserTable({ users, onRefresh }: Props) {
  const toast = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  // The user id whose "Deactivate" button is awaiting a second-click confirm.
  // Inline (per-row) instead of a blocking window.confirm — accessible + on-brand.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function updateUserRole(userId: string, role: string) {
    setLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        toast.success("Role updated", `Set to ${role}.`);
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(
          "Could not update role",
          data.error || "The change was not saved. Please try again.",
        );
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error(
        "Could not update role",
        "A network error occurred. Please try again.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function updateOrgPlan(orgId: string, plan: string) {
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

  async function setUserActive(userId: string, nextActive: boolean) {
    setConfirmingId(null);
    setLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ isActive: nextActive }),
      });

      if (res.ok) {
        toast.success(
          nextActive ? "User activated" : "User deactivated",
          nextActive
            ? "They can sign in again."
            : "They can no longer sign in.",
        );
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(
          "Could not update status",
          data.error || "The change was not saved. Please try again.",
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(
        "Could not update status",
        "A network error occurred. Please try again.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  if (users.length === 0) {
    return (
      <div
        className="glass-surface bg-white dark:bg-[var(--surface-raised)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl p-12 text-center"
        role="status"
      >
        <p className="text-body-lg text-slate-500 dark:text-[var(--text-secondary)]">
          No users found matching your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-surface bg-white dark:bg-[var(--surface-raised)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" aria-label="Users">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[var(--border-default)] bg-slate-50 dark:bg-[var(--surface-sunken)]">
              <th scope="col" className={`text-left ${TH_CLASS}`}>
                User
              </th>
              <th scope="col" className={`text-left ${TH_CLASS}`}>
                Organization
              </th>
              <th scope="col" className={`text-left ${TH_CLASS}`}>
                Plan
              </th>
              <th scope="col" className={`text-left ${TH_CLASS}`}>
                Role
              </th>
              <th scope="col" className={`text-left ${TH_CLASS}`}>
                Status
              </th>
              <th scope="col" className={`text-right ${TH_CLASS}`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const orgMembership = user.organizationMemberships?.[0];
              const orgName =
                orgMembership?.organization?.name || user.organization || "—";
              const orgId = orgMembership?.organization?.id;
              const orgPlan = orgMembership?.organization?.plan || null;
              const isBusy = loadingId === user.id;
              const isConfirming = confirmingId === user.id;

              return (
                <tr
                  key={user.id}
                  className="border-b border-slate-100 dark:border-[var(--border-subtle)] last:border-0 hover:bg-slate-50/50 dark:hover:bg-[var(--surface-sunken)] transition-colors"
                >
                  {/* User */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-[var(--surface-sunken)] dark:to-[var(--surface-base)] flex items-center justify-center flex-shrink-0">
                        <span className="text-caption font-medium text-slate-600 dark:text-[var(--text-secondary)]">
                          {user.name
                            ? user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)
                            : user.email?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-body font-medium text-slate-900 dark:text-[var(--text-primary)] truncate">
                          {user.name || "Unnamed User"}
                        </p>
                        <p className="text-small text-slate-500 dark:text-[var(--text-secondary)] truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Organization */}
                  <td className="px-4 py-3.5">
                    <p className="text-body text-slate-700 dark:text-[var(--text-primary)] truncate">
                      {orgName}
                    </p>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3.5">
                    {orgId && orgPlan ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          aria-label={`Plan for ${orgName}`}
                          value={orgPlan}
                          onChange={(e) => updateOrgPlan(orgId, e.target.value)}
                          disabled={loadingId === orgId}
                          className={`px-2 py-1 border rounded-lg text-small font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 ${PLAN_STYLES[orgPlan] || PLAN_STYLES.FREE}`}
                        >
                          <option value="FREE">Free</option>
                          <option value="STARTER">Starter</option>
                          <option value="PROFESSIONAL">Professional</option>
                          <option value="ENTERPRISE">Enterprise</option>
                        </select>
                        {successId === orgId && (
                          <Check
                            size={14}
                            className="text-emerald-500"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-small text-slate-400 dark:text-[var(--text-tertiary)]">
                        —
                      </span>
                    )}
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3.5">
                    <select
                      aria-label={`Role for ${user.name || user.email}`}
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      disabled={isBusy}
                      className={`px-2 py-1 border rounded-lg text-small font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 ${ROLE_STYLES[user.role] || ROLE_STYLES.user}`}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="auditor">Auditor</option>
                    </select>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full text-caption font-medium">
                        <User size={11} aria-hidden="true" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-[var(--surface-sunken)] border border-slate-200 dark:border-[var(--border-subtle)] text-slate-500 dark:text-[var(--text-secondary)] rounded-full text-caption font-medium">
                        <UserX size={11} aria-hidden="true" />
                        Inactive
                      </span>
                    )}
                  </td>

                  {/* Actions — inline two-step confirm for the destructive
                      deactivate; activate is non-destructive and fires directly. */}
                  <td className="px-4 py-3.5 text-right">
                    {isBusy ? (
                      <span
                        className="inline-block text-small text-slate-400 dark:text-[var(--text-tertiary)] px-3 py-1.5"
                        role="status"
                      >
                        Saving…
                      </span>
                    ) : !user.isActive ? (
                      <button
                        onClick={() => setUserActive(user.id, true)}
                        className="text-small font-medium px-3 py-1.5 rounded-lg transition-colors text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                      >
                        Activate
                      </button>
                    ) : isConfirming ? (
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <span className="text-caption text-slate-500 dark:text-[var(--text-secondary)]">
                          Deactivate?
                        </span>
                        <button
                          onClick={() => setUserActive(user.id, false)}
                          className="text-small font-medium px-2.5 py-1.5 rounded-lg transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                          aria-label={`Confirm deactivate ${user.name || user.email}`}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="text-small font-medium px-2.5 py-1.5 rounded-lg transition-colors text-slate-500 dark:text-[var(--text-secondary)] hover:bg-slate-100 dark:hover:bg-[var(--surface-sunken)]"
                          aria-label="Cancel deactivate"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(user.id)}
                        className="text-small font-medium px-3 py-1.5 rounded-lg transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        Deactivate
                      </button>
                    )}
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
