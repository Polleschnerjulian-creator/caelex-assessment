"use client";

/**
 * ModuleWhySidebar — explains "why am I seeing THESE controls?" at the
 * top of a compliance module page. Renders the overall scoping decision
 * in a compact info-panel with dimension-by-dimension breakdown.
 *
 * Designed to be drop-in for any module page that computes applicability
 * from a deterministic filter. Accepts a pre-shaped ModuleScope object
 * so the module page keeps its own domain-specific scope logic — this
 * component is pure presentation.
 */

import { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

export interface ModuleScope {
  headline: string;
  bullets: string[];
}

interface ModuleWhySidebarProps {
  scope: ModuleScope;
  /** Optional CTA link — e.g. "Edit Profile →" when scoping is driven
   *  by the operator profile and the user wants to change it. */
  editHref?: string;
  /** Initially open or collapsed. Defaults to collapsed — the value is
   *  a one-line teaser the user can choose to expand. */
  defaultOpen?: boolean;
}

export function ModuleWhySidebar({
  scope,
  editHref,
  defaultOpen = false,
}: ModuleWhySidebarProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-emerald-500/5 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span className="text-sm text-[var(--text-primary)] truncate">
            <span className="font-medium">{scope.headline}</span>
            {!open && (
              <span className="ml-2 text-xs text-[var(--text-tertiary)]">
                · Click for scope breakdown
              </span>
            )}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-3 pt-1 border-t border-emerald-500/10">
          <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mb-2 mt-2">
            Why these controls?
          </p>
          <ul className="space-y-1.5">
            {scope.bullets.map((b) => (
              <li
                key={b}
                className="text-xs text-[var(--text-secondary)] flex items-start gap-2"
              >
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {editHref && (
            <a
              href={editHref}
              className="inline-block mt-3 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Edit profile to change scope →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default ModuleWhySidebar;
