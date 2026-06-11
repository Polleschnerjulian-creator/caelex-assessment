"use client";

/**
 * "Heute" — the CRM working cockpit (Phase 2: "immer auf dem aktuellen
 * Stand"). Three columns of truth, all from existing APIs:
 *   1. Meine Aufgaben — overdue / today / upcoming open tasks that are
 *      assigned to ME (or unassigned and owned by me), completable
 *      inline (PATCH). Everything else lives on the "Aufgaben" tab
 *      (onShowAllTasks switches to it).
 *   2. Letzte Aktivitäten — the global activity stream (notes, stage
 *      changes, imports) with entity links.
 *   3. Neue Leads — link out to /admin/leads where conversion lives.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow, isPast, isToday } from "date-fns";
import { Inbox, ArrowRight } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useAssignees } from "@/components/crm/useAssignees";
import type { CrmTaskRow } from "./TasksPanel";

interface TaskWithRefs extends CrmTaskRow {
  contact?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  company?: { id: string; name: string } | null;
}

interface ActivityRow {
  id: string;
  type: string;
  summary: string | null;
  createdAt: string;
  contact?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  company?: { id: string; name: string } | null;
}

function taskHref(t: TaskWithRefs): string | null {
  if (t.contact) return `/admin/crm/contacts/${t.contact.id}`;
  if (t.company) return `/admin/crm/companies/${t.company.id}`;
  return null;
}

function taskEntityLabel(t: TaskWithRefs): string {
  if (t.contact) {
    const name = [t.contact.firstName, t.contact.lastName]
      .filter(Boolean)
      .join(" ");
    return name || t.contact.email || "Kontakt";
  }
  if (t.company) return t.company.name;
  return "";
}

export default function TodayPanel({
  onShowAllTasks,
}: {
  /** Wechselt auf den „Aufgaben"-Tab (vom CrmWorkspace durchgereicht). */
  onShowAllTasks?: () => void;
}) {
  const [tasks, setTasks] = useState<TaskWithRefs[] | null>(null);
  const [activities, setActivities] = useState<ActivityRow[] | null>(null);
  const { meId } = useAssignees();

  const load = useCallback(async () => {
    const [taskRes, actRes] = await Promise.all([
      fetch("/api/admin/crm/tasks?status=OPEN").catch(() => null),
      fetch("/api/admin/crm/activities?limit=12").catch(() => null),
    ]);
    if (taskRes?.ok) {
      const data = (await taskRes.json()) as { tasks: TaskWithRefs[] };
      setTasks(data.tasks);
    } else {
      setTasks([]);
    }
    if (actRes?.ok) {
      const data = (await actRes.json()) as { activities: ActivityRow[] };
      setActivities(data.activities ?? []);
    } else {
      setActivities([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function complete(id: string) {
    await fetch("/api/admin/crm/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ id, status: "COMPLETED" }),
    }).catch(() => null);
    await load();
  }

  // „Meine Aufgaben": mir zugewiesen ODER (unzugewiesen UND von mir
  // angelegt). Bis meId geladen ist, zeigen wir alles (kein Flackern
  // von „leer" → „voll").
  const open = (tasks ?? []).filter(
    (t) =>
      !meId || t.assignee?.id === meId || (!t.assignee && t.owner?.id === meId),
  );
  const overdue = open.filter(
    (t) =>
      t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)),
  );
  const today = open.filter((t) => t.dueDate && isToday(new Date(t.dueDate)));
  const upcoming = open.filter(
    (t) =>
      !t.dueDate ||
      (!isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))),
  );

  const section = (label: string, rows: TaskWithRefs[], danger = false) =>
    rows.length === 0 ? null : (
      <div className="mb-4">
        <p
          className="text-caption font-medium uppercase tracking-wider mb-2"
          style={{
            color: danger
              ? "var(--accent-danger, #dc2626)"
              : "var(--text-tertiary)",
          }}
        >
          {label} ({rows.length})
        </p>
        <ul className="space-y-2">
          {rows.map((t) => {
            const href = taskHref(t);
            return (
              <li
                key={t.id}
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
                  onChange={() => void complete(t.id)}
                  aria-label={`„${t.title}" erledigen`}
                  className="h-4 w-4 cursor-pointer"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body text-[var(--text-primary)] truncate">
                    {t.title}
                  </p>
                  <p className="text-caption text-[var(--text-tertiary)]">
                    {href ? (
                      <Link href={href} className="hover:underline">
                        {taskEntityLabel(t)}
                      </Link>
                    ) : (
                      taskEntityLabel(t)
                    )}
                    {t.dueDate
                      ? ` · fällig ${formatDistanceToNow(new Date(t.dueDate), { addSuffix: true })}`
                      : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      {/* Meine Aufgaben */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-title font-medium text-[var(--text-primary)]">
            Meine Aufgaben
          </h3>
          {onShowAllTasks ? (
            <button
              type="button"
              onClick={onShowAllTasks}
              className="inline-flex items-center gap-1 text-small text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Alle Aufgaben <ArrowRight size={12} />
            </button>
          ) : null}
        </div>
        <p className="text-caption text-[var(--text-tertiary)] mb-3">
          Zeigt nur, was dir zugewiesen ist (oder unzugewiesen von dir angelegt
          wurde).
        </p>
        {tasks === null ? (
          <p className="text-body text-[var(--text-tertiary)]">Lade…</p>
        ) : open.length === 0 ? (
          <p className="text-body text-[var(--text-tertiary)]">
            Keine offenen Aufgaben für dich. Neue legst du im Tab „Aufgaben"
            oder direkt am Kontakt an.
          </p>
        ) : (
          <>
            {section("Überfällig", overdue, true)}
            {section("Heute", today)}
            {section("Demnächst / ohne Datum", upcoming)}
          </>
        )}
      </div>

      {/* Aktivität + Leads */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-title font-medium text-[var(--text-primary)]">
              Letzte Aktivitäten
            </h3>
          </div>
          {activities === null ? (
            <p className="text-body text-[var(--text-tertiary)]">Lade…</p>
          ) : activities.length === 0 ? (
            <p className="text-body text-[var(--text-tertiary)]">
              Noch keine Aktivitäten.
            </p>
          ) : (
            <ul className="space-y-2">
              {activities.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border p-3"
                  style={{
                    background: "var(--surface-raised)",
                    borderColor: "var(--border-default)",
                  }}
                >
                  <p className="text-body text-[var(--text-primary)]">
                    {a.summary ?? a.type}
                  </p>
                  <p className="text-caption text-[var(--text-tertiary)]">
                    {a.contact
                      ? [a.contact.firstName, a.contact.lastName]
                          .filter(Boolean)
                          .join(" ")
                      : (a.company?.name ?? "")}{" "}
                    ·{" "}
                    {formatDistanceToNow(new Date(a.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          href="/admin/leads"
          className="flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors hover:opacity-90"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--border-default)",
          }}
        >
          <span className="flex items-center gap-2 text-body text-[var(--text-primary)]">
            <Inbox size={16} />
            Neue Assessment-Leads ansehen &amp; übernehmen
          </span>
          <ArrowRight size={14} className="text-[var(--text-tertiary)]" />
        </Link>
      </div>
    </div>
  );
}
