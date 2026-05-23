/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Caelex Trade ↔ Caelex Comply cross-domain bridge service.
 *
 * Surfaces the satellite-operator's main-platform compliance lifecycle
 * data (Debris Mitigation, ITU Spectrum coordination, National Space-Act
 * Authorization, NIS2 entity classification) on the Trade Operation
 * detail page so that export-control AVs can see, at a glance, whether
 * the underlying spacecraft is authorised, has an accepted debris plan,
 * and is coordinated for the frequencies it operates on.
 *
 * IMPORTANT: This is a READ-ONLY adapter. No mutations are performed on
 * the Comply tables; no schema changes are introduced. The adapter
 * tolerates absent links — when a TradeOperation has no associated
 * Spacecraft (the most common case in v1, because the data model does
 * not directly connect TradeItem → Spacecraft), it returns `null` for
 * every probe and the UI degrades to an explanatory empty state.
 *
 * Resolution strategy for finding the related Spacecraft:
 *
 *   1. Walk TradeOperation.missionRef → Mission.spacecraft (M:N junction
 *      MissionSpacecraft) → Spacecraft. We prefer the assignment with
 *      `endedAt = null` (active assignment) and `role = "primary"` when
 *      multiple exist.
 *
 *   2. If no mission link, return null. The Trade data model does not
 *      yet carry a per-TradeItem.spacecraftId field, so we cannot
 *      reverse-resolve via operation lines today. (A future migration
 *      could add TradeItem.spacecraftId; this adapter would then pick
 *      up the new path without UI changes.)
 *
 * The service is org-scoped on every read — cross-tenant id leaks are
 * impossible because every Prisma `findFirst` includes
 * `{ organizationId }` in the where clause.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";

// ─── Public result shapes ────────────────────────────────────────────

/** Compliance verdict band used across all three panels. */
export type ComplyStatus =
  | "compliant"
  | "non_compliant"
  | "under_review"
  | "unknown";

export interface SpacecraftLinkContext {
  spacecraftId: string;
  spacecraftName: string;
  cosparId: string | null;
  noradId: string | null;
  orbitType: string;
  missionRefId: string;
  missionName: string;
}

export interface DebrisStatus {
  spacecraft: SpacecraftLinkContext;
  /** True when the assessment indicates IADC mitigation guideline conformance. */
  iadcCompliant: boolean | null;
  /**
   * Deorbit status:
   *   - "yes"    — within 25 years (LEO) per IADC § 5.3.2 / NASA-STD-8719.14B
   *   - "exempt" — GEO graveyard orbit (raise to GEO+300 km, IADC § 5.3.1)
   *   - "no"     — neither plan in place
   *   - null     — not yet assessed
   */
  deorbit25Year: "yes" | "no" | "exempt" | null;
  /**
   * FCC Orbital Debris Mitigation Plan (47 CFR § 25.114(d)(14)):
   *   - "yes" — plan filed and on-record
   *   - "no"  — plan required but not yet filed
   *   - "n_a" — not subject to FCC jurisdiction (non-US spectrum filing)
   *   - null  — unknown
   */
  fccOdmpStatus: "yes" | "no" | "n_a" | null;
  lastReviewDate: Date | null;
  complianceScore: number | null;
  status: ComplyStatus;
}

export interface SpectrumStatus {
  spacecraft: SpacecraftLinkContext;
  /** Frequencies in MHz, deduplicated, sorted ascending. */
  operatingFrequenciesMhz: number[];
  /**
   * ITU coordination status — derived from SpectrumAssessment phase
   * statuses (apiStatus → notificationStatus → recordingStatus). The
   * highest-progressed phase wins. OPERATIONAL = MFRN-recorded + BIU
   * achieved. DENIED = unfavorable examination finding.
   */
  ituStatus:
    | "FILED"
    | "COORDINATED"
    | "NOTIFIED"
    | "OPERATIONAL"
    | "DENIED"
    | null;
  /** ITU API / Coordination Request / Notification filing reference. */
  filingReference: string | null;
  /** National notifying administration (e.g. "BNetzA", "FCC", "Ofcom", "ARCEP"). */
  nationalAdministration: string | null;
  status: ComplyStatus;
}

