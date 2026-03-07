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
          <h1 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Building2
              size={22}
              className="text-[var(--accent-primary)]"
              aria-hidden="true"
            />
            NCA Submission Portal
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage regulatory submissions to National Competent Authorities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            aria-label="Refresh portal data"
            className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]:text-white rounded-lg hover:bg-[var(--surface-sunken)] transition-colors"
          >
            <RefreshCw
              size={16}
              className={isLoading ? "animate-spin" : ""}
              aria-hidden="true"
            />
          </button>
          <Link
            href="/dashboard/nca-portal/packages/new"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors"
          >
            <Package size={14} />
            Assemble Package
          </Link>
          <Link
            href="/dashboard/modules/supervision"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--surface-raised)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]:bg-dark-border rounded-lg transition-colors"
          >
            <Plus size={14} />
            New Submission
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      {isLoading ? (
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          role="status"
          aria-live="polite"
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4 h-20 animate-pulse"
            />
          ))}
          <span className="sr-only">Loading portal statistics...</span>
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
        <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4 h-64 animate-pulse" />
      ) : pipeline ? (
        <SubmissionPipeline pipeline={pipeline.pipeline} />
      ) : null}

      {/* Recent Activity */}
      <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            Recent Correspondence
          </h3>
          {dashboard?.recentCorrespondence &&
            dashboard.recentCorrespondence.length > 0 && (
              <span className="text-xs text-[var(--text-tertiary)]">
                {dashboard.recentCorrespondence.filter((c) => !c.isRead).length}{" "}
                unread
              </span>
            )}
        </div>

        {!dashboard?.recentCorrespondence ||
        dashboard.recentCorrespondence.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] py-4 text-center">
            No correspondence yet. Submit to an NCA to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {dashboard.recentCorrespondence.slice(0, 5).map((entry) => (
              <Link
                key={entry.id}
                href={`/dashboard/nca-portal/submissions/${entry.submissionId}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-sunken)]:bg-[var(--surface-sunken)] transition-colors group"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    entry.direction === "INBOUND"
                      ? "bg-[var(--accent-primary-soft)]"
                      : "bg-[var(--surface-sunken)]"
                  }`}
                >
                  {entry.isRead ? (
                    <MailOpen
                      size={14}
                      className="text-[var(--text-tertiary)]"
                    />
                  ) : (
                    <Mail
                      size={14}
                      className={
                        entry.direction === "INBOUND"
                          ? "text-[var(--accent-primary)]"
                          : "text-[var(--text-tertiary)]"
                      }
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">
                    {entry.subject}
                  </p>
                  <p className="text-micro text-[var(--text-tertiary)]">
                    {entry.ncaAuthority} &middot;{" "}
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {!entry.isRead && (
                  <>
                    <div
                      className="w-2 h-2 rounded-full bg-[var(--accent-primary)] flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="sr-only">Unread</span>
                  </>
                )}
                <ArrowRight
                  size={14}
                  className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
