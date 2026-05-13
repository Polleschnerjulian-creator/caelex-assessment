"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate-Index Client.
 *
 * Filter (Status), Sort (Last-Activity / Name / Open-Deadlines),
 * Search (über name + clientName) — alles client-side über die
 * initial geladene Liste vom Server. Cards aus MandateIndexCard.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { MandateIndexCard, type IndexMandate } from "./MandateIndexCard";

type SortKey = "recent" | "name" | "deadlines";
type StatusFilter = "active" | "archived" | "closed" | "all";

interface Props {
  mandates: IndexMandate[];
}

export function MandateIndexClient({ mandates }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filteredByStatus =
      statusFilter === "all"
        ? mandates
        : mandates.filter((m) => m.status === statusFilter);
    const filteredByQuery =
      q.length === 0
        ? filteredByStatus
        : filteredByStatus.filter(
            (m) =>
              m.name.toLowerCase().includes(q) ||
              (m.clientName ?? "").toLowerCase().includes(q),
          );
    const sorted = [...filteredByQuery];
    if (sortKey === "recent") {
      sorted.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    } else if (sortKey === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "de"));
    } else if (sortKey === "deadlines") {
      sorted.sort(
        (a, b) => (b._count?.deadlines ?? 0) - (a._count?.deadlines ?? 0),
      );
    }
    return sorted;
  }, [mandates, query, statusFilter, sortKey]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-white/[0.08]">
        <h1 className="text-[18px] font-medium tracking-tight text-slate-900 dark:text-slate-100">
          Mandate
        </h1>
        <Link
          href="/atlas/mandate/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
        >
          <Plus size={13} />
          Neues Mandat
        </Link>
      </div>

      {/* Filters / Search */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-3 dark:border-white/[0.05]">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-black/[0.04] px-2.5 py-1.5 dark:bg-white/[0.04]">
          <Search size={13} className="shrink-0 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mandat suchen…"
            aria-label="Mandat suchen"
            className="w-full bg-transparent text-[13px] outline-none focus-visible:outline-none placeholder:text-slate-500 dark:text-slate-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12.5px] text-slate-700 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-200"
          aria-label="Status filtern"
        >
          <option value="active">Aktiv</option>
          <option value="archived">Archiviert</option>
          <option value="closed">Abgeschlossen</option>
          <option value="all">Alle</option>
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12.5px] text-slate-700 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-200"
          aria-label="Sortierung"
        >
          <option value="recent">Letzte Aktivität</option>
          <option value="name">Name (A-Z)</option>
          <option value="deadlines">Offene Deadlines</option>
        </select>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[14px] text-slate-500 dark:text-slate-400">
              {query.trim() || statusFilter !== "active"
                ? "Keine Mandate für diese Filter."
                : "Noch keine Mandate angelegt."}
            </p>
            {!(query.trim() || statusFilter !== "active") && (
              <Link
                href="/atlas/mandate/new"
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
              >
                <Plus size={13} />
                Erstes Mandat anlegen
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((m) => (
              <MandateIndexCard key={m.id} mandate={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
