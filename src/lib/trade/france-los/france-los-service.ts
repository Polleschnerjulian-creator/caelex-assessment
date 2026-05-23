/**
 * Caelex Trade — France LOS (Loi sur les Opérations Spatiales)
 * authorisation service (Z34-FR, Tier 4).
 *
 * Loi 2008-518 — France's national space law — requires operators of
 * space activities from French territory OR by French nationals /
 * companies to obtain a CNES-administered authorisation from DGE
 * (Direction Générale des Entreprises) before launching, operating
 * in orbit, performing a controlled return, or re-entering a
 * third-party space object.
 *
 * Distinct from export licensing (RGCC / DGRIS): the LOS authorises
 * the SPACE ACTIVITY itself — debris-mitigation plan, casualty risk,
 * insurance fitness, third-party liability cap. The four lifecycle
 * verbs (submitToCnes, recordCnesDecision, markMissionCompleted,
 * listExpiring) map to operational moments where Caelex Trade has
 * something to surface to the operator.
 *
 * Pure helper: `calculateCasualtyRiskCompliance` — boundary-tested
 * against LOS Art. R. 331-21's 1 in 10⁴ threshold. The helper
 * intentionally lives in the service module rather than a shared
 * util so that the legal threshold is co-located with the
 * lifecycle that consumes it.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import {
  type TradeFranceLosAuthorisation,
  type TradeFranceLosAuthorisationStatus,
  type TradeFranceLosAuthorisationType,
  type TradeFranceLosSpacecraftClassification,
} from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────

export type FranceLosWithRelations = TradeFranceLosAuthorisation & {
  launchVehicle: { id: string; reference: string } | null;
  lastActionBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

export interface FranceLosCreateInput {
  organizationId: string;
  operatorName: string;
  operatorAddress?: string | null;
  authorisationType: TradeFranceLosAuthorisationType;
  missionName: string;
  missionDescription?: string | null;
  spacecraftClassification: TradeFranceLosSpacecraftClassification;
  launchVehicleId?: string | null;
  apogeeKm?: number | null;
  perigeeKm?: number | null;
  inclinationDeg?: number | null;
  debrisMitigationPlanRef?: string | null;
  reEntryRiskAssessment?: ReEntryRiskAssessment | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  notes?: string | null;
  lastActionById: string;
}

export interface FranceLosCnesDecisionInput {
  organizationId: string;
  losId: string;
  /** Either AUTHORISED or REFUSED. Other targets rejected. */
  decision: Extract<
    TradeFranceLosAuthorisationStatus,
    "AUTHORISED" | "REFUSED"
  >;
  /** CNES file reference, e.g. "DGE-LOS-2026-0042". */
  cnesReference: string;
  /** Validity window assigned by CNES on AUTHORISED. */
  validFrom?: Date | null;
  validUntil?: Date | null;
  /** Operator notes (refusal rationale, conditions, etc.). */
  notes?: string | null;
  lastActionById: string;
}

/**
 * Shape of the JSON `reEntryRiskAssessment` blob. The DB stores it as
 * `Prisma.JsonValue` so additional fields are allowed without a
 * schema migration; only these three are read by the compliance
 * helper.
 */
export interface ReEntryRiskAssessment {
  /** Probability of casualty per re-entry. 0.0001 = 1 in 10⁴. */
  casualtyRisk: number;
  /** Methodology label, e.g. "NASA DAS 3.2.0" or "ESA DRAMA". */
  methodology?: string;
  /** Operator-supplied notes. */
  notes?: string;
}

/**
 * Result of `calculateCasualtyRiskCompliance` — pure function output
 * surfaced to UI badges + cron emails.
 */
export interface CasualtyRiskComplianceResult {
  /** Strict: ≤ 1 in 10⁴ = compliant. > threshold = non-compliant. */
  compliant: boolean;
  /** The threshold used, exposed for UI display. */
  threshold: number;
  /** Casualty-risk figure parsed from the input. */
  casualtyRisk: number | null;
  /** Human-readable rationale for the verdict. */
  rationale: string;
}

// ─── Constants ──────────────────────────────────────────────────────

