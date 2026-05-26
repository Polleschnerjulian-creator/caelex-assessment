import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — Comparison Tools (T0.1.f bundle-split, 2026-05-26).
 *
 * Two tools that compare or delta the legal-corpus across time
 * and jurisdiction:
 *   - compare_jurisdictions_for_filing — cross-JD matrix on 10
 *     comparison criteria (insurance, casualty risk, PMD, etc.)
 *   - summarize_changes_since — delta from a given date pulling
 *     three streams: corpus amendments, REGULATION_TIMELINE
 *     lifecycle events, and admin-published AtlasUpdate entries
 *
 * Crucial side-effect of this extraction: `REGULATION_TIMELINE`
 * and `RegulationPhase` finally leave atlas-tool-executor.ts.
 * Deadlines bundle (T0.1.g) imported them from @/data/regulation-timeline
 * directly; now the executor has no need.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ALL_SOURCES } from "@/data/legal-sources";
import {
  REGULATION_TIMELINE,
  type RegulationPhase,
} from "@/data/regulation-timeline";

/* ── Result type ────────────────────────────────────────────────────── */

export interface ComparisonToolResult {
  content: string;
  isError: boolean;
}

/* ── Constants ──────────────────────────────────────────────────────── */

const COMPARE_CRITERIA = [
  "insurance_cap",
  "casualty_risk_threshold",
  "pmd_timeline",
  "disposal_reliability",
  "indemnification_regime",
  "processing_time",
  "itu_coordination_support",
  "debris_mitigation_baseline",
  "fdi_screening",
  "data_protection_regime",
] as const;

const DEFAULT_COMPARE_JURISDICTIONS = [
  "US",
  "UK",
  "FR",
  "DE",
  "IT",
  "NL",
  "AU",
  "NZ",
];

const DEFAULT_CRITERIA = [
  "insurance_cap",
  "casualty_risk_threshold",
  "pmd_timeline",
  "indemnification_regime",
  "debris_mitigation_baseline",
] as const;

/* ── Tool definitions ───────────────────────────────────────────────── */

export const COMPARISON_TOOLS: Anthropic.Tool[] = [
  {
    name: "compare_jurisdictions_for_filing",
    description: `Generates a structured comparison matrix across jurisdictions for a chosen set of regulatory criteria — to help operators decide where to file or which JV partner to choose. Returns a per-jurisdiction × per-criterion grid with quantitative values (insurance cap, casualty-risk, PMD timeline, indemnification regime, disposal-reliability target, processing time, ITU-coordination support) and the ATLAS-ID source backing each cell.

Use when the user asks "compare UK vs. France vs. Germany for satellite licensing", "where's the best jurisdiction for a small LEO Earth-observation constellation", "which European spaceport has the cheapest indemnification regime", etc.

Returns the comparison as a structured payload the agent renders as a markdown table in the chat. Caveats and unknowns are flagged explicitly so lawyers don't infer presence-of-data from absence-of-warning. Wrap the final comparison with the legal-review disclaimer.`,
    input_schema: {
      type: "object",
      properties: {
        candidate_jurisdictions: {
          type: "array",
          items: { type: "string" },
          description:
            "ISO alpha-2 jurisdictions to compare. Empty array = the eight most-active commercial-space jurisdictions (US, UK, FR, DE, IT, NL, AU, NZ).",
        },
        criteria: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "insurance_cap",
              "casualty_risk_threshold",
              "pmd_timeline",
              "disposal_reliability",
              "indemnification_regime",
              "processing_time",
              "itu_coordination_support",
              "debris_mitigation_baseline",
              "fdi_screening",
              "data_protection_regime",
            ],
          },
          description:
            "Comparison axes. Empty array = a sensible default set (insurance_cap, casualty_risk_threshold, pmd_timeline, indemnification_regime, debris_mitigation_baseline). Each criterion maps onto specific source provisions; cells without data are marked as 'no data' rather than left blank.",
        },
        operator_type: {
          type: "string",
          enum: [
            "satellite_operator",
            "launch_provider",
            "ground_segment",
            "in_orbit_services",
            "constellation_operator",
          ],
          description:
            "Optional. Operator category — narrows the comparison to the rules that actually bite for this operator class.",
        },
      },
    },
  },
  {
    name: "summarize_changes_since",
    description: `Returns regulatory changes that have occurred since a given date. Three buckets: (a) amendments to legal sources (statute changes, regulation revisions), (b) lifecycle events (regulations entering force, transition windows starting, supersession), and (c) regulatory-feed updates (admin-published AtlasUpdate entries — official notices, market guidance, enforcement signals).

Use when the user asks ANY "what's changed" question — "what's new since my last visit?", "any updates on UK SIA in the last 6 months?", "what amendments hit the EU Space Act this year?", "summarize this quarter's regulatory developments". The agent supplies the 'since' date based on conversational context (date the user mentions, "last week" → 7 days ago, "last quarter" → 90 days ago, etc.).

Returns ISO-dated entries grouped by source/jurisdiction with [ATLAS-…] citations. Render as a chronologically-sorted list grouped by month, NOT a generic table.`,
    input_schema: {
      type: "object",
      properties: {
        since: {
          type: "string",
          description:
            "ISO-8601 date (YYYY-MM-DD) — the cutoff. Returns events strictly after this date. REQUIRED. The agent should infer this from the user's question (e.g. 'since my last visit on March 1' → 2026-03-01; 'last 30 days' → today minus 30).",
        },
        jurisdiction: {
          type: "string",
          description:
            "Optional. ISO alpha-2 jurisdiction (DE, FR, UK, US, EU, INT) — narrows results to amendments and updates targeting this jurisdiction.",
        },
        source_ids: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional. Specific ATLAS source IDs to scope the delta to (e.g. ['UK-SIA-2018', 'EU-NIS2-2022']). When supplied, returns ONLY changes affecting these sources.",
        },
      },
      required: ["since"],
    },
  },
];

