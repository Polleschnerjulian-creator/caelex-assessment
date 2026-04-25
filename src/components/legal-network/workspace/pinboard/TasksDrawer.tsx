"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * TasksDrawer — full CRUD for MatterTask entities. Opens from the
 * TasksSystemCard pinboard tile.
 *
 * Why a drawer rather than a card-on-the-pinboard:
 *   - Tasks are mutable (status flips, priority changes, edit due
 *     date) — that doesn't fit the immutable-payload model of
 *     MatterArtifact.
 *   - Tasks need a list view, not a single-glance summary; a drawer
 *     gives space for filters + inline create without crowding the
 *     pinboard.
 *
 * Wired to /api/network/matter/:id/tasks (already hardened in cleanup).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Check,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  createdAt: string;
  completedAt: string | null;
}

interface TasksDrawerProps {
  matterId: string;
  open: boolean;
  onClose: () => void;
  /** Tells the parent to refresh its summary count after a change. */
  onChanged?: () => void;
}

const STATUS_LABEL: Record<Task["status"], string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Arbeit",
  BLOCKED: "Blockiert",
  DONE: "Erledigt",
  CANCELLED: "Abgebrochen",
};

const PRIORITY_TINT: Record<Task["priority"], string> = {
  LOW: "text-white/40",
  NORMAL: "text-white/60",
  HIGH: "text-amber-400",
  URGENT: "text-red-400",
};

type Filter = "open" | "all" | "done";

export function TasksDrawer({
  matterId,
  open,
  onClose,
  onChanged,
}: TasksDrawerProps) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [error, setError] = useState<string | null>(null);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/network/matter/${matterId}/tasks`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Konnte Tasks nicht laden");
      setTasks(json.tasks);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [matterId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const updateTask = useCallback(
    async (id: string, patch: Partial<Pick<Task, "status" | "priority">>) => {
      const snapshot = tasks;
      // Optimistic
      setTasks((prev) =>
        prev ? prev.map((t) => (t.id === id ? { ...t, ...patch } : t)) : prev,
      );
      try {
        const res = await fetch(`/api/network/matter/${matterId}/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error();
        await load();
        onChanged?.();
      } catch {
        setTasks(snapshot);
      }
    },
    [matterId, tasks, load, onChanged],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (!confirm("Task löschen?")) return;
      const snapshot = tasks;
      setTasks((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
      try {
        const res = await fetch(`/api/network/matter/${matterId}/tasks/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
        onChanged?.();
      } catch {
        setTasks(snapshot);
      }
    },
    [matterId, tasks, onChanged],
  );

  if (!open) return null;

  const visible = (tasks ?? []).filter((t) => {
    if (filter === "open")
      return t.status !== "DONE" && t.status !== "CANCELLED";
    if (filter === "done") return t.status === "DONE";
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tasks-drawer-title"
      className="fixed inset-0 z-[80] flex justify-end"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div className="relative w-full sm:w-[560px] h-full bg-[#0a0c10] border-l border-white/[0.08] shadow-2xl flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <div className="text-[9px] tracking-[0.22em] uppercase text-white/40">
              Aufgaben · Detailansicht
            </div>
            <h2
              id="tasks-drawer-title"
              className="text-sm font-medium text-white"
            >
              Tasks für dieses Mandat
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-1 rounded-md hover:bg-white/[0.06] transition"
            aria-label="Schließen"
          >
            <X size={15} strokeWidth={1.8} />
          </button>
        </header>

        {/* Filters */}
        <div className="flex items-center gap-1 px-5 py-2 border-b border-white/[0.04] flex-shrink-0">
          {(["open", "all", "done"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] px-2.5 py-1 rounded-md transition ${
                filter === f
                  ? "bg-white/[0.08] text-white"
                  : "text-white/45 hover:text-white/70"
              }`}
            >
              {f === "open" ? "Offen" : f === "done" ? "Erledigt" : "Alle"}
            </button>
          ))}
        </div>

        {/* Inline create */}
        <div className="px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
          <CreateTaskInline matterId={matterId} onCreated={load} />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {error && (
            <div className="text-[11px] text-red-400 mb-3">{error}</div>
          )}
          {!tasks && (
            <div className="text-center text-[12px] text-white/35 animate-pulse py-8">
              Lade Tasks…
            </div>
          )}
          {tasks && visible.length === 0 && (
            <div className="text-center text-[12px] text-white/40 py-8">
              {filter === "open"
                ? "Keine offenen Tasks."
                : filter === "done"
                  ? "Keine erledigten Tasks."
                  : "Noch keine Tasks erstellt."}
            </div>
          )}
          <ul className="space-y-2">
            {visible.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onToggleDone={(done) =>
                  updateTask(t.id, { status: done ? "DONE" : "OPEN" })
                }
                onDelete={() => deleteTask(t.id)}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Inline create ───────────────────────────────────────────────────

function CreateTaskInline({
  matterId,
  onCreated,
}: {
  matterId: string;
  onCreated: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("NORMAL");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const t = title.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/network/matter/${matterId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          priority,
        }),
      });
      if (res.ok) {
        setTitle("");
        setDueDate("");
        setPriority("NORMAL");
        await onCreated();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) submit();
        }}
        placeholder="Neue Task — z.B. „NIS2-Klassifizierung prüfen"
        disabled={submitting}
        className="flex-1 bg-white/[0.025] border border-white/[0.08] rounded-md px-2.5 py-1.5 text-[12px] text-white placeholder:text-white/30 outline-none focus:border-white/20"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        disabled={submitting}
        className="bg-white/[0.025] border border-white/[0.08] rounded-md px-2 py-1.5 text-[11px] text-white/80 outline-none focus:border-white/20"
      />
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as Task["priority"])}
        disabled={submitting}
        className="bg-white/[0.025] border border-white/[0.08] rounded-md px-2 py-1.5 text-[11px] text-white/80 outline-none focus:border-white/20"
      >
        <option value="LOW">Low</option>
        <option value="NORMAL">Normal</option>
        <option value="HIGH">High</option>
        <option value="URGENT">Urgent</option>
      </select>
      <button
        onClick={submit}
        disabled={!title.trim() || submitting}
        className="px-2.5 py-1.5 rounded-md bg-white text-black text-[11px] font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 inline-flex items-center gap-1.5"
        title="Hinzufügen"
      >
        {submitting ? (
          <Loader2 size={11} strokeWidth={2.2} className="animate-spin" />
        ) : (
          <Plus size={11} strokeWidth={2.2} />
        )}
      </button>
    </div>
  );
}

