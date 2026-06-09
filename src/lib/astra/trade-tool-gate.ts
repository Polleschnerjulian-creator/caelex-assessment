/**
 * ASTRA Trade Tool Gate (G4 / T-H10 residual / B3-DEFER)
 *
 * The founder's thesis at the engine layer: in export control the
 * liability is personal and criminal — the named Ausfuhrverantwortliche
 * signs, never "the AI". So the AI may PROPOSE but never silently COMMIT.
 *
 * This module is the single, central enforcement boundary that makes
 * that true for every Astra Trade (Passage) tool:
 *
 *   1. PRODUCT SCOPE — a Trade chat only ever sees Trade + universal
 *      read-only tools. Mutating tools from other products are not
 *      offered to the model in a Trade context.
 *
 *   2. MUTATION CLASSIFICATION — every Trade tool is declared here as
 *      either READ_ONLY (a lookup / computation / draft-only) or
 *      MUTATING (it would persist state, send a notification, or draw
 *      down a quota). The classification lives in code, not in a prompt.
 *
 *   3. AUDITOR = READ-ONLY — an `auditor`-persona user can never invoke
 *      a mutating tool. Enforced here, at the tool layer, not by prompt
 *      advisory text (which the model can ignore or be steered past).
 *
 *   4. PROPOSAL GATE — a mutating Trade tool does NOT execute its write.
 *      It returns an explicit PROPOSAL envelope (`TradeToolGateProposal`)
 *      that a human reviews and applies. The human is the decision of
 *      record on the audit trail.
 *
 * IMPORTANT — fail closed. If a tool's mutation status is unknown, it
 * is treated as MUTATING (the conservative default). A new Trade tool
 * that forgets to register here is gated, never silently writable.
 *
 * This module changes NO tool semantics. Read-only tools still run
 * directly via their handler. It only decides whether a tool call is
 * allowed to reach its handler, or must be deflected to a proposal.
 */

import type { AstraUserContext } from "./types";
import { TOOL_CATEGORIES } from "./tool-definitions";

// ─── Mutation classification ───────────────────────────────────────────

/**
 * Trade tools that are pure reads / computations / draft-only. These
 * have NO persisted side-effect: they look up DB rows, run a
 * deterministic engine, or emit text (a DCS string, a classification
 * draft) the human still has to apply downstream. They run directly.
 *
 * NOTE: every name here MUST also appear in TOOL_CATEGORIES.trade — the
 * `assertTradeRegistryConsistent()` test enforces that the union of
 * READ_ONLY + MUTATING exactly covers the trade category, so a newly
 * added trade tool cannot escape classification.
 */
export const READ_ONLY_TRADE_TOOLS: readonly string[] = [
  // Classification — deterministic engine evaluation, no DB write.
  "classify_trade_item",
  "lookup_classification_code",
  // Datasheet copilot — returns a ClassificationDraft, never persists.
  "classify_from_datasheet",
  // Counterparty reads — return persisted state only (the un-gated
  // screenParty() write was already removed in the T-H10 first pass).
  "screen_trade_party",
  "lookup_trade_party",
  "check_sanctions_status",
  // Licence analytics + lookups — read DB / published statistics only.
  "predict_license_time",
  "find_covering_license",
  "evaluate_sham_risk",
  // DCS generator — emits statement TEXT; placing it on the shipping
  // document is the operator's manual act. No DB mutation.
  "generate_dcs",
] as const;

/**
 * Trade tools that WOULD persist state, notify a reviewer, draw down a
 * licence quota, or otherwise commit an irreversible export-control
 * decision. None of these may execute directly from an Astra tool call.
 * They are routed through the proposal gate.
 *
 * Currently empty in the executor's handler map (the audit's first pass
 * neutered the un-gated writers), but this list is the forward-looking
 * registry: any Trade write surfaced to Astra — directly or via the
 * comply-v2 action bridge — is named here so the gate deflects it to a
 * proposal instead of letting it commit.
 */
