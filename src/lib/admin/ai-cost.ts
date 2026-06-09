/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Efficiency — pure AI unit-economics math (cost per active account + margin).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The efficiency PAGE renders and the efficiency ROUTE reads; ALL of the AI-cost
 * arithmetic lives here as PURE, exported functions, unit-tested in isolation
 * (no React, no Prisma, no clock). The route sums the authoritative per-message
 * cost/token columns from the AI tables and hands the totals to
 * {@link computeAiCost} — deterministic given its inputs.
 *
 * This module OWNS the AI-cost slice of the efficiency API ⇄ UI contract (the
 * `AiCost*` interfaces), co-located with the math (mirrors steering-data.ts /
 * growth-data.ts). The route and the page both import from here.
 *
 * ─── Where the cost comes from (and why some of it is an ESTIMATE) ───────────
 * Two AI products write per-message accounting, but with DIFFERENT fidelity:
 *
 *   • ATLAS — `AtlasMessage.costUsd` is a REAL per-message USD figure, computed
 *     at generation time from the model's actual input/output (and cache) token
 *     split via the canonical Sonnet-4.6 rate table in
 *     `src/lib/atlas/cost-estimator.ts`. We sum it directly. This is REAL spend,
 *     not an estimate — `atlas.isEstimate` is false.
 *
 *   • ASTRA — `AstraMessage.tokensUsed` records only a SINGLE combined token
 *     total per message (no input/output breakdown is persisted). There is
 *     therefore no honest way to apply the asymmetric input/output rates exactly.
 *     Rather than INVENT a $/token rate (the lane forbids that), the route passes
 *     in the codebase's EXISTING canonical Sonnet-4.6 input rate
 *     (`PRICE_INPUT_PER_MTOK`, $/1M tokens) as a conservative blended floor, and
 *     this module multiplies it by the real token total to produce an ESTIMATE.
 *     `astra.isEstimate` is true and the raw `astra.tokens` are surfaced
 *     alongside so the estimate is transparent and never dressed up as exact.
 *     When the route passes a non-positive rate (rate unknown), Astra USD is
 *     `null` and only the token count is shown — "report tokens only".
 *
 * ─── Per-active-account + margin ────────────────────────────────────────────
 * costPerActiveAccount = totalAiCostUsd ÷ activeAccounts. `null` when there are
 * no active accounts (no denominator — an honest "—", never a divide-by-zero).
 * "Active accounts" is the count the route supplies; we keep it model-agnostic
 * here so the definition lives in ONE place (the route) and the math stays pure.
 *
 * marginCostPctOfMrr = totalAiCostUsd ÷ MRR, as a 0..1 fraction (the COGS drag of
 * AI on recurring revenue). `null` when MRR is 0 (revenue not yet wired — a
 * missing ratio, never a fake 0% or an ∞). NOTE the unit caveat surfaced in the
 * contract: `costUsd` is USD while MRR is EUR; we report the ratio honestly as a
 * cost-intensity proxy and label it as such in the UI rather than silently
 * implying a same-currency division.
 *
 * HONESTY RULES (mirrored from the sibling lanes):
 *   • A ratio with a zero denominator is `null` (→ em-dash), NOT 0%.
 *   • USD is rounded to whole cents so no float-dust reaches the header.
 *   • An empty AI footprint (no messages, no tokens, no cost) sets `isEmpty`.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─────────────────────────────────────────────────────────────────────────────
// Raw input — the totals the route sums from the authoritative AI tables.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The already-summed AI accounting the route reads, plus the denominators for
 * the per-account + margin ratios. Every field is a plain number the route
 * computed with Prisma `_sum` / `count`; nothing here is PII.
 */