/**
 * LOS Art. R. 331-21 casualty-risk threshold for controlled re-entry.
 *
 * The text reads: "La probabilité de causer une victime humaine du
 * fait du retour sur Terre des éléments d'un objet spatial ne doit
 * pas excéder 10⁻⁴ par opération de rentrée." — i.e. 1 in 10,000.
 *
 * Exact equality is treated as COMPLIANT (« ne doit pas excéder » =
 * "must not exceed", so equal to the threshold is allowed). Any
 * figure strictly above is non-compliant.
 */
export const CASUALTY_RISK_THRESHOLD_R331_21 = 1e-4;

const EDITOR_REGION = "FR";
void EDITOR_REGION;

// ─── Pure helpers ───────────────────────────────────────────────────

/**
 * Pure compliance verdict on the casualty-risk figure. Reads the
 * `casualtyRisk` field on the re-entry JSON blob, compares to the
 * 1 in 10⁴ threshold defined by LOS Art. R. 331-21. Returns a
 * `{ compliant, threshold, rationale }` triple so the caller can
 * surface both the verdict and the legal anchor in the UI.
 *
 * Boundary semantics:
 *   - risk == 1e-4    → compliant   (exact threshold allowed by text)
 *   - risk < 1e-4     → compliant
 *   - risk > 1e-4     → non-compliant
 *   - missing / NaN / negative / null → non-compliant (no figure
 *     submitted = cannot prove compliance)
 */
export function calculateCasualtyRiskCompliance(
  reEntry: unknown,
): CasualtyRiskComplianceResult {
  const threshold = CASUALTY_RISK_THRESHOLD_R331_21;

  // Defensive parsing — the JSON column can be anything in practice.
  if (
    reEntry === null ||
    reEntry === undefined ||
    typeof reEntry !== "object"
  ) {
    return {
      compliant: false,
      threshold,
      casualtyRisk: null,
      rationale:
        "No re-entry risk assessment provided — LOS Art. R. 331-21 requires a documented casualty-risk figure ≤ 1 in 10⁴.",
    };
  }

  const raw = (reEntry as Record<string, unknown>).casualtyRisk;
  const casualtyRisk =
    typeof raw === "number" && Number.isFinite(raw) ? raw : null;

  if (casualtyRisk === null) {
    return {
      compliant: false,
      threshold,
      casualtyRisk: null,
      rationale:
        "Re-entry assessment missing numeric `casualtyRisk` field — LOS Art. R. 331-21 requires a documented casualty-risk figure.",
    };
  }

  if (casualtyRisk < 0) {
    return {
      compliant: false,
      threshold,
      casualtyRisk,
      rationale:
        "Casualty-risk figure is negative — invalid input; cannot evaluate against LOS Art. R. 331-21.",
    };
  }

  if (casualtyRisk <= threshold) {
    return {
      compliant: true,
      threshold,
      casualtyRisk,
      rationale: `Casualty risk ${formatRisk(casualtyRisk)} does not exceed the LOS Art. R. 331-21 threshold of 1 in 10⁴ (${formatRisk(threshold)}).`,
    };
  }

  return {
    compliant: false,
    threshold,
    casualtyRisk,
    rationale: `Casualty risk ${formatRisk(casualtyRisk)} exceeds the LOS Art. R. 331-21 threshold of 1 in 10⁴ (${formatRisk(threshold)}) — CNES will require a mitigation plan or refuse authorisation.`,
  };
}

function formatRisk(value: number): string {
  if (value === 0) return "0";
  return value.toExponential(2);
}

// ─── Reads ──────────────────────────────────────────────────────────

/**
 * List LOS authorisations for an org. Eager-loads the launch-vehicle
 * operation reference and the last-action user so the list page can
 * display readable provenance without an N+1.
 */
