/**
 * Comply Trade — TS-Types für die Trade-Operations-Schicht.
 *
 * Re-exports der Prisma-generierten Types + zusätzliche Aliasse für
 * Client-Components, die kein "@prisma/client" importieren sollten.
 *
 * Single source of truth: prisma/schema.prisma. Wenn ein Feld dort
 * geändert wird, regeneriert `npx prisma generate` die Types
 * automatisch und diese Datei aktualisiert sich.
 *
 * See:
 *   - docs/COMPLY-EXPORT-CONTROL-CONCEPT.md
 *   - docs/COMPLY-EXPORT-CONTROL-PLAN.md (Sprint B1)
 */

import type {
  TradeItem,
  TradeItemNote,
  TradeItemStatus,
  TradeClassificationSource,
} from "@prisma/client";

// ─── Re-exports (so client modules don't import from @prisma/client) ──

export type {
  TradeItem,
  TradeItemNote,
  TradeItemStatus,
  TradeClassificationSource,
};

// ─── Display labels ─────────────────────────────────────────────────

/**
 * Human-readable status labels for UI surfaces. Apple-HIG-style:
 * sentence case, no emojis, no all-caps. The enum values stay
 * upper-snake_case in the DB; this mapping is purely cosmetic.
 */
export const TRADE_ITEM_STATUS_LABELS: Record<TradeItemStatus, string> = {
  DRAFT: "Draft",
  CLASSIFIED: "Classified",
  REQUIRES_REVIEW: "Requires review",
  ARCHIVED: "Archived",
};

/**
 * Provenance labels for the classification-source field. Matches the
 * "where did this classification come from" question that prosecutors
 * + counsel ask first. The order here mirrors the trust hierarchy:
 * BAFA "Auskunft zur Güterliste" + CJ-determination > Attorney opinion
 * > Astra suggestion (LLM) > User-declared (least defensible).
 */
export const TRADE_CLASSIFICATION_SOURCE_LABELS: Record<
  TradeClassificationSource,
  string
> = {
  BAFA_AUSKUNFT_GUETERLISTE: "BAFA Auskunft zur Güterliste",
  CJ_DETERMINATION: "US Commodity Jurisdiction",
  ATTORNEY_OPINION: "Attorney opinion",
  ASTRA_SUGGESTED: "Astra suggested",
  USER_DECLARED: "User declared",
};

// ─── Convenience type aliases ───────────────────────────────────────

/**
 * Sprint B1: only the fields a card-level UI needs to render the
 * status badge + name. Detail page uses the full TradeItem type.
 *
 * Phase B7 will introduce the actual list page; this alias is
 * pre-positioned so the type-import-graph doesn't churn.
 */
export interface TradeItemListCard {
  id: string;
  name: string;
  internalSku: string | null;
  status: TradeItemStatus;
  /** Resolved label of the highest-confidence classification, or null. */
  primaryClassification: string | null;
  classificationSource: TradeClassificationSource;
  updatedAt: Date;
}
