import type {
  ExportControlAssessment,
  TradeRequirementStatus,
  TradeProgramStatus,
} from "@prisma/client";
import type { ProgramProfilePatch } from "./program-service";

// NOTE: Intentionally NO `import "server-only"` here. The module is
// pure data-mapping (no DB or encryption calls) and is imported from
// scripts/migrate-legacy-export-control.ts under tsx, where the
// server-only barrier throws. Consumers in app code already pass
// through program-service.ts which is properly server-only.

/**
 * Caelex Trade Sprint T5 — Legacy → V2 field-mapping (pure functions).
 *
 * The migration script in `scripts/migrate-legacy-export-control.ts`
 * imports these helpers. Kept as pure data transformations so unit
 * tests run without a DB or encryption-key.
 *
 * Sensitive fields (`ddtcRegistrationNo`, `empoweredOfficialEmail`) are
 * surfaced as **plaintext** in the patch. The program-service does the
 * AES-256-GCM encryption when the patch is applied — never duplicate
 * that boundary here.
 */

/**
 * Maps a Prisma `ExportControlAssessment` row to a partial program patch
 * suitable for `program-service.upsertProgramProfile`. Includes every
 * field that exists on both sides; legacy-only fields (`itarComplianceScore`,
 * `maxCivilPenalty`, `documentationChecklistJson`, etc.) are dropped on
 * purpose — they're computed values, not persisted state in V2.
 */
export function mapAssessmentToProgramPatch(
  a: ExportControlAssessment,
): ProgramProfilePatch {
  return {
    status: mapLegacyAssessmentStatus(a.status),
    companyTypesJson: a.companyTypes,
    hasITARItems: a.hasITARItems,
    hasEARItems: a.hasEARItems,
    hasForeignNationals: a.hasForeignNationals,
    foreignNationalCountries: a.foreignNationalCountries,
    exportsToCountries: a.exportsToCountries,
    hasTechnologyTransfer: a.hasTechnologyTransfer,
    hasDefenseContracts: a.hasDefenseContracts,
    hasManufacturingAbroad: a.hasManufacturingAbroad,
    hasJointVentures: a.hasJointVentures,
    annualExportValueEur: a.annualExportValue,
    registeredWithDDTC: a.registeredWithDDTC,
    ddtcRegistrationNo: a.ddtcRegistrationNo,
    ddtcRegistrationExpiry: a.ddtcRegistrationExpiry,
    hasTCP: a.hasTCP,
    tcpLastReviewDate: a.tcpLastReviewDate,
    hasECL: a.hasECL,
    hasAutomatedScreening: a.hasAutomatedScreening,
    screeningVendor: a.screeningVendor,
    empoweredOfficialName: a.empoweredOfficialName,
    empoweredOfficialEmail: a.empoweredOfficialEmail,
    empoweredOfficialTitle: a.empoweredOfficialTitle,
    jurisdictionDetermination: a.jurisdictionDetermination,
    jurisdictionDeterminationDate: a.jurisdictionDeterminationDate,
    hasCJRequest: a.hasCJRequest,
    cjRequestDate: a.cjRequestDate,
    cjDeterminationDate: a.cjDeterminationDate,
    cjDetermination: a.cjDetermination,
    activeITARLicenses: a.activeITARLicenses,
    pendingITARLicenses: a.pendingITARLicenses,
    activeTAAs: a.activeTAAs,
    activeMLAs: a.activeMLAs,
    activeEARLicenses: a.activeEARLicenses,
    pendingEARLicenses: a.pendingEARLicenses,
    usesLicenseExceptions: a.usesLicenseExceptions,
    licenseExceptionsUsed: a.licenseExceptionsUsed,
    lastTrainingDate: a.lastTrainingDate,
    nextTrainingDue: a.nextTrainingDue,
    trainingCompletionRate: a.trainingCompletionRate,
    lastAuditDate: a.lastAuditDate,
    nextAuditDue: a.nextAuditDue,
    lastAuditFindings: a.lastAuditFindings,
    hasVoluntaryDisclosures: a.hasVoluntaryDisclosures,
    voluntaryDisclosureCount: a.voluntaryDisclosureCount,
    lastVoluntaryDisclosureDate: a.lastVoluntaryDisclosureDate,
  };
}

/**
 * Translate the legacy free-form status string to the V2 enum. Unknown
 * values default to DRAFT — the migration log surfaces them so an
 * operator can re-classify manually if needed.
 */
export function mapLegacyAssessmentStatus(legacy: string): TradeProgramStatus {
  switch (legacy) {
    case "in_progress":
      return "IN_PROGRESS";
    case "completed":
      return "COMPLETE";
    case "archived":
      return "ARCHIVED";
    case "draft":
    default:
      return "DRAFT";
  }
}

/**
 * Translate the legacy free-form requirement-status string to the V2
 * enum. Unknown values default to NOT_ASSESSED — safer than guessing
 * compliance when we don't know.
 */
export function mapLegacyStatusToEnum(legacy: string): TradeRequirementStatus {
  switch (legacy) {
    case "compliant":
      return "COMPLIANT";
    case "partial":
      return "PARTIAL";
    case "non_compliant":
      return "NON_COMPLIANT";
    case "not_applicable":
      return "NOT_APPLICABLE";
    case "not_assessed":
    default:
      return "NOT_ASSESSED";
  }
}