export async function listLosAuthorisations(
  organizationId: string,
  options: { status?: TradeFranceLosAuthorisationStatus } = {},
): Promise<FranceLosWithRelations[]> {
  return prisma.tradeFranceLosAuthorisation.findMany({
    where: {
      organizationId,
      ...(options.status ? { status: options.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      launchVehicle: { select: { id: true, reference: true } },
      lastActionBy: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * Fetch a single LOS authorisation by id, scoped to the org. Returns
 * null when the id does not belong to the org — callers MUST treat
 * null as 404 to avoid leaking cross-org existence.
 */
export async function getLosAuthorisation(
  organizationId: string,
  losId: string,
): Promise<FranceLosWithRelations | null> {
  return prisma.tradeFranceLosAuthorisation.findFirst({
    where: { id: losId, organizationId },
    include: {
      launchVehicle: { select: { id: true, reference: true } },
      lastActionBy: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * List AUTHORISED LOS rows whose validUntil falls within the next
 * `days` calendar days. Powers the daily reminder cron + the
 * dashboard expiry strip.
 */
export async function listExpiring(
  organizationId: string,
  days: number,
): Promise<FranceLosWithRelations[]> {
  if (!Number.isFinite(days) || days <= 0) {
    return [];
  }
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return prisma.tradeFranceLosAuthorisation.findMany({
    where: {
      organizationId,
      status: "AUTHORISED",
      validUntil: { gte: now, lte: cutoff },
    },
    orderBy: { validUntil: "asc" },
    include: {
      launchVehicle: { select: { id: true, reference: true } },
      lastActionBy: { select: { id: true, name: true, email: true } },
    },
  });
}

// ─── Writes ─────────────────────────────────────────────────────────

/**
 * Create a new LOS authorisation in DRAFT. Validates the optional
 * launch-vehicle operation belongs to the same org so a hand-crafted
 * payload can never link a cross-org operation.
 */
export async function createLosAuthorisation(
  input: FranceLosCreateInput,
): Promise<TradeFranceLosAuthorisation> {
  if (!input.operatorName || input.operatorName.trim().length === 0) {
    throw new Error("operatorName is required");
  }
  if (!input.missionName || input.missionName.trim().length === 0) {
    throw new Error("missionName is required");
  }

  if (input.launchVehicleId) {
    const op = await prisma.tradeOperation.findFirst({
      where: {
        id: input.launchVehicleId,
        organizationId: input.organizationId,
      },
      select: { id: true },
    });
    if (!op) {
      throw new Error(
        "Launch-vehicle operation not found in this organisation",
      );
    }
  }

  return prisma.tradeFranceLosAuthorisation.create({
    data: {
      organizationId: input.organizationId,
      operatorName: input.operatorName.trim(),
      operatorAddress: input.operatorAddress ?? null,
      authorisationType: input.authorisationType,
      missionName: input.missionName.trim(),
      missionDescription: input.missionDescription ?? null,
      spacecraftClassification: input.spacecraftClassification,
      launchVehicleId: input.launchVehicleId ?? null,
      apogeeKm: input.apogeeKm ?? null,
      perigeeKm: input.perigeeKm ?? null,
      inclinationDeg: input.inclinationDeg ?? null,
      debrisMitigationPlanRef: input.debrisMitigationPlanRef ?? null,
      reEntryRiskAssessment:
        input.reEntryRiskAssessment === null ||
        input.reEntryRiskAssessment === undefined
          ? undefined
          : (input.reEntryRiskAssessment as unknown as object),
      validFrom: input.validFrom ?? null,
      validUntil: input.validUntil ?? null,
      notes: input.notes ?? null,
      lastActionById: input.lastActionById,
      status: "DRAFT",
    },
  });
}

/**
 * Transition DRAFT → SUBMITTED. Stamps `submittedAt = now()` and
 * leaves CNES reference / decision fields for the regulator-driven
 * `recordCnesDecision` step.
 */
export async function submitToCnes(
  organizationId: string,
  losId: string,
  lastActionById: string,
): Promise<TradeFranceLosAuthorisation> {
  const current = await prisma.tradeFranceLosAuthorisation.findFirst({
    where: { id: losId, organizationId },
    select: { status: true },
  });
  if (!current) {
    throw new Error("LOS authorisation not found in this organisation");
  }
  if (current.status !== "DRAFT") {
    throw new Error(
      `Invalid lifecycle transition ${current.status} → SUBMITTED — only DRAFT can be submitted.`,
    );
  }
  return prisma.tradeFranceLosAuthorisation.update({
    where: { id: losId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      lastActionById,
    },
  });
}

/**
 * Record the CNES decision after the file leaves CNES review.
 *
 * Acceptable input transitions:
 *   - SUBMITTED → UNDER_REVIEW happens automatically before
 *     decision; the cron picks up SUBMITTED rows after a few days
 *     and moves them to UNDER_REVIEW. Callers can ALSO transition
 *     directly UNDER_REVIEW → AUTHORISED/REFUSED here, OR fast-path
 *     SUBMITTED → AUTHORISED/REFUSED (common when CNES bundles ack
 *     and decision in one message).
 */
export async function recordCnesDecision(
  input: FranceLosCnesDecisionInput,
): Promise<TradeFranceLosAuthorisation> {
  const current = await prisma.tradeFranceLosAuthorisation.findFirst({
    where: { id: input.losId, organizationId: input.organizationId },
    select: { status: true },
  });
  if (!current) {
    throw new Error("LOS authorisation not found in this organisation");
  }
  if (current.status !== "SUBMITTED" && current.status !== "UNDER_REVIEW") {
    throw new Error(
      `Invalid lifecycle transition ${current.status} → ${input.decision} — only SUBMITTED or UNDER_REVIEW can receive a CNES decision.`,
    );
  }
  if (!input.cnesReference || input.cnesReference.trim().length === 0) {
    throw new Error("cnesReference is required when recording a CNES decision");
  }

  const now = new Date();
  return prisma.tradeFranceLosAuthorisation.update({
    where: { id: input.losId },
    data: {
      status: input.decision,
      cnesReference: input.cnesReference.trim(),
      decisionAt: now,
      reviewStartAt: current.status === "SUBMITTED" ? now : undefined,
      validFrom: input.validFrom ?? undefined,
      validUntil: input.validUntil ?? undefined,
      notes: input.notes ?? undefined,
      lastActionById: input.lastActionById,
    },
  });
}

/**
 * Mark the mission COMPLETED after the spacecraft has de-orbited
 * (LEO) or been moved to graveyard orbit (GEO). Only AUTHORISED
 * rows are eligible. CNES expects an end-of-mission notification
 * filed in parallel — that workflow lives in the Compliance Program
 * module.
 */
export async function markMissionCompleted(
  organizationId: string,
  losId: string,
  lastActionById: string,
): Promise<TradeFranceLosAuthorisation> {
  const current = await prisma.tradeFranceLosAuthorisation.findFirst({
    where: { id: losId, organizationId },
    select: { status: true },
  });
  if (!current) {
    throw new Error("LOS authorisation not found in this organisation");
  }
  if (current.status !== "AUTHORISED") {
    throw new Error(
      `Invalid lifecycle transition ${current.status} → COMPLETED — only AUTHORISED can be completed.`,
    );
  }
  return prisma.tradeFranceLosAuthorisation.update({
    where: { id: losId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      lastActionById,
    },
  });
}

/**
 * Regulator-initiated REVOKED transition. Reachable from any
 * non-terminal state. Distinct from REFUSED (CNES never issued the
 * authorisation) — REVOKED is mid-mission pull.
 */
export async function revokeAuthorisation(
  organizationId: string,
  losId: string,
  lastActionById: string,
  reason: string,
): Promise<TradeFranceLosAuthorisation> {
  const current = await prisma.tradeFranceLosAuthorisation.findFirst({
    where: { id: losId, organizationId },
    select: { status: true, notes: true },
  });
  if (!current) {
    throw new Error("LOS authorisation not found in this organisation");
  }
  const terminal: TradeFranceLosAuthorisationStatus[] = [
    "REFUSED",
    "REVOKED",
    "COMPLETED",
  ];
  if (terminal.includes(current.status)) {
    throw new Error(
      `Invalid lifecycle transition ${current.status} → REVOKED — already terminal.`,
    );
  }
  const trimmed = (reason ?? "").trim();
  if (trimmed.length === 0) {
    throw new Error("revoke reason is required");
  }
  return prisma.tradeFranceLosAuthorisation.update({
    where: { id: losId },
    data: {
      status: "REVOKED",
      notes: `${current.notes ? current.notes + "\n\n" : ""}[REVOKED] ${trimmed}`,
      lastActionById,
    },
  });
}