export const MUTATING_TRADE_TOOLS: readonly string[] = [
  // Running a fresh screening persists a TradeScreeningResult, mutates
  // screeningStatus, and may email reviewers — human-in-the-loop only.
  "run_trade_screening",
  // Persisting a classification is the single highest-liability call.
  "apply_trade_classification",
  // Drawing down a Sammelgenehmigung / GEA quota is irreversible.
  "draw_down_trade_license",
  // Confirming a sanctions hit triggers blocking + notification.
  "confirm_trade_sanctions_hit",
  // Advancing an operation's lifecycle (e.g. → EXECUTED) is the ship gate.
  "advance_trade_operation",
  // Filing a BAFA / customs submission is the point of no return.
  "file_trade_submission",
] as const;

const READ_ONLY_SET = new Set(READ_ONLY_TRADE_TOOLS);
const MUTATING_SET = new Set(MUTATING_TRADE_TOOLS);
// Defensive: TOOL_CATEGORIES.trade is the canonical list of trade-category
// tools, but some test setups mock tool-definitions with a partial shape.
// Fall back to the read-only allow-list so the gate never throws at import.
const TRADE_TOOL_SET = new Set<string>(TOOL_CATEGORIES?.trade ?? []);

/** True if `toolName` is any Trade-category tool (read-only or mutating). */
export function isTradeTool(toolName: string): boolean {
  return (
    TRADE_TOOL_SET.has(toolName) ||
    READ_ONLY_SET.has(toolName) ||
    MUTATING_SET.has(toolName)
  );
}

/**
 * Whether a Trade tool mutates state.
 *
 * FAIL CLOSED: a Trade tool that is NOT explicitly on the read-only
 * allow-list is treated as mutating. Only an explicitly-listed read-only
 * tool is allowed to run directly. This guarantees a new, unclassified
 * Trade tool is gated by default rather than silently writable.
 */
export function isMutatingTradeTool(toolName: string): boolean {
  if (READ_ONLY_SET.has(toolName)) return false;
  // Explicitly mutating, OR an unrecognised trade tool → mutating.
  return MUTATING_SET.has(toolName) || isTradeTool(toolName);
}

// ─── Persona / role ────────────────────────────────────────────────────

/**
 * An auditor is, by definition, a read-only investigative persona
 * (see AstraUserContext.useCase docs). They may run every lookup but
 * may invoke NO mutating tool on any product.
 */
export function isAuditorContext(userContext: AstraUserContext): boolean {
  return userContext.useCase === "auditor";
}

// ─── Gate decision ─────────────────────────────────────────────────────

export type TradeGateDecision =
  | { kind: "allow" }
  | { kind: "deny-auditor"; reason: string }
  | { kind: "propose"; reason: string };

/**
 * Decide how an Astra Trade tool call must be handled. Pure function —
 * no I/O — so it is trivially testable and cannot itself have a side
 * effect.
 *
 *   - Non-Trade tools: not this gate's concern → allow (other gates,
 *     e.g. the comply-v2 action bridge's requiresApproval, still apply).
 *   - Read-only Trade tools: allow (run directly).
 *   - Mutating Trade tool + auditor: deny (auditor is read-only).
 *   - Mutating Trade tool + any other persona: propose (never execute).
 */
export function decideTradeToolGate(
  toolName: string,
  userContext: AstraUserContext,
): TradeGateDecision {
  if (!isTradeTool(toolName)) {
    return { kind: "allow" };
  }

  const mutating = isMutatingTradeTool(toolName);

  // Auditor may never mutate — checked BEFORE the proposal path so an
  // auditor cannot even queue a write proposal.
  if (mutating && isAuditorContext(userContext)) {
    return {
      kind: "deny-auditor",
      reason:
        `The "${toolName}" tool changes export-control state, and your ` +
        `session is in read-only auditor mode. Auditors can review and ` +
        `look up everything but cannot initiate writes. An operator must ` +
        `perform this action.`,
    };
  }

  if (mutating) {
    return {
      kind: "propose",
      reason:
        `The "${toolName}" tool would commit an export-control decision. ` +
        `Caelex never auto-commits these: it prepares a PROPOSAL for a ` +
        `named human to review, edit, and apply. You remain the recorded ` +
        `decision-maker.`,
    };
  }

  return { kind: "allow" };
}

