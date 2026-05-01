/**
 * Re-Verification Dispatcher tests.
 *
 * The dispatcher has three behaviours worth covering:
 *
 *   1. Grouping — N stale rows from M orgs collapse into M auto-detection
 *      runs (not N).
 *   2. Identity-hint extraction — pulls VAT-ID from prior evidence rows,
 *      establishment from the OperatorProfile column.
 *   3. Hard cap — at MAX_ORGS_PER_DISPATCH the dispatcher truncates and
 *      flags `truncated: true`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockOperatorProfile,
  mockOrganization,
  mockDerivationTrace,
  mockRunAutoDetection,
} = vi.hoisted(() => ({
  mockOperatorProfile: { findUnique: vi.fn() },
  mockOrganization: { findUnique: vi.fn() },
  mockDerivationTrace: { findFirst: vi.fn() },
  mockRunAutoDetection: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    operatorProfile: mockOperatorProfile,
    organization: mockOrganization,
    derivationTrace: mockDerivationTrace,
  },
}));

vi.mock("./cross-verifier.server", () => ({
  runAutoDetection: mockRunAutoDetection,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  dispatchAnonymous,
  dispatchOne,
  dispatchReverificationForStaleRows,
  MAX_ORGS_PER_DISPATCH,
} from "./dispatcher.server";
import type { StaleEvidenceRow } from "../evidence.server";

beforeEach(() => {
  vi.clearAllMocks();
  mockOperatorProfile.findUnique.mockResolvedValue({ establishment: "DE" });
  mockOrganization.findUnique.mockResolvedValue({
    name: "Acme Aerospace GmbH",
    vatNumber: null,
  });
  mockDerivationTrace.findFirst.mockResolvedValue(null);
  mockRunAutoDetection.mockResolvedValue({
    organizationId: "org_x",
    startedAt: new Date(),
    finishedAt: new Date(),
    successfulOutcomes: [],
    failures: [],
    mergedFields: [],
  });
});

function makeStaleRow(
  organizationId: string,
  fieldName = "establishment",
): StaleEvidenceRow {
  return {
    id: `e_${organizationId}_${fieldName}`,
    organizationId,
    entityType: "operator_profile",
    entityId: `p_${organizationId}`,
    fieldName,
    verificationTier: "T2_SOURCE_VERIFIED",
    expiresAt: new Date("2026-04-01T00:00:00Z"),
    derivedAt: new Date("2025-12-01T00:00:00Z"),
    attestationRef: null,
  };
}

describe("dispatchReverificationForStaleRows", () => {
  it("groups multiple rows from the same org into one auto-detection run", async () => {
    const rows = [
      makeStaleRow("org_1", "establishment"),
      makeStaleRow("org_1", "operatorType"),
      makeStaleRow("org_1", "entitySize"),
    ];
    const summary = await dispatchReverificationForStaleRows(rows);
    // 3 rows from 1 org → 1 auto-detection run
    expect(mockRunAutoDetection).toHaveBeenCalledTimes(1);
    expect(summary.orgsProcessed + summary.orgsSkipped).toBe(1);
  });

  it("processes N orgs with N runs", async () => {
    const rows = [
      makeStaleRow("org_1"),
      makeStaleRow("org_2"),
      makeStaleRow("org_3"),
    ];
    await dispatchReverificationForStaleRows(rows);
    expect(mockRunAutoDetection).toHaveBeenCalledTimes(3);
  });

  it("flags truncated when org count exceeds the cap", async () => {
    const rows = Array.from({ length: MAX_ORGS_PER_DISPATCH + 5 }, (_, i) =>
      makeStaleRow(`org_${i}`),
    );
    const summary = await dispatchReverificationForStaleRows(rows);
    expect(summary.truncated).toBe(true);
    // mocking establishment="DE" + no vatId → org gets skipped (no vat hint).
    // What we're testing here is the cap logic, not the per-org outcome.
    expect(summary.orgsProcessed + summary.orgsSkipped).toBe(
      MAX_ORGS_PER_DISPATCH,
    );
  });

  it("skips orgs with no identity hints (no vatId, no name, no establishment)", async () => {
    mockOperatorProfile.findUnique.mockResolvedValue({ establishment: null });
    mockOrganization.findUnique.mockResolvedValue({
      name: null,
      vatNumber: null,
    });
    mockDerivationTrace.findFirst.mockResolvedValue(null);
    const rows = [makeStaleRow("org_skip")];
    const summary = await dispatchReverificationForStaleRows(rows);
    expect(summary.orgsSkipped).toBe(1);
    expect(summary.orgsProcessed).toBe(0);
    expect(mockRunAutoDetection).not.toHaveBeenCalled();
  });

  it("extracts vatId from existing evidence rows for adapter input", async () => {
    mockDerivationTrace.findFirst.mockResolvedValue({
      value: '"DE123456789"',
    });
    const rows = [makeStaleRow("org_with_vat")];
    await dispatchReverificationForStaleRows(rows);
    expect(mockRunAutoDetection).toHaveBeenCalledTimes(1);
    const [input] = mockRunAutoDetection.mock.calls[0];
    expect(input.vatId).toBe("DE123456789");
  });

  it("falls back to Organization.vatNumber when no evidence row exists", async () => {
    mockOrganization.findUnique.mockResolvedValue({
      name: "Acme",
      vatNumber: "DE987654321",
    });
    mockDerivationTrace.findFirst.mockResolvedValue(null);
    const rows = [makeStaleRow("org_orgvat")];
    await dispatchReverificationForStaleRows(rows);
    const [input] = mockRunAutoDetection.mock.calls[0];
    expect(input.vatId).toBe("DE987654321");
  });

  it("evidence-row vatId wins over Organization.vatNumber column", async () => {
    mockOrganization.findUnique.mockResolvedValue({
      name: "Acme",
      vatNumber: "DE000000000",
    });
    mockDerivationTrace.findFirst.mockResolvedValue({
      value: '"DE111111111"',
    });
    const rows = [makeStaleRow("org_both")];
    await dispatchReverificationForStaleRows(rows);
    const [input] = mockRunAutoDetection.mock.calls[0];
    expect(input.vatId).toBe("DE111111111");
  });

  it("surfaces Organization.name as legalName for CelesTrak adapter", async () => {
    mockOrganization.findUnique.mockResolvedValue({
      name: "OneWeb Limited",
      vatNumber: null,
    });
    const rows = [makeStaleRow("org_named")];
    await dispatchReverificationForStaleRows(rows);
    const [input] = mockRunAutoDetection.mock.calls[0];
    expect(input.legalName).toBe("OneWeb Limited");
  });

  it("counts failures from runAutoDetection failures array", async () => {
    mockRunAutoDetection.mockResolvedValueOnce({
      organizationId: "org_1",
      startedAt: new Date(),
      finishedAt: new Date(),
      successfulOutcomes: [],
      failures: [
        {
          ok: false,
          source: "vies-eu-vat",
          errorKind: "rate-limited",
          message: "VIES rate-limited",
        },
      ],
      mergedFields: [],
    });
    mockOperatorProfile.findUnique.mockResolvedValue({ establishment: "DE" });
    const rows = [makeStaleRow("org_1")];
    const summary = await dispatchReverificationForStaleRows(rows);
    expect(summary.failures).toBe(1);
  });

  it("does not throw when a single org's prisma read fails", async () => {
    mockOperatorProfile.findUnique
      .mockRejectedValueOnce(new Error("DB hiccup"))
      .mockResolvedValue({ establishment: "DE" });

    const rows = [makeStaleRow("org_broken"), makeStaleRow("org_ok")];
    const summary = await dispatchReverificationForStaleRows(rows);
    // failure for org_broken, success for org_ok
    expect(summary.failures).toBeGreaterThanOrEqual(1);
    expect(summary.perOrg).toHaveLength(2);
  });
});

describe("dispatchOne", () => {
  it("calls runAutoDetection with org's hints + override merged in", async () => {
    mockOperatorProfile.findUnique.mockResolvedValue({ establishment: "DE" });
    await dispatchOne("org_1", { vatId: "DE123456789" });
    expect(mockRunAutoDetection).toHaveBeenCalledTimes(1);
    const [input] = mockRunAutoDetection.mock.calls[0];
    expect(input.organizationId).toBe("org_1");
    expect(input.establishment).toBe("DE");
    expect(input.vatId).toBe("DE123456789");
  });

  it("forwards options.persist to runAutoDetection", async () => {
    mockOperatorProfile.findUnique.mockResolvedValue({ establishment: "DE" });
    await dispatchOne("org_1", undefined, { persist: false });
    const [, options] = mockRunAutoDetection.mock.calls[0];
    expect(options).toEqual({ persist: false });
  });
});

describe("dispatchAnonymous", () => {
  it("calls runAutoDetection with synthetic orgId + persist:false", async () => {
    await dispatchAnonymous({
      legalName: "OneWeb Limited",
      vatId: "DE123456789",
    });
    expect(mockRunAutoDetection).toHaveBeenCalledTimes(1);
    const [input, options] = mockRunAutoDetection.mock.calls[0];
    expect(input.organizationId).toMatch(/^pulse-anon-\d+$/);
    expect(input.legalName).toBe("OneWeb Limited");
    expect(input.vatId).toBe("DE123456789");
    expect(options).toEqual({ persist: false });
  });

  it("does NOT consult buildAdapterInput / Prisma (truly anonymous)", async () => {
    await dispatchAnonymous({ legalName: "Acme" });
    expect(mockOrganization.findUnique).not.toHaveBeenCalled();
    expect(mockOperatorProfile.findUnique).not.toHaveBeenCalled();
    expect(mockDerivationTrace.findFirst).not.toHaveBeenCalled();
  });
});
