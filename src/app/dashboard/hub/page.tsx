"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FolderKanban, Users } from "lucide-react";
import DashboardStats from "@/components/hub/DashboardStats";
import ActivityFeed from "@/components/hub/ActivityFeed";
import { csrfHeaders } from "@/lib/csrf-client";

interface DashboardStatsData {
  totalProjects: number;
  activeProjects: number;
  openTasks: number;
  inProgress: number;
  completedThisWeek: number;
  totalTasks: number;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  updatedAt: string;
  project: { id: string; name: string; color: string | null };
  assignee?: { id: string; name: string | null; image: string | null } | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
  color: string | null;
  _count: { tasks: number };
  members: {
    user: { id: string; name: string | null; image: string | null };
  }[];
}

interface DashboardData {
  stats: DashboardStatsData;
  recentTasks: RecentTask[];
  projects: Project[];
}

export default function HubDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/v1/hub/dashboard", {
          headers: {
            ...csrfHeaders(),
          },
        });
        if (!res.ok) throw new Error("Failed to load dashboard");
        const json = await res.json();
        setData(json.data as DashboardData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    void fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-[1400px]">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-24 bg-[#f5f5f7] rounded-lg animate-pulse" />
          <div className="h-4 w-40 bg-[#f5f5f7] rounded-lg animate-pulse" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#f5f5f7] rounded-2xl h-[96px] animate-pulse"
            />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-[#f5f5f7] rounded-2xl h-64 animate-pulse" />
          <div className="lg:col-span-2 bg-[#f5f5f7] rounded-2xl h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-[13px] text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || (data.projects.length === 0 && data.recentTasks.length === 0)) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-6">
            <FolderKanban size={32} className="text-[#1d1d1f]" />
          </div>
          <h2 className="text-[24px] font-bold text-[#1d1d1f] mb-2">
            Welcome to HUB
          </h2>
          <p className="text-[14px] text-[#86868b] mb-8 max-w-sm">
            Create your first project to get started
          </p>
          <Link
            href="/dashboard/hub/projects"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1d1d1f] hover:bg-[#000000] text-white text-[15px] font-medium rounded-full transition-colors"
          >
            <FolderKanban size={16} />
            Create a Project
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-bold text-[#1d1d1f]">HUB</h1>
        <p className="text-[14px] text-[#86868b] mt-1">Project Management</p>
      </div>

      {/* Stats row */}
      <DashboardStats stats={data.stats} />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Activity Feed */}
        <div className="lg:col-span-3">
          <ActivityFeed tasks={data.recentTasks} />
        </div>

        {/* Right: Projects */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Projects</h2>

          {data.projects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e5e5ea] p-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <p className="text-[13px] text-[#86868b]">No projects yet</p>
              <Link
                href="/dashboard/hub/projects"
                className="inline-flex items-center gap-1.5 mt-3 text-[13px] text-[#1d1d1f] font-medium hover:underline transition-colors"
              >
                Create one
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data.projects.map((project) => {
                const accentColor = project.color ?? "#3B82F6";
                return (
                  <Link
                    key={project.id}
                    href={`/dashboard/hub/projects/${project.id}`}
                    className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-[#e5e5ea] hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200 group"
                  >
                    {/* Colored dot */}
                    <span
                      className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: accentColor }}
                      aria-hidden="true"
                    />

                    {/* Name */}
                    <span className="flex-1 min-w-0 text-[13px] font-medium text-[#1d1d1f] group-hover:text-[#000000] truncate transition-colors">
                      {project.name}
                    </span>

                    {/* Task count */}
                    <span className="flex-shrink-0 flex items-center gap-1 text-[12px] text-[#86868b]">
                      <FolderKanban size={12} />
                      {project._count.tasks}
                    </span>

                    {/* Member count */}
                    <span className="flex-shrink-0 flex items-center gap-1 text-[12px] text-[#86868b]">
                      <Users size={12} />
                      {project.members.length}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
