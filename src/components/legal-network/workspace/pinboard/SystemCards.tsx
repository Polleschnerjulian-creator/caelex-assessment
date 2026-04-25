"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * SystemCards — pinned at the top of the Pinboard, ABOVE the masonry
 * grid of MatterArtifact rows. Two cards:
 *
 *   - TasksSystemCard: live-summary of MatterTask rows (open count
 *     + top open tasks with due dates).
 *   - NotesSystemCard: live-summary of MatterNote rows (count + top
 *     recent titles).
 *
 * These are NOT MatterArtifact rows. The pinboard treats them as
 * always-present widgets — they can't be deleted, can't be reordered,
 * and refresh themselves on focus. Click opens a drawer for full CRUD.
 *
 * Visually they mirror ArtifactCard (same liquid-glass chrome, same
 * header structure) so the board feels uniform — but the data layer
 * is independent.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import { CheckSquare, StickyNote, Clock, ChevronRight } from "lucide-react";
import { TasksDrawer } from "./TasksDrawer";
import { NotesDrawer } from "./NotesDrawer";

interface TaskSummary {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  priority: string;
}

interface NoteSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export function SystemCards({ matterId }: { matterId: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 pt-6">
      <TasksSystemCard matterId={matterId} />
      <NotesSystemCard matterId={matterId} />
    </div>
  );
}

// ─── Tasks summary ──────────────────────────────────────────────────

function TasksSystemCard({ matterId }: { matterId: string }) {
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/network/matter/${matterId}/tasks`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      setTasks(json.tasks ?? []);
    } catch {
      // Silent fail — system card just shows "lade…"
    }
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  const openTasks = (tasks ?? []).filter(
    (t) => t.status !== "DONE" && t.status !== "CANCELLED",
  );
  const topOpen = openTasks.slice(0, 3);
  const overdueCount = openTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).getTime() < Date.now(),
  ).length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="
          group text-left rounded-2xl
          border border-white/[0.08] bg-white/[0.025]
          backdrop-blur-xl
          shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_30px_-8px_rgba(0,0,0,0.6)]
          transition-all duration-200
          hover:border-white/[0.18] hover:bg-white/[0.04]
        "
      >
        <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
              <CheckSquare
                size={13}
                strokeWidth={1.8}
                className="text-white/70"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] tracking-[0.2em] uppercase text-white/40">
                Aufgaben
              </div>
              <h3 className="text-[13px] font-medium text-white">
                {tasks === null
                  ? "Lade…"
                  : openTasks.length === 0
                    ? "Keine offenen Tasks"
                    : `${openTasks.length} offen${
                        overdueCount > 0 ? ` · ${overdueCount} überfällig` : ""
                      }`}
              </h3>
            </div>
          </div>
          <ChevronRight
            size={13}
            strokeWidth={1.8}
            className="text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition flex-shrink-0 mt-1"
          />
        </header>
        <div className="px-4 pb-4 space-y-1.5">
          {topOpen.length === 0 && tasks !== null && (
            <p className="text-[11px] text-white/35 italic">
              Klick zum Anlegen einer neuen Task.
            </p>
          )}
          {topOpen.map((t) => {
            const overdue =
              t.dueDate && new Date(t.dueDate).getTime() < Date.now();
            return (
              <div key={t.id} className="flex items-start gap-2 text-[11.5px]">
                <span
                  className={`flex-shrink-0 mt-1 w-1 h-1 rounded-full ${
                    t.priority === "URGENT"
                      ? "bg-red-400"
                      : t.priority === "HIGH"
                        ? "bg-amber-400"
                        : "bg-white/40"
                  }`}
                />
                <span className="text-white/85 line-clamp-1 flex-1">
                  {t.title}
                </span>
                {t.dueDate && (
                  <span
                    className={`text-[10px] tabular-nums flex-shrink-0 ${
                      overdue ? "text-red-400" : "text-white/35"
                    }`}
                  >
                    {new Date(t.dueDate).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                )}
              </div>
            );
          })}
          {openTasks.length > topOpen.length && (
            <div className="text-[10px] text-white/30 pt-1">
              +{openTasks.length - topOpen.length} weitere
            </div>
          )}
        </div>
      </button>

      <TasksDrawer
        matterId={matterId}
        open={open}
        onClose={() => {
          setOpen(false);
          // Drawer might have changed counts — refetch summary
          load();
        }}
        onChanged={load}
      />
    </>
  );
}

// ─── Notes summary ──────────────────────────────────────────────────

function NotesSystemCard({ matterId }: { matterId: string }) {
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/network/matter/${matterId}/notes`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      setNotes(json.notes ?? []);
    } catch {
      /* silent */
    }
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  const top = (notes ?? []).slice(0, 3);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="
          group text-left rounded-2xl
          border border-white/[0.08] bg-white/[0.025]
          backdrop-blur-xl
          shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_30px_-8px_rgba(0,0,0,0.6)]
          transition-all duration-200
          hover:border-white/[0.18] hover:bg-white/[0.04]
        "
      >
        <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
              <StickyNote
                size={13}
                strokeWidth={1.8}
                className="text-white/70"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] tracking-[0.2em] uppercase text-white/40">
                Notizen
              </div>
              <h3 className="text-[13px] font-medium text-white">
                {notes === null
                  ? "Lade…"
                  : notes.length === 0
                    ? "Noch keine Notizen"
                    : `${notes.length} Notiz${notes.length === 1 ? "" : "en"}`}
              </h3>
            </div>
          </div>
          <ChevronRight
            size={13}
            strokeWidth={1.8}
            className="text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition flex-shrink-0 mt-1"
          />
        </header>
        <div className="px-4 pb-4 space-y-1.5">
          {top.length === 0 && notes !== null && (
            <p className="text-[11px] text-white/35 italic">
              Klick um eine neue Notiz anzulegen — oder lass Claude per „Memo
              entwerfen" eine schreiben.
            </p>
          )}
          {top.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-2 text-[11.5px] text-white/85"
            >
              <Clock
                size={9}
                strokeWidth={1.8}
                className="text-white/35 mt-1 flex-shrink-0"
              />
              <span className="line-clamp-1 flex-1">{n.title}</span>
              <span className="text-[10px] tabular-nums text-white/35 flex-shrink-0">
                {new Date(n.updatedAt).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
            </div>
          ))}
          {(notes?.length ?? 0) > top.length && (
            <div className="text-[10px] text-white/30 pt-1">
              +{(notes?.length ?? 0) - top.length} weitere
            </div>
          )}
        </div>
      </button>

      <NotesDrawer
        matterId={matterId}
        open={open}
        onClose={() => {
          setOpen(false);
          load();
        }}
        onChanged={load}
      />
    </>
  );
}