export interface AuthorizationStatus {
  spacecraft: SpacecraftLinkContext;
  /**
   * National space-act authorisation status — pulled from the
   * AuthorizationWorkflow tied to the same Mission as the operation.
   * Possible values mirror AuthorizationWorkflow.status:
   *   not_started | in_progress | submitted | under_review | approved | rejected
   */
  nationalAuthorizationStatus: string | null;
  /** Primary NCA display name (e.g. "Bundesnetzagentur (DE)"). */
  primaryNcaName: string | null;
  /** EU Space Act compliance level — read from associated workflow pathway. */
  euSpaceActPathway: string | null;
  /**
   * NIS2 entity classification — "essential", "important", "out_of_scope".
   * Sourced from the org's most-recent NIS2Assessment (org-scoped, not
   * spacecraft-scoped — NIS2 applies to the operator entity).
   */
  nis2Classification: "essential" | "important" | "out_of_scope" | null;
  status: ComplyStatus;
}

// ─── Resolver: TradeOperation → Spacecraft via Mission ───────────────

/**
 * Resolve the canonical Spacecraft for a TradeOperation by walking
 * the Mission link. Returns null when:
 *   - the operation is not found (or cross-org id leak attempt),
 *   - the operation has no missionRefId,
 *   - the mission has no active spacecraft assignment.
 *
 * Spacecraft selection rule when multiple are assigned: prefer
 * (active assignments) → (role === "primary") → (most recent startedAt).
 */
async function resolveSpacecraftForOperation(
  operationId: string,
  organizationId: string,
): Promise<{
  spacecraft: SpacecraftLinkContext;
  spacecraftId: string;
} | null> {
  const op = await prisma.tradeOperation.findFirst({
    where: { id: operationId, organizationId },
    select: {
      missionRefId: true,
      missionRef: {
        select: {
          id: true,
          name: true,
          spacecraft: {
            where: { endedAt: null },
            select: {
              role: true,
              startedAt: true,
              spacecraft: {
                select: {
                  id: true,
                  name: true,
                  cosparId: true,
                  noradId: true,
                  orbitType: true,
                },
              },
            },
            orderBy: [{ startedAt: "desc" }],
          },
        },
      },
    },
  });

  if (!op || !op.missionRef || op.missionRef.spacecraft.length === 0) {
    return null;
  }

  // Prefer primary assignment; fall back to first (already ordered by
  // startedAt desc within the active set).
  const assignments = op.missionRef.spacecraft;
  const primary =
    assignments.find((a) => a.role === "primary") ?? assignments[0];
  if (!primary) return null;

  return {
    spacecraftId: primary.spacecraft.id,
    spacecraft: {
      spacecraftId: primary.spacecraft.id,
      spacecraftName: primary.spacecraft.name,
      cosparId: primary.spacecraft.cosparId,
      noradId: primary.spacecraft.noradId,
      orbitType: primary.spacecraft.orbitType,
      missionRefId: op.missionRef.id,
      missionName: op.missionRef.name,
    },
  };
}

// ─── Status band derivation helpers ──────────────────────────────────

/** Map a DebrisAssessment to a top-level verdict band. */
function deriveDebrisStatus(
  iadcCompliant: boolean | null,
  deorbit25Year: DebrisStatus["deorbit25Year"],
  fccOdmpStatus: DebrisStatus["fccOdmpStatus"],
  complianceScore: number | null,
): ComplyStatus {
  // Score ≥ 80 with no fatal flag = compliant
  if (
    iadcCompliant === true &&
    (deorbit25Year === "yes" || deorbit25Year === "exempt") &&
    (fccOdmpStatus === "yes" || fccOdmpStatus === "n_a") &&
    (complianceScore === null || complianceScore >= 80)
  ) {
    return "compliant";
  }
  // Explicit non-conformity flags
  if (
    iadcCompliant === false ||
    deorbit25Year === "no" ||
    fccOdmpStatus === "no"
  ) {
    return "non_compliant";
  }
  // Some data present but not all green
  if (
    iadcCompliant !== null ||
    deorbit25Year !== null ||
    fccOdmpStatus !== null ||
    complianceScore !== null
  ) {
    return "under_review";
  }
  return "unknown";
}

