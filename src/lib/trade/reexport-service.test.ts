/**
 * Tests for src/lib/trade/reexport-service.ts — Caelex Trade Sprint E4b.
 *
 * Coverage (14 cases):
 *   1.  listReexportConsents org-scopes the query
 *   2.  listReexportConsents applies status filter
 *   3.  getReexportConsent returns null for cross-org id
 *   4.  createReexportConsent refuses cross-org party
 *   5.  createReexportConsent refuses cross-org operation
 *   6.  createReexportConsent happy path → DRAFTED default
 *   7.  State machine: DRAFTED → SENT stamps sentAt
 *   8.  State machine: SENT → APPROVED stamps decidedAt
 *   9.  State machine: SENT → DENIED requires reason (throws without)
 *  10.  State machine: SENT → DENIED stamps decidedAt + denialReason
 *  11.  State machine: DRAFTED → APPROVED rejected (no skipping)
 *  12.  State machine: SENT → DRAFTED rejected (no backward)
 *  13.  State machine: REVOKED reachable from non-terminal, blocked from DENIED
 *  14.  State machine: cross-org id throws on transition
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockFindMany,
  mockFindFirst,
  mockCreate,
  mockUpdate,
  mockPartyFindFirst,
  mockOpFindFirst,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockPartyFindFirst: vi.fn(),
  mockOpFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeReexportConsent: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
    },
    tradeParty: { findFirst: mockPartyFindFirst },
    tradeOperation: { findFirst: mockOpFindFirst },
  },
}));

import {
  listReexportConsents,
  getReexportConsent,
  createReexportConsent,
  transitionReexportStatus,
} from "./reexport-service";

beforeEach(() => {
  vi.clearAllMocks();
});

const baseConsent = {
  id: "rx_1",
  organizationId: "org_1",
  formType: "BAFA_REEXPORT_AUTH" as const,
  originalLicenseNumber: null,
  originalExporterName: "Lockheed Martin Space",
  originalExporterCountry: "US",
  requestingPartyId: "party_1",
  newDestinationCountry: "IN",
  newEndUserName: "ISRO",
  operationId: null,
  status: "DRAFTED" as const,
  requestedAt: new Date("2026-05-01"),
  sentAt: null,
  decidedAt: null,
  validUntil: null,
  lastActionById: "user_1",
  denialReason: null,
  signedDocumentId: null,
  notes: null,
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-05-01"),
};

describe("listReexportConsents", () => {
  it("scopes the query to the org", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await listReexportConsents("org_42");
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org_42" }),
      }),
    );
  });

  it("applies status filter when provided", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await listReexportConsents("org_1", { status: "APPROVED" });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          status: "APPROVED",
        }),
      }),
    );
  });
});

describe("getReexportConsent", () => {
  it("returns null on cross-org id (no leak)", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const result = await getReexportConsent("org_1", "rx_other_org");
    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rx_other_org", organizationId: "org_1" },
      }),
    );
  });
});

describe("createReexportConsent", () => {
  it("refuses cross-org party", async () => {
    mockPartyFindFirst.mockResolvedValueOnce(null);
    await expect(
      createReexportConsent({
        organizationId: "org_1",
        formType: "BAFA_REEXPORT_AUTH",
        requestingPartyId: "party_other_org",
        originalExporterName: "Foo",
        originalExporterCountry: "US",
        newDestinationCountry: "IN",
        newEndUserName: "Bar",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Requesting party not found/);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("refuses cross-org operation", async () => {
    mockPartyFindFirst.mockResolvedValueOnce({ id: "party_1" });
    mockOpFindFirst.mockResolvedValueOnce(null);
    await expect(
      createReexportConsent({
        organizationId: "org_1",
        formType: "BAFA_REEXPORT_AUTH",
        requestingPartyId: "party_1",
        originalExporterName: "Foo",
        originalExporterCountry: "US",
        newDestinationCountry: "IN",
        newEndUserName: "Bar",
        operationId: "op_other_org",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Operation not found/);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("persists with DRAFTED default on happy path", async () => {
    mockPartyFindFirst.mockResolvedValueOnce({ id: "party_1" });
    mockCreate.mockResolvedValueOnce({ ...baseConsent, id: "rx_new" });

    const result = await createReexportConsent({
      organizationId: "org_1",
      formType: "BAFA_REEXPORT_AUTH",
      requestingPartyId: "party_1",
      originalExporterName: "Lockheed Martin Space",
      originalExporterCountry: "US",
      newDestinationCountry: "IN",
      newEndUserName: "ISRO",
      lastActionById: "user_1",
    });

    expect(result.id).toBe("rx_new");
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        formType: "BAFA_REEXPORT_AUTH",
        originalExporterName: "Lockheed Martin Space",
        originalExporterCountry: "US",
        newDestinationCountry: "IN",
        newEndUserName: "ISRO",
      }),
    });
  });
});

describe("transitionReexportStatus state machine", () => {
  it("DRAFTED → SENT stamps sentAt", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseConsent, status: "DRAFTED" });
    mockUpdate.mockResolvedValueOnce({ ...baseConsent, status: "SENT" });

    await transitionReexportStatus({
      organizationId: "org_1",
      reexportId: "rx_1",
      nextStatus: "SENT",
      lastActionById: "user_1",
    });

    const updateCall = mockUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.status).toBe("SENT");
    expect(updateCall.data.sentAt).toBeInstanceOf(Date);
    expect(updateCall.data.decidedAt).toBeUndefined();
  });

  it("SENT → APPROVED stamps decidedAt", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseConsent, status: "SENT" });
    mockUpdate.mockResolvedValueOnce({ ...baseConsent, status: "APPROVED" });

    await transitionReexportStatus({
      organizationId: "org_1",
      reexportId: "rx_1",
      nextStatus: "APPROVED",
      lastActionById: "user_1",
    });

    const updateCall = mockUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.status).toBe("APPROVED");
    expect(updateCall.data.decidedAt).toBeInstanceOf(Date);
  });

  it("SENT → DENIED throws when reason missing", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseConsent, status: "SENT" });
    await expect(
      transitionReexportStatus({
        organizationId: "org_1",
        reexportId: "rx_1",
        nextStatus: "DENIED",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/DENIED transition requires a denial reason/);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("SENT → DENIED stamps decidedAt + denialReason when reason given", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseConsent, status: "SENT" });
    mockUpdate.mockResolvedValueOnce({ ...baseConsent, status: "DENIED" });

    await transitionReexportStatus({
      organizationId: "org_1",
      reexportId: "rx_1",
      nextStatus: "DENIED",
      denialReason: "Destination is on BIS Entity List",
      lastActionById: "user_1",
    });

    const updateCall = mockUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.status).toBe("DENIED");
    expect(updateCall.data.decidedAt).toBeInstanceOf(Date);
    expect(updateCall.data.denialReason).toBe(
      "Destination is on BIS Entity List",
    );
  });

  it("DRAFTED → APPROVED rejected (no skipping SENT)", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseConsent, status: "DRAFTED" });
    await expect(
      transitionReexportStatus({
        organizationId: "org_1",
        reexportId: "rx_1",
        nextStatus: "APPROVED",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Invalid lifecycle transition/);
  });

  it("SENT → DRAFTED rejected (no backward)", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseConsent, status: "SENT" });
    await expect(
      transitionReexportStatus({
        organizationId: "org_1",
        reexportId: "rx_1",
        nextStatus: "DRAFTED",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Invalid lifecycle transition/);
  });

  it("REVOKED reachable from non-terminal SENT", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseConsent, status: "SENT" });
    mockUpdate.mockResolvedValueOnce({ ...baseConsent, status: "REVOKED" });

    await transitionReexportStatus({
      organizationId: "org_1",
      reexportId: "rx_1",
      nextStatus: "REVOKED",
      lastActionById: "user_1",
    });
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("REVOKED blocked from terminal DENIED", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseConsent, status: "DENIED" });
    await expect(
      transitionReexportStatus({
        organizationId: "org_1",
        reexportId: "rx_1",
        nextStatus: "REVOKED",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Invalid lifecycle transition/);
  });

  it("throws on cross-org id (org-scope defence)", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    await expect(
      transitionReexportStatus({
        organizationId: "org_1",
        reexportId: "rx_other_org",
        nextStatus: "SENT",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Re-export consent not found/);
  });
});
