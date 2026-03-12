"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Pencil,
  Plus,
  Loader2,
  AlertTriangle,
  Trash2,
  UserPlus,
} from "lucide-react";
import { glassItemVariants } from "@/components/ui/GlassMotion";
import GlassCard from "@/components/ui/GlassCard";
import ProjectForm from "@/components/hub/ProjectForm";
import { csrfHeaders } from "@/lib/csrf-client";

// ——— Types ———

interface ProjectMember {
  role: string;
  user: { id: string; name: string | null; image: string | null };
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  status: string;
  members: ProjectMember[];
  _count: { tasks: number };
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: { id: string; name: string | null; image: string | null } | null;
}

// ——— Constants ———

type TabId = "Tasks" | "Members" | "Settings";
const TABS: TabId[] = ["Tasks", "Members", "Settings"];

const tabContentVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as number[] },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -20 : 20,
    opacity: 0,
    transition: { duration: 0.15 },
  }),
};

// ——— Helper components ———

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    TODO: "bg-slate-500/20 text-slate-400",
    IN_PROGRESS: "bg-blue-500/20 text-blue-400",
    IN_REVIEW: "bg-amber-500/20 text-amber-400",
    DONE: "bg-green-500/20 text-green-400",
    ACTIVE: "bg-blue-500/20 text-blue-400",
    ARCHIVED: "bg-slate-500/20 text-slate-400",
    ON_HOLD: "bg-amber-500/20 text-amber-400",
    COMPLETED: "bg-green-500/20 text-green-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption uppercase tracking-wide font-medium ${map[status] ?? "bg-slate-500/20 text-slate-400"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    LOW: "text-slate-400",
    MEDIUM: "text-blue-400",
    HIGH: "text-amber-400",
    URGENT: "text-red-400",
  };
  return (
    <span
      className={`text-caption font-medium ${map[priority] ?? "text-slate-400"}`}
    >
      {priority}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    ADMIN: "bg-blue-500/20 text-blue-400",
    MEMBER: "bg-slate-500/20 text-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption uppercase tracking-wide font-medium ${map[role] ?? "bg-slate-500/20 text-slate-400"}`}
    >
      {role}
    </span>
  );
}

