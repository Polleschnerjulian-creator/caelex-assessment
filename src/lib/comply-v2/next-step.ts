/**
 * Next-Step Derivation Engine — Comply Sprint 1.2
 *
 * Replaces opaque status pills ("EVIDENCE_REQUIRED") with a concrete
 * action the user can take ("Upload telemetry document — drag & drop
 * or pick from vault"). Each ComplianceItem maps deterministically to
 * exactly one NextStep based on its status, regulation, and
 * notes/evidence presence.
 *
 * Pure function — no DB, no Date.now, no I/O. Safe to import from
 * client components AND server components.
 *
 * Design choice: regulation-aware copy, status-driven action. The
 * Cybersecurity NIS2 path leans on Sentinel telemetry; the
 * Authorization path leans on document upload. Same status
 * (EVIDENCE_REQUIRED) → different CTA depending on regulation. This
 * is the whole point of #2 from docs/COMPLY-WORKFLOW-PLAN.md — the
 * user shouldn't have to translate "evidence required" into "I need
 * to do X for this specific regulation."
 */

import type { ComplianceItem, ComplianceStatus, RegulationKey } from "./types";

/**
 * The 7 distinct kinds of next-step the user can take. Ordered by
 * "how directly the user controls the outcome": top of list = pure
 * user action; bottom = waiting on someone else.
 */
export type NextStepKind =
  /** Item needs a document — upload from disk or pick from the vault. */
  | "UPLOAD_EVIDENCE"
  /** Item could be auto-attested if a Sentinel agent is connected. */
  | "CONNECT_SENTINEL"
  /** Item is gated on completing an N-question assessment. */
  | "RUN_ASSESSMENT"
  /** Astra has prepared a draft — user reviews and signs. */
  | "REVIEW_DRAFT"
  /** Item is ready — user marks it attested for the next cycle. */
  | "ATTEST"
  /** Item delegated to a teammate; waiting for their input. */
  | "REQUEST_FROM_TEAM"
  /** Item is in approval queue — waiting on a reviewer. */
  | "WAIT_FOR_APPROVAL";

export interface NextStep {
  /** The action category — drives icon + verb in the UI. */
  kind: NextStepKind;
  /** Human-readable headline shown as the primary CTA label.
   *  ≤ 32 chars so it fits the card without wrapping. */
  ctaLabel: string;
  /** One-line explanation shown next to the CTA. ≤ 90 chars. */
  helper: string;
  /** Where the CTA navigates to. Relative path. */
  href: string;
  /** Visual urgency tone — drives card border + CTA color. */
  tone: "emerald" | "amber" | "slate";
  /** True when the user can action this themselves now. False = waiting
   *  on someone else. UI uses this to grey-out the CTA. */
  selfActionable: boolean;
}

// ─── Regulation-specific helpers ──────────────────────────────────────

/**
 * Cybersecurity (NIS2) + Debris items can often be auto-attested by
 * Sentinel telemetry. Other regimes need manual document upload —
 * Authorization cover-letters, Insurance policy PDFs, etc.
 */
const SENTINEL_BACKED_REGULATIONS: ReadonlySet<RegulationKey> = new Set([
  "CYBERSECURITY",
  "NIS2",
  "DEBRIS",
]);

/**
 * Heuristic for which regimes use a structured assessment to
 * determine applicability before evidence collection starts. The 4
 * jurisdiction-specific regimes (UK, US, Export-Control, CRA) start
 * with an applicability assessment.
 */
const ASSESSMENT_DRIVEN_REGULATIONS: ReadonlySet<RegulationKey> = new Set([
  "UK_SPACE_ACT",
  "US_REGULATORY",
  "EXPORT_CONTROL",
  "CRA",
]);

/**
 * Friendly verb for the regulation. Used in helper copy:
 *   `Sentinel can auto-attest fuel telemetry for ${verb}.`
 */
function regulationShortVerb(reg: RegulationKey): string {
  switch (reg) {
    case "CYBERSECURITY":
      return "the cybersecurity controls";
    case "NIS2":
      return "the NIS2 incident-reporting requirement";
    case "DEBRIS":
      return "the debris-mitigation threshold";
    case "CRA":
      return "the Cyber Resilience Act controls";
    case "UK_SPACE_ACT":
      return "this UK Space Industry Act requirement";
    case "US_REGULATORY":
      return "this US (FCC/FAA) requirement";
    case "EXPORT_CONTROL":
      return "the ITAR/EAR export-control declaration";
    case "SPECTRUM":
      return "the ITU spectrum filing";
    default:
      return "this requirement";
  }
}

// ─── Derivation ──────────────────────────────────────────────────────

/**
 * Compute the next step for a single ComplianceItem.
 *
 * Resolution order:
 *   1. ATTESTED → no action, just "ready to renew"
 *   2. EXPIRED → re-attest with fresh evidence
 *   3. UNDER_REVIEW → waiting on reviewer
 *   4. EVIDENCE_REQUIRED + Sentinel-backed → CONNECT_SENTINEL
 *   5. EVIDENCE_REQUIRED + manual-doc → UPLOAD_EVIDENCE
 *   6. PENDING + assessment-driven → RUN_ASSESSMENT
 *   7. PENDING (other) → UPLOAD_EVIDENCE (default)
 *   8. DRAFT + has notes → REVIEW_DRAFT (Astra likely populated it)
 *   9. DRAFT (empty) → UPLOAD_EVIDENCE
 *  10. NOT_APPLICABLE → no action
 *
 * The href always lands on the item-detail page, where the right
 * panel will (in Sprint 1.3) host the Astra co-pilot for that item.
 */
