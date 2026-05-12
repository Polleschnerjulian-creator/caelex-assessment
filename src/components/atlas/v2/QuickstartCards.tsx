"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Quickstart row (UI refresh 2026-05-12).
 *
 * Replaced the dense 6-card grid with ChatGPT's chip-row pattern:
 *   - 4 chip-pills max (top isQuickstart workflows)
 *   - Single icon + name + (optional one-line hint on hover)
 *   - "Mehr Workflows →" link to the full catalog
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listWorkflows } from "@/lib/atlas/workflow-library";

interface Props {
  onPick: (promptHint: string, titleHint: string) => void;
}

export function QuickstartCards({ onPick }: Props) {
  const all = listWorkflows({ quickstartsOnly: true });
  /* Render up to 4 most-relevant. The catalog page shows the full set. */
  const visible = all.slice(0, 4);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {visible.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onPick(q.startingPrompt, q.name)}
            title={q.description}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-300 dark:hover:border-white/[0.12] dark:hover:bg-white/[0.05] dark:hover:text-slate-100"
          >
            <span className="text-base leading-none">{q.emoji}</span>
            <span>{q.name}</span>
          </button>
        ))}
      </div>
      <Link
        href="/atlas/workflows"
        className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
      >
        Mehr Workflows
        <ArrowRight size={11} />
      </Link>
    </div>
  );
}
