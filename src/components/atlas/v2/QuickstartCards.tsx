"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Quickstart cards on the homepage.
 *
 * Click → fires onPick with the quickstart's promptHint so the
 * homepage can populate the input + auto-submit.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { QUICKSTARTS } from "./types";

interface Props {
  onPick: (promptHint: string, titleHint: string) => void;
}

export function QuickstartCards({ onPick }: Props) {
  return (
    <div>
      <p className="mb-3 text-center text-[11px] uppercase tracking-wider text-slate-500">
        Schnellstarts
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {QUICKSTARTS.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onPick(q.promptHint, q.title)}
            className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-left transition-colors hover:border-emerald-500/40 hover:bg-slate-900"
          >
            <span className="text-lg leading-none">{q.emoji}</span>
            <span className="flex-1">
              <span className="block text-[13px] font-medium text-slate-100">
                {q.title}
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-slate-500 line-clamp-2">
                {q.promptHint}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
