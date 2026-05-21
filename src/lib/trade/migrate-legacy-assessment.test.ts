/**
 * Tests for src/lib/trade/migrate-legacy-assessment.ts —
 * Caelex Trade Sprint T5 legacy field-mapping.
 *
 * Coverage (8 cases):
 *   1. Full-populated assessment maps every shared field
 *   2. Sensitive fields stay plaintext in patch (service encrypts later)
 *   3. All-null assessment maps to all-null patch without throwing
 *   4. annualExportValue → annualExportValueEur (same value)
 *   5. mapLegacyAssessmentStatus translates the 4 known strings
 *   6. mapLegacyAssessmentStatus falls back to DRAFT for garbage
 *   7. mapLegacyStatusToEnum translates the 5 known requirement strings
 *   8. mapLegacyStatusToEnum falls back to NOT_ASSESSED for garbage
 */

import { describe, it, expect } from "vitest";
import type { ExportControlAssessment } from "@prisma/client";
import {
  mapAssessmentToProgramPatch,
  mapLegacyAssessmentStatus,
  mapLegacyStatusToEnum,
} from "./migrate-legacy-assessment";

// Shape used to build representative test inputs. We don't depend on
// every Prisma column — the mapper only touches the fields enumerated
// in mapAssessmentToProgramPatch.
const fullAssessment = {
  id: "ec_1",
  userId: "user_1",
  assessmentName: "Test Assessment",
  status: "in_progress",
  companyTypes: '["spacecraft_manufacturer"]',
  hasITARItems: true,
  hasEARItems: true,
  hasForeignNationals: false,
  foreignNationalCountries: '["DE","FR"]',
  exportsToCountries: '["US","JP"]',
  hasTechnologyTransfer: true,
  hasDefenseContracts: false,
  hasManufacturingAbroad: false,
  hasJointVentures: false,
  annualExportValue: 1_500_000,
  registeredWithDDTC: true,
  ddtcRegistrationNo: "M12345",
  ddtcRegistrationExpiry: new Date("2027-01-01"),
  hasTCP: true,
  tcpLastReviewDate: new Date("2026-01-15"),
  hasECL: true,
  hasAutomatedScreening: true,
  screeningVendor: "Descartes",
  empoweredOfficialName: "Jane Doe",
  empoweredOfficialEmail: "jane@example.com",
  empoweredOfficialTitle: "VP Compliance",
  jurisdictionDetermination: "dual_use",
  jurisdictionDeterminationDate: new Date("2026-01-10"),
  hasCJRequest: true,
  cjRequestDate: new Date("2025-09-01"),
  cjDeterminationDate: new Date("2025-11-15"),
  cjDetermination: "EAR",
  activeITARLicenses: 3,
  pendingITARLicenses: 1,
  activeTAAs: 2,
  activeMLAs: 0,
  activeEARLicenses: 5,
  pendingEARLicenses: 2,
  usesLicenseExceptions: true,
  licenseExceptionsUsed: '["TMP","RPL"]',
  lastTrainingDate: new Date("2026-02-01"),
  nextTrainingDue: new Date("2027-02-01"),
  trainingCompletionRate: 92.5,
  lastAuditDate: new Date("2025-12-01"),
  nextAuditDue: new Date("2026-12-01"),
  lastAuditFindings: "No material findings",
  hasVoluntaryDisclosures: false,
  voluntaryDisclosureCount: null,
  lastVoluntaryDisclosureDate: null,
  // Legacy-only fields the mapper drops on purpose — included here so
  // tests realistically resemble a DB row but the mapper output won't
  // contain them.
  itarComplianceScore: 87,
  earComplianceScore: 90,
  overallComplianceScore: 88,
  mandatoryScore: 95,
  criticalScore: 100,
  riskLevel: "medium",
  criticalGaps: 0,
  highGaps: 2,
  maxCivilPenalty: 500_000,
  maxCriminalPenalty: 1_000_000,
  maxImprisonment: 5,
  reportGenerated: false,
  reportGeneratedAt: null,
  documentationChecklistJson: null,
  createdAt: new Date("2025-08-01"),
  updatedAt: new Date("2026-05-01"),
} satisfies ExportControlAssessment;

