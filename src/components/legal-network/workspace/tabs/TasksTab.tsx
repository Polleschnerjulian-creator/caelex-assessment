"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * TasksTab — firm-side task list for a matter.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";

type Status = "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";
type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: Status;
  priority: Priority;
  assignedTo: string | null;
  createdBy: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<Status, string> = {
  OPEN: "offen",
  IN_PROGRESS: "in Arbeit",
  BLOCKED: "blockiert",
  DONE: "erledigt",
  CANCELLED: "abgebrochen",
};

const STATUS_COLOR: Record<Status, string> = {
  OPEN: "bg-white/10 text-white/80",
  IN_PROGRESS: "bg-blue-500/20 text-blue-300",
  BLOCKED: "bg-amber-500/20 text-amber-300",
  DONE: "bg-emerald-500/20 text-emerald-300",
  CANCELLED: "bg-white/5 text-white/40 line-through",
};

const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: "text-white/40",
  NORMAL: "text-white/70",
  HIGH: "text-amber-400",
  URGENT: "text-red-400",
};

export function TasksTab({ matterId }: { matterId: string }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<"active" | "done" | "all">("active");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/network/matter/${matterId}/tasks`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Tasks nicht ladbar");
      setTasks(json.tasks);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateTask(id: string, patch: Partial<Task>) {
    await fetch(`/api/network/matter/${matterId}/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
  }

  async function deleteTask(id: string) {
    if (!confirm("Task wirklich löschen?")) return;
    await fetch(`/api/network/matter/${matterId}/tasks/${id}`, {
      method: "DELETE",
    });
    await load();
  }

  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!tasks)
    return (
      <div className="text-white/40 text-sm animate-pulse">Lade Tasks…</div>
    );

  const visible = tasks.filter((t) => {
    if (filter === "active")
      return t.status !== "DONE" && t.status !== "CANCELLED";
    if (filter === "done")
      return t.status === "DONE" || t.status === "CANCELLED";
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 text-[11px]">
          {(["active", "done", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full transition ${
                filter === f
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {f === "active" ? "Aktiv" : f === "done" ? "Erledigt" : "Alle"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-medium hover:bg-white/90"
        >
          + Neue Aufgabe
        </button>
      </div>

      {showNew && (
        <NewTaskForm
          matterId={matterId}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            load();
          }}
        />
      )}

      {visible.length === 0 && !showNew && (
        <div className="text-center py-12 text-sm text-white/40">
          {filter === "active"
            ? "Keine aktiven Aufgaben."
            : filter === "done"
              ? "Keine erledigten Aufgaben."
              : "Noch keine Aufgaben."}
        </div>
      )}

      <ul className="space-y-1.5">
        {visible.map((task) => (
          <li
            key={task.id}
            className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition group"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={task.status === "DONE"}
                onChange={(e) =>
                  updateTask(task.id, {
                    status: e.target.checked ? "DONE" : "OPEN",
                  })
                }
                className="mt-1 w-4 h-4 rounded bg-transparent border-white/30 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium ${task.status === "DONE" ? "line-through text-white/40" : "text-white/95"}`}
                >
                  {task.title}
                </div>
                {task.description && (
                  <div className="text-xs text-white/50 mt-0.5">
                    {task.description}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2 text-[10px]">
                  <span
                    className={`px-2 py-0.5 rounded-full ${STATUS_COLOR[task.status]}`}
                  >
                    {STATUS_LABEL[task.status]}
                  </span>
                  <span className={`${PRIORITY_COLOR[task.priority]}`}>
                    {task.priority}
                  </span>
                  {task.dueDate && (
                    <span className="text-white/40">
                      bis {new Date(task.dueDate).toLocaleDateString("de-DE")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <select
                  value={task.status}
                  onChange={(e) =>
                    updateTask(task.id, { status: e.target.value as Status })
                  }
                  className="text-[10px] bg-transparent border border-white/10 rounded px-1.5 py-1"
                >
                  {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                    <option key={s} value={s} className="bg-black">
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-[10px] text-white/40 hover:text-red-400 px-2"
                >
                  ×
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewTaskForm({
  matterId,
  onClose,
  onCreated,
}: {
  matterId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch(`/api/network/matter/${matterId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        priority,
      }),
    });
    setSubmitting(false);
    onCreated();
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 p-4 rounded-xl bg-white/[0.05] border border-white/[0.12] space-y-3"
    >
      <input
        required
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel (z.B. Memo zu FR-Lizenzfristen vorbereiten)"
        className="w-full bg-transparent border-b border-white/10 focus:border-white/40 text-base text-white placeholder:text-white/30 py-1 outline-none"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Beschreibung (optional)"
        rows={2}
        className="w-full bg-transparent text-sm text-white/90 placeholder:text-white/30 resize-none outline-none"
      />
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="text-xs bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white/80"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="text-xs bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white/80"
        >
          <option value="LOW" className="bg-black">
            Niedrig
          </option>
          <option value="NORMAL" className="bg-black">
            Normal
          </option>
          <option value="HIGH" className="bg-black">
            Hoch
          </option>
          <option value="URGENT" className="bg-black">
            Dringend
          </option>
        </select>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-white/50 hover:text-white/80 px-3"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={submitting || !title}
          className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-medium disabled:opacity-40"
        >
          {submitting ? "…" : "Erstellen"}
        </button>
      </div>
    </form>
  );
}