// ─── Single task row ────────────────────────────────────────────────

function TaskRow({
  task,
  onToggleDone,
  onDelete,
}: {
  task: Task;
  onToggleDone: (done: boolean) => void;
  onDelete: () => void;
}) {
  const isDone = task.status === "DONE";
  const overdue =
    !isDone && task.dueDate && new Date(task.dueDate).getTime() < Date.now();

  return (
    <li className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition group">
      <button
        onClick={() => onToggleDone(!isDone)}
        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition ${
          isDone
            ? "bg-emerald-500 border-emerald-500"
            : "border-white/30 hover:border-white/60"
        }`}
        aria-label={isDone ? "Wieder öffnen" : "Erledigt markieren"}
      >
        {isDone && <Check size={10} strokeWidth={3} className="text-black" />}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className={`text-[12px] leading-snug ${
            isDone ? "text-white/40 line-through" : "text-white/90"
          }`}
        >
          {task.title}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-white/40">
          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 ${
                overdue ? "text-red-400 font-medium" : ""
              }`}
            >
              <Clock size={9} strokeWidth={1.8} />
              {new Date(task.dueDate).toLocaleDateString("de-DE")}
              {overdue && " · überfällig"}
            </span>
          )}
          <span className={PRIORITY_TINT[task.priority]}>
            {task.priority === "URGENT" && (
              <AlertTriangle
                size={9}
                strokeWidth={1.8}
                className="inline mr-0.5 -mt-0.5"
              />
            )}
            {task.priority.toLowerCase()}
          </span>
          <span className="text-white/25">·</span>
          <span>{STATUS_LABEL[task.status]}</span>
        </div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 p-1 rounded transition flex-shrink-0"
        aria-label="Löschen"
        title="Löschen"
      >
        <Trash2 size={11} strokeWidth={1.8} />
      </button>
    </li>
  );
}
