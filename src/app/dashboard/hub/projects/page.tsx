"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, FolderOpen } from "lucide-react";
import { GlassMotion, GlassStagger } from "@/components/ui/GlassMotion";
import { motion } from "framer-motion";
import { glassItemVariants } from "@/components/ui/GlassMotion";
import ProjectCard from "@/components/hub/ProjectCard";
import ProjectForm from "@/components/hub/ProjectForm";
import { csrfHeaders } from "@/lib/csrf-client";

interface ProjectMember {
  user: { id: string; name: string | null; image: string | null };
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  status: string;
  taskStatusCounts: Record<string, number>;
  members: ProjectMember[];
  _count: { tasks: number };
}

export default function HubProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/hub/projects", {
        headers: { ...csrfHeaders() },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          (data as { error?: string }).error ?? "Failed to load projects",
        );
        return;
      }
      setProjects((data as { projects: Project[] }).projects ?? []);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <motion.div
        variants={glassItemVariants}
        initial="hidden"
        animate="visible"
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-display-sm font-bold text-white">Projects</h1>
          <p className="text-body text-slate-400 mt-1">
            HUB — manage your team projects and tasks
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-body font-medium rounded-lg transition-colors flex-shrink-0"
        >
          <Plus size={16} />
          New Project
        </button>
      </motion.div>

      {/* Search bar */}
      <GlassMotion>
        <div className="relative max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg pl-8 pr-3 py-2 text-body text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
      </GlassMotion>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-center justify-between">
          <p className="text-small text-red-400">{error}</p>
          <button
            onClick={fetchProjects}
            className="text-small text-red-400 hover:text-white transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="glass-surface rounded-xl h-44 animate-pulse border border-[var(--glass-border)]"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <GlassMotion>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
              <FolderOpen size={28} className="text-blue-400" />
            </div>
            <h3 className="text-title font-semibold text-white mb-2">
              {search ? "No projects match your search" : "No projects yet"}
            </h3>
            <p className="text-body text-slate-400 mb-6 max-w-xs">
              {search
                ? "Try a different search term."
                : "Create your first project to start organising tasks for your team."}
            </p>
            {!search && (
              <button
                onClick={() => setFormOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-body font-medium rounded-lg transition-colors"
              >
                <Plus size={16} />
                Create Project
              </button>
            )}
          </div>
        </GlassMotion>
      )}

      {/* Project grid */}
      {!loading && !error && filtered.length > 0 && (
        <GlassStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <GlassMotion key={project.id}>
              <ProjectCard
                id={project.id}
                name={project.name}
                description={project.description}
                color={project.color}
                status={project.status}
                taskCount={project._count.tasks}
                taskStatusCounts={project.taskStatusCounts}
                members={project.members}
              />
            </GlassMotion>
          ))}
        </GlassStagger>
      )}

      {/* New project modal */}
      <ProjectForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={fetchProjects}
      />
    </div>
  );
}
