/**
 * Tests for src/lib/trade/settings/notification-preferences-service.ts
 * — Caelex Trade Settings (Sprint T-Settings).
 *
 * Coverage (6 cases):
 *   1. getPreferences returns null when no row exists
 *   2. ensurePreferences upserts default-on row when missing
 *   3. upsertPreferences persists partial toggle patch
 *   4. upsertPreferences rejects out-of-range retention years
 *   5. upsertPreferences sanitises empty webhook URL to null
 *   6. upsertPreferences skips omitted columns (partial-patch semantics)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockUpsert } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeNotificationPreferences: {
      findUnique: mockFindUnique,
      upsert: mockUpsert,
    },
  },
}));

import {
  getPreferences,
  ensurePreferences,
  upsertPreferences,
  RetentionRangeError,
  MIN_RETENTION_YEARS,
  MAX_RETENTION_YEARS,
} from "./notification-preferences-service";

beforeEach(() => {
  vi.clearAllMocks();
});

const baseRow = {
  id: "pref_1",
  organizationId: "org_1",
  notifyLicenseExpiry: true,
  notifyEucExpiry: true,
  notifyReexportConsentExpiry: true,
  notifySanctionsHit: true,
  notifyCatchAllTrigger: true,
  notifySupplement2Reminder: true,
  notifySammelgenehmigungExpiry: true,
  notifyVsdDeadline: true,
  auditRetentionYears: 5,
  auditWebhookUrl: null as string | null,
  auditWebhookOnClassification: false,
  auditWebhookOnLicenseDecision: false,
  auditWebhookOnScreeningHit: false,
  auditWebhookOnEucLifecycle: false,
  auditWebhookOnVsdSubmitted: false,
  createdAt: new Date("2026-05-23T00:00:00Z"),
  updatedAt: new Date("2026-05-23T00:00:00Z"),
};

describe("getPreferences", () => {
  it("returns null when no row exists for the org", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await getPreferences("org_missing");
    expect(result).toBeNull();
  });
});

describe("ensurePreferences", () => {
  it("upserts an empty row when none exists — defaults all-on", async () => {
    mockUpsert.mockResolvedValue(baseRow);

    const result = await ensurePreferences("org_1");

    expect(result.notifyLicenseExpiry).toBe(true);
    expect(result.notifyVsdDeadline).toBe(true);
    expect(result.auditRetentionYears).toBe(5);
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { organizationId: "org_1" },
      create: { organizationId: "org_1" },
      update: {},
    });
  });
});

describe("upsertPreferences", () => {
  it("persists a partial toggle patch — flipping only one switch", async () => {
    mockUpsert.mockResolvedValue({
      ...baseRow,
      notifySanctionsHit: false,
    });

    await upsertPreferences("org_1", {
      notifySanctionsHit: false,
    });

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.notifySanctionsHit).toBe(false);
    expect(call.update.notifySanctionsHit).toBe(false);
    // Other toggles must NOT appear in the patch — partial-update semantics.
    expect(call.update).not.toHaveProperty("notifyLicenseExpiry");
    expect(call.update).not.toHaveProperty("notifyVsdDeadline");
  });

  it("rejects auditRetentionYears below the floor (1y) and above ceiling (30y)", async () => {
    await expect(
      upsertPreferences("org_1", { auditRetentionYears: 0 }),
    ).rejects.toBeInstanceOf(RetentionRangeError);

    await expect(
      upsertPreferences("org_1", {
        auditRetentionYears: MAX_RETENTION_YEARS + 1,
      }),
    ).rejects.toBeInstanceOf(RetentionRangeError);

    // Boundary values must pass.
    mockUpsert.mockResolvedValue(baseRow);
    await expect(
      upsertPreferences("org_1", { auditRetentionYears: MIN_RETENTION_YEARS }),
    ).resolves.toBeTruthy();
    await expect(
      upsertPreferences("org_1", { auditRetentionYears: MAX_RETENTION_YEARS }),
    ).resolves.toBeTruthy();
  });

  it("collapses empty-string webhook URL to null on the way to the DB", async () => {
    mockUpsert.mockResolvedValue(baseRow);

    await upsertPreferences("org_1", {
      auditWebhookUrl: "",
    });

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.auditWebhookUrl).toBeNull();
    expect(call.update.auditWebhookUrl).toBeNull();
  });

  it("skips columns not present in the patch — true partial-patch semantics", async () => {
    mockUpsert.mockResolvedValue(baseRow);

    await upsertPreferences("org_1", {
      auditWebhookOnClassification: true,
    });

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.auditWebhookOnClassification).toBe(true);
    expect(call.update).not.toHaveProperty("notifyLicenseExpiry");
    expect(call.update).not.toHaveProperty("auditRetentionYears");
    expect(call.update).not.toHaveProperty("auditWebhookUrl");
  });
});
