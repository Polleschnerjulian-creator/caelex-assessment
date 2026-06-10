/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * UnknownsList — the prioritized unknowns section of the FULL result page
 * (plan Task 3.3, §6 (3)).
 *
 * Every "I'm not sure" the operator left behind is listed with WHAT ANSWERING
 * IT WOULD CHANGE — high-priority unknowns first (spectrum-existential
 * unknowns are "high", §4 Q9.2). Unknown rounds up (invariant #2): the copy
 * frames resolution as narrowing — an unresolved unknown never made the
 * verdict cleaner.
 *
 * Server-compatible presentational component (no hooks). Props are
 * structural (JSON-tolerant) — mirrors the pipeline's `UnknownToResolve`.
 */

import { HelpCircle } from "lucide-react";

export interface UnknownItem {
  questionId: string;
  question: string;
  whatAnsweringChanges: string;
  priority: "high" | "medium";
}

const PRIORITY_WEIGHT: Record<UnknownItem["priority"], number> = {
  high: 0,
  medium: 1,
};

const PRIORITY_CHIP: Record<
  UnknownItem["priority"],
  { label: string; className: string }
> = {
  high: {
    label: "High priority",
    className: "bg-black/[0.05] border-black/[0.18] text-black/75",
  },
  medium: {
    label: "Medium priority",
    className: "bg-black/[0.04] border-black/[0.12] text-black/60",
  },
};

export default function UnknownsList({
  unknowns,
}: {
  unknowns: UnknownItem[];
}) {
  if (unknowns.length === 0) {
    return (
      <p className="text-body text-black/60 leading-relaxed">
        No unknowns to resolve — every question in your tier was answered.
      </p>
    );
  }

  // Prioritized: high first; stable within a band (copy — no prop mutation).
  const ordered = [...unknowns].sort(
    (a, b) =>
      (PRIORITY_WEIGHT[a.priority] ?? 9) - (PRIORITY_WEIGHT[b.priority] ?? 9),
  );

  return (
    <ul className="space-y-3">
      {ordered.map((u) => {
        const chip = PRIORITY_CHIP[u.priority] ?? PRIORITY_CHIP.medium;
        return (
          <li
            key={u.questionId}
            className="rounded-xl bg-white border border-black/[0.08] p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <p className="inline-flex items-start gap-2 text-body text-[#1d1d1f] leading-snug">
                <HelpCircle
                  size={14}
                  className="mt-0.5 shrink-0 text-[#1d1d1f]"
                  aria-hidden="true"
                />
                {u.question}
              </p>
              <span
                className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full border text-micro uppercase tracking-[0.12em] ${chip.className}`}
              >
                {chip.label}
              </span>
            </div>
            <p className="text-small text-black/55 leading-relaxed pl-6">
              <span className="text-black/40">
                What answering it would change:
              </span>{" "}
              {u.whatAnsweringChanges}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
