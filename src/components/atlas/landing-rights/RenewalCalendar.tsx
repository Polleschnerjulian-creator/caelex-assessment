/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 *
 * Month-grouped renewal/milestone calendar. Pure Server Component —
 * events are statically computed at build time.
 */

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { CalendarEvent } from "@/data/landing-rights";
import { formatDaysUntil } from "@/data/landing-rights/calendar";

const TYPE_LABEL: Record<CalendarEvent["type"], string> = {
  license_renewal: "Renewal",
  milestone: "Milestone",
  wrc: "WRC",
  biu_deadline: "BIU",
  regulatory_change: "Regulatory",
  enforcement: "Enforcement",
};

const TYPE_COLOR: Record<CalendarEvent["type"], string> = {
  license_renewal: "bg-emerald-50 text-emerald-700 border-emerald-200",
  milestone: "bg-blue-50 text-blue-700 border-blue-200",
  wrc: "bg-purple-50 text-purple-700 border-purple-200",
  biu_deadline: "bg-amber-50 text-amber-700 border-amber-200",
  regulatory_change:
    "bg-[var(--atlas-bg-surface-muted)] text-[var(--atlas-text-secondary)] border-[var(--atlas-border)]",
  enforcement: "bg-red-50 text-red-700 border-red-200",
};

function monthKey(date: string): string {
  return date.slice(0, 7); // YYYY-MM
}

function formatMonth(key: string): string {
  const [year, month] = key.split("-");
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${MONTHS[parseInt(month ?? "1", 10) - 1]} ${year}`;
}

export function RenewalCalendar({ events }: { events: CalendarEvent[] }) {
  const grouped = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = monthKey(e.date);
    const list = grouped.get(key) ?? [];
    list.push(e);
    grouped.set(key, list);
  }

  return (
    <div className="flex flex-col gap-8">
      {[...grouped.entries()].map(([month, monthEvents]) => (
        <section key={month} className="relative">
          <div className="sticky top-0 z-10 bg-[#F7F8FA] py-2 -my-2 mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--atlas-text-muted)]">
              {formatMonth(month)}
            </h3>
          </div>
          <ul className="space-y-2">
            {monthEvents.map((event) => (
              <li
                key={event.id}
                className={`flex items-start gap-4 p-4 rounded-xl bg-[var(--atlas-bg-surface)] border ${event.status === "past" ? "border-[var(--atlas-border-subtle)] opacity-70" : "border-[var(--atlas-border-subtle)] hover:border-[var(--atlas-border-strong)] hover:shadow-sm"} transition-all`}
              >
                <div className="flex flex-col items-center w-16 flex-shrink-0 pt-0.5">
                  <span className="text-[11px] font-bold text-[var(--atlas-text-primary)]">
                    {event.date.split("-")[2] ?? "—"}
                  </span>
                  <span className="text-[9px] uppercase text-[var(--atlas-text-faint)] mt-0.5">
                    {formatDaysUntil(event.date)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-semibold uppercase tracking-wider ${TYPE_COLOR[event.type]}`}
                    >
                      {TYPE_LABEL[event.type]}
                    </span>
                    {event.status === "past" && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--atlas-text-faint)]">
                        ✓ Past
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-semibold text-[var(--atlas-text-primary)] leading-snug">
                    {event.title}
                  </p>
                  {event.description && (
                    <p className="text-[12px] text-[var(--atlas-text-secondary)] mt-1 leading-relaxed">
                      {event.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--atlas-text-muted)]">
                    {event.jurisdiction && (
                      <Link
                        href={`/atlas/landing-rights/${event.jurisdiction.toLowerCase()}`}
                        className="font-semibold hover:text-[var(--atlas-text-primary)]"
                      >
                        {event.jurisdiction}
                      </Link>
                    )}
                    {event.operator && <span>{event.operator}</span>}
                    {event.source_url && (
                      <a
                        href={event.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-emerald-700"
                      >
                        Official source <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
