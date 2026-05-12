"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Context-window indicator.
 *
 * Claude-Code-style donut showing how much of Sonnet 4.5's 200k token
 * context window the current conversation has consumed. The visible
 * data point is the LAST assistant message's `inputTokens` — that
 * value represents the cumulative conversation Anthropic saw on the
 * most recent turn (system-prompt + every user/assistant turn so far
 * + tool-use traces). It's the right proxy for "am I about to bump
 * the model's context limit?".
 *
 * Color stops:
 *   < 50 %  emerald  — plenty of room
 *   < 75 %  amber    — getting fuller
 *   ≥ 75 %  red      — consider starting a new chat
 *
 * Hover/focus surfaces the breakdown (input + output + total + cost)
 * via a small popover so the lawyer can sanity-check the spend.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";

/* Sonnet 4.5 (claude-sonnet-4-6) — 200k input context window. Pinned
   here rather than imported from the engine so the UI stays self-
   contained; if we ever bump the model, both files update once. */
const CONTEXT_WINDOW_TOKENS = 200_000;

interface Props {
  /** Latest assistant turn's input tokens — represents the full
   *  conversation context as Anthropic last saw it. Pass null when
   *  the chat hasn't received an assistant turn yet (the indicator
   *  hides itself in that case). */
  lastInputTokens: number | null;
  /** Cumulative output tokens across the chat (sum of all
   *  assistant messages). Only used for the hover-tooltip detail. */
  totalOutputTokens: number;
  /** Cumulative spend across the chat in USD. */
  totalCostUsd: number;
}

export function ContextWindowIndicator({
  lastInputTokens,
  totalOutputTokens,
  totalCostUsd,
}: Props) {
  const [hover, setHover] = useState(false);

  /* Hide entirely when the chat has had no assistant turns yet —
     showing 0% would be visual noise on the empty-chat skeleton. */
  if (lastInputTokens === null || lastInputTokens === 0) return null;

  const pct = Math.min(1, lastInputTokens / CONTEXT_WINDOW_TOKENS);
  const pctDisplay = Math.round(pct * 100);

  const color =
    pct < 0.5
      ? {
          ring: "stroke-emerald-500",
          text: "text-emerald-600 dark:text-emerald-400",
        }
      : pct < 0.75
        ? {
            ring: "stroke-amber-500",
            text: "text-amber-600 dark:text-amber-400",
          }
        : { ring: "stroke-red-500", text: "text-red-600 dark:text-red-400" };

  /* Donut math: 16x16 viewBox, radius 6, circumference ≈ 37.7. The
     stroke-dasharray trick draws an arc proportional to `pct`. */
  const r = 6;
  const c = 2 * Math.PI * r;
  const dash = pct * c;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <button
        type="button"
        aria-label={`Kontextfenster: ${pctDisplay} % belegt`}
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium tabular-nums text-slate-600 transition-colors hover:bg-black/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.05]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="-rotate-90"
        >
          {/* Track — full circle in the canvas's neutral grey. */}
          <circle
            cx="8"
            cy="8"
            r={r}
            fill="none"
            strokeWidth="1.6"
            className="stroke-slate-200 dark:stroke-white/[0.08]"
          />
          {/* Progress arc — colour-stopped per pct. */}
          <circle
            cx="8"
            cy="8"
            r={r}
            fill="none"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            className={`${color.ring} transition-all duration-500`}
          />
        </svg>
        <span className={color.text}>{pctDisplay}%</span>
      </button>

      {hover && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-64 rounded-lg border border-slate-200 bg-white p-3 text-[11.5px] shadow-[0_8px_24px_rgba(0,0,0,0.10)] dark:border-white/[0.08] dark:bg-[#2a2a2a] dark:shadow-[0_8px_24px_rgba(0,0,0,0.40)]">
          <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-white/[0.05]">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Kontextfenster
            </span>
            <span className={`tabular-nums ${color.text}`}>{pctDisplay}%</span>
          </div>
          <Row
            label="Aktueller Turn"
            value={`${formatTokens(lastInputTokens)} / ${formatTokens(CONTEXT_WINDOW_TOKENS)}`}
          />
          <Row
            label="Antwort-Tokens (kum.)"
            value={formatTokens(totalOutputTokens)}
          />
          <Row label="Kosten (kum.)" value={`$${totalCostUsd.toFixed(4)}`} />
          <div className="mt-2 border-t border-slate-100 pt-2 text-[10.5px] leading-snug text-slate-500 dark:border-white/[0.05]">
            Modell: Claude Sonnet 4.5 · 200k Tokens.
            {pct >= 0.75 &&
              " Erwäge einen neuen Chat — bei > 75 % steigt das Risiko von Antwortabbrüchen."}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className="tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}

/* Compact token formatter — 12,345 → "12k", 1,200,000 → "1.2M" so
   the donut tooltip stays narrow on the right edge of the header. */
function formatTokens(n: number): string {
  if (n < 1_000) return n.toString();
  if (n < 1_000_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
