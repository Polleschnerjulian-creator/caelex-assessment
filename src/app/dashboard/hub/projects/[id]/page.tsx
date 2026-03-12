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
import ProjectForm from "@/components/hub/ProjectForm";
import { TaskForm } from "@/components/hub/TaskForm";
import { TaskDetailDrawer } from "@/components/hub/TaskDetailDrawer";
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
    TODO: "bg-[#f5f5f7] text-[#86868b]",
    IN_PROGRESS: "bg-blue-50 text-blue-600",
    IN_REVIEW: "bg-amber-50 text-amber-600",
    DONE: "bg-green-50 text-green-600",
    ACTIVE: "bg-blue-50 text-blue-600",
    ARCHIVED: "bg-[#f5f5f7] text-[#86868b]",
    ON_HOLD: "bg-amber-50 text-amber-600",
    COMPLETED: "bg-green-50 text-green-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wide font-medium ${map[status] ?? "bg-[#f5f5f7] text-[#86868b]"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    LOW: "text-[#86868b]",
    MEDIUM: "text-blue-500",
    HIGH: "text-amber-500",
    URGENT: "text-red-500",
  };
  return (
    <span
      className={`text-[11px] font-medium ${map[priority] ?? "text-[#86868b]"}`}
    >
      {priority}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    ADMIN: "bg-blue-50 text-blue-600",
    MEMBER: "bg-[#f5f5f7] text-[#86868b]",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wide font-medium ${map[role] ?? "bg-[#f5f5f7] text-[#86868b]"}`}
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
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [memberInput, setMemberInput] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [orgMembers, setOrgMembers] = useState<
    { id: string; name: string | null; image: string | null }[]
  >([]);

  // ——— Fetch org members ———

  useEffect(() => {
    async function loadOrgMembers() {
      try {
        const res = await fetch("/api/v1/hub/members");
        if (!res.ok) return;
        const data = await res.json();
        setOrgMembers(data.members ?? []);
      } catch {
        // silent
      }
    }
    void loadOrgMembers();
  }, []);

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
    if (!id) return;
    setLoadingTasks(true);
    setTaskError(null);
    try {
      const res = await fetch(`/api/v1/hub/tasks?projectId=${id}`);
      const data = await res.json();
      if (res.ok) {
        setTasks((data as { tasks: Task[] }).tasks ?? []);
      } else {
        setTaskError("Failed to load tasks");
      }
    } catch {
      setTaskError("Network error — could not load tasks");
    } finally {
      setLoadingTasks(false);
    }
  }, [id]);

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
        <div className="h-6 w-48 bg-[#f5f5f7] rounded-lg animate-pulse" />
        <div className="h-12 w-full bg-[#f5f5f7] rounded-2xl animate-pulse" />
        <div className="h-10 w-full bg-[#f5f5f7] rounded-2xl animate-pulse" />
        <div className="h-64 w-full bg-[#f5f5f7] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle size={32} className="text-red-500" />
        <p className="text-[14px] text-red-600">{projectError}</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard/hub/projects")}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-medium text-[#1d1d1f] rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <button
            onClick={fetchProject}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1d1d1f] hover:bg-[#000000] text-white text-[14px] font-medium rounded-full transition-colors"
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
      <div>
        <button
          onClick={() => router.push("/dashboard/hub/projects")}
          className="flex items-center gap-1.5 text-[13px] text-[#86868b] hover:text-[#1d1d1f] transition-colors mb-4"
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
              <h1 className="text-[24px] font-bold text-[#1d1d1f] leading-tight">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-[14px] text-[#86868b] mt-1 max-w-2xl">
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
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-medium text-[#1d1d1f] rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors"
          >
            <Pencil size={13} /> Edit
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-[#f5f5f7] rounded-xl p-1">
        <div className="relative flex">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`relative flex-1 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors z-10 ${
                activeTab === tab
                  ? "text-[#1d1d1f]"
                  : "text-[#86868b] hover:text-[#1d1d1f]"
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="hub-project-tab-indicator"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </button>
          ))}
        </div>
      </div>

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
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                  Tasks
                </h2>
                <button
                  onClick={() => setTaskFormOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-[#1d1d1f] hover:bg-[#000000] text-white rounded-full transition-colors"
                >
                  <Plus size={13} /> New Task
                </button>
              </div>

              {taskError && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 mb-4 flex items-center justify-between">
                  <p className="text-[13px] text-red-600">{taskError}</p>
                  <button
                    onClick={() => void fetchTasks()}
                    className="text-[13px] text-red-600 hover:text-red-700 font-medium transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-[#e5e5ea] shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                {loadingTasks ? (
                  <div className="p-4 space-y-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-12 bg-[#f5f5f7] rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-[14px] text-[#86868b]">No tasks yet.</p>
                    <p className="text-[13px] text-[#86868b]/60 mt-1">
                      Create the first task for this project.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#e5e5ea]">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[#f5f5f7] transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] text-[#1d1d1f] truncate">
                            {task.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <PriorityBadge priority={task.priority} />
                          <StatusBadge status={task.status} />
                          {task.assignee && (
                            <div
                              className="w-6 h-6 rounded-full bg-[#f5f5f7] text-[#1d1d1f] flex items-center justify-center overflow-hidden flex-shrink-0"
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
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                  Members
                </h2>
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
                  className="flex-1 bg-white border border-[#e5e5ea] rounded-xl px-3 py-2 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b]/50 focus:outline-none focus:border-[#1d1d1f]/30 focus:ring-1 focus:ring-[#1d1d1f]/10 transition-colors"
                />
                <button
                  type="submit"
                  disabled={addingMember || !memberInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-[#1d1d1f] hover:bg-[#000000] text-white rounded-full transition-colors disabled:opacity-50"
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
                <p className="text-[13px] text-red-600">{memberError}</p>
              )}

              <div className="bg-white rounded-2xl border border-[#e5e5ea] shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                {project.members.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-[14px] text-[#86868b]">
                      No members yet.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#e5e5ea]">
                    {project.members.map(({ user, role }) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#f5f5f7] text-[#1d1d1f] flex items-center justify-center overflow-hidden flex-shrink-0">
                          {user.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.image}
                              alt={user.name ?? "Member"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[12px] font-medium">
                              {user.name
                                ? user.name.charAt(0).toUpperCase()
                                : "?"}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] text-[#1d1d1f] truncate">
                            {user.name ?? "Unknown user"}
                          </p>
                          <p className="text-[12px] text-[#86868b] truncate">
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
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                Settings
              </h2>

              {/* Edit project */}
              <div className="bg-white rounded-2xl border border-[#e5e5ea] p-5 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
                  Project Details
                </h3>
                <p className="text-[13px] text-[#86868b]">
                  Update the project name, description, and accent color.
                </p>
                <button
                  onClick={() => setEditFormOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-medium text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#e8e8ed] rounded-full transition-colors"
                >
                  <Pencil size={14} /> Edit Project
                </button>
              </div>

              {/* Danger zone */}
              <div className="bg-white rounded-2xl border border-red-100 p-5 space-y-4">
                <h3 className="text-[15px] font-semibold text-red-600">
                  Danger Zone
                </h3>
                <p className="text-[13px] text-[#86868b]">
                  Permanently delete this project and all its tasks. This action
                  cannot be undone.
                </p>

                {deleteError && (
                  <p className="text-[13px] text-red-600">{deleteError}</p>
                )}

                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
                  >
                    <Trash2 size={14} /> Delete Project
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-[13px] text-red-600">Are you sure?</p>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-full transition-colors disabled:opacity-50"
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
                      className="px-4 py-2.5 text-[14px] font-medium text-[#86868b] hover:text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors"
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

      {/* New task modal */}
      <TaskForm
        open={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        onCreated={() => {
          setTaskFormOpen(false);
          void fetchTasks();
        }}
        projectId={id}
        projects={[
          { id: project.id, name: project.name, color: project.color ?? null },
        ]}
        members={orgMembers}
      />

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

      {/* Task detail drawer */}
      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={() => void fetchTasks()}
        onDeleted={() => void fetchTasks()}
        members={orgMembers}
      />
    </div>
  );
}
