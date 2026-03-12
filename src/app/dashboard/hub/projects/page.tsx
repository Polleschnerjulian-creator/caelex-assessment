"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, FolderOpen } from "lucide-react";
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#1d1d1f]">Projects</h1>
          <p className="text-[14px] text-[#86868b] mt-1">
            HUB — manage your team projects and tasks
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1d1d1f] hover:bg-[#000000] text-white text-[14px] font-medium rounded-full transition-colors flex-shrink-0"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b] pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects…"
          className="w-full bg-white border border-[#e5e5ea] rounded-xl pl-8 pr-3 py-2 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b]/50 focus:outline-none focus:border-[#1d1d1f]/30 focus:ring-1 focus:ring-[#1d1d1f]/10 transition-colors"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 flex items-center justify-between">
          <p className="text-[13px] text-red-600">{error}</p>
          <button
            onClick={fetchProjects}
            className="text-[13px] text-red-600 hover:text-red-700 font-medium transition-colors"
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
              className="bg-[#f5f5f7] rounded-2xl h-44 animate-pulse border border-[#e5e5ea]"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-[#1d1d1f]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
            {search ? "No projects match your search" : "No projects yet"}
          </h3>
          <p className="text-[14px] text-[#86868b] mb-6 max-w-xs">
            {search
              ? "Try a different search term."
              : "Create your first project to start organising tasks for your team."}
          </p>
          {!search && (
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1d1d1f] hover:bg-[#000000] text-white text-[14px] font-medium rounded-full transition-colors"
            >
              <Plus size={16} />
              Create Project
            </button>
          )}
        </div>
      )}

      {/* Project grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              description={project.description}
              color={project.color}
              status={project.status}
              taskCount={project._count.tasks}
              taskStatusCounts={project.taskStatusCounts}
              members={project.members}
            />
          ))}
        </div>
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