const COMPARISON_TOOL_NAMES = COMPARISON_TOOLS.map((t) => t.name) as string[];

export function isComparisonToolName(name: string): boolean {
  return COMPARISON_TOOL_NAMES.includes(name);
}

/* ── compare_jurisdictions_for_filing ───────────────────────────────── */

const CompareInput = z.object({
  candidate_jurisdictions: z
    .array(
      z
        .string()
        .min(2)
        .max(5)
        .regex(/^[A-Z]{2,3}$/),
    )
    .max(20)
    .optional(),
  criteria: z.array(z.enum(COMPARE_CRITERIA)).max(10).optional(),
  operator_type: z
    .enum([
      "satellite_operator",
      "launch_provider",
      "ground_segment",
      "in_orbit_services",
      "constellation_operator",
    ])
    .optional(),
});

interface CriterionMatch {
  source_id: string;
  section: string;
  text: string;
}

function findCriterionMatch(
  jurisdiction: string,
  criterion: string,
): CriterionMatch | null {
  const sources = ALL_SOURCES.filter(
    (s) => s.jurisdiction === jurisdiction && s.status === "in_force",
  );

  /* Heuristic keyword sets per criterion. We're looking for the most-
     relevant provision, so we scan the provisions of the highest-
     relevance sources first. */
  const keywordsByCriterion: Record<string, string[]> = {
    insurance_cap: [
      "insurance",
      "haftpflicht",
      "versicherung",
      "indemnif",
      "60 mio",
      "60 million",
    ],
    casualty_risk_threshold: [
      "casualty",
      "1:10,000",
      "10⁻⁴",
      "10⁻⁵",
      "10⁻⁶",
      "re-entry risk",
    ],
    pmd_timeline: [
      "post-mission disposal",
      "end of mission",
      "end-of-life",
      "5-year",
      "25-year",
      "5 jahre",
      "25 jahre",
    ],
    disposal_reliability: [
      "reliability",
      "zuverlässigkeit",
      "0.9",
      "0.95",
      "≥ 0,9",
      "≥ 0,95",
    ],
    indemnification_regime: [
      "indemnif",
      "indemnity",
      "cross-waiver",
      "section 10",
      "§ 50914",
      "krone",
      "indemnification",
    ],
    processing_time: [
      "processing",
      "review period",
      "30 days",
      "60 days",
      "90 days",
      "monaten",
    ],
    itu_coordination_support: [
      "itu",
      "coordination",
      "mifr",
      "spectrum",
      "frequenz",
    ],
    debris_mitigation_baseline: [
      "iso 24113",
      "ecss-u-as-10c",
      "iadc",
      "debris mitigation",
      "trümmer",
    ],
    fdi_screening: [
      "fdi",
      "foreign direct investment",
      "ief",
      "cfius",
      "national-security review",
      "ausländer",
    ],
    data_protection_regime: ["gdpr", "dsgvo", "data protection", "datenschutz"],
  };

  const keywords = keywordsByCriterion[criterion] ?? [];

  const order: Record<string, number> = {
    fundamental: 0,
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };
  const ranked = sources.sort(
    (a, b) => (order[a.relevance_level] ?? 9) - (order[b.relevance_level] ?? 9),
  );

  for (const s of ranked) {
    for (const p of s.key_provisions) {
      const blob = `${p.title} ${p.summary}`.toLowerCase();
      if (keywords.some((kw) => blob.includes(kw))) {
        return {
          source_id: s.id,
          section: p.section,
          text: p.summary.slice(0, 300),
        };
      }
    }
  }
  return null;
}

