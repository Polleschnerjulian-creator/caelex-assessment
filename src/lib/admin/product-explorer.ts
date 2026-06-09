/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Product-Explorer — pure data-shaping for the "which product to double
 * down on" deep-dive screen.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The Product-Explorer PAGE is a thin renderer and its ROUTE is a thin reader;
 * ALL of the per-product view-model arithmetic lives here as PURE, exported
 * functions so it can be unit-tested in isolation (no React, no DOM, no Prisma,
 * no clock). The route reads ONLY aggregate counts + org-grouped aggregates from
 * the authoritative domain tables, normalises them into the RAW shapes below, and
 * hands them to {@link buildProductExplorer} — which is deterministic given its
 * inputs.
 *
 * 🔒 GDPR — AGGREGATE + ORGANIZATION-LEVEL ONLY (the founder explicitly chose
 * this granularity). NOTHING in this module — input shape, output shape, or any
 * derivation — carries an INDIVIDUAL user identity. "Active users" is a single
 * COUNT(DISTINCT userId) number the route computes server-side; the user ids
 * themselves never reach this module. The by-organization breakdown carries an
 * organization NAME (a legal entity, fine under legitimate interest) + aggregate
 * counts only — never a per-user row. If a future field would expose a person,
 * it does not belong here.
 *
 * ─── Per-product framing ─────────────────────────────────────────────────────
 * Each product surfaces, all aggregate/org-level:
 *   • USAGE — active users (distinct-userId COUNT), optional per-product logins,
 *     and a cheap trend (this-window vs the prior window of equal length).
 *   • AI / TOKEN SPEND — Atlas: Σ AtlasMessage.costUsd (REAL); Comply (Astra):
 *     Σ AstraMessage.tokensUsed → USD via the admin-local Sonnet input rate
 *     (an ESTIMATE, badged as such). Trade/Scholar/Pharos have no AI spend lane.
 *   • BY ORGANIZATION — top orgs for this product (org name + aggregate counts),
 *     sorted by activeUsers desc then spend desc. Honest blanks where a metric
 *     doesn't apply (em-dash in the UI). Scholar is USER-DECOUPLED in the schema
 *     (no organizationId on its rows), so its org breakdown is structurally empty
 *     — surfaced honestly, never faked.
 *   • OUTCOMES — the product's weighted + raw value-outcomes this window, reusing
 *     the canonical WACO catalogue in `value-events.ts` (single source of truth).
 *   • ENTITLEMENT — orgs with OrganizationProductAccess for this product, split
 *     into active (produced ≥1 outcome this window) vs idle (entitled, silent).
 *
 * HONESTY RULES (mirrored from the sibling lanes):
 *   • A ratio / trend with a zero baseline is `null` (→ em-dash), NOT 0%.
 *   • USD is rounded to whole cents so no float-dust reaches the header.
 *   • An empty product (no usage, no outcomes, no spend) sets `isEmpty` so the
 *     page shows a friendly explainer instead of a wall of zeros.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  VALUE_PRODUCT_LABELS,
  VALUE_OUTCOME_BY_ID,
  weightedOutcome,
  type ValueProduct,
  type ValueOutcomeId,
} from "@/lib/admin/value-events";

// ─────────────────────────────────────────────────────────────────────────────
// Product identity — the closed set this explorer offers.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The five billable products, in the order the switcher renders them. Mirrors
 * `VALUE_PRODUCTS` (and the Prisma `ProductCode` enum) but is re-declared here as
 * the explorer's own ordered tuple so the switcher order is owned by this lane.
 */
export const EXPLORER_PRODUCTS = [
  "atlas",
  "comply",
  "trade",
  "scholar",
  "pharos",
] as const;

export type ExplorerProduct = (typeof EXPLORER_PRODUCTS)[number];

/** Type guard for an untrusted `?product=` query param. */
export function isExplorerProduct(v: unknown): v is ExplorerProduct {
  return (
    typeof v === "string" &&
    (EXPLORER_PRODUCTS as readonly string[]).includes(v)
  );
}

/** Display name for a product slug ("trade" → "Passage"). Falls back to a
 * capitalised slug for any value outside the value-events catalogue. */
