"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Workflow Catalog (UI refresh, theme-aware).
 *
 * Lists all 12+ workflows from the library, grouped by category, with
 * a category-filter strip across the top. Click → navigates to
 * /atlas?prompt=<urlencoded> so the homepage pre-fills + the user can
 * tweak before sending.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Wrench, Star } from "lucide-react";
import {
  WORKFLOW_LIBRARY,
  listCategories,
  type Workflow,
  type WorkflowCategory,
} from "@/lib/atlas/workflow-library";

export function WorkflowCatalog() {
  const router = useRouter();
  const [filter, setFilter] = useState<WorkflowCategory | "all">("all");
  const categories = listCategories();

  const visible =
    filter === "all"
      ? WORKFLOW_LIBRARY
      : WORKFLOW_LIBRARY.filter((w) => w.category === filter);

  const handleLaunch = (w: Workflow) => {
    /* Navigate to homepage with the prompt pre-filled in URL. The
       homepage reads ?prompt= on mount and seeds the input. */
    const url = `/atlas?prompt=${encodeURIComponent(w.startingPrompt)}&workflowId=${encodeURIComponent(w.id)}`;
    router.push(url);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <Link
          href="/atlas"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={12} /> Zurück zu Atlas
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Workflow-Bibliothek
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {WORKFLOW_LIBRARY.length} kuratierte Workflows für die häufigsten
          Anwalts-Aufgaben in Weltraum-Regulatorik. Klick auf einen Workflow →
          Atlas öffnet einen neuen Chat mit vorgefülltem Prompt.
        </p>
      </header>

      {/* Category filter */}
      <div className="mb-8 flex flex-wrap gap-2">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={`Alle (${WORKFLOW_LIBRARY.length})`}
        />
        {categories.map((c) => (
          <FilterChip
            key={c.category}
            active={filter === c.category}
            onClick={() => setFilter(c.category)}
            label={`${c.label} (${c.count})`}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {visible.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => handleLaunch(w)}
            className="group flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/40 dark:hover:border-emerald-500/50 dark:hover:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">{w.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                    {w.name}
                  </span>
                  {w.isQuickstart && (
                    <Star
                      size={11}
                      className="text-amber-500 dark:text-amber-400"
                      aria-label="Quickstart"
                    />
                  )}
                </div>
                <span className="mt-1 line-clamp-2 block text-[12px] leading-snug text-slate-600 dark:text-slate-400">
                  {w.description}
                </span>
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-2 text-[10px] text-slate-500 dark:border-slate-800">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {w.category}
              </span>
              {w.estimatedMinutes && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={10} /> ~{w.estimatedMinutes} Min
                </span>
              )}
              {w.expectedTools && w.expectedTools.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Wrench size={10} /> {w.expectedTools.length} Tools
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        active
          ? "border border-slate-900 bg-slate-900 text-white dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
          : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
      }`}
    >
      {label}
    </button>
  );
}