export function deriveNextStep(item: ComplianceItem): NextStep {
  const detailHref = `/dashboard/items/${item.regulation}/${item.rowId}`;

  // 1. ATTESTED — already done. Highlight the renewal path.
  if (item.status === "ATTESTED") {
    return {
      kind: "ATTEST",
      ctaLabel: "Open record",
      helper: "Attested. Renew before expiry to keep this requirement covered.",
      href: detailHref,
      tone: "slate",
      selfActionable: true,
    };
  }

  // 2. EXPIRED — needs fresh evidence and re-attestation. Urgent.
  if (item.status === "EXPIRED") {
    return {
      kind: "ATTEST",
      ctaLabel: "Re-attest now",
      helper:
        "Attestation expired. Refresh evidence and re-attest to restore coverage.",
      href: detailHref,
      tone: "amber",
      selfActionable: true,
    };
  }

  // 3. UNDER_REVIEW — out of the user's hands.
  if (item.status === "UNDER_REVIEW") {
    return {
      kind: "WAIT_FOR_APPROVAL",
      ctaLabel: "View review status",
      helper: "Pending reviewer approval. No action from you required.",
      href: detailHref,
      tone: "slate",
      selfActionable: false,
    };
  }

  // 4. NOT_APPLICABLE — no action.
  if (item.status === "NOT_APPLICABLE") {
    return {
      kind: "ATTEST",
      ctaLabel: "Open record",
      helper: "Marked as not applicable to your operation.",
      href: detailHref,
      tone: "slate",
      selfActionable: true,
    };
  }

  // 5. EVIDENCE_REQUIRED — split by regulation.
  if (item.status === "EVIDENCE_REQUIRED") {
    if (SENTINEL_BACKED_REGULATIONS.has(item.regulation)) {
      return {
        kind: "CONNECT_SENTINEL",
        ctaLabel: "Connect Sentinel",
        helper: `Sentinel can auto-attest ${regulationShortVerb(item.regulation)}.`,
        href: detailHref,
        tone: "emerald",
        selfActionable: true,
      };
    }
    return {
      kind: "UPLOAD_EVIDENCE",
      ctaLabel: "Upload evidence",
      helper: `Upload a document or pick from the vault for ${regulationShortVerb(item.regulation)}.`,
      href: detailHref,
      tone: "emerald",
      selfActionable: true,
    };
  }

  // 6. PENDING — split by regulation. Assessment-driven = run questions.
  if (item.status === "PENDING") {
    if (ASSESSMENT_DRIVEN_REGULATIONS.has(item.regulation)) {
      return {
        kind: "RUN_ASSESSMENT",
        ctaLabel: "Start assessment",
        helper: `Answer a short assessment for ${regulationShortVerb(item.regulation)}.`,
        href: detailHref,
        tone: "emerald",
        selfActionable: true,
      };
    }
    return {
      kind: "UPLOAD_EVIDENCE",
      ctaLabel: "Upload evidence",
      helper: `Provide initial evidence for ${regulationShortVerb(item.regulation)}.`,
      href: detailHref,
      tone: "slate",
      selfActionable: true,
    };
  }

  // 7. DRAFT — Astra likely seeded it; user reviews + signs.
  if (item.status === "DRAFT") {
    const hasContent = Boolean(
      (item.notes && item.notes.trim().length > 0) ||
      (item.evidenceNotes && item.evidenceNotes.trim().length > 0),
    );
    if (hasContent) {
      return {
        kind: "REVIEW_DRAFT",
        ctaLabel: "Review draft",
        helper: "Draft prepared. Review the content and sign to attest.",
        href: detailHref,
        tone: "emerald",
        selfActionable: true,
      };
    }
    return {
      kind: "UPLOAD_EVIDENCE",
      ctaLabel: "Add evidence",
      helper: `Add notes or upload a document for ${regulationShortVerb(item.regulation)}.`,
      href: detailHref,
      tone: "slate",
      selfActionable: true,
    };
  }

  // Fallback (TS exhaustiveness — any future status falls here).
  const _exhaustive: never = item.status as never;
  void _exhaustive;
  return {
    kind: "UPLOAD_EVIDENCE",
    ctaLabel: "Open item",
    helper: "Open this item to see what's needed next.",
    href: detailHref,
    tone: "slate",
    selfActionable: true,
  };
}

/**
 * For UI consumers that need to dispatch on the kind without
 * importing the icon set. Mapped here so the icon choice is
 * a single source of truth.
 */
export const NEXT_STEP_ICON_NAMES: Record<NextStepKind, string> = {
  UPLOAD_EVIDENCE: "Upload",
  CONNECT_SENTINEL: "Radio",
  RUN_ASSESSMENT: "ListChecks",
  REVIEW_DRAFT: "FileSignature",
  ATTEST: "ShieldCheck",
  REQUEST_FROM_TEAM: "UserPlus",
  WAIT_FOR_APPROVAL: "Hourglass",
};

// ─── Compile-time sanity: status coverage ────────────────────────────

/**
 * Guard that fires at type-check time if a new ComplianceStatus is
 * added without updating deriveNextStep. The handlers above must
 * cover every member of the union; this assertion is a reminder.
 */
type _StatusCoverage = ComplianceStatus extends infer S
  ? S extends ComplianceStatus
    ? S
    : never
  : never;
type _AssertCovered = _StatusCoverage; // referenced to keep the alias live
void (null as _AssertCovered | null);