function compareJurisdictionsForFiling(input: unknown): ComparisonToolResult {
  const raw = input as {
    candidate_jurisdictions?: unknown;
    criteria?: unknown;
  };
  const normalised = {
    ...((input as object) ?? {}),
    candidate_jurisdictions: Array.isArray(raw?.candidate_jurisdictions)
      ? (raw.candidate_jurisdictions as string[]).map((j) =>
          typeof j === "string" ? j.toUpperCase() : j,
        )
      : raw?.candidate_jurisdictions,
  };
  const parsed = CompareInput.safeParse(normalised);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid comparison input",
        code: "INVALID_INPUT",
        issues: parsed.error.issues.map((i) => i.path.join(".")),
      }),
      isError: true,
    };
  }

  const jurisdictions =
    parsed.data.candidate_jurisdictions &&
    parsed.data.candidate_jurisdictions.length > 0
      ? parsed.data.candidate_jurisdictions
      : DEFAULT_COMPARE_JURISDICTIONS;
  const criteria =
    parsed.data.criteria && parsed.data.criteria.length > 0
      ? parsed.data.criteria
      : [...DEFAULT_CRITERIA];

  const matrix: Array<{
    jurisdiction: string;
    cells: Array<{
      criterion: string;
      match: CriterionMatch | null;
    }>;
  }> = [];

  for (const jd of jurisdictions) {
    const cells = criteria.map((c) => ({
      criterion: c,
      match: findCriterionMatch(jd, c),
    }));
    matrix.push({ jurisdiction: jd, cells });
  }

  const total = matrix.length * criteria.length;
  const filled = matrix.reduce(
    (acc, row) => acc + row.cells.filter((c) => c.match !== null).length,
    0,
  );

  const payload = {
    drafting_mode: "jurisdiction_comparison",
    operator_type: parsed.data.operator_type ?? null,
    jurisdictions,
    criteria,
    coverage_pct: Math.round((filled / total) * 100),
    matrix,
    drafting_directives: [
      "Render the matrix as a markdown table: rows = jurisdictions, columns = criteria.",
      "Each cell with a match: cite [ATLAS-ID] inline. Cells with match=null: render 'Keine Daten' (DE) / 'No data' (EN).",
      "Below the table: 1-2 sentences per criterion summarising the cross-jurisdiction pattern (e.g. '5-year PMD: US/UK/FR 5y; DE/IT 25y until WeltraumG-Entwurf').",
      "Wrap the final comparison with the legal-review disclaimer.",
    ],
  };

  return { content: JSON.stringify(payload), isError: false };
}

/* ── summarize_changes_since ────────────────────────────────────────── */

const ChangesInput = z.object({
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "must be ISO date YYYY-MM-DD"),
  jurisdiction: z.string().min(2).max(5).optional(),
  source_ids: z.array(z.string().min(2).max(80)).max(20).optional(),
});

interface AmendmentEntry {
  source_id: string;
  source_title: string;
  jurisdiction: string;
  date: string;
  reference: string;
  summary: string;
  affected_sections?: string[];
  source_url?: string;
}

interface LifecycleEntry {
  id: string;
  regulation: string;
  status: RegulationPhase["status"];
  effective_date: string;
  transition_end_date: string | null;
  superseded_by: string | null;
  applicable_to: string[];
}

