"use client";

/**
 * Per-entity task list + composer (CRM Phase 1 — "was gemacht werden
 * kann"). Self-loading from /api/admin/crm/tasks; completing a task is a
 * checkbox PATCH (the API logs the TASK_COMPLETED activity). Visual
 * idiom mirrors NotesPanel (CSS-var tokens).
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RotateCcw } from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";
import { csrfHeaders } from "@/lib/csrf-client";

export interface CrmTaskRow {
  id: string;
  title: string;
  status: "OPEN" | "COMPLETED" | "CANCELLED";
  dueDate: string | null;
  completedAt: string | null;
  owner?: { name: string | null; email: string } | null;
}

export default function TasksPanel({
  contactId,
  companyId,
  dealId,
}: {
  contactId?: string;
  companyId?: string;
  dealId?: string;
}) {
  const [tasks, setTasks] = useState<CrmTaskRow[] | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);

  const scopeParam = contactId
    ? `contactId=${contactId}`
    : companyId
      ? `companyId=${companyId}`
      : dealId
        ? `dealId=${dealId}`
        : "";

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/crm/tasks?status=ALL&${scopeParam}`);
      if (!res.ok) {
        setTasks([]);
        return;
      }
      const data = (await res.json()) as { tasks: CrmTaskRow[] };
      setTasks(data.tasks);
    } catch {
      setTasks([]);
    }
  }, [scopeParam]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/crm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          title: title.trim(),
          ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
          contactId,
          companyId,
          dealId,
        }),
      });
      if (res.ok) {
        setTitle("");
        setDueDate("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: CrmTaskRow["status"]) {
    await fetch("/api/admin/crm/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ id, status }),
    }).catch(() => null);
    await load();
  }

  const open = (tasks ?? []).filter((t) => t.status === "OPEN");
  const done = (tasks ?? []).filter((t) => t.status !== "OPEN").slice(0, 5);

  return (
    <div className="space-y-4">
      <form onSubmit={createTask} className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nächster Schritt… (z. B. Follow-up Mail nach ILA)"
          className="flex-1 rounded-lg border px-3 py-2 text-body focus:outline-none focus:ring-1"
          style={{
            background: "var(--surface-sunken)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-label="Fällig am"
          className="rounded-lg border px-2 py-2 text-small focus:outline-none"
          style={{
            background: "var(--surface-sunken)",
            borderColor: "var(--border-default)",
            color: "var(--text-secondary)",
          }}
        />
        <button
          type="submit"
          disabled={!title.trim() || busy}
          aria-label="Aufgabe anlegen"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-small font-medium rounded-md disabled:opacity-50"
          style={{ background: "var(--accent-primary)", color: "white" }}
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
        </button>
      </form>

      {tasks === null ? (
        <p className="text-body text-[var(--text-tertiary)] py-2">Lade…</p>
      ) : open.length === 0 && done.length === 0 ? (
        <p className="text-body text-[var(--text-tertiary)] text-center py-4">
          Keine Aufgaben — lege den nächsten Schritt oben an.
        </p>
      ) : (
        <ul className="space-y-2">
          {open.map((t) => {
            const overdue = t.dueDate ? isPast(new Date(t.dueDate)) : false;
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-lg border p-3"
                style={{
                  background: "var(--surface-raised)",
                  borderColor: overdue
                    ? "var(--accent-danger, #dc2626)"
                    : "var(--border-default)",
                }}
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => void setStatus(t.id, "COMPLETED")}
                  aria-label={`„${t.title}" erledigen`}
                  className="h-4 w-4 cursor-pointer"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body text-[var(--text-primary)] truncate">
                    {t.title}
                  </p>
                  {t.dueDate ? (
                    <p
                      className="text-caption"
                      style={{
                        color: overdue
                          ? "var(--accent-danger, #dc2626)"
                          : "var(--text-tertiary)",
                      }}
                    >
                      fällig{" "}
                      {formatDistanceToNow(new Date(t.dueDate), {
                        addSuffix: true,
                      })}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
          {done.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-lg border p-2.5 opacity-60"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border-default)",
              }}
            >
              <span className="text-caption line-through text-[var(--text-tertiary)] flex-1 truncate">
                {t.title}
              </span>
              <button
                type="button"
                onClick={() => void setStatus(t.id, "OPEN")}
                aria-label={`„${t.title}" wieder öffnen`}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <RotateCcw size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