function deriveSpectrumStatus(
  ituStatus: SpectrumStatus["ituStatus"],
): ComplyStatus {
  if (ituStatus === "OPERATIONAL") return "compliant";
  if (ituStatus === "DENIED") return "non_compliant";
  if (
    ituStatus === "COORDINATED" ||
    ituStatus === "NOTIFIED" ||
    ituStatus === "FILED"
  ) {
    return "under_review";
  }
  return "unknown";
}

function deriveAuthorizationStatus(
  nationalAuthorizationStatus: string | null,
): ComplyStatus {
  if (nationalAuthorizationStatus === "approved") return "compliant";
  if (nationalAuthorizationStatus === "rejected") return "non_compliant";
  if (
    nationalAuthorizationStatus === "in_progress" ||
    nationalAuthorizationStatus === "submitted" ||
    nationalAuthorizationStatus === "under_review"
  ) {
    return "under_review";
  }
  return "unknown";
}

// ─── Frequency parsing ───────────────────────────────────────────────

/**
 * Parse the SpectrumAssessment.frequencyDetails JSON into a flat,
 * sorted list of representative frequencies in MHz. The JSON shape is
 * loose — see schema doc — so we walk it defensively. Returns [] on
 * malformed or absent payloads (UI shows "no frequencies declared").
 *
 * Exported for unit-test access.
 */
export function parseFrequencyDetails(
  raw: string | null | undefined,
): number[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];

  const out = new Set<number>();
  for (const band of Object.values(parsed as Record<string, unknown>)) {
    if (!band || typeof band !== "object") continue;
    const bandObj = band as Record<string, unknown>;
    for (const key of ["uplinkMHz", "downlinkMHz", "centerMHz"]) {
      const val = bandObj[key];
      if (typeof val === "number" && isFinite(val)) {
        out.add(Math.round(val));
      } else if (Array.isArray(val)) {
        for (const v of val) {
          if (typeof v === "number" && isFinite(v)) {
            out.add(Math.round(v));
          }
        }
      }
    }
  }
  return Array.from(out).sort((a, b) => a - b);
}

/** Map ITU-administration code to display name. */
function adminCodeToName(code: string | null | undefined): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    D: "BNetzA (DE)",
    DEU: "BNetzA (DE)",
    USA: "FCC (US)",
    F: "ARCEP (FR)",
    FRA: "ARCEP (FR)",
    G: "Ofcom (UK)",
    GBR: "Ofcom (UK)",
    LUX: "ILR (LU)",
    NLD: "Agentschap Telecom (NL)",
    ESP: "SETSI (ES)",
    ITA: "MISE (IT)",
    BEL: "BIPT (BE)",
    POL: "UKE (PL)",
  };
  return map[code.toUpperCase()] ?? code;
}

/**
 * Derive ITU coordination phase from the four SpectrumAssessment phase
 * status fields. Highest-progressed phase wins. Returns null when
 * nothing has been filed.
 *
 * Exported for unit-test access.
 */
