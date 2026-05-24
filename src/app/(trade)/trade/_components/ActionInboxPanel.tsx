/**
 * ActionInboxPanel — Today's Action Inbox on /trade welcome (U-HIGH-1).
 *
 * Linear-style flat list of "needs action right now" items aggregated
 * across cohorts (blocked operations, expiring licenses, awaiting EUCs,
 * party screening triage, VSD deadlines). Each row has a severity
 * icon, title, optional subtitle, optional countdown chip, and a deep-
 * link to the source detail page.
 *
 * MVP scope (Phase 4a):
 *   - Read-only — clicking the row navigates to the source page where
 *     the operator can take action with full context.
 *   - No per-row Snooze / Resolve actions yet (those need mutation API
 *     + per-user persistence; deferred to a later sprint).
 *
 * Visual rules:
 *   - When the inbox is empty: render an explicit "All clear" state so
 *     the panel doesn't look broken / loading. Empty is a GOOD outcome.
 *   - When the inbox has items: show the top 8 inline + "Show all (N)"
 *     toggle to expand. Keeps the welcome page compact on busy orgs.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  type ActionItem,
  type ActionSeverity,
  severityToneClass,
  severityChipBg,
  severityLabel,
} from "@/lib/trade/action-inbox-aggregator";

const SEVERITY_ICONS: Record<ActionSeverity, LucideIcon> = {
  critical: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
};

const INITIAL_VISIBLE = 8;

interface Props {
  items: ReadonlyArray<ActionItem>;
}

export function ActionInboxPanel({ items }: Props) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE);
  const hiddenCount = Math.max(0, items.length - INITIAL_VISIBLE);

  return (
    <section
      aria-labelledby="action-inbox-heading"
      className="mb-8 rounded-md border border-trade-border-subtle bg-trade-bg-panel"
    >
      <header className="flex items-center justify-between gap-3 border-b border-trade-border-subtle px-5 py-3">
        <div className="flex items-center gap-2">
          <h2
            id="action-inbox-heading"
            className="text-[13px] font-semibold text-trade-text-primary"
          >
            Today&rsquo;s action inbox
          </h2>
          {items.length > 0 ? (
            <span
              className="rounded-full bg-trade-bg-subtle px-2 py-0.5 text-[10px] font-semibold tabular-nums text-trade-text-secondary"
              aria-label={`${items.length} items need attention`}
            >
              {items.length}
            </span>
          ) : null}
        </div>
        <p className="text-[11px] text-trade-text-muted">
          What needs human action right now.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyAllClear />
      ) : (
        <>
          <ul
            className="divide-y divide-trade-border-subtle"
            // role="list" survives the divide-y override in some screen
            // reader heuristics that drop list semantics from styled lists.
            role="list"
          >
            {visible.map((item) => (
              <li key={item.id} role="listitem">
                <InboxRow item={item} />
              </li>
            ))}
          </ul>
          {hiddenCount > 0 ? (
            <div className="border-t border-trade-border-subtle px-5 py-2 text-right">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="text-[11px] font-semibold text-trade-text-secondary transition hover:text-trade-text-primary"
              >
                {expanded
                  ? "Show top 8 only ↑"
                  : `Show all ${items.length} items ↓`}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function InboxRow({ item }: { item: ActionItem }) {
  const Icon = SEVERITY_ICONS[item.severity];
  const toneClass = severityToneClass(item.severity);
  const chipBg = severityChipBg(item.severity);
  return (
    <Link
      href={item.href}
      className="group flex items-start gap-3 px-5 py-3 transition hover:bg-trade-bg-elevated"
    >
      <div
        aria-hidden="true"
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${chipBg}`}
      >
        <Icon className={`h-4 w-4 ${toneClass}`} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-[13px] font-medium text-trade-text-primary">
            {item.title}
          </p>
          {item.countdown ? (
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${chipBg} ${toneClass}`}
            >
              {item.countdown}
            </span>
          ) : null}
        </div>
        {item.subtitle ? (
          <p className="mt-0.5 truncate text-[12px] text-trade-text-secondary">
            {item.subtitle}
          </p>
        ) : null}
      </div>
      {/* Severity label for screen readers — visible icon + colour
          alone isn't sufficient WCAG-wise. */}
      <span className="sr-only">Severity: {severityLabel(item.severity)}</span>
      <ChevronRight
        aria-hidden="true"
        className="mt-1 h-4 w-4 shrink-0 text-trade-text-muted opacity-0 transition group-hover:opacity-100"
      />
    </Link>
  );
}

function EmptyAllClear() {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
      <div
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50"
      >
        <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={1.75} />
      </div>
      <p className="text-[13px] font-semibold text-trade-text-primary">
        All clear
      </p>
      <p className="max-w-sm text-[12px] text-trade-text-secondary">
        Nothing needs human action right now. New blocked operations, expiring
        licenses, screening hits, and approaching deadlines will surface here as
        they arise.
      </p>
      <Link
        href="/trade/astra"
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-trade-border-subtle bg-trade-bg-elevated px-3 py-1.5 text-[11px] font-medium text-trade-text-secondary transition hover:border-trade-accent hover:text-trade-text-primary"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Ask Astra what to work on next
      </Link>
    </div>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
