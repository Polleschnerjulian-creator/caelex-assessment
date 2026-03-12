"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FolderKanban, Users } from "lucide-react";
import { motion } from "framer-motion";
import GlassMotion, { glassItemVariants } from "@/components/ui/GlassMotion";
import DashboardStats from "@/components/hub/DashboardStats";
import ActivityFeed from "@/components/hub/ActivityFeed";
import { csrfHeaders } from "@/lib/csrf-client";

interface DashboardStats {
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
  stats: DashboardStats;
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
          <div className="h-8 w-24 bg-white/[0.05] rounded animate-pulse" />
          <div className="h-4 w-40 bg-white/[0.03] rounded animate-pulse" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-surface rounded-[var(--radius-lg)] h-[96px] animate-pulse"
            />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 glass-elevated rounded-xl h-64 animate-pulse" />
          <div className="lg:col-span-2 glass-surface rounded-xl h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-small text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state — no data or no projects
  if (!data || (data.projects.length === 0 && data.recentTasks.length === 0)) {
    return (
      <div className="p-6 max-w-[1400px]">
        <GlassMotion className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
            <FolderKanban size={32} className="text-blue-400" />
          </div>
          <h2 className="text-display-sm font-bold text-white mb-2">
            Welcome to HUB
          </h2>
          <p className="text-body text-slate-400 mb-8 max-w-sm">
            Create your first project to get started
          </p>
          <Link
            href="/dashboard/hub/projects"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white text-subtitle font-medium rounded-lg transition-colors"
          >
            <FolderKanban size={16} />
            Create a Project
          </Link>
        </GlassMotion>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <motion.div
        variants={glassItemVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-display-sm font-bold text-white">HUB</h1>
        <p className="text-body text-slate-400 mt-1">Project Management</p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        variants={glassItemVariants}
        initial="hidden"
        animate="visible"
      >
        <DashboardStats stats={data.stats} />
      </motion.div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Activity Feed */}
        <motion.div
          variants={glassItemVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-3"
        >
          <ActivityFeed tasks={data.recentTasks} />
        </motion.div>

        {/* Right: Projects */}
        <motion.div
          variants={glassItemVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-2 space-y-4"
        >
          <h2 className="text-title font-semibold text-white">Projects</h2>

          {data.projects.length === 0 ? (
            <div className="glass-surface rounded-xl border border-[var(--glass-border)] p-6 text-center">
              <p className="text-small text-slate-500">No projects yet</p>
              <Link
                href="/dashboard/hub/projects"
                className="inline-flex items-center gap-1.5 mt-3 text-small text-blue-400 hover:text-blue-300 transition-colors"
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
                    className="flex items-center gap-3 px-4 py-3 glass-elevated glass-interactive rounded-xl border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all duration-200 group"
                  >
                    {/* Colored dot */}
                    <span
                      className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: accentColor }}
                      aria-hidden="true"
                    />

                    {/* Name */}
                    <span className="flex-1 min-w-0 text-small font-medium text-slate-200 group-hover:text-white truncate transition-colors">
                      {project.name}
                    </span>

                    {/* Task count */}
                    <span className="flex-shrink-0 flex items-center gap-1 text-caption text-slate-500">
                      <FolderKanban size={12} />
                      {project._count.tasks}
                    </span>

                    {/* Member count */}
                    <span className="flex-shrink-0 flex items-center gap-1 text-caption text-slate-500">
                      <Users size={12} />
                      {project.members.length}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
