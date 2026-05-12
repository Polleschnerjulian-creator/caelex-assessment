"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Quickstart cards on the homepage (Sprint 6 refactor).
 *
 * Now sources from the central WORKFLOW_LIBRARY (`isQuickstart: true`)
 * instead of a hand-maintained array. Adding a new quickstart =
 * flipping the flag in workflow-library.ts. Plus a "Mehr Workflows →"
 * link to the full /atlas/workflows catalog.
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
  const quickstarts = listWorkflows({ quickstartsOnly: true });
  return (
    <div>
      <p className="mb-3 text-center text-[11px] uppercase tracking-wider text-slate-500">
        Schnellstarts
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {quickstarts.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onPick(q.startingPrompt, q.name)}
            className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-left transition-colors hover:border-emerald-500/40 hover:bg-slate-900"
          >
            <span className="text-lg leading-none">{q.emoji}</span>
            <span className="flex-1">
              <span className="block text-[13px] font-medium text-slate-100">
                {q.name}
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-slate-500 line-clamp-2">
                {q.description}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 text-center">
        <Link
          href="/atlas/workflows"
          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-emerald-300"
        >
          Mehr Workflows
          <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}
