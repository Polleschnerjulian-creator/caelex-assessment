"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Cumulative-usage indicator.
 *
 * Claude-Code-style donut showing the CUMULATIVE token spend across
 * the entire chat (sum of input + output tokens across every
 * assistant turn). Grows monotonically as the conversation
 * progresses — matches the lawyer's intuition of "wie viel hat
 * dieser Chat bisher verbraucht?".
 *
 * The 200k denominator is Sonnet 4.5's input context limit, used
 * here as a soft "consider starting a new chat" budget marker. A
 * chat that crosses ~80 % is approaching both the model's hard
 * input limit on the next turn AND a meaningful € spend.
 *
 * Color stops:
 *   < 50 %  emerald  — plenty of budget
 *   < 75 %  amber    — getting fuller
 *   ≥ 75 %  red      — consider starting a new chat
 *
 * Hover/focus surfaces the breakdown (cumulative input, output,
 * total, cost) via a small popover.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef, useState } from "react";

/* Sonnet 4.5 (claude-sonnet-4-6) — 200k input context window. Used
   here as a soft cumulative-spend budget; the actual hard limit is
   per-turn input only, but 200k of cumulative tokens is also a good
   "this chat is getting expensive" threshold. */
const BUDGET_TOKENS = 200_000;

interface Props {
  /** CUMULATIVE input tokens across every assistant turn so far.
   *  Grows monotonically as the conversation progresses. */
  totalInputTokens: number;
  /** CUMULATIVE output tokens across every assistant turn. */
  totalOutputTokens: number;
  /** CUMULATIVE spend in USD across every assistant turn. */
  totalCostUsd: number;
  /** Compact form — for in-composer placement: smaller icon, no
   *  percentage text. The full chat-header variant still shows the
   *  number. */
  compact?: boolean;
}

export function ContextWindowIndicator({
  totalInputTokens,
  totalOutputTokens,
  totalCostUsd,
  compact = false,
}: Props) {
  /* Two independent visibility flags so hover-UX (desktop) and click-
     toggle-UX (touch + keyboard) compose cleanly. The popover is shown
     when EITHER is true; clicking pins it open across hover-out, and
     hovering still reveals it on desktop without requiring a tap. */
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Click-outside dismisses the pinned popover. Mousedown (not click)
     so the popover closes BEFORE any focused control inside steals
     focus, which feels snappier and avoids a flash. */
  useEffect(() => {
    if (!pinned) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setPinned(false);
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [pinned]);

  /* Esc dismisses the pinned popover. Only attached when pinned to
     avoid swallowing Esc elsewhere (composer, modal). */
  useEffect(() => {
    if (!pinned) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPinned(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pinned]);

  const popoverOpen = hover || pinned;

  /* Total burn = input + output. The donut fills toward the soft
     200k budget. Caps at 100 % so the visual stays sensible even
     for marathon chats that overflow the budget. */
  const tokens = totalInputTokens + totalOutputTokens;
  const pct = Math.min(1, tokens / BUDGET_TOKENS);
  const pctDisplay = Math.round(pct * 100);

  const color =
    tokens === 0
      ? {
          /* Neutral grey at 0 % — fresh chat shouldn't read as
             "low usage emerald", it should read as "nothing yet". */
          ring: "stroke-slate-400 dark:stroke-slate-500",
          text: "text-slate-500 dark:text-slate-400",
        }
      : pct < 0.5
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
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <button
        type="button"
        onClick={() => setPinned((p) => !p)}
        aria-label={`Verbraucht: ${pctDisplay} % des Budgets`}
        aria-expanded={popoverOpen}
        aria-haspopup="dialog"
        className={`inline-flex items-center rounded-full transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05] ${
          compact ? "h-7 w-7 justify-center" : "gap-1.5 px-2 py-1"
        }`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="-rotate-90"
        >
          <circle
            cx="8"
            cy="8"
            r={r}
            fill="none"
            strokeWidth="1.6"
            className="stroke-slate-200 dark:stroke-white/[0.08]"
          />
          {dash > 0 && (
            <circle
              cx="8"
              cy="8"
              r={r}
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              className={`${color.ring} transition-all duration-500 motion-reduce:transition-none`}
            />
          )}
        </svg>
        {!compact && (
          <span
            className={`text-[11px] font-medium tabular-nums ${color.text}`}
          >
            {pctDisplay}%
          </span>
        )}
      </button>

      {popoverOpen && (
        <div
          role="dialog"
          aria-label="Token-Verbrauch dieses Chats"
          className={`absolute right-0 z-30 w-64 rounded-lg border border-slate-200 bg-white p-3 text-[11.5px] shadow-[0_8px_24px_rgba(0,0,0,0.10)] dark:border-white/[0.08] dark:bg-[#2a2a2a] dark:shadow-[0_8px_24px_rgba(0,0,0,0.40)] ${
            compact ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-white/[0.05]">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Verbrauch
            </span>
            <span className={`tabular-nums ${color.text}`}>{pctDisplay}%</span>
          </div>
          <Row
            label="Insgesamt"
            value={`${formatTokens(tokens)} / ${formatTokens(BUDGET_TOKENS)}`}
          />
          <Row label="Input (kum.)" value={formatTokens(totalInputTokens)} />
          <Row label="Output (kum.)" value={formatTokens(totalOutputTokens)} />
          <Row label="Kosten (kum.)" value={`$${totalCostUsd.toFixed(4)}`} />
          <div className="mt-2 border-t border-slate-100 pt-2 text-[10.5px] leading-snug text-slate-500 dark:border-white/[0.05]">
            Modell: Claude Sonnet 4.5 · Budget 200k Tokens.
            {pct >= 0.75 &&
              " Erwäge einen neuen Chat — bei > 75 % wird's spürbar teurer."}
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
