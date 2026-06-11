"use client";

/**
 * "Aufgaben" — vollwertiges Task-Management für das Gründerteam.
 * Quick-Add (Titel ⏎, Fälligkeit, Zuweisung, optionale Beschreibung),
 * Filter (Zugewiesen × Status), Gruppierung Überfällig/Heute/Diese
 * Woche/Später/Ohne Termin. Erledigen ist optimistisch (Rollback wenn
 * der PATCH fehlschlägt); Verwerfen = Status CANCELLED (kein DELETE).
 * Komplett deutsch; keine Benachrichtigungs-Mails — Zuweisungen sind
 * in „Heute"/„Aufgaben" sichtbar.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  format,
  formatDistanceToNow,
  isPast,
  isThisWeek,
  isToday,
} from "date-fns";
import { de } from "date-fns/locale";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import {
  assigneeInitials,
  assigneeLabel,
  useAssignees,
  type CrmAssignee,
} from "@/components/crm/useAssignees";

interface TaskBoardTask {
  id: string;
  title: string;
  description: string | null;
  status: "OPEN" | "COMPLETED" | "CANCELLED";
  dueDate: string | null;
  completedAt: string | null;
  owner: { id: string; name: string | null; email: string } | null;
  assignee: { id: string; name: string | null; email: string } | null;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  company: { id: string; name: string } | null;
  deal: { id: string; title: string } | null;
}

type AssigneeFilter = "all" | "me" | "none" | string;
type StatusFilter = "OPEN" | "DONE";

function recordChip(t: TaskBoardTask): { href: string; label: string } | null {
  if (t.contact) {
    const name = [t.contact.firstName, t.contact.lastName]
      .filter(Boolean)
      .join(" ");
    return {
      href: `/admin/crm/contacts/${t.contact.id}`,
      label: name || t.contact.email || "Kontakt",
    };
  }
  if (t.company) {
    return {
      href: `/admin/crm/companies/${t.company.id}`,
      label: t.company.name,
    };
  }
  if (t.deal) {
    return { href: `/admin/crm/deals/${t.deal.id}`, label: t.deal.title };
  }
  return null;
}

type Bucket = "overdue" | "today" | "week" | "later" | "none";

function bucketOf(t: TaskBoardTask): Bucket {
  if (!t.dueDate) return "none";
  const d = new Date(t.dueDate);
  if (isToday(d)) return "today";
  if (isPast(d)) return "overdue";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "week";
  return "later";
}

const inputStyle: React.CSSProperties = {
  background: "var(--surface-sunken)",
  borderColor: "var(--border-default)",
  color: "var(--text-primary)",
};

export default function TaskBoard() {
  const { assignees, meId, loaded: assigneesLoaded } = useAssignees();
  const [tasks, setTasks] = useState<TaskBoardTask[] | null>(null);

  // Filter
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("OPEN");

  // Quick-Add
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  // null = noch keine Wahl getroffen → „Ich" (meId), sobald geladen.
  const [assigneeSel, setAssigneeSel] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [busy, setBusy] = useState(false);

  // Zeilen-Zustände
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDue, setEditDue] = useState("");
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const composerAssignee = assigneeSel ?? meId ?? "";

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        // „Erledigt" braucht COMPLETED + CANCELLED → ALL holen und
        // clientseitig trennen; „Offen" filtert der Server.
        status: statusFilter === "OPEN" ? "OPEN" : "ALL",
        assignee: assigneeFilter,
      });
      const res = await fetch(`/api/admin/crm/tasks?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setTasks([]);
        return;
      }
      const data = (await res.json()) as { tasks: TaskBoardTask[] };
      setTasks(data.tasks);
    } catch {
      setTasks([]);
    }
  }, [statusFilter, assigneeFilter]);

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
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
          ...(composerAssignee ? { assigneeId: composerAssignee } : {}),
        }),
      });
      if (res.ok) {
        setTitle("");
        setDueDate("");
        setDescription("");
        setShowDescription(false);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  /** Status-PATCH optimistisch mit Rollback, wenn der Server ablehnt. */
  async function patchStatus(id: string, status: TaskBoardTask["status"]) {
    const prev = tasks;
    setTasks((cur) =>
      (cur ?? []).map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              completedAt:
                status === "COMPLETED" ? new Date().toISOString() : null,
            }
          : t,
      ),
    );
    const res = await fetch("/api/admin/crm/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ id, status }),
    }).catch(() => null);
    if (!res?.ok) {
      setTasks(prev); // Rollback
      return;
    }
    await load();
  }

  /** Zuweisung optimistisch umziehen (Rollback bei Fehler). */
  async function reassign(id: string, assigneeId: string | null) {
    const prev = tasks;
    const next: TaskBoardTask["assignee"] = assigneeId
      ? (assignees.find((a) => a.id === assigneeId) ?? null)
      : null;
    setTasks((cur) =>
      (cur ?? []).map((t) => (t.id === id ? { ...t, assignee: next } : t)),
    );
    const res = await fetch("/api/admin/crm/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ id, assigneeId }),
    }).catch(() => null);
    if (!res?.ok) {
      setTasks(prev); // Rollback
      return;
    }
    await load();
  }

  function startEdit(t: TaskBoardTask) {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditDue(t.dueDate ? t.dueDate.slice(0, 10) : "");
    setConfirmCancelId(null);
  }

  async function saveEdit() {
    if (!editingId || !editTitle.trim()) return;
    const res = await fetch("/api/admin/crm/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({
        id: editingId,
        title: editTitle.trim(),
        dueDate: editDue ? new Date(editDue).toISOString() : null,
      }),
    }).catch(() => null);
    if (res?.ok) {
      setEditingId(null);
      await load();
    }
  }

  const all = tasks ?? [];
  const openRows = all.filter((t) => t.status === "OPEN");
  const doneRows = all
    .filter((t) => t.status !== "OPEN")
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? 0).getTime() -
        new Date(a.completedAt ?? 0).getTime(),
    );

  const groups = useMemo(() => {
    const by: Record<Bucket, TaskBoardTask[]> = {
      overdue: [],
      today: [],
      week: [],
      later: [],
      none: [],
    };
    for (const t of openRows) by[bucketOf(t)].push(t);
    return [
      { label: "Überfällig", rows: by.overdue, danger: true },
      { label: "Heute", rows: by.today, danger: false },
      { label: "Diese Woche", rows: by.week, danger: false },
      { label: "Später", rows: by.later, danger: false },
      { label: "Ohne Termin", rows: by.none, danger: false },
    ];
  }, [openRows]);

  const others = assignees.filter((a) => a.id !== meId);

  const renderAssigneeOptions = (
    <>
      {meId ? <option value={meId}>Ich</option> : null}
      {others.map((a) => (
        <option key={a.id} value={a.id}>
          {assigneeLabel(a)}
        </option>
      ))}
      <option value="">Unzugewiesen</option>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Quick-Add */}
      <form
        onSubmit={createTask}
        className="rounded-xl border p-3 space-y-2"
        style={{
          background: "var(--surface-raised)",
          borderColor: "var(--border-default)",
        }}
      >
        <div className="flex flex-wrap gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Neue Aufgabe… (Enter legt sie an)"
            aria-label="Titel der neuen Aufgabe"
            className="flex-1 min-w-[220px] rounded-lg border px-3 py-2 text-body focus:outline-none focus:ring-1"
            style={inputStyle}
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Fällig am"
            className="rounded-lg border px-2 py-2 text-small focus:outline-none"
            style={inputStyle}
          />
          <select
            value={composerAssignee}
            onChange={(e) => setAssigneeSel(e.target.value)}
            aria-label="Zuweisen an"
            disabled={!assigneesLoaded}
            className="rounded-lg border px-2 py-2 text-small focus:outline-none"
            style={inputStyle}
          >
            {renderAssigneeOptions}
          </select>
          <button
            type="submit"
            disabled={!title.trim() || busy}
            aria-label="Aufgabe anlegen"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-small font-medium rounded-lg disabled:opacity-50 text-white"
            style={{ background: "var(--accent-primary)" }}
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Anlegen
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowDescription((s) => !s)}
          className="inline-flex items-center gap-1 text-caption text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          {showDescription ? (
            <ChevronUp size={12} />
          ) : (
            <ChevronDown size={12} />
          )}
          Beschreibung {showDescription ? "ausblenden" : "hinzufügen"}
        </button>
        {showDescription ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Worum geht es? (optional)"
            aria-label="Beschreibung"
            rows={2}
            className="w-full rounded-lg border px-3 py-2 text-body focus:outline-none"
            style={inputStyle}
          />
        ) : null}
      </form>

      {/* Filterleiste */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
          Zugewiesen an:
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-small focus:outline-none"
            style={inputStyle}
          >
            <option value="all">Alle</option>
            <option value="me">Ich</option>
            {others.map((a) => (
              <option key={a.id} value={a.id}>
                {assigneeLabel(a)}
              </option>
            ))}
            <option value="none">Unzugewiesen</option>
          </select>
        </label>
        <div
          className="flex items-center gap-1 p-1 rounded-lg border w-fit"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--border-default)",
          }}
        >
          {(
            [
              ["OPEN", "Offen"],
              ["DONE", "Erledigt"],
            ] as Array<[StatusFilter, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1 text-small font-medium rounded ${
                statusFilter === value
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {tasks === null ? (
        <div className="flex items-center justify-center py-16 text-[var(--text-tertiary)]">
          <Loader2 size={16} className="animate-spin mr-2" />
          Lade Aufgaben…
        </div>
      ) : statusFilter === "OPEN" ? (
        openRows.length === 0 ? (
          <div
            className="rounded-xl border p-10 text-center"
            style={{
              background: "var(--surface-raised)",
              borderColor: "var(--border-default)",
            }}
          >
            <ListTodo
              size={28}
              className="mx-auto mb-3 text-[var(--text-tertiary)]"
            />
            <p className="text-body text-[var(--text-secondary)]">
              Keine offenen Aufgaben — tippe oben einen Titel ein und drücke
              Enter, um die erste anzulegen.
            </p>
          </div>
        ) : (
          groups.map((g) =>
            g.rows.length === 0 ? null : (
              <div key={g.label}>
                <p
                  className="text-caption font-medium uppercase tracking-wider mb-2"
                  style={{
                    color: g.danger
                      ? "var(--accent-danger, #dc2626)"
                      : "var(--text-tertiary)",
                  }}
                >
                  {g.label} ({g.rows.length})
                </p>
                <ul className="space-y-2 mb-4">
                  {g.rows.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      danger={g.danger}
                      assignees={assignees}
                      meId={meId}
                      editing={editingId === t.id}
                      editTitle={editTitle}
                      editDue={editDue}
                      confirming={confirmCancelId === t.id}
                      onToggle={() => void patchStatus(t.id, "COMPLETED")}
                      onReassign={(aid) => void reassign(t.id, aid)}
                      onStartEdit={() => startEdit(t)}
                      onEditTitle={setEditTitle}
                      onEditDue={setEditDue}
                      onSaveEdit={() => void saveEdit()}
                      onCancelEdit={() => setEditingId(null)}
                      onAskCancel={() => {
                        setConfirmCancelId(t.id);
                        setEditingId(null);
                      }}
                      onConfirmCancel={() => {
                        setConfirmCancelId(null);
                        void patchStatus(t.id, "CANCELLED");
                      }}
                      onDismissCancel={() => setConfirmCancelId(null)}
                    />
                  ))}
                </ul>
              </div>
            ),
          )
        )
      ) : doneRows.length === 0 ? (
        <p className="text-body text-[var(--text-tertiary)] text-center py-10">
          Noch nichts erledigt oder verworfen.
        </p>
      ) : (
        <ul className="space-y-2">
          {doneRows.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-lg border p-2.5 opacity-70"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border-default)",
              }}
            >
              <Check size={14} className="text-[var(--text-tertiary)]" />
              <span className="text-body line-through text-[var(--text-tertiary)] flex-1 truncate">
                {t.title}
              </span>
              {t.status === "CANCELLED" ? (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    background: "var(--surface-sunken)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Verworfen
                </span>
              ) : null}
              {t.assignee ? (
                <AssigneeAvatar assignee={t.assignee} meId={meId} />
              ) : null}
              <button
                type="button"
                onClick={() => void patchStatus(t.id, "OPEN")}
                aria-label={`„${t.title}" wieder öffnen`}
                title="Wieder öffnen"
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

// ─── Zeile ────────────────────────────────────────────────────────────────────

function AssigneeAvatar({
  assignee,
  meId,
}: {
  assignee: { id: string; name: string | null; email: string };
  meId: string | null;
}) {
  const label = assignee.id === meId ? "Ich" : assigneeLabel(assignee);
  return (
    <span
      title={`Zugewiesen an ${label}`}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
      style={{
        background: "var(--accent-primary-soft)",
        color: "var(--accent-primary)",
      }}
    >
      {assigneeInitials(assignee)}
    </span>
  );
}

function TaskRow({
  task: t,
  danger,
  assignees,
  meId,
  editing,
  editTitle,
  editDue,
  confirming,
  onToggle,
  onReassign,
  onStartEdit,
  onEditTitle,
  onEditDue,
  onSaveEdit,
  onCancelEdit,
  onAskCancel,
  onConfirmCancel,
  onDismissCancel,
}: {
  task: TaskBoardTask;
  danger: boolean;
  assignees: CrmAssignee[];
  meId: string | null;
  editing: boolean;
  editTitle: string;
  editDue: string;
  confirming: boolean;
  onToggle: () => void;
  onReassign: (assigneeId: string | null) => void;
  onStartEdit: () => void;
  onEditTitle: (v: string) => void;
  onEditDue: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onAskCancel: () => void;
  onConfirmCancel: () => void;
  onDismissCancel: () => void;
}) {
  const chip = recordChip(t);
  const due = t.dueDate ? new Date(t.dueDate) : null;
  const others = assignees.filter((a) => a.id !== meId);

  return (
    <li
      className="flex items-center gap-3 rounded-lg border p-3"
      style={{
        background: "var(--surface-raised)",
        borderColor: danger
          ? "var(--accent-danger, #dc2626)"
          : "var(--border-default)",
      }}
    >
      <input
        type="checkbox"
        checked={false}
        onChange={onToggle}
        aria-label={`„${t.title}" erledigen`}
        className="h-4 w-4 cursor-pointer shrink-0"
      />

      {editing ? (
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          <input
            value={editTitle}
            onChange={(e) => onEditTitle(e.target.value)}
            aria-label="Titel bearbeiten"
            className="flex-1 min-w-[160px] rounded-lg border px-2 py-1.5 text-body focus:outline-none"
            style={inputStyle}
          />
          <input
            type="date"
            value={editDue}
            onChange={(e) => onEditDue(e.target.value)}
            aria-label="Fälligkeit bearbeiten"
            className="rounded-lg border px-2 py-1.5 text-small focus:outline-none"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={onSaveEdit}
            disabled={!editTitle.trim()}
            aria-label="Änderungen speichern"
            className="inline-flex items-center gap-1 px-2 py-1.5 text-small font-medium rounded-md text-white disabled:opacity-50"
            style={{ background: "var(--accent-primary)" }}
          >
            <Check size={13} /> Speichern
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            aria-label="Bearbeiten abbrechen"
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="text-body text-[var(--text-primary)] truncate">
              {t.title}
            </p>
            <p className="text-caption text-[var(--text-tertiary)] flex items-center gap-1.5 flex-wrap">
              {chip ? (
                <Link
                  href={chip.href}
                  className="px-1.5 py-0.5 rounded-full font-medium hover:underline"
                  style={{
                    background: "var(--surface-sunken)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {chip.label}
                </Link>
              ) : null}
              {t.description ? (
                <span className="truncate max-w-[320px]">{t.description}</span>
              ) : null}
            </p>
          </div>

          {due ? (
            <span
              className="text-caption shrink-0"
              style={{
                color: danger
                  ? "var(--accent-danger, #dc2626)"
                  : "var(--text-tertiary)",
              }}
              title={format(due, "PPP", { locale: de })}
            >
              {danger
                ? `fällig ${formatDistanceToNow(due, { addSuffix: true, locale: de })}`
                : format(due, "d. MMM", { locale: de })}
            </span>
          ) : null}

          <span className="flex items-center gap-1 shrink-0">
            {t.assignee ? (
              <AssigneeAvatar assignee={t.assignee} meId={meId} />
            ) : null}
            <select
              value={t.assignee?.id ?? ""}
              onChange={(e) => onReassign(e.target.value || null)}
              aria-label={`„${t.title}" zuweisen`}
              title="Zuweisen"
              className="max-w-[110px] rounded-md border px-1.5 py-1 text-caption focus:outline-none"
              style={inputStyle}
            >
              {meId ? <option value={meId}>Ich</option> : null}
              {others.map((a) => (
                <option key={a.id} value={a.id}>
                  {assigneeLabel(a)}
                </option>
              ))}
              <option value="">Unzugewiesen</option>
            </select>
          </span>

          {confirming ? (
            <span className="flex items-center gap-1.5 shrink-0 text-caption">
              <span style={{ color: "var(--accent-danger, #dc2626)" }}>
                Verwerfen?
              </span>
              <button
                type="button"
                onClick={onConfirmCancel}
                className="font-medium px-1.5 py-0.5 rounded text-white"
                style={{ background: "var(--accent-danger, #dc2626)" }}
              >
                Ja
              </button>
              <button
                type="button"
                onClick={onDismissCancel}
                className="px-1.5 py-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Nein
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onStartEdit}
                aria-label={`„${t.title}" bearbeiten`}
                title="Titel/Datum bearbeiten"
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={onAskCancel}
                aria-label={`„${t.title}" verwerfen`}
                title="Verwerfen (landet unter Erledigt)"
                className="text-[var(--text-tertiary)] hover:text-[var(--accent-danger,#dc2626)]"
              >
                <Trash2 size={13} />
              </button>
            </span>
          )}
        </>
      )}
    </li>
  );
}
