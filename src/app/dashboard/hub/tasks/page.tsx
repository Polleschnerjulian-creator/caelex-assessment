"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, LayoutGrid, List, ChevronUp, ChevronDown } from "lucide-react";
import { KanbanBoard } from "@/components/hub/KanbanBoard";
import { TaskForm } from "@/components/hub/TaskForm";
import { TaskDetailDrawer } from "@/components/hub/TaskDetailDrawer";
import { TaskFilters } from "@/components/hub/TaskFilters";
import { PriorityIcon } from "@/components/hub/PriorityIcon";
import { csrfHeaders } from "@/lib/csrf-client";

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  position: number;
  dueDate?: string | null;
  project: { id: string; name: string; color: string | null };
  assignee?: { id: string; name: string | null; image: string | null } | null;
  creator: { id: string; name: string | null; image: string | null };
  taskLabels: { label: { id: string; name: string; color: string } }[];
  _count: { comments: number };
}

interface Project {
  id: string;
  name: string;
  color: string | null;
  members?: {
    user: { id: string; name: string | null; image: string | null };
  }[];
}

type ViewType = "kanban" | "list";
type SortKey = "title" | "status" | "priority" | "dueDate" | "project";
type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<string, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  IN_REVIEW: 2,
  DONE: 3,
};

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

function getInitial(name: string | null): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(dueDateStr: string): boolean {
  const due = new Date(dueDateStr);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

export default function HubTasksPage() {
  const [view, setView] = useState<ViewType>("kanban");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<{
    projectId?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
  }>({});

  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("hub-tasks-view");
    if (stored === "kanban" || stored === "list") {
      setView(stored);
    }
  }, []);

  function handleViewChange(v: ViewType) {
    setView(v);
    localStorage.setItem("hub-tasks-view", v);
  }

  const members = Array.from(
    new Map(
      projects.flatMap((p) => p.members ?? []).map((m) => [m.user.id, m.user]),
    ).values(),
  );

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.projectId) params.set("projectId", filters.projectId);
      if (filters.status) params.set("status", filters.status);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);

      const url = `/api/v1/hub/tasks${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : (data.tasks ?? []));
    } catch {
      // silently fail
    }
  }, [filters]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/hub/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : (data.projects ?? []));
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchProjects()]);
      setLoading(false);
    }
    loadAll();
  }, [fetchTasks, fetchProjects]);

  async function handleReorder(
    updates: { id: string; status: string; position: number }[],
  ) {
    try {
      await fetch("/api/v1/hub/tasks/reorder", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ updates }),
      });
      await fetchTasks();
    } catch {
      // silently fail
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "status":
        cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
        break;
      case "priority":
        cmp =
          (PRIORITY_ORDER[a.priority] ?? 99) -
          (PRIORITY_ORDER[b.priority] ?? 99);
        break;
      case "dueDate":
        if (!a.dueDate && !b.dueDate) cmp = 0;
        else if (!a.dueDate) cmp = 1;
        else if (!b.dueDate) cmp = -1;
        else
          cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;
      case "project":
        cmp = a.project.name.localeCompare(b.project.name);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return (
        <ChevronUp size={12} strokeWidth={2} className="text-[#86868b]/40" />
      );
    return sortDir === "asc" ? (
      <ChevronUp size={12} strokeWidth={2} className="text-[#1d1d1f]" />
    ) : (
      <ChevronDown size={12} strokeWidth={2} className="text-[#1d1d1f]" />
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen p-6 gap-5">
      {/* Page header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-[24px] font-semibold text-[#1d1d1f]">Tasks</h1>
          <p className="text-[13px] text-[#86868b] mt-0.5">
            Manage and track your team&apos;s work
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-[#e5e5ea] overflow-hidden bg-[#f5f5f7]">
            <button
              type="button"
              onClick={() => handleViewChange("kanban")}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 text-[13px] transition-colors",
                view === "kanban"
                  ? "bg-white text-[#1d1d1f] shadow-sm"
                  : "text-[#86868b] hover:text-[#1d1d1f]",
              ].join(" ")}
            >
              <LayoutGrid size={13} strokeWidth={2} />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => handleViewChange("list")}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 text-[13px] transition-colors",
                view === "list"
                  ? "bg-white text-[#1d1d1f] shadow-sm"
                  : "text-[#86868b] hover:text-[#1d1d1f]",
              ].join(" ")}
            >
              <List size={13} strokeWidth={2} />
              List
            </button>
          </div>

          {/* New Task */}
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-[14px] font-medium bg-[#1d1d1f] hover:bg-[#000000] text-white transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            New Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-1">
        <TaskFilters
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          members={members}
          filters={filters}
          onChange={setFilters}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#e5e5ea] border-t-[#1d1d1f] rounded-full animate-spin" />
        </div>
      ) : view === "kanban" ? (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            tasks={tasks}
            onTaskClick={(id) => setSelectedTaskId(id)}
            onReorder={handleReorder}
          />
        </div>
      ) : (
        /* List view */
        <div className="bg-white rounded-2xl border border-[#e5e5ea] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e5e5ea]">
                {(
                  [
                    { key: "title", label: "Title" },
                    { key: "project", label: "Project" },
                    { key: "status", label: "Status" },
                    { key: "priority", label: "Priority" },
                    { key: "dueDate", label: "Due Date" },
                  ] as { key: SortKey; label: string }[]
                ).map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="text-left px-4 py-2.5 text-[12px] text-[#86868b] font-medium cursor-pointer hover:text-[#1d1d1f] transition-colors select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.key} />
                    </span>
                  </th>
                ))}
                <th className="text-left px-4 py-2.5 text-[12px] text-[#86868b] font-medium">
                  Assignee
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-[13px] text-[#86868b]"
                  >
                    No tasks found.
                  </td>
                </tr>
              ) : (
                sortedTasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="border-b border-[#f5f5f7] hover:bg-[#f5f5f7] cursor-pointer transition-colors"
                  >
                    {/* Title */}
                    <td className="px-4 py-2.5 max-w-[280px]">
                      <span className="text-[13px] text-[#1d1d1f] line-clamp-1 font-medium">
                        {task.title}
                      </span>
                    </td>

                    {/* Project */}
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: task.project.color ?? "#6B7280",
                          }}
                        />
                        <span className="text-[13px] text-[#86868b]">
                          {task.project.name}
                        </span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5">
                      <span className="text-[13px] text-[#86868b]">
                        {STATUS_LABELS[task.status] ?? task.status}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-2.5">
                      <PriorityIcon
                        priority={
                          task.priority as "URGENT" | "HIGH" | "MEDIUM" | "LOW"
                        }
                        size={12}
                        showLabel
                      />
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-2.5">
                      {task.dueDate ? (
                        <span
                          className={`text-[13px] ${
                            isOverdue(task.dueDate)
                              ? "text-red-500"
                              : "text-[#86868b]"
                          }`}
                        >
                          {formatDate(task.dueDate)}
                        </span>
                      ) : (
                        <span className="text-[13px] text-[#86868b]/30">—</span>
                      )}
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-2.5">
                      {task.assignee ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#f5f5f7] text-[#1d1d1f] text-[10px] font-semibold flex-shrink-0">
                            {getInitial(task.assignee.name)}
                          </span>
                          <span className="text-[13px] text-[#86868b]">
                            {task.assignee.name ?? "Unknown"}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[13px] text-[#86868b]/30">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Form modal */}
      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={() => {
          setFormOpen(false);
          fetchTasks();
        }}
        projects={projects}
        members={members}
      />

      {/* Task detail drawer */}
      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={fetchTasks}
        members={members}
      />
    </div>
  );
}