export interface AiCostInputs {
  /** Σ AtlasMessage.costUsd over the window (assistant turns). REAL USD spend. */
  atlasCostUsd: number;
  /** COUNT of Atlas assistant messages in the window. */
  atlasMessages: number;
  /** Σ AstraMessage.tokensUsed over the window (assistant turns). */
  astraTokens: number;
  /** COUNT of Astra assistant messages in the window. */
  astraMessages: number;
  /**
   * The canonical Sonnet-4.6 $/1M-token rate the route passes to ESTIMATE Astra
   * spend (it has no persisted USD). Sourced from
   * `src/lib/atlas/cost-estimator.ts`. A non-positive value means "rate unknown"
   * → Astra USD is reported as null (tokens only).
   */
  astraUsdPerMtok: number;
  /**
   * Count of ACTIVE accounts (the per-account denominator). Defined by the route
   * (e.g. active subscriptions) so the definition lives in one place.
   */
  activeAccounts: number;
  /** Plan-priced MRR (EUR) for the margin ratio; 0 when revenue is empty. */
  mrr: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public contract — the AI-cost slice of the efficiency response.
// ─────────────────────────────────────────────────────────────────────────────

/** One product's AI spend line (Atlas = real USD; Astra = estimated from tokens). */
export interface AiCostProductLine {
  /** Product slug: "atlas" | "comply" (Astra is Comply's copilot). */
  product: string;
  /** Display label ("Atlas" | "Comply · Astra"). */
  label: string;
  /** Messages (assistant turns) produced by this product in the window. */
  messages: number;
  /** Tokens consumed (only Astra persists a token total; Atlas reports null). */
  tokens: number | null;
  /** USD cost — real for Atlas, estimated for Astra, or null when unknown. */
  costUsd: number | null;
  /** True when `costUsd` is a token-derived ESTIMATE rather than a real sum. */
  isEstimate: boolean;
}

/** The full AI unit-economics view-model the efficiency page renders. */
export interface AiCost {
  /** Total AI cost in the window = real Atlas USD + estimated Astra USD (cents). */
  totalCostUsd: number;
  /** True when ANY part of `totalCostUsd` is a token-derived estimate. */
  totalIncludesEstimate: boolean;
  /** Active-account denominator the per-account figure used. */
  activeAccounts: number;
  /** totalCostUsd ÷ activeAccounts (USD), or null when there are no accounts. */
  costPerActiveAccount: number | null;
  /** MRR (EUR) the margin ratio used (echoed for the UI caption). */
  mrr: number;
  /**
   * totalCostUsd ÷ MRR as a 0..1 fraction — AI's cost-intensity vs recurring
   * revenue. null when MRR is 0. (USD-vs-EUR caveat noted in the module header.)
   */
  marginCostPctOfMrr: number | null;
  /** Per-product spend split (Atlas real, Astra estimated), heaviest first. */
  perProduct: AiCostProductLine[];
  /**
   * True when there is no AI footprint at all this window — no messages, no
   * tokens, no cost. The page shows a friendly empty state instead of zeros.
   */
  isEmpty: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers.
// ─────────────────────────────────────────────────────────────────────────────

/** Round a USD amount to whole cents, guarding non-finite/negative junk → 0. */
function roundCents(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

/** Clamp a possibly-dirty count to a non-negative finite integer. */
function count(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Estimate USD from a raw token total and a $/1M-token rate. Returns `null` when
 * the rate is non-positive/non-finite ("rate unknown" → report tokens only) so
 * the caller can surface a token count without a fabricated dollar figure.
 * Exported for direct unit-testing of the rate boundary.
 */
export function estimateUsdFromTokens(
  tokens: number,
  usdPerMtok: number,
): number | null {
  if (!Number.isFinite(usdPerMtok) || usdPerMtok <= 0) return null;
  const t = count(tokens);
  return roundCents((t / 1_000_000) * usdPerMtok);
}

/**
 * Cost per active account = totalUsd ÷ activeAccounts. `null` (not 0/∞) when
 * there are no active accounts — an honest "no denominator", surfaced as an
 * em-dash by the UI. Rounded to whole cents.
 */
export function costPerAccount(
  totalUsd: number,
  activeAccounts: number,
): number | null {
  const accounts = count(activeAccounts);
  if (accounts <= 0) return null;
  if (!Number.isFinite(totalUsd)) return null;
  return roundCents(totalUsd / accounts);
}

/**
 * AI cost as a fraction of MRR (0..1). `null` when MRR is 0 (revenue not wired —
 * a missing ratio, never a fake 0% or an ∞). 4 dp so the UI can format to a
 * stable percent without float-dust.
 */
export function costPctOfMrr(totalUsd: number, mrr: number): number | null {
  if (!Number.isFinite(totalUsd) || !Number.isFinite(mrr)) return null;
  if (mrr <= 0) return null;
  return Math.round((totalUsd / mrr) * 10000) / 10000;
}

/**
 * Assemble the full {@link AiCost} view-model from the route's summed totals.
 *
 * PURE + total: returns a fresh object, tolerates dirty/empty inputs, and
 * applies every honesty rule (null denominators, real-vs-estimate split, cents
 * rounding, isEmpty). The per-product list is sorted by USD cost desc (a null
 * Astra cost sorts last, since estimate-unknown has no comparable magnitude),
 * tie-broken by message volume so the order is deterministic.
 */
export function computeAiCost(input: AiCostInputs): AiCost {
  // ── Atlas: REAL summed USD. ──
  const atlasCostUsd = roundCents(input.atlasCostUsd);
  const atlasMessages = count(input.atlasMessages);

  // ── Astra: token total → ESTIMATED USD via the injected canonical rate. ──
  const astraTokens = count(input.astraTokens);
  const astraMessages = count(input.astraMessages);
  const astraCostUsd = estimateUsdFromTokens(
    astraTokens,
    input.astraUsdPerMtok,
  );
  const astraIsEstimate = astraCostUsd !== null; // a real (token-derived) estimate

  // ── Total = real Atlas + (estimated Astra, treated as 0 when unknown). ──
  const totalCostUsd = roundCents(atlasCostUsd + (astraCostUsd ?? 0));
  const totalIncludesEstimate = astraIsEstimate && (astraCostUsd ?? 0) > 0;

  const activeAccounts = count(input.activeAccounts);
  const mrr = roundCents(input.mrr);

  const perProduct: AiCostProductLine[] = [
    {
      product: "atlas",
      label: "Atlas",
      messages: atlasMessages,
      tokens: null, // Atlas persists USD, not a single token total
      costUsd: atlasCostUsd,
      isEstimate: false,
    },
    {
      product: "comply",
      label: "Comply · Astra",
      messages: astraMessages,
      tokens: astraTokens,
      costUsd: astraCostUsd,
      isEstimate: astraIsEstimate,
    },
  ].sort((a, b) => {
    // Heaviest USD first; a null cost (unknown) sorts after any real number.
    const av = a.costUsd ?? -1;
    const bv = b.costUsd ?? -1;
    if (bv !== av) return bv - av;
    return b.messages - a.messages;
  });

  // Empty = no AI footprint anywhere: no messages, no tokens, no real cost.
  const isEmpty =
    atlasMessages === 0 &&
    astraMessages === 0 &&
    astraTokens === 0 &&
    atlasCostUsd === 0;

  return {
    totalCostUsd,
    totalIncludesEstimate,
    activeAccounts,
    costPerActiveAccount: costPerAccount(totalCostUsd, activeAccounts),
    mrr,
    marginCostPctOfMrr: costPctOfMrr(totalCostUsd, mrr),
    perProduct,
    isEmpty,
  };
}