export function explorerProductLabel(product: string): string {
  const known = VALUE_PRODUCT_LABELS[product as ValueProduct];
  if (known) return known;
  return product.charAt(0).toUpperCase() + product.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// RAW input — what the route hands the pure layer (PII-free aggregates only).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single value-outcome tally for the selected product this window: a canonical
 * outcome id (drives weight + label via the value-events catalogue) and the REAL
 * row COUNT the route read. No identity — a count only.
 */
export interface OutcomeCountRaw {
  outcomeId: ValueOutcomeId;
  /** Real number of rows of this outcome kind in the window. */
  count: number;
}

/**
 * One organization's aggregate line for the selected product. Built by the route
 * from a GROUP BY organizationId (+ a join to Organization for the name). Carries
 * NO user identity — org-level aggregates only.
 */
export interface OrgAggregateRaw {
  /** Organization id — used only as a stable row key (a legal entity, not a
   * person). Never rendered as anything but the row's React key. */
  organizationId: string;
  /** Organization display name (legal entity). May be empty if unknown. */
  orgName: string;
  /** COUNT(DISTINCT userId) of users active in this product+org this window. */
  activeUsers: number;
  /** AI spend (USD) attributable to this org for this product, or null when the
   * product has no AI lane / the org produced no costed AI turns. */
  spendUsd: number | null;
  /** Raw value-outcome count this org produced for this product this window. */
  outcomes: number;
}

/**
 * The full RAW bundle the route assembles for ONE product + window. Every field
 * is a plain aggregate the route computed with Prisma `count` / `aggregate` /
 * `groupBy`; nothing here is PII.
 */
export interface ProductExplorerRaw {
  product: ExplorerProduct;
  /** Number of days the window covers (echoed for the UI caption). */
  rangeDays: number;

  // ── USAGE ──
  /** COUNT(DISTINCT userId) of users active in this product this window. A single
   * number — the route computed it from a server-side Set and the ids never left
   * the server. */
  activeUsers: number;
  /** Same distinct-user COUNT for the immediately-prior window of equal length,
   * for the trend. A single number; null when the route did not compute it. */
  activeUsersPrior: number | null;
  /** Per-product login/visit count this window, or null when no honest
   * per-product login signal exists for this product. */
  logins: number | null;

  // ── AI / TOKEN SPEND ──
  /** Real summed Atlas USD (Σ AtlasMessage.costUsd) — only for Atlas; 0 otherwise. */
  atlasCostUsd: number;
  /** Atlas assistant message count (only for Atlas; 0 otherwise). */
  atlasMessages: number;
  /** Summed Astra token total (Σ AstraMessage.tokensUsed) — only for Comply; 0
   * otherwise. Estimated to USD via {@link astraUsdPerMtok}. */
  astraTokens: number;
  /** Astra assistant message count (only for Comply; 0 otherwise). */
  astraMessages: number;
  /** The admin-local Sonnet input $/1M-token rate the route injects to ESTIMATE
   * Astra USD. A non-positive value means "rate unknown" → tokens only. */
  astraUsdPerMtok: number;

  // ── OUTCOMES (reuse the WACO catalogue) ──
  /** Per-outcome-kind counts for this product this window. */
  outcomeCounts: OutcomeCountRaw[];

  // ── BY ORGANIZATION ──
  /** Top orgs for this product (already projected to org-level aggregates). When
   * the product is user-decoupled in the schema (Scholar), this is empty and
   * {@link orgBreakdownUnavailable} is true. */
  orgRows: OrgAggregateRaw[];
  /** True when an org breakdown is structurally impossible for this product (its
   * domain rows carry no organizationId — Scholar). Drives an honest note, NOT a
   * blank table that implies "no orgs". */
  orgBreakdownUnavailable: boolean;

  // ── ENTITLEMENT / penetration ──
  /** Orgs holding OrganizationProductAccess for this product (ACTIVE or TRIAL). */
  entitledOrgs: number;
  /** Of those, orgs that produced ≥1 value-outcome for this product this window
   * (the route computes the intersection of entitled-org-ids ∩ active-org-ids). */
  entitledActiveOrgs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT — the Product-Explorer API ⇄ UI contract.
// ─────────────────────────────────────────────────────────────────────────────

/** One product's USAGE block. */
export interface ProductUsage {
  /** COUNT(DISTINCT userId) active this window (a single number, never a list). */
  activeUsers: number;
  /** Prior-window distinct-user count, or null when not computed. */
  activeUsersPrior: number | null;
  /** Window-over-window change in active users as a 0-centred ratio
   * (0.5 = +50%), or null when there is no prior baseline (prior = 0). */
  activeUsersTrend: number | null;
  /** Per-product login/visit count this window, or null when no honest signal. */
  logins: number | null;
}

/** One product's AI spend line (Atlas = real USD; Astra = token-derived estimate). */
export interface ProductAiSpendLine {
  /** "atlas" | "comply". */
  product: string;
  /** Display label ("Atlas" | "Comply · Astra"). */
  label: string;
  /** Assistant messages produced in the window. */
  messages: number;
  /** Tokens consumed (Astra only; Atlas reports null). */
  tokens: number | null;
  /** USD cost — real for Atlas, estimated for Astra, or null when unknown. */
  costUsd: number | null;
  /** True when `costUsd` is a token-derived ESTIMATE, not a real sum. */
  isEstimate: boolean;
}

/** One product's AI / TOKEN SPEND block. */
export interface ProductAiSpend {
  /** Whether this product even has an AI spend lane (Atlas / Comply do). */
  applicable: boolean;
  /** Total spend USD = real Atlas + estimated Astra (whole cents). */
  totalCostUsd: number;
  /** True when any part of `totalCostUsd` is a token-derived estimate. */
  includesEstimate: boolean;
  /** Per-source split (Atlas real, Astra estimated), heaviest first. */
  lines: ProductAiSpendLine[];
}

/** One organization row in the by-organization breakdown. */
export interface ProductOrgRow {
  /** Stable row key (org id — a legal entity, never rendered as text). */
  organizationId: string;
  /** Organization display name (legal entity). "—" placeholder when unknown. */
  orgName: string;
  /** COUNT(DISTINCT userId) for this org+product this window (a number). */
  activeUsers: number;
  /** AI spend USD for this org, or null when not applicable / none. */
  spendUsd: number | null;
  /** Raw value-outcomes this org produced for this product this window. */
  outcomes: number;
}

/** One value-outcome line in the OUTCOMES block. */
export interface ProductOutcomeLine {
  outcomeId: ValueOutcomeId;
  /** Short human label from the catalogue (e.g. "Licences issued"). */
  label: string;
  /** Real row count this window. */
  count: number;
  /** count × weight — contribution to the product's weighted outcome total. */
  weighted: number;
}

/** One product's OUTCOMES block. */
export interface ProductOutcomes {
  /** Raw (unweighted) value-outcome count this window. */
  rawTotal: number;
  /** Product-weighted outcome total this window (Σ count × weight). */
  weightedTotal: number;
  /** Per-kind breakdown, heaviest weighted contribution first. */
  lines: ProductOutcomeLine[];
}

/** One product's ENTITLEMENT / penetration block. */
export interface ProductEntitlement {
  /** Orgs holding access (ACTIVE or TRIAL) for this product. */
  entitledOrgs: number;
  /** Of those, orgs that produced ≥1 outcome this window. */
  activeOrgs: number;
  /** Entitled-but-silent orgs (entitled − active), floored at 0. */
  idleOrgs: number;
  /** activeOrgs / entitledOrgs, 0..1 — adoption of the entitled base — or null
   * when no orgs are entitled (no denominator). */
  activationRate: number | null;
}

/** The full per-product view-model the Product-Explorer page renders. */
export interface ProductExplorerView {
  product: ExplorerProduct;
  /** Display name ("Atlas" / "Passage" / …). */
  label: string;
  rangeDays: number;
  usage: ProductUsage;
  aiSpend: ProductAiSpend;
  outcomes: ProductOutcomes;
  /** Top orgs for this product (org-level aggregates), sorted desc. */
  orgRows: ProductOrgRow[];
  /** True when an org breakdown is structurally impossible (Scholar). */
  orgBreakdownUnavailable: boolean;
  entitlement: ProductEntitlement;
  /** True when this product produced nothing this window — no active users, no
   * outcomes, no AI spend, no entitled orgs. The page shows a friendly empty
   * state instead of zeros. */
  isEmpty: boolean;
}

/** The full payload returned by GET /api/admin/v2/products. */
export interface ProductExplorerResponse {
  /** The selected product slug. */
  product: ExplorerProduct;
  /** The selected range token ("7d" | "30d" | "90d"). */
  range: string;
  /** ISO timestamp the payload was computed (for the "as of" stamp). */
  generatedAt: string;
  /** The per-product view-model. */
  view: ProductExplorerView;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers.
// ─────────────────────────────────────────────────────────────────────────────

/** Clamp a possibly-dirty count to a non-negative finite integer. */
function count(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Round a USD amount to whole cents, guarding non-finite/negative junk → 0. */
function roundCents(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Period-over-period change as a 0-centred ratio: (current − prior) / prior.
 * Returns null when there is no prior baseline (prior = 0) — "+∞%" is meaningless,
 * the UI shows "new" instead. 3 dp to avoid float-dust in the payload.
 * Exported for direct unit-testing of the baseline boundary.
 */
export function usageTrend(
  current: number,
  prior: number | null | undefined,
): number | null {
  if (prior === null || prior === undefined) return null;
  if (!Number.isFinite(current) || !Number.isFinite(prior)) return null;
  if (prior <= 0) return null;
  return Math.round(((current - prior) / prior) * 1000) / 1000;
}

/**
 * Estimate USD from a raw token total and a $/1M-token rate. Returns `null` when
 * the rate is non-positive/non-finite ("rate unknown" → report tokens only), so
 * the caller can surface a token count without a fabricated dollar figure.
 * Mirrors the ai-cost.ts approach exactly (same rate semantics).
 * Exported for direct unit-testing of the rate boundary.
 */
export function estimateAstraUsd(
  tokens: number,
  usdPerMtok: number,
): number | null {
  if (!Number.isFinite(usdPerMtok) || usdPerMtok <= 0) return null;
  return roundCents((count(tokens) / 1_000_000) * usdPerMtok);
}

/**
 * Build the AI / TOKEN SPEND block. Atlas spend is the REAL summed costUsd; Astra
 * spend is an ESTIMATE from its token total via the injected canonical rate
 * (badged). `applicable` is false for products with no AI lane (Trade / Scholar /
 * Pharos) so the page can render an honest "not applicable" instead of €0.
 */
export function buildAiSpend(raw: ProductExplorerRaw): ProductAiSpend {
  const atlasCostUsd = roundCents(raw.atlasCostUsd);
  const atlasMessages = count(raw.atlasMessages);
  const astraTokens = count(raw.astraTokens);
  const astraMessages = count(raw.astraMessages);
  const astraCostUsd = estimateAstraUsd(astraTokens, raw.astraUsdPerMtok);
  const astraIsEstimate = astraCostUsd !== null;

  // Atlas is the only AI source for the "atlas" product; Astra (Comply's copilot)
  // is the only AI source for "comply". Other products have no AI lane.
  const lines: ProductAiSpendLine[] = [];
  if (raw.product === "atlas") {
    lines.push({
      product: "atlas",
      label: explorerProductLabel("atlas"),
      messages: atlasMessages,
      tokens: null, // Atlas persists USD, not a single token total
      costUsd: atlasCostUsd,
      isEstimate: false,
    });
  } else if (raw.product === "comply") {
    lines.push({
      product: "comply",
      label: `${explorerProductLabel("comply")} · Astra`,
      messages: astraMessages,
      tokens: astraTokens,
      costUsd: astraCostUsd,
      isEstimate: astraIsEstimate,
    });
  }

  const applicable = lines.length > 0;
  // Total = real Atlas + (estimated Astra, treated as 0 when unknown). Only the
  // product's own lane contributes (the other lane's raw fields are 0).
  const totalCostUsd =
    raw.product === "atlas"
      ? atlasCostUsd
      : raw.product === "comply"
        ? roundCents(astraCostUsd ?? 0)
        : 0;
  const includesEstimate =
    raw.product === "comply" && astraIsEstimate && (astraCostUsd ?? 0) > 0;

  return { applicable, totalCostUsd, includesEstimate, lines };
}

/**
 * Build the OUTCOMES block from the per-kind raw counts, reusing the canonical
 * WACO weights. Lines are sorted by weighted contribution desc (then count desc,
 * then id for determinism). Pure: a new array, never mutates input.
 */
export function buildOutcomes(
  rows: readonly OutcomeCountRaw[],
): ProductOutcomes {
  const lines: ProductOutcomeLine[] = rows.map((r) => {
    const c = count(r.count);
    const weighted = Math.round(weightedOutcome(r.outcomeId, c) * 100) / 100;
    return {
      outcomeId: r.outcomeId,
      label: outcomeLabel(r.outcomeId),
      count: c,
      weighted,
    };
  });

  const rawTotal = lines.reduce((acc, l) => acc + l.count, 0);
  const weightedTotal =
    Math.round(lines.reduce((acc, l) => acc + l.weighted, 0) * 100) / 100;

  lines.sort(
    (a, b) =>
      b.weighted - a.weighted ||
      b.count - a.count ||
      a.outcomeId.localeCompare(b.outcomeId),
  );

  return { rawTotal, weightedTotal, lines };
}

/**
 * Shape the raw org-aggregate rows into the by-organization view-model. Sorts by
 * activeUsers desc, then spendUsd desc (a null spend sorts last — unknown has no
 * comparable magnitude), then outcomes desc, then orgName for a stable order.
 * Clamps every count; rounds spend to cents; substitutes an em-dash placeholder
 * for a blank org name. Pure + total.
 */
export function buildOrgRows(
  rows: readonly OrgAggregateRaw[],
): ProductOrgRow[] {
  return rows
    .map((r): ProductOrgRow => {
      const spend =
        r.spendUsd === null || r.spendUsd === undefined
          ? null
          : roundCents(r.spendUsd);
      const name = r.orgName && r.orgName.trim().length > 0 ? r.orgName : "—";
      return {
        organizationId: r.organizationId,
        orgName: name,
        activeUsers: count(r.activeUsers),
        spendUsd: spend,
        outcomes: count(r.outcomes),
      };
    })
    .sort((a, b) => {
      if (b.activeUsers !== a.activeUsers) return b.activeUsers - a.activeUsers;
      const as = a.spendUsd ?? -1;
      const bs = b.spendUsd ?? -1;
      if (bs !== as) return bs - as;
      if (b.outcomes !== a.outcomes) return b.outcomes - a.outcomes;
      return a.orgName.localeCompare(b.orgName);
    });
}

/**
 * Build the ENTITLEMENT / penetration block. `idleOrgs` is entitled − active
 * (floored at 0 so a data anomaly where active > entitled never goes negative).
 * `activationRate` is active / entitled, 0..1, or null when no orgs are entitled
 * (no denominator → em-dash, not a fake 0%). Pure.
 */
export function buildEntitlement(raw: ProductExplorerRaw): ProductEntitlement {
  const entitledOrgs = count(raw.entitledOrgs);
  // active can never exceed entitled in honest data; clamp defensively.
  const activeOrgs = Math.min(count(raw.entitledActiveOrgs), entitledOrgs);
  const idleOrgs = Math.max(0, entitledOrgs - activeOrgs);
  const activationRate =
    entitledOrgs > 0
      ? Math.round((activeOrgs / entitledOrgs) * 10000) / 10000
      : null;
  return { entitledOrgs, activeOrgs, idleOrgs, activationRate };
}

/**
 * The single composer the route calls. Folds the RAW per-product aggregates into
 * the full {@link ProductExplorerView}. Deterministic: identical input ⇒
 * identical output (no clock, no I/O). The `isEmpty` predicate keys the page's
 * friendly empty state.
 */
export function buildProductExplorer(
  raw: ProductExplorerRaw,
): ProductExplorerView {
  const activeUsers = count(raw.activeUsers);
  const activeUsersPrior =
    raw.activeUsersPrior === null || raw.activeUsersPrior === undefined
      ? null
      : count(raw.activeUsersPrior);

  const usage: ProductUsage = {
    activeUsers,
    activeUsersPrior,
    activeUsersTrend: usageTrend(activeUsers, activeUsersPrior),
    logins:
      raw.logins === null || raw.logins === undefined
        ? null
        : count(raw.logins),
  };

  const aiSpend = buildAiSpend(raw);
  const outcomes = buildOutcomes(raw.outcomeCounts);
  const orgRows = buildOrgRows(raw.orgRows);
  const entitlement = buildEntitlement(raw);

  // Empty = nothing real to show for this product this window. AI spend is part
  // of the test (a product can be silent on outcomes but still cost money).
  const isEmpty =
    activeUsers === 0 &&
    outcomes.rawTotal === 0 &&
    aiSpend.totalCostUsd === 0 &&
    orgRows.length === 0 &&
    entitlement.entitledOrgs === 0;

  return {
    product: raw.product,
    label: explorerProductLabel(raw.product),
    rangeDays: count(raw.rangeDays),
    usage,
    aiSpend,
    outcomes,
    orgRows,
    orgBreakdownUnavailable: raw.orgBreakdownUnavailable === true,
    entitlement,
    isEmpty,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Outcome labels — resolved from the canonical catalogue, with a safe fallback.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Human label for a value-outcome id, resolved from the canonical catalogue
 * (single source of truth for outcome wording — the explorer never re-invents
 * it). A null/unknown id degrades to a de-slugged label so the UI never prints a
 * bare enum token.
 */
function outcomeLabel(id: ValueOutcomeId): string {
  const def = VALUE_OUTCOME_BY_ID[id];
  return def ? def.label : deSlug(id);
}

/** De-slug an unknown id ("foo_bar_baz" → "Foo bar baz") as a last-resort label. */
function deSlug(id: string): string {
  const s = String(id).replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
