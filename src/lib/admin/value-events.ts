/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Steering — the CANONICAL definition of "compliance value outcomes".
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This module is the SINGLE SOURCE OF TRUTH for the North-Star Metric (NSM):
 *
 *   WACO — Weekly Active Compliance Outcomes
 *   = the product-weighted count of distinct tenants that produced ≥1 core
 *     regulatory value-outcome in a 7-day window.
 *
 * For compliance software, "value" is not a login or a page-view — it is the
 * moment a *regulatory outcome was produced*: an assessment was completed, an
 * export item was classified, a sanctions screening was decided, a licence was
 * issued, a research draft was generated, a regulator submission was filed. WACO
 * resists vanity (it is not logins), is leading (it precedes MRR), and is true
 * to what Caelex sells.
 *
 * WHY DOMAIN TABLES, NOT ANALYTICS EVENTS:
 *   The `AnalyticsEvent` value-event taxonomy (comply_*, trade_*, atlas_* …) is
 *   defined but almost entirely UNWIRED in product code today — only generic
 *   page-views + a single signup fire. Counting outcomes from those events would
 *   read permanently zero. So every outcome below is sourced from an
 *   AUTHORITATIVE DOMAIN TABLE whose rows are written by the real product flow
 *   (e.g. a row in `TradeLicense` with `issuedAt` set IS a licence being
 *   issued). This module is therefore PURE METADATA — it names the outcomes,
 *   their product, and their weight; the actual Prisma reads live in
 *   `steering-data.ts` (the route's data layer), which references these ids.
 *
 * REUSE CONTRACT:
 *   Later admin phases (cockpit NSM tile, per-product depth strips, forecasting)
 *   MUST import {@link PRODUCT_VALUE_OUTCOMES} / {@link describeValueEvents}
 *   rather than re-listing outcomes, so the NSM never drifts between screens.
 *
 * This is a PURE module (no React, no Prisma, no server-only) so both the route
 * handler and any future client surface can import the same definition and let
 * the compiler enforce the contract.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * The five billable products (mirrors the Prisma `ProductCode` enum exactly:
 * COMPLY, TRADE, ATLAS, PHAROS, SCHOLAR). We use the lower-case slug everywhere
 * in the admin surface to match `FeatureUsageDaily`'s `<product>:` prefix and
 * the analytics `product` dimension. Ephemeris is a FEATURE of Comply, not a
 * product, so it is deliberately absent.
 */
export const VALUE_PRODUCTS = [
  "comply",
  "trade",
  "atlas",
  "pharos",
  "scholar",
] as const;

export type ValueProduct = (typeof VALUE_PRODUCTS)[number];

/**
 * The stable id of a single value-outcome kind. These ids are the join key
 * between this metadata module and the Prisma reads in `steering-data.ts`, and
 * they are surfaced (as a `kind`) in the steering API payload so the UI can
 * label each contribution. Renaming one is a breaking change to the API shape —
 * treat the string literal as the contract.
 */
export type ValueOutcomeId =
  // Comply — a regulatory assessment was completed (report/plan/framework
  // generated, or the assessment was moved to a terminal "done" status).
  | "comply_assessment_completed"
  // Passage / Trade — an export item was classified.
  | "trade_item_classified"
  // Passage / Trade — a sanctions screening reached a resolved decision.
  | "trade_screening_decided"
  // Passage / Trade — an export licence was issued.
  | "trade_license_issued"
  // Atlas — the AI produced a research/draft answer (assistant turn).
  | "atlas_draft_produced"
  // Scholar — a Planspiel (legal-research simulation) run was started.
  | "scholar_planspiel_run"
  // Scholar — a student saved a source/case to a reading list.
  | "scholar_bookmark_saved"
  // Cross — a submission was filed to a National Competent Authority.
  | "nca_submission_filed"
  // Cross — a compliance document was generated to completion.
  | "document_generated"
  // Cross — a compliance deadline was met (marked completed).
  | "deadline_met";

/**
 * One value-outcome definition: which product it counts toward, its relative
 * `weight` in the WACO total, and human-readable labels for the UI.
 *
 * WEIGHTS — rationale:
 *   Outcomes are NOT all equal in regulatory value. A licence issued or an NCA
 *   submission filed is a heavyweight, externally-binding outcome; a saved
 *   bookmark is a lightweight engagement signal. Weights let WACO reflect that
 *   without inventing data — they only re-scale REAL counts. They are chosen so
 *   that:
 *     • binding regulator-facing outcomes (licence, NCA filing) weigh most (3),
 *     • substantive produced artefacts (assessment, classification, screening
 *       decision, generated document, met deadline, AI draft) weigh 1–2,
 *     • lightweight engagement (a saved bookmark) weighs least (0.25).
 *   The weights are the ONLY tunable here; the counts they multiply are always
 *   real rows from the tables named in {@link valueOutcomeTable}.
 */
export interface ValueOutcomeDef {
  id: ValueOutcomeId;
  product: ValueProduct;
  /** Relative contribution to the weighted WACO total (real count × weight). */
  weight: number;
  /** Short label for a KPI/contribution chip (e.g. "Licences issued"). */
  label: string;
  /** One-line description of exactly what real row counts as this outcome. */
  description: string;
}

/**
 * The canonical outcome catalogue. ORDER IS STABLE and grouped by product so the
 * steering UI can render per-product contribution in a predictable sequence.
 * Every entry maps 1:1 to a verified Prisma model + predicate in
 * `steering-data.ts` (see {@link valueOutcomeTable} for the model name).
 */
export const VALUE_OUTCOME_DEFS: readonly ValueOutcomeDef[] = [
  // ── Comply ──────────────────────────────────────────────────────────────
  {
    id: "comply_assessment_completed",
    product: "comply",
    weight: 2,
    label: "Assessments completed",
    description:
      "A compliance assessment (debris, cyber, NIS2, insurance, environmental, COPUOS, UK, US, export, spectrum) reached a completed/report-generated state.",
  },
  // ── Passage / Trade ─────────────────────────────────────────────────────
  {
    id: "trade_item_classified",
    product: "trade",
    weight: 1,
    label: "Items classified",
    description:
      "An export item was classified (TradeItem moved to the CLASSIFIED status).",
  },
  {
    id: "trade_screening_decided",
    product: "trade",
    weight: 1,
    label: "Screenings decided",
    description:
      "A sanctions screening reached a resolved decision (clear, confirmed hit, or dismissed false positive).",
  },
  {
    id: "trade_license_issued",
    product: "trade",
    weight: 3,
    label: "Licences issued",
    description:
      "An export licence was issued (TradeLicense.issuedAt was set).",
  },
  // ── Atlas ───────────────────────────────────────────────────────────────
  {
    id: "atlas_draft_produced",
    product: "atlas",
    weight: 1,
    label: "AI drafts produced",
    description:
      "The Atlas AI produced a research/draft answer (an assistant message turn).",
  },
  // ── Scholar ─────────────────────────────────────────────────────────────
  {
    id: "scholar_planspiel_run",
    product: "scholar",
    weight: 1,
    label: "Simulation runs",
    description:
      "A Scholar Planspiel (legal-research simulation) run was started.",
  },
  {
    id: "scholar_bookmark_saved",
    product: "scholar",
    weight: 0.25,
    label: "Sources bookmarked",
    description: "A student saved a source or case to a reading list.",
  },
  // ── Cross-product ───────────────────────────────────────────────────────
  {
    id: "nca_submission_filed",
    product: "comply",
    weight: 3,
    label: "NCA submissions filed",
    description:
      "A submission was filed to a National Competent Authority (counts toward Comply).",
  },
  {
    id: "document_generated",
    product: "comply",
    weight: 1,
    label: "Documents generated",
    description:
      "A compliance document was generated to completion (counts toward Comply).",
  },
  {
    id: "deadline_met",
    product: "comply",
    weight: 1,
    label: "Deadlines met",
    description:
      "A compliance deadline was marked completed (counts toward Comply).",
  },
] as const;

/**
 * Index the catalogue by id for O(1) weight/label lookups from the data layer.
 * Built once at module load from the canonical array above.
 */
export const VALUE_OUTCOME_BY_ID: Readonly<
  Record<ValueOutcomeId, ValueOutcomeDef>
> = Object.freeze(
  VALUE_OUTCOME_DEFS.reduce(
    (acc, def) => {
      acc[def.id] = def;
      return acc;
    },
    {} as Record<ValueOutcomeId, ValueOutcomeDef>,
  ),
);

/**
 * Group the outcome ids by product, preserving catalogue order. The steering UI
 * uses this to render a per-product contribution breakdown and a friendly
 * "no outcomes yet" empty state for a product that has produced nothing.
 *
 * Returned as a plain ordered map: every product in {@link VALUE_PRODUCTS} is a
 * key (even when it has no outcomes — value is an empty array), so the UI can
 * always enumerate all five products.
 */
export const PRODUCT_VALUE_OUTCOMES: Readonly<
  Record<ValueProduct, readonly ValueOutcomeId[]>
> = Object.freeze(
  VALUE_PRODUCTS.reduce(
    (acc, product) => {
      acc[product] = VALUE_OUTCOME_DEFS.filter(
        (d) => d.product === product,
      ).map((d) => d.id);
      return acc;
    },
    {} as Record<ValueProduct, ValueOutcomeId[]>,
  ),
);

/**
 * Human-readable product display names for the steering header / chips. Kept
 * here (next to the product list) so the NSM label set never drifts. "Passage"
 * is the brand name for the Trade surface.
 */
export const VALUE_PRODUCT_LABELS: Readonly<Record<ValueProduct, string>> =
  Object.freeze({
    comply: "Comply",
    trade: "Passage",
    atlas: "Atlas",
    pharos: "Pharos",
    scholar: "Scholar",
  });

/**
 * The weighted contribution of a single outcome kind given its REAL count.
 * Pure: `count × weight`, guarded so a non-finite/negative count contributes 0
 * (the UI never multiplies garbage into the headline). This is the one place
 * the weight is applied, so the rule is defined exactly once.
 */
export function weightedOutcome(id: ValueOutcomeId, count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  const def = VALUE_OUTCOME_BY_ID[id];
  if (!def) return 0;
  return count * def.weight;
}

/**
 * A self-describing summary of the WACO definition — id, product, weight, label,
 * description — for every outcome kind, in catalogue order. Exposed so a future
 * "how is WACO computed?" tooltip / docs surface can render the live definition
 * instead of hard-coding it, and so tests can assert the catalogue is coherent.
 *
 * Returns a fresh array of plain objects (a defensive copy), so a caller can
 * never mutate the frozen catalogue through it.
 */
export function describeValueEvents(): ValueOutcomeDef[] {
  return VALUE_OUTCOME_DEFS.map((d) => ({ ...d }));
}
