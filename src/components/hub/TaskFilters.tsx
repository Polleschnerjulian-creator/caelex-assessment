"use client";

import { X } from "lucide-react";

interface TaskFiltersProps {
  projects: { id: string; name: string }[];
  members: { id: string; name: string | null }[];
  filters: {
    projectId?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
  };
  onChange: (filters: TaskFiltersProps["filters"]) => void;
}

const STATUSES = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "IN_REVIEW", label: "In Review" },
  { id: "DONE", label: "Done" },
];

const PRIORITIES = [
  { id: "URGENT", label: "Urgent" },
  { id: "HIGH", label: "High" },
  { id: "MEDIUM", label: "Medium" },
  { id: "LOW", label: "Low" },
];

const selectClass =
  "glass-surface rounded-lg px-2.5 py-1.5 text-small text-slate-300 border border-white/10 hover:border-white/20 focus:border-blue-500/50 focus:outline-none transition-colors bg-transparent cursor-pointer";

export function TaskFilters({
  projects,
  members,
  filters,
  onChange,
}: TaskFiltersProps) {
  const hasActiveFilters =
    filters.projectId ||
    filters.status ||
    filters.priority ||
    filters.assigneeId;

  function set(key: keyof TaskFiltersProps["filters"], value: string) {
    onChange({ ...filters, [key]: value || undefined });
  }

  function clearAll() {
    onChange({});
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Project */}
      <select
        value={filters.projectId ?? ""}
        onChange={(e) => set("projectId", e.target.value)}
        className={selectClass}
      >
        <option value="" className="bg-navy-900 text-slate-400">
          All Projects
        </option>
        {projects.map((p) => (
          <option key={p.id} value={p.id} className="bg-navy-900">
            {p.name}
          </option>
        ))}
      </select>

      {/* Status */}
      <select
        value={filters.status ?? ""}
        onChange={(e) => set("status", e.target.value)}
        className={selectClass}
      >
        <option value="" className="bg-navy-900 text-slate-400">
          All Statuses
        </option>
        {STATUSES.map((s) => (
          <option key={s.id} value={s.id} className="bg-navy-900">
            {s.label}
          </option>
        ))}
      </select>

      {/* Priority */}
      <select
        value={filters.priority ?? ""}
        onChange={(e) => set("priority", e.target.value)}
        className={selectClass}
      >
        <option value="" className="bg-navy-900 text-slate-400">
          All Priorities
        </option>
        {PRIORITIES.map((p) => (
          <option key={p.id} value={p.id} className="bg-navy-900">
            {p.label}
          </option>
        ))}
      </select>

      {/* Assignee */}
      <select
        value={filters.assigneeId ?? ""}
        onChange={(e) => set("assigneeId", e.target.value)}
        className={selectClass}
      >
        <option value="" className="bg-navy-900 text-slate-400">
          All Assignees
        </option>
        {members.map((m) => (
          <option key={m.id} value={m.id} className="bg-navy-900">
            {m.name ?? "Unknown"}
          </option>
        ))}
      </select>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-small text-slate-400 hover:text-slate-200 glass-surface border border-white/10 hover:border-white/20 transition-colors"
        >
          <X size={11} strokeWidth={2} />
          Clear
        </button>
      )}
    </div>
  );
}
