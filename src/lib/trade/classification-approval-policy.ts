/**
 * Caelex Passage — Classification Approval Policy (pure logic).
 *
 * T-M18 fix — the single highest-liability call in the product (an item
 * classification) must not be self-signed when the org runs "four-eyes"
 * (moderate, the DEFAULT). The Ausfuhrverantwortliche who signs the BAFA
 * application is a NAMED human carrying PERSONAL CRIMINAL LIABILITY — a
 * classification author approving their own proposal defeats the
 * second-set-of-eyes control the whole product is built to provide.
 *
 * This module is framework-free + I/O-free so it is unit-testable and
 * shared by:
 *   - the `recordDecision` service (the enforced gate)
 *   - the `decideDraft` server action (early, friendly error)
 *   - the `/trade/classify` review UI (so the operator sees the
 *     "second approver required" state BEFORE clicking, never a silent
 *     failure)
 *
 * CONSERVATIVE-BY-DESIGN INVARIANTS (a reviewer will hunt for violations):
 *   - When four-eyes is ON and the acting user IS the author, an
 *     ACCEPT / MODIFY is BLOCKED. We never silently downgrade this to a
 *     pass.
 *   - When four-eyes is ON and the org has only ONE eligible human
 *     (sole user), we surface an explicit SECOND_APPROVER_REQUIRED state
 *     — we do NOT auto-allow self-approval to "unblock" the lone user.
 *     A green verdict that nobody independently reviewed is exactly the
 *     black-box trust the thesis forbids.
 *   - REJECT is always allowed by the author themselves — rejecting your
 *     own AI proposal lowers exposure (it does not advance a control
 *     code), so it carries no four-eyes risk and must never be blocked.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/** A decision the operator can record on a classification draft. */
export type ClassificationDecision = "ACCEPTED" | "REJECTED" | "MODIFIED";

/**
 * Why an approval is not permitted. `null` (in the result) means the
 * decision is allowed.
 */
export type ApprovalBlockReason =
  /** Four-eyes is on and the acting user authored this draft. */
  | "SELF_APPROVAL_BLOCKED"
  /**
   * Four-eyes is on and there is no *other* human in the org who could
   * approve — the org must add a second eligible reviewer first.
   */
  | "SECOND_APPROVER_REQUIRED";

export interface ApprovalPolicyInput {
  /** The decision the acting user is attempting. */
  decision: ClassificationDecision;
  /** Org policy — moderate four-eyes (author ≠ approver). Default ON. */
  fourEyesEnabled: boolean;
  /** User who created / proposed the draft. */
  authorUserId: string;
  /** User attempting to record the decision now. */
  actingUserId: string;
  /**
   * True when the org has only ONE human who could ever approve (e.g. a
   * single-seat org). When four-eyes is on this is the
   * SECOND_APPROVER_REQUIRED state — it is NOT a licence to self-approve.
   * Optional: callers that cannot cheaply count eligible approvers may
   * omit it; the self-approval block still fires on identity alone.
   */
  soleEligibleApprover?: boolean;
}

export interface ApprovalPolicyResult {
  /** Whether the decision may be recorded. */
  allowed: boolean;
  /** Populated only when `allowed === false`. */
  reason: ApprovalBlockReason | null;
  /** Human-readable, operator-facing explanation (always present). */
  message: string;
}

const SELF_APPROVAL_MESSAGE =
  "Vier-Augen-Prinzip: Eine Einstufung muss von einer ANDEREN Person freigegeben werden als der, die sie erstellt hat. Du hast diesen Entwurf erstellt — bitte lass ihn von einer zweiten berechtigten Person prüfen und freigeben. (Du darfst ihn selbst ablehnen.)";

const SECOND_APPROVER_MESSAGE =
  "Vier-Augen-Prinzip: Für die Freigabe einer Einstufung ist eine zweite berechtigte Person erforderlich. In dieser Organisation gibt es derzeit nur einen berechtigten Prüfer. Füge ein zweites Mitglied (MEMBER+) hinzu, damit Autor und Freigeber unterschiedlich sind.";

const ALLOWED_MESSAGE = "Freigabe zulässig.";

/**
 * Decide whether a classification decision may be recorded under the
 * org's approval policy. Pure — no I/O.
 *
 * Logic (in precedence order):
 *   1. REJECT is always allowed (lowers exposure, advances no code).
 *   2. Four-eyes OFF → any decision by an editor is allowed (the org has
 *      explicitly opted out of the second-set-of-eyes control).
 *   3. Four-eyes ON + acting user IS the author → BLOCKED. If the org
 *      additionally has no other eligible approver, the more specific
 *      SECOND_APPROVER_REQUIRED reason is surfaced (so the UI can guide
 *      "add a teammate" rather than just "ask someone else").
 *   4. Otherwise (four-eyes ON, approver ≠ author) → allowed.
 */
export function evaluateApprovalEligibility(
  input: ApprovalPolicyInput,
): ApprovalPolicyResult {
  // (1) Rejecting your own (or anyone's) AI proposal is always fine — it
  // does not advance a control code, so no four-eyes risk attaches.
  if (input.decision === "REJECTED") {
    return { allowed: true, reason: null, message: ALLOWED_MESSAGE };
  }

  // (2) Org opted out of four-eyes.
  if (!input.fourEyesEnabled) {
    return { allowed: true, reason: null, message: ALLOWED_MESSAGE };
  }

  const isAuthor = input.actingUserId === input.authorUserId;

  // (3) Four-eyes on + acting user is the author → cannot self-approve.
  if (isAuthor) {
    // Distinguish "ask a colleague" (others exist) from "you have no
    // second approver at all" (add one) so the UI can guide correctly.
    if (input.soleEligibleApprover === true) {
      return {
        allowed: false,
        reason: "SECOND_APPROVER_REQUIRED",
        message: SECOND_APPROVER_MESSAGE,
      };
    }
    return {
      allowed: false,
      reason: "SELF_APPROVAL_BLOCKED",
      message: SELF_APPROVAL_MESSAGE,
    };
  }

  // (4) Four-eyes on, approver ≠ author → allowed.
  return { allowed: true, reason: null, message: ALLOWED_MESSAGE };
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