// ─── Proposal envelope ─────────────────────────────────────────────────

/**
 * The shape returned to the model (and surfaced to the user) when a
 * mutating Trade tool is deflected to the proposal gate. It is NOT a
 * successful write — `committed` is always false. The model is
 * instructed (via `next`) to tell the user a proposal is queued for
 * their review, never to claim the action was done.
 *
 * Mirrors the comply-v2 `ProposalDeferral` intent (status PROPOSED) so
 * the two surfaces speak the same vocabulary, while keeping this module
 * free of a Prisma/DB dependency — the actual AstraProposal row is
 * written by the comply-v2 action bridge when a real mutating action is
 * wired; this envelope is the engine-layer contract the bridge fills.
 */
export interface TradeToolGateProposal {
  status: "PROPOSED";
  committed: false;
  tool: string;
  input: Record<string, unknown>;
  reason: string;
  /** What the human must do next — the AI proposes, the human commits. */
  next: string;
}

export function buildTradeProposal(
  toolName: string,
  input: Record<string, unknown>,
  reason: string,
): TradeToolGateProposal {
  return {
    status: "PROPOSED",
    committed: false,
    tool: toolName,
    input,
    reason,
    next:
      "Review the proposed action and its inputs, then apply it from the " +
      "Trade operation / counterparty page (or the proposals queue). The " +
      "assistant will not, and cannot, commit it for you.",
  };
}

// ─── Product scoping (LLM tool-offer surface) ──────────────────────────

/**
 * Astra "products" — the brand surface a chat is embedded in. Trade =
 * Passage. Used to scope the tool surface offered to the model.
 */
export type AstraProduct = "trade" | "comply" | "atlas" | "pharos" | "default";

/**
 * Tool-name predicate for "should this tool be OFFERED to the model in
 * the given product context?". This is the product-scope filter the
 * engine applies to ALL_TOOLS.
 *
 * Trade context: offer Trade tools + the universal, product-agnostic
 * read-only tools (regulatory knowledge, glossary, capabilities). Do
 * NOT offer the full cross-product tool surface — a Passage chat has no
 * business proposing an EU-Space-Act debris-plan generation.
 *
 * Non-Trade context: offer everything EXCEPT Trade tools, so other
 * products' chats don't surface export-control tooling they can't frame.
 *
 * NOTE: this is the OFFER surface only. Even if a tool slipped through
 * the offer filter, `decideTradeToolGate()` in the executor is the hard
 * enforcement boundary — product scoping is defence-in-depth, not the
 * sole guarantee.
 */
export function isToolInProductScope(
  toolName: string,
  product: AstraProduct,
): boolean {
  if (product === "trade") {
    return isTradeTool(toolName) || UNIVERSAL_READ_ONLY_TOOLS.has(toolName);
  }
  // Every non-Trade product: hide Trade tools.
  return !isTradeTool(toolName);
}

/**
 * Product-agnostic, read-only tools safe to expose in ANY product
 * context (pure regulatory-knowledge lookups + meta). Kept small and
 * explicit so a Trade chat stays focused.
 */
const UNIVERSAL_READ_ONLY_TOOLS = new Set<string>([
  "search_regulation",
  "get_article_detail",
  "get_article_requirements",
  "get_cross_references",
  "explain_term",
  "compare_jurisdictions",
  "discover_caelex_capabilities",
]);

/**
 * Filter a tool-definition list down to a product's offer surface.
 * Generic over anything with a `name` so it works for both the native
 * AstraToolDefinition[] and the action-bridge tool list.
 */
export function scopeToolsToProduct<T extends { name: string }>(
  tools: readonly T[],
  product: AstraProduct,
): T[] {
  if (product === "default") return [...tools];
  return tools.filter((t) => isToolInProductScope(t.name, product));
}
