import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — Deadlines Tools (T0.1.g bundle-split, 2026-05-26).
 *
 * Time-aware companion to the static-corpus tools. Currently one
 * tool: `get_filing_deadlines`. Combines two data sources:
 *   (a) `regulatoryDeadlines` for recurring / launch-relative filings
 *       (annual reports, quarterly data submissions, EOL notices,
 *       ITU windows)
 *   (b) `REGULATION_TIMELINE` for one-time lifecycle events
 *       (EU Space Act effective dates, transition windows, FCC rule
 *       changes)
 *
 * Operator-type → applicableTo code mapping mirrors the dataset's
 * existing string codes (SCO/LO/EO_MISSION/PRS_USER/ALL).
 * Pass-through when the agent supplies no operator_type.
 *
 * Extracted from `atlas-tool-executor.ts` as part of T0.1.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  regulatoryDeadlines,
  type RegulatoryDeadline,
} from "@/data/timeline-deadlines";
import {
  REGULATION_TIMELINE,
  type RegulationPhase,
} from "@/data/regulation-timeline";

/* ── Result type ────────────────────────────────────────────────────── */

export interface DeadlinesToolResult {
  content: string;
  isError: boolean;
}

/* ── Tool definitions ───────────────────────────────────────────────── */

export const DEADLINES_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_filing_deadlines",
    description: `Returns upcoming regulatory filing windows + recurring deadlines an operator must hit. Three buckets: (a) recurring deadlines (annual reports, quarterly data submissions, ITU filings), (b) launch-anchored windows (X days before / after launch), (c) regulatory-lifecycle events (EU Space Act effective dates, FCC rule changes, transition windows).

Use when the user asks "I'm filing in Germany next month, what should I prepare?", "when is the next EU Space Act milestone?", "what deadlines apply to a constellation operator?", or "what's coming up in the next 90 days?".

Returns a structured list with: title, regulatory reference, due-date semantics (annual/launch-relative/one-time), priority (CRITICAL/HIGH/MEDIUM), penalty info if known, and the ATLAS-ID anchoring the deadline to its source. Filter inputs are optional — empty inputs return the global view.

The agent should render this as a chronologically-sorted list, not a generic table. Wrap the final answer with the legal-review disclaimer.`,
    input_schema: {
      type: "object",
      properties: {
        jurisdiction: {
          type: "string",
          description:
            "Optional. ISO alpha-2 jurisdiction code (DE, FR, UK, US, INT, EU). When supplied, narrows results to deadlines that target this jurisdiction. Otherwise returns multi-jurisdictional + INT/EU deadlines.",
        },
        operator_type: {
          type: "string",
          enum: [
            "satellite_operator",
            "launch_provider",
            "ground_segment",
            "in_orbit_services",
            "constellation_operator",
            "earth_observation",
          ],
          description:
            "Optional. Operator category — drops deadlines that don't apply to this class (e.g. ITU filings irrelevant for ground-segment-only).",
        },
        horizon_days: {
          type: "number",
          description:
            "Optional. Time-window in days from today. Default 365 (one year ahead). Use 90 for the partner's 'what's coming up next quarter' question; 30 for 'what's urgent this month'.",
          minimum: 7,
          maximum: 1825,
        },
      },
    },
  },
];

const DEADLINES_TOOL_NAMES = DEADLINES_TOOLS.map((t) => t.name) as string[];

export function isDeadlinesToolName(name: string): boolean {
  return DEADLINES_TOOL_NAMES.includes(name);
}

/* ── Tool execution ─────────────────────────────────────────────────── */

const FilingDeadlinesInput = z.object({
  jurisdiction: z.string().min(2).max(5).optional(),
  operator_type: z
    .enum([
      "satellite_operator",
      "launch_provider",
      "ground_segment",
      "in_orbit_services",
      "constellation_operator",
      "earth_observation",
    ])
    .optional(),
  horizon_days: z.number().int().min(7).max(1825).optional(),
});

