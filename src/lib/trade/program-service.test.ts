/**
 * Tests for src/lib/trade/program-service.ts — Caelex Trade Sprint T4
 * Posture-Layer service.
 *
 * Coverage (10 cases):
 *   1.  decrypt roundtrip — encrypted DDTC nr surfaces as plaintext
 *   2.  decrypt roundtrip — encrypted EO email surfaces as plaintext
 *   3.  getProgram returns null when no row exists
 *   4.  ensureProgram upserts (create-on-miss, no-op-on-hit)
 *   5.  upsertProgramProfile encrypts DDTC nr + EO email before write
 *   6.  upsertProgramProfile clears encrypted fields when patch passes ""
 *   7.  upsertProgramProfile skips sensitive columns when patch omits them
 *   8.  getProgramWithRequirements returns ordered requirement list
 *   9.  setRequirementStatus uses compound (programId, requirementId) key
 *  10.  setRequirementStatus leaves unset meta fields untouched in update
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockUpsert, mockReqUpsert, mockEncrypt, mockDecrypt } =
  vi.hoisted(() => ({
    mockFindUnique: vi.fn(),
    mockUpsert: vi.fn(),
    mockReqUpsert: vi.fn(),
    mockEncrypt: vi.fn(),
    mockDecrypt: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeComplianceProgram: {
      findUnique: mockFindUnique,
      upsert: mockUpsert,
    },
    tradeProgramRequirementStatus: {
      upsert: mockReqUpsert,
    },
  },
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: mockEncrypt,
  decrypt: mockDecrypt,
}));

import {
  getProgram,
  getProgramWithRequirements,
  ensureProgram,
  upsertProgramProfile,
  setRequirementStatus,
} from "./program-service";

beforeEach(() => {
  vi.clearAllMocks();
  // Predictable, reversible mock encryption so tests can assert
  // round-trip behaviour without needing a real ENCRYPTION_KEY.
  mockEncrypt.mockImplementation(
    async (plaintext: string) => `ENC:${plaintext}`,
  );
  mockDecrypt.mockImplementation(async (ciphertext: string) =>
    ciphertext.replace(/^ENC:/, ""),
  );
});

const baseRow = {
  id: "prog_1",
  organizationId: "org_1",
  status: "DRAFT" as const,
  companyTypesJson: null,
  hasITARItems: false,
  hasEARItems: false,
  hasForeignNationals: false,
  foreignNationalCountries: null,
  exportsToCountries: null,
  hasTechnologyTransfer: false,
  hasDefenseContracts: false,
  hasManufacturingAbroad: false,
  hasJointVentures: false,
  annualExportValueEur: null,
  registeredWithDDTC: false,
  ddtcRegistrationNoEnc: null,
  ddtcRegistrationExpiry: null,
  hasTCP: false,
  tcpLastReviewDate: null,
  hasECL: false,
  hasAutomatedScreening: false,
  screeningVendor: null,
  empoweredOfficialName: null,
  empoweredOfficialEmailEnc: null,
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
  createdAt: new Date("2026-05-21T00:00:00Z"),
  updatedAt: new Date("2026-05-21T00:00:00Z"),
};

// ─── getProgram + decrypt roundtrip ─────────────────────────────────────

describe("getProgram", () => {
  it("returns null when no row exists for the organisation", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await getProgram("org_unknown");

    expect(result).toBeNull();
    expect(mockDecrypt).not.toHaveBeenCalled();
  });

  it("decrypts DDTC registration number — caller sees plaintext", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseRow,
      ddtcRegistrationNoEnc: "ENC:M12345",
    });

    const result = await getProgram("org_1");

    expect(result?.ddtcRegistrationNo).toBe("M12345");
    expect(mockDecrypt).toHaveBeenCalledWith("ENC:M12345");
    // Raw ciphertext column never surfaces on the view.
    expect(result as unknown as Record<string, unknown>).not.toHaveProperty(
      "ddtcRegistrationNoEnc",
    );
  });

  it("decrypts Empowered Official email — caller sees plaintext", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseRow,
      empoweredOfficialEmailEnc: "ENC:eo@example.com",
    });

    const result = await getProgram("org_1");

    expect(result?.empoweredOfficialEmail).toBe("eo@example.com");
    expect(mockDecrypt).toHaveBeenCalledWith("ENC:eo@example.com");
  });
});

// ─── ensureProgram ──────────────────────────────────────────────────────

describe("ensureProgram", () => {
  it("upserts a default DRAFT row when none exists", async () => {
    mockUpsert.mockResolvedValue(baseRow);

    const result = await ensureProgram("org_1");

    expect(result.status).toBe("DRAFT");
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { organizationId: "org_1" },
      create: { organizationId: "org_1" },
      update: {},
    });
  });
});

// ─── upsertProgramProfile + encryption boundary ─────────────────────────

describe("upsertProgramProfile", () => {
  it("encrypts DDTC nr and EO email before writing them to the DB", async () => {
    mockUpsert.mockResolvedValue({
      ...baseRow,
      ddtcRegistrationNoEnc: "ENC:M77777",
      empoweredOfficialEmailEnc: "ENC:eo2@example.com",
    });

    await upsertProgramProfile("org_1", {
      ddtcRegistrationNo: "M77777",
      empoweredOfficialEmail: "eo2@example.com",
      registeredWithDDTC: true,
    });

    expect(mockEncrypt).toHaveBeenCalledWith("M77777");
    expect(mockEncrypt).toHaveBeenCalledWith("eo2@example.com");

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.ddtcRegistrationNoEnc).toBe("ENC:M77777");
    expect(call.create.empoweredOfficialEmailEnc).toBe("ENC:eo2@example.com");
    expect(call.create.registeredWithDDTC).toBe(true);
    // Plain field "ddtcRegistrationNo" never reaches Prisma.
    expect(call.create).not.toHaveProperty("ddtcRegistrationNo");
    expect(call.create).not.toHaveProperty("empoweredOfficialEmail");
  });

  it("clears encrypted columns to NULL when patch passes empty string", async () => {
    mockUpsert.mockResolvedValue(baseRow);

    await upsertProgramProfile("org_1", {
      ddtcRegistrationNo: "",
      empoweredOfficialEmail: "",
    });

    expect(mockEncrypt).not.toHaveBeenCalled();
    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.ddtcRegistrationNoEnc).toBeNull();
    expect(call.create.empoweredOfficialEmailEnc).toBeNull();
    expect(call.update.ddtcRegistrationNoEnc).toBeNull();
    expect(call.update.empoweredOfficialEmailEnc).toBeNull();
  });

  it("skips sensitive columns entirely when the patch omits them", async () => {
    mockUpsert.mockResolvedValue(baseRow);

    await upsertProgramProfile("org_1", { hasTCP: true });

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.hasTCP).toBe(true);
    expect(call.create).not.toHaveProperty("ddtcRegistrationNoEnc");
    expect(call.create).not.toHaveProperty("empoweredOfficialEmailEnc");
    expect(call.update).not.toHaveProperty("ddtcRegistrationNoEnc");
    expect(call.update).not.toHaveProperty("empoweredOfficialEmailEnc");
  });
});

// ─── getProgramWithRequirements ─────────────────────────────────────────

describe("getProgramWithRequirements", () => {
  it("returns the program plus its requirement-status rows", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseRow,
      requirementStatuses: [
        {
          id: "rs_1",
          programId: "prog_1",
          requirementId: "ITAR-001",
          status: "COMPLIANT",
          notes: null,
          evidenceNotes: null,
          targetDate: null,
          responsibleParty: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "rs_2",
          programId: "prog_1",
          requirementId: "EAR-014",
          status: "PARTIAL",
          notes: null,
          evidenceNotes: null,
          targetDate: null,
          responsibleParty: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const result = await getProgramWithRequirements("org_1");

    expect(result?.requirementStatuses).toHaveLength(2);
    expect(result?.requirementStatuses[0].requirementId).toBe("ITAR-001");
    expect(result?.program.id).toBe("prog_1");
    // findUnique call requested ordered statuses.
    const arg = mockFindUnique.mock.calls[0][0];
    expect(arg.include.requirementStatuses.orderBy).toEqual([
      { status: "asc" },
      { requirementId: "asc" },
    ]);
  });
});

// ─── setRequirementStatus ───────────────────────────────────────────────

describe("setRequirementStatus", () => {
  it("upserts via the compound (programId, requirementId) unique key", async () => {
    mockReqUpsert.mockResolvedValue({});

    await setRequirementStatus("prog_1", "ITAR-001", "COMPLIANT", {
      notes: "TCP signed off 2026-05",
    });

    const call = mockReqUpsert.mock.calls[0][0];
    expect(call.where).toEqual({
      programId_requirementId: {
        programId: "prog_1",
        requirementId: "ITAR-001",
      },
    });
    expect(call.create.status).toBe("COMPLIANT");
    expect(call.create.notes).toBe("TCP signed off 2026-05");
  });

  it("leaves unset meta fields untouched on update — partial patch semantics", async () => {
    mockReqUpsert.mockResolvedValue({});

    await setRequirementStatus("prog_1", "ITAR-001", "PARTIAL");

    const call = mockReqUpsert.mock.calls[0][0];
    expect(call.update).toEqual({ status: "PARTIAL" });
    expect(call.update).not.toHaveProperty("notes");
    expect(call.update).not.toHaveProperty("evidenceNotes");
    expect(call.update).not.toHaveProperty("targetDate");
    expect(call.update).not.toHaveProperty("responsibleParty");
  });
});
