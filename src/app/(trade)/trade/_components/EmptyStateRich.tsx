"use client";

/**
 * EmptyStateRich — shared empty-state panel used by all Trade list pages.
 *
 * Replaces the per-page EmptyState components that each rendered only
 * an icon + title + description + single CTA. The "rich" variant adds
 * a secondary actions row underneath the primary CTA so first-time
 * users don't hit a dead-end when their list is empty.
 *
 * Why this matters (UX-finding U-HIGH-4):
 *   When a workspace has zero items / zero counterparties / zero
 *   licenses, the bare "Add first X" panel sends the message "do all
 *   the data entry yourself, alone, from scratch". Operators new to
 *   the platform abandon. The secondary row signals "you have helpers"
 *   — Astra knows the regulations, you can import bulk data later,
 *   you can learn the workflow first. That single design change is
 *   the difference between first-task completion and bounce.
 *
 * Secondary actions are intentionally optional + variable per page:
 *   - Astra prompt: ALWAYS shown, pre-fills the Astra chat with a
 *     page-appropriate question.
 *   - Related-entity browse: contextual ("Browse counterparties" on
 *     items page, "Find an item to classify" on parties page).
 *   - Docs / learn link: shown when we have a relevant explainer.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import Link from "next/link";
import { Plus, Sparkles, type LucideIcon } from "lucide-react";

export interface SecondaryAction {
  label: string;
  /** Either href for a navigation link, OR onClick for a local action. */
  href?: string;
  onClick?: () => void;
  /** Optional lucide icon. Defaults to no icon when omitted. */
  icon?: LucideIcon;
}

export interface AstraPrompt {
  /** Visible label, e.g. "Ask Astra: How do I classify a satellite?" */
  label: string;
  /** Question text Astra will be pre-filled with on landing. */
  prefill: string;
}

interface Props {
  /** Big illustrative icon at the top. */
  icon: LucideIcon;
  /** Headline — "No trade items yet" etc. */
  title: string;
  /** 1-2 sentence supportive description. */
  description: string;
  /** Primary CTA (e.g. "New item"). Always rendered. */
  primaryAction: {
    label: string;
    onClick: () => void;
    /** Icon override; defaults to Plus. */
    icon?: LucideIcon;
  };
  /** Astra deep-link — the always-on assistive shortcut. */
  astra?: AstraPrompt;
  /** Optional list of secondary navigation/action links. */
  secondaryActions?: ReadonlyArray<SecondaryAction>;
}

export function EmptyStateRich({
  icon: Icon,
  title,
  description,
  primaryAction,
  astra,
  secondaryActions,
}: Props) {
  const PrimaryIcon = primaryAction.icon ?? Plus;
  return (
    <div className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated px-8 py-12 text-center">
      <div
        aria-hidden="true"
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-trade-accent-soft text-trade-accent-strong"
      >
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>

      <h3 className="mb-1.5 text-[15px] font-semibold text-trade-text-primary">
        {title}
      </h3>
      <p className="mx-auto mb-6 max-w-md text-[13px] leading-relaxed text-trade-text-secondary">
        {description}
      </p>

      {/* Primary CTA — the "do the obvious thing" path */}
      <button
        onClick={primaryAction.onClick}
        className="inline-flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-trade-accent-strong"
      >
        <PrimaryIcon className="h-4 w-4" aria-hidden="true" />
        {primaryAction.label}
      </button>

      {/* Secondary helpers — Astra + related links. Quiet styling so they
          don't compete with the primary CTA, but reachable when "Add new"
          isn't actually the user's first instinct. */}
      {(astra || (secondaryActions && secondaryActions.length > 0)) && (
        <div className="mx-auto mt-7 flex max-w-md flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-trade-border-subtle pt-5 text-[12px] text-trade-text-muted">
          {astra ? (
            <Link
              href={`/trade/astra?prefill=${encodeURIComponent(astra.prefill)}`}
              className="inline-flex items-center gap-1.5 text-trade-text-secondary transition hover:text-trade-text-primary"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {astra.label}
            </Link>
          ) : null}
          {secondaryActions?.map((action) => {
            const ActionIcon = action.icon;
            const content = (
              <>
                {ActionIcon ? (
                  <ActionIcon className="h-3.5 w-3.5" aria-hidden="true" />
                ) : null}
                {action.label}
              </>
            );
            if (action.href) {
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="inline-flex items-center gap-1.5 text-trade-text-secondary transition hover:text-trade-text-primary"
                >
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-1.5 text-trade-text-secondary transition hover:text-trade-text-primary"
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