const OPERATOR_CODE_MAP: Record<string, ReadonlySet<string>> = {
  satellite_operator: new Set(["SCO", "ALL"]),
  launch_provider: new Set(["LO", "ALL"]),
  ground_segment: new Set(["ALL"]),
  in_orbit_services: new Set(["SCO", "ALL"]),
  constellation_operator: new Set(["SCO", "ALL"]),
  earth_observation: new Set(["EO_MISSION", "SCO", "ALL"]),
};

/**
 * Heuristic: extract the jurisdiction tag from a regulatory reference
 * string. "ESA Convention Art. XI" → "INT", "EU Space Act Art. 50-54"
 * → "EU", "FCC Part 25" → "US", "ITU Radio Regulations" → "INT".
 * Returns null when nothing matches — caller treats null as
 * "applies broadly".
 */
function inferDeadlineJurisdiction(d: RegulatoryDeadline): string | null {
  const s = `${d.regulatoryRef} ${d.title}`.toLowerCase();
  if (/\beu\b|european union|eu space act|copernicus|galileo/.test(s))
    return "EU";
  if (
    /\bun\b|registration convention|liability convention|outer space treaty|copuos/.test(
      s,
    )
  )
    return "INT";
  if (/itu|international telecommunication/.test(s)) return "INT";
  if (/\besa\b|european space agency/.test(s)) return "INT";
  if (/\bfcc\b|us\b|noaa|nasa|faa/.test(s)) return "US";
  if (/\buk\b|united kingdom|ofcom|caa/.test(s)) return "UK";
  if (/\bbafa\b|bnetza|bmwk|deutsch/.test(s)) return "DE";
  if (/\bcnes\b|france|frança/.test(s)) return "FR";
  return null;
}

/** ISO date for the next occurrence of a recurring annual deadline. */
function nextAnnualOccurrence(month: number, day: number): Date {
  const now = new Date();
  const candidate = new Date(now.getFullYear(), month - 1, day);
  if (candidate.getTime() < now.getTime()) {
    return new Date(now.getFullYear() + 1, month - 1, day);
  }
  return candidate;
}

