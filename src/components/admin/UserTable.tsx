"use client";

import { useState } from "react";
import { User, UserX, Check } from "lucide-react";

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

const ROLE_STYLES: Record<string, string> = {
  admin:
    "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  auditor:
    "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
  user: "bg-slate-50 dark:bg-white/[0.06] text-slate-600 dark:text-white/60 border-slate-200 dark:border-white/10",
};

const PLAN_STYLES: Record<string, string> = {
  ENTERPRISE:
    "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  PROFESSIONAL:
    "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20",
  STARTER:
    "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
  FREE: "bg-slate-50 dark:bg-white/[0.06] text-slate-600 dark:text-white/50 border-slate-200 dark:border-white/10",
};

export default function UserTable({ users, onRefresh }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  async function updateUserRole(userId: string, role: string) {
    setLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role");
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
        headers: { "Content-Type": "application/json" },
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

  async function toggleUserActive(userId: string, currentActive: boolean) {
    setLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (res.ok) {
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    } finally {
      setLoadingId(null);
    }
  }

  if (users.length === 0) {
    return (
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-12 text-center">
        <p className="text-[14px] text-slate-500 dark:text-white/50">
          No users found matching your filters.
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
                User
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-white/50">
                Organization
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-white/50">
                Plan
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-white/50">
                Role
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-white/50">
                Status
              </th>
              <th className="text-right px-4 py-3 text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-white/50">
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

              return (
                <tr
                  key={user.id}
                  className="border-b border-slate-100 dark:border-white/[0.05] last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* User */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-white/10 dark:to-white/5 flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-medium text-slate-600 dark:text-white/60">
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
                        <p className="text-[13px] font-medium text-slate-900 dark:text-white truncate">
                          {user.name || "Unnamed User"}
                        </p>
                        <p className="text-[12px] text-slate-500 dark:text-white/50 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Organization */}
                  <td className="px-4 py-3.5">
                    <p className="text-[13px] text-slate-700 dark:text-white/80 truncate">
                      {orgName}
                    </p>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3.5">
                    {orgId && orgPlan ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={orgPlan}
                          onChange={(e) => updateOrgPlan(orgId, e.target.value)}
                          disabled={loadingId === orgId}
                          className={`px-2 py-1 border rounded-md text-[12px] font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 ${PLAN_STYLES[orgPlan] || PLAN_STYLES.FREE}`}
                        >
                          <option value="FREE">Free</option>
                          <option value="STARTER">Starter</option>
                          <option value="PROFESSIONAL">Professional</option>
                          <option value="ENTERPRISE">Enterprise</option>
                        </select>
                        {successId === orgId && (
                          <Check size={14} className="text-emerald-500" />
                        )}
                      </div>
                    ) : (
                      <span className="text-[12px] text-slate-400 dark:text-white/30">
                        —
                      </span>
                    )}
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3.5">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      disabled={loadingId === user.id}
                      className={`px-2 py-1 border rounded-md text-[12px] font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 ${ROLE_STYLES[user.role] || ROLE_STYLES.user}`}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="auditor">Auditor</option>
                    </select>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full text-[11px] font-medium">
                        <User size={11} />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 rounded-full text-[11px] font-medium">
                        <UserX size={11} />
                        Inactive
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => toggleUserActive(user.id, user.isActive)}
                      disabled={loadingId === user.id}
                      className={`text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 ${
                        user.isActive
                          ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                          : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                      }`}
                    >
                      {loadingId === user.id
                        ? "..."
                        : user.isActive
                          ? "Deactivate"
                          : "Activate"}
                    </button>
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
