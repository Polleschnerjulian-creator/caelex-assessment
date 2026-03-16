"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Package,
  Plus,
  RefreshCw,
  ArrowRight,
  Mail,
  MailOpen,
  Send,
  MessageSquare,
  Clock,
  Timer,
} from "lucide-react";
import PortalStats from "@/components/nca-portal/PortalStats";
import SubmissionPipeline from "@/components/nca-portal/SubmissionPipeline";

interface DashboardData {
  activeSubmissions: number;
  pendingFollowUps: number;
  upcomingDeadlines: number;
  avgResponseDays: number;
  recentCorrespondence: Array<{
    id: string;
    submissionId: string;
    ncaAuthority: string;
    subject: string;
    direction: string;
    createdAt: string;
    isRead: boolean;
  }>;
  submissionsByStatus: Record<string, number>;
}

interface PipelineData {
  pipeline: Record<
    string,
    Array<{
      id: string;
      ncaAuthority: string;
      ncaAuthorityName: string;
      status: string;
      priority: string;
      daysInStatus: number;
      correspondenceCount: number;
      reportTitle: string | null;
      slaDeadline: string | null;
    }>
  >;
}

// ─── Glass Styles (matching Documents page) ───

const glassPanel: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.55)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: "1px solid rgba(255, 255, 255, 0.45)",
  borderRadius: 20,
  boxShadow:
    "0 8px 40px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
  overflow: "hidden",
};

const innerGlass: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.45)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  borderRadius: 14,
  boxShadow:
    "0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
};

// ─── Sidebar stat row ───

function StatRow({
  icon,
  label,
  value,
  suffix,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between px-1 py-1.5">
      <div className="flex items-center gap-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <span className={`text-sm font-semibold ${color}`}>
        {value}
        {suffix ?? ""}
      </span>
    </div>
  );
}

// ─── Navigation items ───

const navItems = [
  {
    href: "/dashboard/nca-portal/packages/new",
    label: "Assemble Package",
    icon: <Package size={16} />,
  },
  {
    href: "/dashboard/modules/supervision",
    label: "New Submission",
    icon: <Plus size={16} />,
  },
];

export default function NCAPortalClient() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dashRes, pipeRes] = await Promise.all([
        fetch("/api/nca-portal/dashboard"),
        fetch("/api/nca-portal/pipeline"),
      ]);

      if (dashRes.ok) setDashboard(await dashRes.json());
      if (pipeRes.ok) setPipeline(await pipeRes.json());
    } catch (error) {
      console.error("Failed to load portal data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Loading State ───

  if (isLoading && !dashboard && !pipeline) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading NCA Portal...</p>
        </div>
      </div>
    );
  }

  // ─── Render ───

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322] p-3 gap-3">
      {/* ─── Left Panel — Navigation + Stats ─── */}
      <div className="w-[260px] shrink-0 flex flex-col" style={glassPanel}>
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Building2 size={18} className="text-emerald-500" />
            NCA Portal
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Regulatory submissions
          </p>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-white"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-5 my-3 border-t border-black/[0.06] dark:border-white/10" />

        {/* Stats Summary */}
        <div className="px-4 space-y-2 flex-1">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium px-1 mb-1.5">
            Quick Stats
          </p>
          <StatRow
            icon={<Send size={14} />}
            label="Active Submissions"
            value={dashboard?.activeSubmissions ?? 0}
            color="text-emerald-600 dark:text-emerald-400"
          />
          <StatRow
            icon={<MessageSquare size={14} />}
            label="Pending Follow-ups"
            value={dashboard?.pendingFollowUps ?? 0}
            color={
              (dashboard?.pendingFollowUps ?? 0) > 0
                ? "text-amber-500"
                : "text-slate-400"
            }
          />
          <StatRow
            icon={<Clock size={14} />}
            label="Deadlines"
            value={dashboard?.upcomingDeadlines ?? 0}
            color={
              (dashboard?.upcomingDeadlines ?? 0) > 0
                ? "text-red-500"
                : "text-slate-400"
            }
          />
          <StatRow
            icon={<Timer size={14} />}
            label="Avg Response"
            value={dashboard?.avgResponseDays ?? 0}
            suffix=" days"
            color="text-slate-700 dark:text-slate-200"
          />
        </div>

        {/* Refresh Button */}
        <div className="px-4 pb-4 pt-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            aria-label="Refresh portal data"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-emerald-600 hover:bg-slate-700 dark:hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* ─── Right Panel — Content ─── */}
      <div className="flex-1 flex flex-col min-w-0" style={glassPanel}>
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Pipeline Section */}
          <div style={innerGlass} className="p-4">
            {isLoading ? (
              <div className="h-64 animate-pulse rounded-xl bg-white/30" />
            ) : pipeline ? (
              <SubmissionPipeline pipeline={pipeline.pipeline} />
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
                No pipeline data available.
              </p>
            )}
          </div>

          {/* Portal Stats (inline cards) */}
          {dashboard && (
            <div style={innerGlass} className="p-4">
              <PortalStats
                activeSubmissions={dashboard.activeSubmissions}
                pendingFollowUps={dashboard.pendingFollowUps}
                upcomingDeadlines={dashboard.upcomingDeadlines}
                avgResponseDays={dashboard.avgResponseDays}
              />
            </div>
          )}

          {/* Recent Correspondence */}
          <div style={innerGlass} className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-800 dark:text-white">
                Recent Correspondence
              </h3>
              {dashboard?.recentCorrespondence &&
                dashboard.recentCorrespondence.length > 0 && (
                  <span className="text-xs text-slate-400">
                    {
                      dashboard.recentCorrespondence.filter((c) => !c.isRead)
                        .length
                    }{" "}
                    unread
                  </span>
                )}
            </div>

            {!dashboard?.recentCorrespondence ||
            dashboard.recentCorrespondence.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                No correspondence yet. Submit to an NCA to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {dashboard.recentCorrespondence.slice(0, 5).map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/dashboard/nca-portal/submissions/${entry.submissionId}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/40 dark:hover:bg-white/5 transition-colors group"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        entry.direction === "INBOUND"
                          ? "bg-emerald-500/10"
                          : "bg-white/40 dark:bg-white/5"
                      }`}
                    >
                      {entry.isRead ? (
                        <MailOpen size={14} className="text-slate-400" />
                      ) : (
                        <Mail
                          size={14}
                          className={
                            entry.direction === "INBOUND"
                              ? "text-emerald-500"
                              : "text-slate-400"
                          }
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 dark:text-white truncate">
                        {entry.subject}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {entry.ncaAuthority} &middot;{" "}
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {!entry.isRead && (
                      <>
                        <div
                          className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span className="sr-only">Unread</span>
                      </>
                    )}
                    <ArrowRight
                      size={14}
                      className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
