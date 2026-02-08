"use client";

import { useState } from "react";
import { Building2, Users, Rocket, Crown, Check } from "lucide-react";
import type { OrganizationPlan } from "@prisma/client";
import { csrfHeaders } from "@/lib/csrf-client";

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

const PLAN_STYLES: Record<string, { bg: string; text: string; icon?: string }> =
  {
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
      bg: "bg-slate-50 dark:bg-white/[0.06] border-slate-200 dark:border-white/10",
      text: "text-slate-600 dark:text-white/50",
    },
  };

const PLANS: OrganizationPlan[] = [
  "FREE",
  "STARTER",
  "PROFESSIONAL",
  "ENTERPRISE",
];

export default function OrgTable({ organizations, onRefresh }: Props) {
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
        onRefresh();
        setTimeout(() => setSuccessId(null), 2000);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update plan");
      }
    } catch (error) {
      console.error("Error updating plan:", error);
      alert("Failed to update plan");
    } finally {
      setLoadingId(null);
    }
  }

  if (organizations.length === 0) {
    return (
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-12 text-center">
        <p className="text-[14px] text-slate-500 dark:text-white/50">
          No organizations found matching your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
              <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-white/50">
                Organization
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-white/50">
                Owner
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-white/50">
                Plan
              </th>
              <th className="text-center px-4 py-3 text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-white/50">
                Members
              </th>
              <th className="text-center px-4 py-3 text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-white/50">
                Spacecraft
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-white/50">
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
                  className="border-b border-slate-100 dark:border-white/[0.05] last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* Organization */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/10 dark:to-white/5 flex items-center justify-center flex-shrink-0">
                        <Building2
                          size={14}
                          className="text-slate-500 dark:text-white/50"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-900 dark:text-white truncate">
                          {org.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-white/40 font-mono">
                          {org.slug}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Owner */}
                  <td className="px-4 py-3.5">
                    <div className="min-w-0">
                      {ownerName && (
                        <p className="text-[13px] text-slate-700 dark:text-white/80 truncate">
                          {ownerName}
                        </p>
                      )}
                      <p className="text-[12px] text-slate-500 dark:text-white/50 truncate">
                        {ownerEmail}
                      </p>
                    </div>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <select
                        value={org.plan}
                        onChange={(e) =>
                          updateOrgPlan(
                            org.id,
                            e.target.value as OrganizationPlan,
                          )
                        }
                        disabled={loadingId === org.id}
                        className={`px-2 py-1 border rounded-md text-[12px] font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 ${planStyle.bg} ${planStyle.text}`}
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
                        />
                      )}
                    </div>
                  </td>

                  {/* Members */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Users
                        size={13}
                        className="text-slate-400 dark:text-white/40"
                      />
                      <span className="text-[13px] text-slate-700 dark:text-white/80">
                        {org._count.members}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-white/30">
                        / {org.maxUsers}
                      </span>
                    </div>
                  </td>

                  {/* Spacecraft */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Rocket
                        size={13}
                        className="text-slate-400 dark:text-white/40"
                      />
                      <span className="text-[13px] text-slate-700 dark:text-white/80">
                        {org._count.spacecraft}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-white/30">
                        / {org.maxSpacecraft}
                      </span>
                    </div>
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3.5">
                    <p className="text-[12px] text-slate-500 dark:text-white/50">
                      {new Date(org.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
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
