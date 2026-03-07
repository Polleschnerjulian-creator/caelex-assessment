"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Building2,
  Crown,
  AlertCircle,
  ArrowRight,
  Zap,
  UserCheck,
  Activity,
} from "lucide-react";
import QuickUpgradeModal from "@/components/admin/QuickUpgradeModal";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalOrgs: number;
  enterpriseOrgs: number;
}

export default function AdminDashboard() {
  const [showQuickUpgrade, setShowQuickUpgrade] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalOrgs: 0,
    enterpriseOrgs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const [usersRes, orgsRes, activeUsersRes, enterpriseOrgsRes] =
        await Promise.all([
          fetch("/api/admin/users?limit=1"),
          fetch("/api/admin/organizations?limit=1"),
          fetch("/api/admin/users?limit=1&isActive=true"),
          fetch("/api/admin/organizations?limit=1&plan=ENTERPRISE"),
        ]);

      const [usersData, orgsData, activeData, enterpriseData] =
        await Promise.all([
          usersRes.ok ? usersRes.json() : { total: 0 },
          orgsRes.ok ? orgsRes.json() : { total: 0 },
          activeUsersRes.ok ? activeUsersRes.json() : { total: 0 },
          enterpriseOrgsRes.ok ? enterpriseOrgsRes.json() : { total: 0 },
        ]);

      setStats({
        totalUsers: usersData.total,
        activeUsers: activeData.total,
        totalOrgs: orgsData.total,
        enterpriseOrgs: enterpriseData.total,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm font-semibold text-[var(--text-primary)]">
            Administration
          </h1>
          <p className="text-body text-[var(--text-secondary)] mt-1">
            Manage users, organizations, and platform settings
          </p>
        </div>

        <button
          onClick={() => setShowQuickUpgrade(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-body font-medium rounded-lg transition-colors shadow-sm"
        >
          <Zap size={16} />
          Quick Upgrade
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={20} />}
          label="Total Users"
          value={stats.totalUsers}
          bgColor="bg-[var(--accent-primary-soft)]"
          iconColor="text-[var(--accent-success)]"
          loading={loading}
        />
        <StatCard
          icon={<UserCheck size={20} />}
          label="Active Users"
          value={stats.activeUsers}
          bgColor="bg-[var(--accent-primary-soft)]"
          iconColor="text-[var(--accent-success)]"
          loading={loading}
        />
        <StatCard
          icon={<Building2 size={20} />}
          label="Organizations"
          value={stats.totalOrgs}
          bgColor="bg-purple-500/10"
          iconColor="text-[var(--accent-info)]"
          loading={loading}
        />
        <StatCard
          icon={<Crown size={20} />}
          label="Enterprise"
          value={stats.enterpriseOrgs}
          bgColor="bg-[var(--accent-warning-soft)]"
          iconColor="text-[var(--accent-warning)]"
          loading={loading}
        />
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionCard
          title="User Management"
          description="View, search, and manage all user accounts. Change roles, activate or deactivate users."
          href="/dashboard/admin/users"
          icon={<Users size={22} />}
          stat={`${stats.totalUsers} users`}
        />
        <ActionCard
          title="Organization Management"
          description="Manage organizations, subscription plans, and resource limits."
          href="/dashboard/admin/organizations"
          icon={<Building2 size={22} />}
          stat={`${stats.totalOrgs} organizations`}
        />
      </div>

      {/* Info Banner */}
      <div className="bg-[var(--accent-warning-soft)] border border-[var(--accent-warning)] rounded-xl p-4 flex items-start gap-3">
        <AlertCircle
          size={18}
          className="text-[var(--accent-warning)] flex-shrink-0 mt-0.5"
        />
        <div>
          <p className="text-body font-medium text-[var(--text-primary)]">
            Admin Audit Trail
          </p>
          <p className="text-body text-[var(--text-secondary)] mt-0.5">
            All administrative actions are logged to the audit trail with
            timestamps, previous values, and reason fields.
          </p>
        </div>
      </div>

      {/* Quick Upgrade Modal */}
      {showQuickUpgrade && (
        <QuickUpgradeModal
          onClose={() => setShowQuickUpgrade(false)}
          onSuccess={() => {
            setShowQuickUpgrade(false);
            fetchStats();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bgColor,
  iconColor,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bgColor: string;
  iconColor: string;
  loading: boolean;
}) {
  return (
    <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-5">
      <div className="flex items-center gap-4">
        <div
          className={`w-11 h-11 ${bgColor} rounded-lg flex items-center justify-center ${iconColor}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-caption uppercase tracking-[0.15em] text-[var(--text-secondary)]">
            {label}
          </p>
          {loading ? (
            <div className="w-12 h-7 bg-[var(--surface-sunken)] rounded animate-pulse mt-1" />
          ) : (
            <p className="text-heading-lg font-semibold text-[var(--text-primary)]">
              {value.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
  icon,
  stat,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  stat: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6 hover:border-[var(--accent-primary)]/50 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 bg-[var(--accent-primary-soft)] rounded-lg flex items-center justify-center text-[var(--accent-success)] group-hover:bg-[var(--accent-success-soft)] transition-colors">
          {icon}
        </div>
        <ArrowRight
          size={18}
          className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-1 transition-all"
        />
      </div>
      <h3 className="text-subtitle font-semibold text-[var(--text-primary)] mb-1">
        {title}
      </h3>
      <p className="text-body text-[var(--text-secondary)] mb-3">
        {description}
      </p>
      <p className="text-small text-[var(--text-secondary)]">{stat}</p>
    </Link>
  );
}
