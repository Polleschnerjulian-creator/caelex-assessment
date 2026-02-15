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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 size={22} className="text-blue-400" />
            NCA Submission Portal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage regulatory submissions to National Competent Authorities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
          <Link
            href="/dashboard/nca-portal/packages/new"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Package size={14} />
            Assemble Package
          </Link>
          <Link
            href="/dashboard/modules/supervision"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-navy-700 rounded-lg transition-colors"
          >
            <Plus size={14} />
            New Submission
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-4 h-20 animate-pulse"
            />
          ))}
        </div>
      ) : dashboard ? (
        <PortalStats
          activeSubmissions={dashboard.activeSubmissions}
          pendingFollowUps={dashboard.pendingFollowUps}
          upcomingDeadlines={dashboard.upcomingDeadlines}
          avgResponseDays={dashboard.avgResponseDays}
        />
      ) : null}

      {/* Pipeline */}
      {isLoading ? (
        <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-4 h-64 animate-pulse" />
      ) : pipeline ? (
        <SubmissionPipeline pipeline={pipeline.pipeline} />
      ) : null}

      {/* Recent Activity */}
      <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">
            Recent Correspondence
          </h3>
          {dashboard?.recentCorrespondence &&
            dashboard.recentCorrespondence.length > 0 && (
              <span className="text-xs text-slate-400">
                {dashboard.recentCorrespondence.filter((c) => !c.isRead).length}{" "}
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
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    entry.direction === "INBOUND"
                      ? "bg-blue-500/10"
                      : "bg-slate-100 dark:bg-white/[0.06]"
                  }`}
                >
                  {entry.isRead ? (
                    <MailOpen size={14} className="text-slate-400" />
                  ) : (
                    <Mail
                      size={14}
                      className={
                        entry.direction === "INBOUND"
                          ? "text-blue-400"
                          : "text-slate-400"
                      }
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-white truncate">
                    {entry.subject}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {entry.ncaAuthority} &middot;{" "}
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {!entry.isRead && (
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                )}
                <ArrowRight
                  size={14}
                  className="text-slate-300 dark:text-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