async function summarizeChangesSince(
  input: unknown,
): Promise<ComparisonToolResult> {
  const parsed = ChangesInput.safeParse(input);
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

  const sinceDate = new Date(parsed.data.since);
  if (Number.isNaN(sinceDate.getTime())) {
    return {
      content: JSON.stringify({
        error: "Invalid date",
        code: "INVALID_INPUT",
      }),
      isError: true,
    };
  }
  const sinceMs = sinceDate.getTime();
  const targetJur = parsed.data.jurisdiction?.toUpperCase();
  const idScope = parsed.data.source_ids?.length
    ? new Set(parsed.data.source_ids)
    : null;

  // ── (a) Amendments across the corpus ──
  const amendments: AmendmentEntry[] = [];
  for (const source of ALL_SOURCES) {
    if (idScope && !idScope.has(source.id)) continue;
    if (targetJur && source.jurisdiction !== targetJur) {
      if (source.jurisdiction !== "INT" && source.jurisdiction !== "EU") {
        continue;
      }
    }
    if (!source.amendments) continue;
    for (const a of source.amendments) {
      const t = new Date(a.date).getTime();
      if (Number.isNaN(t) || t <= sinceMs) continue;
      amendments.push({
        source_id: source.id,
        source_title: source.title_en,
        jurisdiction: source.jurisdiction,
        date: a.date,
        reference: a.reference,
        summary: a.summary,
        affected_sections: a.affected_sections,
        source_url: a.source_url,
      });
    }
  }

  // ── (b) Lifecycle events from REGULATION_TIMELINE ──
  const lifecycle: LifecycleEntry[] = REGULATION_TIMELINE.filter((p) => {
    const t = new Date(p.effectiveDate).getTime();
    if (Number.isNaN(t)) return false;
    if (t <= sinceMs) return false;
    if (t > Date.now()) return false; // only past events; future deadlines belong to get_filing_deadlines
    if (targetJur) {
      const text = `${p.regulation} ${p.applicableTo.join(" ")}`.toLowerCase();
      if (text.includes("eu ") || p.applicableTo.includes("all_eu_operators")) {
        // keep — EU events cross-apply
      } else if (!text.includes(targetJur.toLowerCase())) {
        return false;
      }
    }
    return true;
  }).map((p: RegulationPhase) => ({
    id: p.id,
    regulation: p.regulation,
    status: p.status,
    effective_date: p.effectiveDate,
    transition_end_date: p.transitionEndDate ?? null,
    superseded_by: p.supersededBy ?? null,
    applicable_to: p.applicableTo,
  }));

  // ── (c) AtlasUpdate (DB-published regulatory feed) ──
  let updates: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    jurisdiction: string | null;
    sourceId: string | null;
    publishedAt: string;
  }> = [];
  try {
    const dbUpdates = await prisma.atlasUpdate.findMany({
      where: {
        isPublished: true,
        publishedAt: { gt: sinceDate },
        ...(targetJur && { jurisdiction: targetJur }),
        ...(idScope && {
          sourceId: { in: Array.from(idScope) },
        }),
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });
    updates = dbUpdates.map((u) => ({
      id: u.id,
      title: u.title,
      description: u.description,
      category: u.category,
      jurisdiction: u.jurisdiction,
      sourceId: u.sourceId,
      publishedAt: u.publishedAt.toISOString().slice(0, 10),
    }));
  } catch (err) {
    logger.warn("[atlas] summarize_changes_since: AtlasUpdate query failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const totalEntries = amendments.length + lifecycle.length + updates.length;

  type Headline = {
    kind: "amendment" | "lifecycle" | "update";
    title: string;
    date: string;
    source_id?: string;
  };
  const allHeadlines: Headline[] = [
    ...amendments.map((a) => ({
      kind: "amendment" as const,
      title: `${a.source_id} — ${a.summary}`,
      date: a.date,
      source_id: a.source_id,
    })),
    ...lifecycle.map((l) => ({
      kind: "lifecycle" as const,
      title: l.regulation,
      date: l.effective_date,
      source_id: l.id,
    })),
    ...updates.map((u) => ({
      kind: "update" as const,
      title: u.title,
      date: u.publishedAt,
      source_id: u.sourceId ?? undefined,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const payload = {
    since: parsed.data.since,
    until: new Date().toISOString().slice(0, 10),
    scope: {
      jurisdiction: targetJur ?? null,
      source_ids: parsed.data.source_ids ?? null,
    },
    headlines: allHeadlines,
    counts: {
      amendments: amendments.length,
      lifecycle: lifecycle.length,
      updates: updates.length,
      total: totalEntries,
    },
    amendments,
    lifecycle,
    updates,
    drafting_directives: [
      "Lead with: 'Between [since] and [until], N regulatory developments occurred:' followed by the headline list.",
      "Group full payload by month, most-recent-first.",
      "Cite each amendment with the source's [ATLAS-ID] and quote the reference verbatim.",
      "When totalEntries is 0, say plainly 'No changes recorded in the catalogue between [since] and [until]' — do NOT pad with synthesis.",
      "Wrap the final answer with the legal-review disclaimer.",
    ],
  };

  return { content: JSON.stringify(payload), isError: false };
}

/** Bundle entry-point. */
export async function executeComparisonTool(args: {
  name: string;
  input: unknown;
}): Promise<ComparisonToolResult> {
  switch (args.name) {
    case "compare_jurisdictions_for_filing":
      return compareJurisdictionsForFiling(args.input);
    case "summarize_changes_since":
      return summarizeChangesSince(args.input);
    default:
      return {
        content: JSON.stringify({
          error: `Unknown comparison tool: ${args.name}`,
        }),
        isError: true,
      };
  }
}