export function deriveItuPhase(input: {
  apiStatus: string | null | undefined;
  crCStatus: string | null | undefined;
  notificationStatus: string | null | undefined;
  recordingStatus: string | null | undefined;
  biuAchieved: boolean | null | undefined;
}): SpectrumStatus["ituStatus"] {
  const recording = input.recordingStatus ?? "not_started";
  const notification = input.notificationStatus ?? "not_started";
  const crC = input.crCStatus ?? "not_started";
  const api = input.apiStatus ?? "not_started";

  if (recording === "recorded" && input.biuAchieved === true) {
    return "OPERATIONAL";
  }
  if (notification === "unfavorable") return "DENIED";
  if (recording === "recorded" || recording === "pending") return "NOTIFIED";
  if (
    notification === "submitted" ||
    notification === "examined" ||
    notification === "favorable"
  ) {
    return "NOTIFIED";
  }
  if (crC === "published" || crC === "submitted") return "COORDINATED";
  if (api === "published" || api === "submitted" || api === "extended") {
    return "FILED";
  }
  return null;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Get the debris-mitigation compliance status for the spacecraft
 * associated with the given operation. Returns null when no spacecraft
 * is linked (UI shows empty state with linking instructions).
 */
export async function getDebrisStatus(
  operationId: string,
  organizationId: string,
): Promise<DebrisStatus | null> {
  const resolved = await resolveSpacecraftForOperation(
    operationId,
    organizationId,
  );
  if (!resolved) return null;

  // Pull the most recent DebrisAssessment for this spacecraft, scoped
  // to the same organization. If multiple exist, the freshest wins.
  const assessment = await prisma.debrisAssessment.findFirst({
    where: {
      spacecraftId: resolved.spacecraftId,
      organizationId,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      complianceScore: true,
      deorbitStrategy: true,
      deorbitTimelineYears: true,
      orbitType: true,
      planGenerated: true,
      planGeneratedAt: true,
      updatedAt: true,
    },
  });

  if (!assessment) {
    return {
      spacecraft: resolved.spacecraft,
      iadcCompliant: null,
      deorbit25Year: null,
      fccOdmpStatus: null,
      lastReviewDate: null,
      complianceScore: null,
      status: "unknown",
    };
  }

  // Derive IADC compliance: a deorbit strategy is present AND the
  // timeline (LEO) is within 25 years OR the orbit is GEO with a
  // graveyard strategy.
  const isLeo = ["LEO", "MEO", "HEO"].includes(
    assessment.orbitType.toUpperCase(),
  );
  const isGeo = assessment.orbitType.toUpperCase() === "GEO";

  let deorbit25Year: DebrisStatus["deorbit25Year"];
  if (isGeo && assessment.deorbitStrategy === "graveyard_orbit") {
    deorbit25Year = "exempt";
  } else if (
    isLeo &&
    assessment.deorbitStrategy &&
    assessment.deorbitStrategy !== "passive_decay" &&
    (assessment.deorbitTimelineYears ?? Infinity) <= 25
  ) {
    deorbit25Year = "yes";
  } else if (
    isLeo &&
    assessment.deorbitStrategy === "passive_decay" &&
    (assessment.deorbitTimelineYears ?? Infinity) <= 25
  ) {
    deorbit25Year = "yes";
  } else if (assessment.deorbitStrategy) {
    deorbit25Year = "no";
  } else {
    deorbit25Year = null;
  }

  const iadcCompliant =
    assessment.complianceScore !== null
      ? assessment.complianceScore >= 70
      : null;

  // FCC ODMP: keyed to the planGenerated flag. We can't reliably tell
  // jurisdictional applicability without a US-spectrum filing flag, so
  // we conservatively label this "yes" when a plan exists, "n_a" when
  // the orbit is non-Earth (cislunar etc.) — and "null" otherwise.
  let fccOdmpStatus: DebrisStatus["fccOdmpStatus"];
  if (assessment.orbitType.toLowerCase() === "cislunar") {
    fccOdmpStatus = "n_a";
  } else if (assessment.planGenerated) {
    fccOdmpStatus = "yes";
  } else {
    fccOdmpStatus = null;
  }

  const status = deriveDebrisStatus(
    iadcCompliant,
    deorbit25Year,
    fccOdmpStatus,
    assessment.complianceScore,
  );

  return {
    spacecraft: resolved.spacecraft,
    iadcCompliant,
    deorbit25Year,
    fccOdmpStatus,
    lastReviewDate: assessment.planGeneratedAt ?? assessment.updatedAt,
    complianceScore: assessment.complianceScore,
    status,
  };
}

/**
 * Get the ITU spectrum-coordination status for the spacecraft
 * associated with the given operation. Returns null when no spacecraft
 * is linked.
 *
 * Spectrum is org-scoped (assessments live on User, not Spacecraft).
 * We pick the most recent SpectrumAssessment whose
 * networkName / operatorName matches the spacecraft name, falling
 * back to the most-recent assessment in the org if no name match.
 */
export async function getSpectrumStatus(
  operationId: string,
  organizationId: string,
): Promise<SpectrumStatus | null> {
  const resolved = await resolveSpacecraftForOperation(
    operationId,
    organizationId,
  );
  if (!resolved) return null;

  // SpectrumAssessment is user-scoped (not org-scoped) and not directly
  // linked to Spacecraft. We probe via the org's members.
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  const memberUserIds = members.map((m) => m.userId);
  if (memberUserIds.length === 0) {
    return {
      spacecraft: resolved.spacecraft,
      operatingFrequenciesMhz: [],
      ituStatus: null,
      filingReference: null,
      nationalAdministration: null,
      status: "unknown",
    };
  }

  // Prefer an assessment whose networkName matches the spacecraft name,
  // falling back to org's most-recent.
  const nameMatch = await prisma.spectrumAssessment.findFirst({
    where: {
      userId: { in: memberUserIds },
      OR: [
        {
          networkName: {
            equals: resolved.spacecraft.spacecraftName,
            mode: "insensitive",
          },
        },
        {
          operatorName: {
            equals: resolved.spacecraft.spacecraftName,
            mode: "insensitive",
          },
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
  const assessment =
    nameMatch ??
    (await prisma.spectrumAssessment.findFirst({
      where: { userId: { in: memberUserIds } },
      orderBy: { updatedAt: "desc" },
    }));

  if (!assessment) {
    return {
      spacecraft: resolved.spacecraft,
      operatingFrequenciesMhz: [],
      ituStatus: null,
      filingReference: null,
      nationalAdministration: null,
      status: "unknown",
    };
  }

  const ituPhase = deriveItuPhase({
    apiStatus: assessment.apiStatus,
    crCStatus: assessment.crCStatus,
    notificationStatus: assessment.notificationStatus,
    recordingStatus: assessment.recordingStatus,
    biuAchieved: assessment.biuAchieved,
  });

  const filingReference =
    assessment.recordingReference ??
    assessment.notificationReference ??
    assessment.crCReference ??
    assessment.apiReference ??
    null;

  return {
    spacecraft: resolved.spacecraft,
    operatingFrequenciesMhz: parseFrequencyDetails(assessment.frequencyDetails),
    ituStatus: ituPhase,
    filingReference,
    nationalAdministration: adminCodeToName(assessment.administrationCode),
    status: deriveSpectrumStatus(ituPhase),
  };
}

/**
 * Get the authorization + NIS2 status for the spacecraft / org tied to
 * the given operation. Returns null when no spacecraft is linked.
 *
 * AuthorizationWorkflow is user-scoped + can carry a mission link. We
 * prefer (mission-matched workflows) → (org-member-scoped fallback).
 *
 * NIS2 is org-scoped and reflects the operator entity — fetched
 * separately and combined into the same response.
 */
export async function getAuthorizationStatus(
  operationId: string,
  organizationId: string,
): Promise<AuthorizationStatus | null> {
  const resolved = await resolveSpacecraftForOperation(
    operationId,
    organizationId,
  );
  if (!resolved) return null;

  // Try a mission-matched AuthorizationWorkflow first.
  const missionMatched = await prisma.authorizationWorkflow.findFirst({
    where: { missionRefId: resolved.spacecraft.missionRefId },
    orderBy: { updatedAt: "desc" },
    select: {
      status: true,
      primaryNCAName: true,
      pathway: true,
    },
  });

  let workflow = missionMatched;
  if (!workflow) {
    // Fallback: any workflow owned by an org member.
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      select: { userId: true },
    });
    const memberUserIds = members.map((m) => m.userId);
    if (memberUserIds.length > 0) {
      workflow = await prisma.authorizationWorkflow.findFirst({
        where: { userId: { in: memberUserIds } },
        orderBy: { updatedAt: "desc" },
        select: {
          status: true,
          primaryNCAName: true,
          pathway: true,
        },
      });
    }
  }

  // NIS2 classification — org-scoped, most recent.
  const nis2 = await prisma.nIS2Assessment.findFirst({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    select: { entityClassification: true },
  });

  const nis2Classification =
    nis2?.entityClassification === "essential" ||
    nis2?.entityClassification === "important" ||
    nis2?.entityClassification === "out_of_scope"
      ? nis2.entityClassification
      : null;

  const nationalStatus = workflow?.status ?? null;

  return {
    spacecraft: resolved.spacecraft,
    nationalAuthorizationStatus: nationalStatus,
    primaryNcaName: workflow?.primaryNCAName ?? null,
    euSpaceActPathway: workflow?.pathway ?? null,
    nis2Classification,
    status: deriveAuthorizationStatus(nationalStatus),
  };
}

// ─── Internal helpers exported for testing ───────────────────────────

export const __test__ = {
  deriveDebrisStatus,
  deriveSpectrumStatus,
  deriveAuthorizationStatus,
  adminCodeToName,
};