function getFilingDeadlines(input: unknown): DeadlinesToolResult {
  const parsed = FilingDeadlinesInput.safeParse(input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid tool input",
        code: "INVALID_INPUT",
        issues: parsed.error.flatten(),
      }),
      isError: true,
    };
  }
  const horizon = parsed.data.horizon_days ?? 365;
  const targetJur = parsed.data.jurisdiction?.toUpperCase();
  const opCodes = parsed.data.operator_type
    ? OPERATOR_CODE_MAP[parsed.data.operator_type]
    : null;

  const now = new Date();
  const horizonEnd = new Date(now.getTime() + horizon * 24 * 60 * 60 * 1000);

  // ── Bucket A: recurring + launch-relative deadlines ──
  const recurring = regulatoryDeadlines
    .filter((d) => {
      if (opCodes) {
        const hits = d.applicableTo.some((code) => opCodes.has(code));
        if (!hits) return false;
      }
      if (targetJur) {
        const inferred = inferDeadlineJurisdiction(d);
        if (inferred && inferred !== targetJur) {
          if (inferred !== "INT" && inferred !== "EU") return false;
        }
      }
      return true;
    })
    .map((d) => {
      let nextOccurrence: string | null = null;
      let kind:
        | "annual"
        | "quarterly"
        | "yearly"
        | "launch_relative"
        | "irregular" = "irregular";

      if (d.dueDate) {
        const next = nextAnnualOccurrence(d.dueDate.month, d.dueDate.day);
        nextOccurrence = next.toISOString().slice(0, 10);
        kind = "annual";
      } else if (d.recurrence?.includes("QUARTERLY")) {
        kind = "quarterly";
      } else if (d.recurrence?.includes("YEARLY")) {
        kind = "yearly";
      } else if (
        d.offsetAfterLaunch !== undefined ||
        d.offsetBeforeLaunch !== undefined
      ) {
        kind = "launch_relative";
      }
      return {
        id: d.id,
        title: d.title,
        description: d.description,
        kind,
        next_occurrence: nextOccurrence,
        recurrence: d.recurrence ?? null,
        offset_before_launch_days: d.offsetBeforeLaunch ?? null,
        offset_after_launch_days: d.offsetAfterLaunch ?? null,
        category: d.category,
        priority: d.priority,
        regulatory_ref: d.regulatoryRef,
        applicable_to: d.applicableTo,
        penalty_info: d.penaltyInfo ?? null,
        inferred_jurisdiction: inferDeadlineJurisdiction(d),
      };
    })
    .filter((row) => {
      if (row.kind === "annual" && row.next_occurrence) {
        const t = new Date(row.next_occurrence).getTime();
        return t >= now.getTime() && t <= horizonEnd.getTime();
      }
      return true;
    });

  // ── Bucket B: one-time regulatory-lifecycle events ──
  const lifecycle = REGULATION_TIMELINE.filter((p) => {
    if (p.status === "superseded") return false;
    const eff = new Date(p.effectiveDate).getTime();
    if (Number.isNaN(eff)) return false;
    if (eff < now.getTime()) return false;
    return eff <= horizonEnd.getTime();
  })
    .filter((p) => {
      if (!targetJur) return true;
      const text = `${p.regulation} ${p.applicableTo.join(" ")}`.toLowerCase();
      const targetLower = targetJur.toLowerCase();
      if (text.includes("eu ") || p.applicableTo.includes("all_eu_operators"))
        return true;
      return text.includes(targetLower);
    })
    .map((p: RegulationPhase) => ({
      id: p.id,
      title: p.regulation,
      description: p.notes,
      kind: "lifecycle" as const,
      effective_date: p.effectiveDate,
      transition_end_date: p.transitionEndDate ?? null,
      status: p.status,
      applicable_to: p.applicableTo,
      superseded_by: p.supersededBy ?? null,
    }))
    .sort(
      (a, b) =>
        new Date(a.effective_date).getTime() -
        new Date(b.effective_date).getTime(),
    );

  // ── Headlines: closest 3 dated events for the agent to highlight ──
  const datedRecurring = recurring
    .filter((r) => r.next_occurrence)
    .sort(
      (a, b) =>
        new Date(a.next_occurrence as string).getTime() -
        new Date(b.next_occurrence as string).getTime(),
    );
  const headlines = [
    ...datedRecurring.slice(0, 3).map((r) => ({
      kind: r.kind,
      title: r.title,
      date: r.next_occurrence,
      priority: r.priority,
    })),
    ...lifecycle.slice(0, 2).map((l) => ({
      kind: l.kind,
      title: l.title,
      date: l.effective_date,
      priority: "HIGH",
    })),
  ];

  const payload = {
    horizon_days: horizon,
    horizon_until: horizonEnd.toISOString().slice(0, 10),
    scope: {
      jurisdiction: targetJur ?? null,
      operator_type: parsed.data.operator_type ?? null,
    },
    headlines,
    recurring,
    lifecycle,
    counts: {
      recurring: recurring.length,
      lifecycle: lifecycle.length,
    },
    drafting_directives: [
      "Render as a chronologically-sorted list grouped by month, NOT a generic table.",
      "Annual deadlines go first (concrete dates), then launch-relative, then quarterly/yearly recurring without fixed dates, then lifecycle events.",
      "For launch-relative deadlines, write 'X days before launch' / 'Y days after launch' explicitly — don't fake a date.",
      "Cite the regulatory_ref string verbatim next to each entry.",
      "If horizon_days is 30 or 90, lead with: 'Within the next [N] days, the following filings come due:'.",
      "Wrap the final answer with the legal-review disclaimer.",
    ],
  };

  return { content: JSON.stringify(payload), isError: false };
}

/** Bundle entry-point. */
export async function executeDeadlinesTool(args: {
  name: string;
  input: unknown;
}): Promise<DeadlinesToolResult> {
  switch (args.name) {
    case "get_filing_deadlines":
      return getFilingDeadlines(args.input);
    default:
      return {
        content: JSON.stringify({
          error: `Unknown deadlines tool: ${args.name}`,
        }),
        isError: true,
      };
  }
}