// ——— Main page ———

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>("Tasks");
  const [tabDirection, setTabDirection] = useState(1);
  const prevTabRef = useRef<TabId>("Tasks");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [memberInput, setMemberInput] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // ——— Fetch project ———

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setLoadingProject(true);
    setProjectError(null);
    try {
      const res = await fetch(`/api/v1/hub/projects/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setProjectError(
          (data as { error?: string }).error ?? "Failed to load project",
        );
        return;
      }
      setProject((data as { project: Project }).project);
    } catch {
      setProjectError("Network error — please try again");
    } finally {
      setLoadingProject(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchProject();
  }, [fetchProject]);

  // ——— Fetch tasks ———

  const fetchTasks = useCallback(async () => {
    if (!id || tasksLoaded) return;
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/v1/hub/tasks?projectId=${id}`);
      const data = await res.json();
      if (res.ok) {
        setTasks((data as { tasks: Task[] }).tasks ?? []);
        setTasksLoaded(true);
      }
    } catch {
      // silently fail; user can retry via tab switch
    } finally {
      setLoadingTasks(false);
    }
  }, [id, tasksLoaded]);

  // Fetch tasks on initial load (Tasks is default tab)
  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  // ——— Tab switching ———

  function switchTab(tab: TabId) {
    const prevIdx = TABS.indexOf(prevTabRef.current);
    const newIdx = TABS.indexOf(tab);
    setTabDirection(newIdx >= prevIdx ? 1 : -1);
    prevTabRef.current = tab;
    setActiveTab(tab);

    if (tab === "Tasks") void fetchTasks();
  }

  // ——— Delete project ———

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/v1/hub/projects/${id}`, {
        method: "DELETE",
        headers: { ...csrfHeaders() },
      });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(
          (data as { error?: string }).error ?? "Failed to delete",
        );
        return;
      }
      router.push("/dashboard/hub/projects");
    } catch {
      setDeleteError("Network error — please try again");
    } finally {
      setDeleting(false);
    }
  }

  // ——— Add member ———

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!memberInput.trim()) return;
    setAddingMember(true);
    setMemberError(null);
    try {
      const res = await fetch(`/api/v1/hub/projects/${id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ userId: memberInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMemberError(
          (data as { error?: string }).error ?? "Failed to add member",
        );
        return;
      }
      setMemberInput("");
      void fetchProject();
    } catch {
      setMemberError("Network error — please try again");
    } finally {
      setAddingMember(false);
    }
  }

  // ——— Loading / error states ———

  if (loadingProject) {
    return (
      <div className="p-6 space-y-4 max-w-[1200px]">
        <div className="h-6 w-48 glass-surface rounded animate-pulse" />
        <div className="h-12 w-full glass-surface rounded-xl animate-pulse" />
        <div className="h-10 w-full glass-surface rounded-xl animate-pulse" />
        <div className="h-64 w-full glass-surface rounded-xl animate-pulse" />
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-body text-red-400">{projectError}</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard/hub/projects")}
            className="flex items-center gap-1.5 px-4 py-2 text-body text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors border border-[var(--glass-border)]"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <button
            onClick={fetchProject}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-body rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const accentColor = project.color ?? "#3B82F6";

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Breadcrumb */}
      <motion.div
        variants={glassItemVariants}
        initial="hidden"
        animate="visible"
      >
        <button
          onClick={() => router.push("/dashboard/hub/projects")}
          className="flex items-center gap-1.5 text-small text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ChevronLeft size={14} /> Projects
        </button>

        {/* Project header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className="mt-1 flex-shrink-0 w-3 h-3 rounded-full"
              style={{ backgroundColor: accentColor }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h1 className="text-display-sm font-bold text-white leading-tight">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-body text-slate-400 mt-1 max-w-2xl">
                  {project.description}
                </p>
              )}
              <div className="mt-2">
                <StatusBadge status={project.status} />
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditFormOpen(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-small text-slate-400 hover:text-white rounded-lg hover:bg-white/5 border border-[var(--glass-border)] transition-colors"
          >
            <Pencil size={13} /> Edit
          </button>
        </div>
      </motion.div>

      {/* Tab bar */}
      <motion.div
        variants={glassItemVariants}
        initial="hidden"
        animate="visible"
      >
        <GlassCard hover={false} className="p-1">
          <div className="relative flex">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`relative flex-1 px-3 py-2 text-small font-medium rounded-md transition-colors z-10 ${
                  activeTab === tab
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="hub-project-tab-indicator"
                    className="absolute inset-0 bg-white/[0.08] rounded-md border border-white/10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait" custom={tabDirection}>
        <motion.div
          key={activeTab}
          custom={tabDirection}
          variants={tabContentVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {/* ——— Tasks tab ——— */}
          {activeTab === "Tasks" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-title font-semibold text-white">Tasks</h2>
                <button
                  onClick={async () => {
                    const title = prompt("Task title:");
                    if (!title?.trim()) return;
                    try {
                      const res = await fetch("/api/v1/hub/tasks", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...csrfHeaders(),
                        },
                        body: JSON.stringify({
                          projectId: id,
                          title: title.trim(),
                        }),
                      });
                      if (res.ok) {
                        setTasksLoaded(false);
                        void fetchTasks();
                      }
                    } catch {
                      // no-op
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-small bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <Plus size={13} /> New Task
                </button>
              </div>

              <div className="glass-elevated rounded-xl border border-[var(--glass-border)]">
                {loadingTasks ? (
                  <div className="p-4 space-y-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-12 bg-white/[0.03] rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-body text-slate-400">No tasks yet.</p>
                    <p className="text-small text-slate-500 mt-1">
                      Create the first task for this project.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--glass-border)]">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-body text-slate-200 truncate">
                            {task.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <PriorityBadge priority={task.priority} />
                          <StatusBadge status={task.status} />
                          {task.assignee && (
                            <div
                              className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center overflow-hidden flex-shrink-0"
                              title={task.assignee.name ?? undefined}
                            >
                              {task.assignee.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={task.assignee.image}
                                  alt={task.assignee.name ?? "Assignee"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[9px] font-medium">
                                  {task.assignee.name
                                    ? task.assignee.name.charAt(0).toUpperCase()
                                    : "?"}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ——— Members tab ——— */}
          {activeTab === "Members" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-title font-semibold text-white">Members</h2>
              </div>

              {/* Add member form */}
              <form
                onSubmit={handleAddMember}
                className="flex items-center gap-3"
              >
                <input
                  type="text"
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  placeholder="User ID to add…"
                  className="flex-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-body text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={addingMember || !memberInput.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 text-small bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {addingMember ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <UserPlus size={13} />
                  )}
                  Add Member
                </button>
              </form>
              {memberError && (
                <p className="text-small text-red-400">{memberError}</p>
              )}

              <div className="glass-elevated rounded-xl border border-[var(--glass-border)]">
                {project.members.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-body text-slate-400">No members yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--glass-border)]">
                    {project.members.map(({ user, role }) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {user.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.image}
                              alt={user.name ?? "Member"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-small font-medium">
                              {user.name
                                ? user.name.charAt(0).toUpperCase()
                                : "?"}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body text-slate-200 truncate">
                            {user.name ?? "Unknown user"}
                          </p>
                          <p className="text-caption text-slate-500 truncate">
                            {user.id}
                          </p>
                        </div>
                        <RoleBadge role={role} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ——— Settings tab ——— */}
          {activeTab === "Settings" && (
            <div className="space-y-6">
              <h2 className="text-title font-semibold text-white">Settings</h2>

              {/* Edit project */}
              <div className="glass-elevated rounded-xl border border-[var(--glass-border)] p-5 space-y-4">
                <h3 className="text-body-lg font-semibold text-white">
                  Project Details
                </h3>
                <p className="text-small text-slate-400">
                  Update the project name, description, and accent color.
                </p>
                <button
                  onClick={() => setEditFormOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-body text-slate-200 bg-white/5 hover:bg-white/10 border border-[var(--glass-border)] rounded-lg transition-colors"
                >
                  <Pencil size={14} /> Edit Project
                </button>
              </div>

              {/* Danger zone */}
              <div className="glass-elevated rounded-xl border border-red-500/20 p-5 space-y-4">
                <h3 className="text-body-lg font-semibold text-red-400">
                  Danger Zone
                </h3>
                <p className="text-small text-slate-400">
                  Permanently delete this project and all its tasks. This action
                  cannot be undone.
                </p>

                {deleteError && (
                  <p className="text-small text-red-400">{deleteError}</p>
                )}

                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-body text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} /> Delete Project
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-small text-red-300">Are you sure?</p>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex items-center gap-1.5 px-4 py-2 text-body text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      disabled={deleting}
                      className="px-4 py-2 text-body text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Edit project modal */}
      <ProjectForm
        open={editFormOpen}
        onClose={() => setEditFormOpen(false)}
        onCreated={() => {
          void fetchProject();
          setEditFormOpen(false);
        }}
        initialData={{
          id: project.id,
          name: project.name,
          description: project.description,
          color: project.color,
        }}
      />
    </div>
  );
}
