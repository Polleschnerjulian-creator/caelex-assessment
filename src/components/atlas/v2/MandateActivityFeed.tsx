"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate Activity Feed.
 *
 * "Was hat sich seit gestern verändert?" — chronologische Liste aller
 * Mandats-Events: Chats, Files, Deadlines, Time-Entries, Parties,
 * Members, Agent-Runs.
 *
 * Collapsed by default below a 1-line summary so the section doesn't
 * dominate the page on quiet days. Click-to-expand reveals the full
 * timeline. Lawyers who come in fresh in the morning can scan the
 * collapsed line first ("8 Ereignisse · zuletzt vor 2h") and only
 * expand when they want detail.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  MessageSquare,
  FileText,
  Clock,
  Timer,
  Users,
  UserPlus,
  Cpu,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type ActivityKind =
  | "chat_created"
  | "file_uploaded"
  | "deadline_added"
  | "time_logged"
  | "party_added"
  | "member_added"
  | "agent_run";

interface ActivityEvent {
  kind: ActivityKind;
  at: string;
  title: string;
  actorName: string | null;
  meta?: Record<string, string | number | null>;
}

interface Props {
  mandateId: string;
}

const KIND_META: Record<
  ActivityKind,
  { icon: typeof Activity; label: string; color: string }
> = {
  chat_created: {
    icon: MessageSquare,
    label: "Chat",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  file_uploaded: {
    icon: FileText,
    label: "Datei",
    color: "text-blue-600 dark:text-blue-400",
  },
  deadline_added: {
    icon: Clock,
    label: "Frist",
    color: "text-amber-600 dark:text-amber-400",
  },
  time_logged: {
    icon: Timer,
    label: "Zeit",
    color: "text-slate-500 dark:text-slate-400",
  },
  party_added: {
    icon: Users,
    label: "Partei",
    color: "text-purple-600 dark:text-purple-400",
  },
  member_added: {
    icon: UserPlus,
    label: "Mitglied",
    color: "text-slate-500 dark:text-slate-400",
  },
  agent_run: {
    icon: Cpu,
    label: "Agent",
    color: "text-indigo-600 dark:text-indigo-400",
  },
};

/* Relative time, German, low-noise: "vor 3 Min", "vor 2 Std",
   "vor 5 Tagen", or absolute date for older items. */
function relativeTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diffMs = now - t;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `vor ${diffHr} Std`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `vor ${diffDay} ${diffDay === 1 ? "Tag" : "Tagen"}`;
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function MandateActivityFeed({ mandateId }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}/activity`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { events: ActivityEvent[] };
        setEvents(data.events ?? []);
        setError(null);
      } else {
        setError(`HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [mandateId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700/60 dark:bg-slate-900/30">
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          <Loader2 size={11} className="animate-spin" /> Lädt Aktivität…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
        <span className="text-[11.5px] text-red-700 dark:text-red-300">
          Aktivität konnte nicht geladen werden: {error}
        </span>
      </section>
    );
  }

  if (events.length === 0) {
    /* New / quiet mandates: hidden entirely so the page stays clean. */
    return null;
  }

  const newestAt = events[0].at;

  return (
    <section
      id="activity"
      className="mb-6 scroll-mt-20 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900/30"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="activity-feed-body"
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50"
      >
        <div className="flex min-w-0 items-center gap-2">
          {open ? (
            <ChevronDown size={13} className="shrink-0 text-slate-400" />
          ) : (
            <ChevronRight size={13} className="shrink-0 text-slate-400" />
          )}
          <Activity
            size={12}
            className="shrink-0 text-slate-500 dark:text-slate-400"
          />
          <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
            Aktivität
          </span>
          <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
            · {events.length} Ereigniss{events.length === 1 ? "" : "e"} ·
            zuletzt {relativeTime(newestAt)}
          </span>
        </div>
      </button>

      {open && (
        <ul
          id="activity-feed-body"
          className="divide-y divide-slate-100 border-t border-slate-200 px-4 py-2 dark:divide-slate-800 dark:border-slate-700/60"
        >
          {events.map((e, i) => {
            const meta = KIND_META[e.kind];
            const Icon = meta.icon;
            const chatId =
              e.kind === "chat_created" && typeof e.meta?.chatId === "string"
                ? e.meta.chatId
                : null;
            return (
              <li
                key={`${e.kind}-${e.at}-${i}`}
                className="flex items-start gap-3 py-2"
              >
                <Icon size={12} className={`mt-0.5 shrink-0 ${meta.color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-[10.5px] uppercase tracking-wide text-slate-400">
                      {meta.label}
                    </span>
                    {chatId ? (
                      <Link
                        href={`/atlas/chat/${chatId}`}
                        className="text-[12.5px] text-slate-800 hover:underline dark:text-slate-100"
                      >
                        {e.title}
                      </Link>
                    ) : (
                      <span className="text-[12.5px] text-slate-800 dark:text-slate-100">
                        {e.title}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {e.actorName && <span>{e.actorName} · </span>}
                    {relativeTime(e.at)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
