/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tier 1.7 — verdict/fact-driven operation status auto-advance.
 *
 * `deriveOperationStatus` reflects an operation's *facts* onto its lifecycle
 * status, so the operator does not have to manually click the status forward at
 * each prep step. It governs ONLY the fact-grounded prep band:
 *
 *   DRAFT → AWAITING_CLASSIFICATION → SCREENING → AWAITING_LICENSE
 *
 * and NEVER auto-crosses into a human-Freigabe / terminal state:
 *
 *   LICENSED   (operator confirms the license stack is complete + correct)
 *   EXECUTED   (operator confirms the goods physically shipped)
 *   BLOCKED    (operator/screening consciously halts the operation)
 *   VOLUNTARY_DISCLOSURE_FILED (operator files a self-disclosure)
 *
 * Rationale: in Passage, auto = *suggestion / housekeeping*, never *Freigabe*.
 * The prep-band states are pure reflections of the underlying data (per the
 * TradeOperationStatus schema doc), so syncing them automatically is safe. The
 * four gated states each encode a deliberate human decision, so the engine
 * yields the instant an operation sits in one of them (returns null).
 *
 * A CONFIRMED_HIT counterparty does NOT auto-BLOCK — it simply holds the
 * operation at SCREENING (can't reach AWAITING_LICENSE without a CLEAR party),
 * and the operator then consciously BLOCKs via the PATCH route. That keeps the
 * block a human Freigabe while still preventing forward progress.
 *
 * Pure + synchronous + no I/O. The DB write + CAS guard + event emission live
 * in recompute.server.ts (the caller).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type {
  TradeOperationStatus,
  TradeScreeningStatus,
} from "@prisma/client";

/**
 * The lifecycle states auto-derivation is allowed to write. Every other
 * TradeOperationStatus value is a human-Freigabe / terminal state that the
 * engine must never set or overwrite.
 */
export const AUTO_MANAGED_STATUSES: ReadonlySet<TradeOperationStatus> = new Set(
  ["DRAFT", "AWAITING_CLASSIFICATION", "SCREENING", "AWAITING_LICENSE"],
);

export interface OperationStatusFacts {
  /** Number of (non-archived) lines on the operation. */
  activeLineCount: number;
  /** True if ANY active line's item is not yet CLASSIFIED. */
  hasUnclassifiedItem: boolean;
  /**
   * The counterparty's screening status, or null when the operation has no
   * counterparty yet (in which case it still needs one screened → SCREENING).
   */
  counterpartyScreening: TradeScreeningStatus | null;
}

/**
 * Pure: the fact-truth lifecycle state for a set of facts, always within the
 * auto-managed prep band. Caps at AWAITING_LICENSE — LICENSED and beyond are
 * human gates and are never produced here.
 */
function computeTarget(facts: OperationStatusFacts): TradeOperationStatus {
  if (facts.activeLineCount <= 0) return "DRAFT";
  if (facts.hasUnclassifiedItem) return "AWAITING_CLASSIFICATION";
  // All items classified — gate on counterparty screening.
  if (facts.counterpartyScreening !== "CLEAR") return "SCREENING";
  return "AWAITING_LICENSE";
}

/**
 * Derive the status an operation should auto-advance/regress to, or null when
 * no automatic change should happen — specifically null when:
 *   - `current` is outside the auto-managed prep band (a human gate / terminal
 *     state that must be preserved), or
 *   - the fact-truth target equals `current` (no churn).
 *
 * The returned target is guaranteed to be within AUTO_MANAGED_STATUSES.
 */
export function deriveOperationStatus(
  current: TradeOperationStatus,
  facts: OperationStatusFacts,
): TradeOperationStatus | null {
  // Preserve every human-Freigabe / terminal state.
  if (!AUTO_MANAGED_STATUSES.has(current)) return null;

  const target = computeTarget(facts);
  return target === current ? null : target;
}