describe("mapAssessmentToProgramPatch — full row", () => {
  it("maps every field exposed by the V2 program schema", () => {
    const patch = mapAssessmentToProgramPatch(fullAssessment);

    expect(patch).toMatchObject({
      status: "IN_PROGRESS",
      companyTypesJson: '["spacecraft_manufacturer"]',
      hasITARItems: true,
      hasEARItems: true,
      foreignNationalCountries: '["DE","FR"]',
      annualExportValueEur: 1_500_000,
      registeredWithDDTC: true,
      ddtcRegistrationNo: "M12345",
      tcpLastReviewDate: new Date("2026-01-15"),
      empoweredOfficialName: "Jane Doe",
      empoweredOfficialEmail: "jane@example.com",
      jurisdictionDetermination: "dual_use",
      activeITARLicenses: 3,
      licenseExceptionsUsed: '["TMP","RPL"]',
      trainingCompletionRate: 92.5,
      lastAuditFindings: "No material findings",
    });
  });

  it("keeps sensitive fields as plaintext — service encrypts later", () => {
    const patch = mapAssessmentToProgramPatch(fullAssessment);

    expect(patch.ddtcRegistrationNo).toBe("M12345");
    expect(patch.empoweredOfficialEmail).toBe("jane@example.com");
    // The mapper must NOT pre-encrypt — patch contains the legacy field
    // names (`ddtcRegistrationNo`, not `ddtcRegistrationNoEnc`).
    expect(patch).not.toHaveProperty("ddtcRegistrationNoEnc");
    expect(patch).not.toHaveProperty("empoweredOfficialEmailEnc");
  });

  it("renames annualExportValue → annualExportValueEur (same value)", () => {
    const patch = mapAssessmentToProgramPatch(fullAssessment);

    expect(patch.annualExportValueEur).toBe(1_500_000);
    expect(patch).not.toHaveProperty("annualExportValue");
  });
});

describe("mapAssessmentToProgramPatch — null safety", () => {
  it("handles an all-null assessment without throwing", () => {
    const empty = {
      ...fullAssessment,
      assessmentName: null,
      status: "draft",
      companyTypes: "",
      hasITARItems: false,
      hasEARItems: false,
      hasForeignNationals: false,
      foreignNationalCountries: null,
      exportsToCountries: null,
      hasTechnologyTransfer: false,
      hasDefenseContracts: false,
      hasManufacturingAbroad: false,
      hasJointVentures: false,
      annualExportValue: null,
      registeredWithDDTC: false,
      ddtcRegistrationNo: null,
      ddtcRegistrationExpiry: null,
      hasTCP: false,
      tcpLastReviewDate: null,
      hasECL: false,
      hasAutomatedScreening: false,
      screeningVendor: null,
      empoweredOfficialName: null,
      empoweredOfficialEmail: null,
      empoweredOfficialTitle: null,
      jurisdictionDetermination: null,
      jurisdictionDeterminationDate: null,
      hasCJRequest: false,
      cjRequestDate: null,
      cjDeterminationDate: null,
      cjDetermination: null,
      activeITARLicenses: null,
      pendingITARLicenses: null,
      activeTAAs: null,
      activeMLAs: null,
      activeEARLicenses: null,
      pendingEARLicenses: null,
      usesLicenseExceptions: false,
      licenseExceptionsUsed: null,
      lastTrainingDate: null,
      nextTrainingDue: null,
      trainingCompletionRate: null,
      lastAuditDate: null,
      nextAuditDue: null,
      lastAuditFindings: null,
      hasVoluntaryDisclosures: false,
      voluntaryDisclosureCount: null,
      lastVoluntaryDisclosureDate: null,
    } satisfies ExportControlAssessment;

    const patch = mapAssessmentToProgramPatch(empty);
    expect(patch.status).toBe("DRAFT");
    expect(patch.ddtcRegistrationNo).toBeNull();
    expect(patch.empoweredOfficialEmail).toBeNull();
    expect(patch.annualExportValueEur).toBeNull();
  });
});

describe("mapLegacyAssessmentStatus", () => {
  it("translates the four known status strings", () => {
    expect(mapLegacyAssessmentStatus("draft")).toBe("DRAFT");
    expect(mapLegacyAssessmentStatus("in_progress")).toBe("IN_PROGRESS");
    expect(mapLegacyAssessmentStatus("completed")).toBe("COMPLETE");
    expect(mapLegacyAssessmentStatus("archived")).toBe("ARCHIVED");
  });

  it("falls back to DRAFT for any unknown status", () => {
    expect(mapLegacyAssessmentStatus("done")).toBe("DRAFT");
    expect(mapLegacyAssessmentStatus("")).toBe("DRAFT");
    expect(mapLegacyAssessmentStatus("garbage")).toBe("DRAFT");
  });
});

describe("mapLegacyStatusToEnum", () => {
  it("translates the five known requirement statuses", () => {
    expect(mapLegacyStatusToEnum("compliant")).toBe("COMPLIANT");
    expect(mapLegacyStatusToEnum("partial")).toBe("PARTIAL");
    expect(mapLegacyStatusToEnum("non_compliant")).toBe("NON_COMPLIANT");
    expect(mapLegacyStatusToEnum("not_assessed")).toBe("NOT_ASSESSED");
    expect(mapLegacyStatusToEnum("not_applicable")).toBe("NOT_APPLICABLE");
  });

  it("falls back to NOT_ASSESSED for any unknown requirement status", () => {
    expect(mapLegacyStatusToEnum("garbage")).toBe("NOT_ASSESSED");
    expect(mapLegacyStatusToEnum("")).toBe("NOT_ASSESSED");
  });
});
