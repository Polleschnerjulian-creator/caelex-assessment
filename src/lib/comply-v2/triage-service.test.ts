/**
 * Sprint 10F2 — triage-service.server.ts disposition tests.
 *
 * Focus on the Sprint E perf fix: REGULATORY_UPDATE acknowledge now
 * uses createMany({ skipDuplicates: true }) instead of a sequential
 * upsert loop. We verify:
 *
 *   1. createMany is called once with N rows (not N upserts)
 *   2. skipDuplicates flag is set (so the unique-constraint conflict
 *      degrades gracefully into an idempotent op)
 *   3. when user has no org memberships, neither createMany nor any
 *      org-scoped read fires
 *
 * Plus baseline disposition tests for the other sources to lock in
 * the dispatch behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockOrgMemberFindMany,
  mockNotificationUpdateMany,
  mockRegulatoryUpdateReadCreateMany,
  mockSatelliteAlertUpdateMany,
} = vi.hoisted(() => ({
  mockOrgMemberFindMany: vi.fn(),
  mockNotificationUpdateMany: vi.fn(),
  mockRegulatoryUpdateReadCreateMany: vi.fn(),
  mockSatelliteAlertUpdateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: { findMany: mockOrgMemberFindMany },
    notification: { updateMany: mockNotificationUpdateMany },
    regulatoryUpdateRead: { createMany: mockRegulatoryUpdateReadCreateMany },
    satelliteAlert: { updateMany: mockSatelliteAlertUpdateMany },
  },
}));

import {
  acknowledgeTriageItemAtSource,
  dismissTriageItemAtSource,
} from "./triage-service.server";

const USER_ID = "user_test_42";
const REG_UPDATE_ID = "reg_upd_xyz";

beforeEach(() => {
  vi.clearAllMocks();
  mockOrgMemberFindMany.mockResolvedValue([]);
  mockNotificationUpdateMany.mockResolvedValue({ count: 1 });
  mockRegulatoryUpdateReadCreateMany.mockResolvedValue({ count: 0 });
  mockSatelliteAlertUpdateMany.mockResolvedValue({ count: 1 });
});

describe("acknowledgeTriageItemAtSource — REGULATORY_UPDATE (Sprint E perf fix)", () => {
  it("uses single createMany with skipDuplicates instead of N upserts", async () => {
    mockOrgMemberFindMany.mockResolvedValue([
      { organizationId: "org_1" },
      { organizationId: "org_2" },
      { organizationId: "org_3" },
    ]);

    await acknowledgeTriageItemAtSource(
      `REGULATORY_UPDATE:${REG_UPDATE_ID}`,
      USER_ID,
    );

    // Single createMany call (not 3 upserts).
    expect(mockRegulatoryUpdateReadCreateMany).toHaveBeenCalledTimes(1);
    const call = mockRegulatoryUpdateReadCreateMany.mock.calls[0][0];
    // 3 rows in one batch.
    expect(call.data).toHaveLength(3);
    // skipDuplicates flag set (idempotent semantics on @@unique conflict).
    expect(call.skipDuplicates).toBe(true);
    // Each row has the right shape.
    expect(call.data[0]).toMatchObject({
      regulatoryUpdateId: REG_UPDATE_ID,
      organizationId: "org_1",
      readByUserId: USER_ID,
    });
  });

  it("short-circuits when user has no org memberships", async () => {
    mockOrgMemberFindMany.mockResolvedValue([]);
    await acknowledgeTriageItemAtSource(
      `REGULATORY_UPDATE:${REG_UPDATE_ID}`,
      USER_ID,
    );
    expect(mockRegulatoryUpdateReadCreateMany).not.toHaveBeenCalled();
  });
});

describe("acknowledgeTriageItemAtSource — other sources", () => {
  it("NOTIFICATION → updates read+readAt scoped to userId", async () => {
    await acknowledgeTriageItemAtSource("NOTIFICATION:notif_1", USER_ID);
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "notif_1", userId: USER_ID },
        data: expect.objectContaining({ read: true }),
      }),
    );
  });

  it("SATELLITE_ALERT → updateMany scoped to user's org IDs", async () => {
    mockOrgMemberFindMany.mockResolvedValue([
      { organizationId: "org_1" },
      { organizationId: "org_2" },
    ]);
    await acknowledgeTriageItemAtSource("SATELLITE_ALERT:alert_1", USER_ID);
    expect(mockSatelliteAlertUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "alert_1",
          operatorId: { in: ["org_1", "org_2"] },
        },
        data: expect.objectContaining({ acknowledged: true }),
      }),
    );
  });

  it("rejects malformed triage IDs", async () => {
    await expect(
      acknowledgeTriageItemAtSource("garbage_no_colon", USER_ID),
    ).rejects.toThrow(/Invalid triageId/);
  });
});

describe("dismissTriageItemAtSource", () => {
  it("NOTIFICATION → sets dismissed=true (stronger than acknowledge)", async () => {
    await dismissTriageItemAtSource("NOTIFICATION:notif_1", USER_ID);
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dismissed: true, read: true }),
      }),
    );
  });

  it("SATELLITE_ALERT → sets resolvedAt + acknowledged in single update", async () => {
    mockOrgMemberFindMany.mockResolvedValue([{ organizationId: "org_1" }]);
    await dismissTriageItemAtSource("SATELLITE_ALERT:alert_1", USER_ID);
    const call = mockSatelliteAlertUpdateMany.mock.calls[0][0];
    expect(call.data.resolvedAt).toBeInstanceOf(Date);
    expect(call.data.acknowledged).toBe(true);
  });

  it("REGULATORY_UPDATE → delegates to acknowledge (no dismissed concept)", async () => {
    mockOrgMemberFindMany.mockResolvedValue([{ organizationId: "org_1" }]);
    await dismissTriageItemAtSource(
      `REGULATORY_UPDATE:${REG_UPDATE_ID}`,
      USER_ID,
    );
    // Same outcome as acknowledge — createMany fires.
    expect(mockRegulatoryUpdateReadCreateMany).toHaveBeenCalledTimes(1);
  });
});
