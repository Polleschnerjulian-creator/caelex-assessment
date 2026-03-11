import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only so the service can be imported
vi.mock("server-only", () => ({}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    asset: { findFirst: vi.fn() },
    assetPersonnel: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock audit
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  addPersonnel,
  updatePersonnel,
  getPersonnelForAsset,
  getMfaAdoptionRate,
  getTrainingDashboard,
} from "@/lib/nexus/personnel-service.server";

const mockAsset = {
  id: "asset-1",
  organizationId: "org-1",
  name: "Test Asset",
  isDeleted: false,
};

const mockPersonnel = {
  id: "personnel-1",
  assetId: "asset-1",
  personName: "Alice Engineer",
  role: "OPERATOR",
  accessLevel: "FULL",
  mfaEnabled: true,
  lastTraining: new Date("2024-06-01"),
  trainingRequired: true,
  clearanceLevel: null,
  accessGrantedAt: new Date("2024-01-01"),
  accessExpiresAt: null,
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("Personnel Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(logAuditEvent).mockResolvedValue(undefined);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // addPersonnel
  // ─────────────────────────────────────────────────────────────────────────

  describe("addPersonnel", () => {
    it("creates personnel when asset belongs to the org", async () => {
      vi.mocked(prisma.asset.findFirst).mockResolvedValue(mockAsset as never);
      vi.mocked(prisma.assetPersonnel.create).mockResolvedValue(
        mockPersonnel as never,
      );

      const result = await addPersonnel(
        "asset-1",
        { personName: "Alice Engineer", role: "OPERATOR", accessLevel: "FULL" },
        "org-1",
        "user-1",
      );

      expect(prisma.asset.findFirst).toHaveBeenCalledWith({
        where: { id: "asset-1", organizationId: "org-1", isDeleted: false },
      });
      expect(prisma.assetPersonnel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assetId: "asset-1",
            personName: "Alice Engineer",
            role: "OPERATOR",
            accessLevel: "FULL",
          }),
        }),
      );
      expect(result).toEqual(mockPersonnel);
    });

    it("throws when asset does not exist in org", async () => {
      vi.mocked(prisma.asset.findFirst).mockResolvedValue(null);

      await expect(
        addPersonnel(
          "asset-missing",
          { personName: "Bob", role: "VIEWER", accessLevel: "READ_ONLY" },
          "org-1",
          "user-1",
        ),
      ).rejects.toThrow("Asset not found");
    });

    it("logs nexus_personnel_added audit event", async () => {
      vi.mocked(prisma.asset.findFirst).mockResolvedValue(mockAsset as never);
      vi.mocked(prisma.assetPersonnel.create).mockResolvedValue(
        mockPersonnel as never,
      );

      await addPersonnel(
        "asset-1",
        { personName: "Alice Engineer", role: "OPERATOR", accessLevel: "FULL" },
        "org-1",
        "user-1",
      );

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "nexus_personnel_added",
          entityType: "nexus_personnel",
          entityId: "personnel-1",
          userId: "user-1",
          organizationId: "org-1",
        }),
      );
    });

    it("defaults isActive to true and trainingRequired to true", async () => {
      vi.mocked(prisma.asset.findFirst).mockResolvedValue(mockAsset as never);
      vi.mocked(prisma.assetPersonnel.create).mockResolvedValue(
        mockPersonnel as never,
      );

      await addPersonnel(
        "asset-1",
        { personName: "Bob", role: "VIEWER", accessLevel: "READ_ONLY" },
        "org-1",
        "user-1",
      );

      expect(prisma.assetPersonnel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
            trainingRequired: true,
          }),
        }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updatePersonnel
  // ─────────────────────────────────────────────────────────────────────────

  describe("updatePersonnel", () => {
    it("updates personnel and logs audit", async () => {
      const personnelWithAsset = {
        ...mockPersonnel,
        asset: { organizationId: "org-1" },
      };
      const updatedPersonnel = { ...mockPersonnel, personName: "Alice Smith" };

      vi.mocked(prisma.assetPersonnel.findFirst).mockResolvedValue(
        personnelWithAsset as never,
      );
      vi.mocked(prisma.assetPersonnel.update).mockResolvedValue(
        updatedPersonnel as never,
      );

      const result = await updatePersonnel(
        "personnel-1",
        { personName: "Alice Smith" },
        "org-1",
        "user-1",
      );

      expect(prisma.assetPersonnel.update).toHaveBeenCalledWith({
        where: { id: "personnel-1" },
        data: expect.objectContaining({ personName: "Alice Smith" }),
      });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "nexus_personnel_updated",
          entityType: "nexus_personnel",
          entityId: "personnel-1",
        }),
      );
      expect(result).toEqual(updatedPersonnel);
    });

    it("throws when personnel does not exist", async () => {
      vi.mocked(prisma.assetPersonnel.findFirst).mockResolvedValue(null);

      await expect(
        updatePersonnel(
          "personnel-missing",
          { personName: "X" },
          "org-1",
          "user-1",
        ),
      ).rejects.toThrow("Personnel not found");
    });

    it("throws when personnel belongs to a different org", async () => {
      const personnelOtherOrg = {
        ...mockPersonnel,
        asset: { organizationId: "org-other" },
      };
      vi.mocked(prisma.assetPersonnel.findFirst).mockResolvedValue(
        personnelOtherOrg as never,
      );

      await expect(
        updatePersonnel("personnel-1", { personName: "X" }, "org-1", "user-1"),
      ).rejects.toThrow("Personnel not found");
    });

    it("can update mfaEnabled and isActive", async () => {
      const personnelWithAsset = {
        ...mockPersonnel,
        asset: { organizationId: "org-1" },
      };
      const updatedPersonnel = {
        ...mockPersonnel,
        mfaEnabled: false,
        isActive: false,
      };

      vi.mocked(prisma.assetPersonnel.findFirst).mockResolvedValue(
        personnelWithAsset as never,
      );
      vi.mocked(prisma.assetPersonnel.update).mockResolvedValue(
        updatedPersonnel as never,
      );

      await updatePersonnel(
        "personnel-1",
        { mfaEnabled: false, isActive: false },
        "org-1",
        "user-1",
      );

      expect(prisma.assetPersonnel.update).toHaveBeenCalledWith({
        where: { id: "personnel-1" },
        data: expect.objectContaining({ mfaEnabled: false, isActive: false }),
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getPersonnelForAsset
  // ─────────────────────────────────────────────────────────────────────────

  describe("getPersonnelForAsset", () => {
    it("returns all personnel for an asset", async () => {
      const personnel = [
        mockPersonnel,
        { ...mockPersonnel, id: "personnel-2" },
      ];
      vi.mocked(prisma.assetPersonnel.findMany).mockResolvedValue(
        personnel as never,
      );

      const result = await getPersonnelForAsset("asset-1", "org-1");

      expect(prisma.assetPersonnel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assetId: "asset-1" }),
        }),
      );
      expect(result).toEqual(personnel);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getMfaAdoptionRate
  // ─────────────────────────────────────────────────────────────────────────

  describe("getMfaAdoptionRate", () => {
    it("returns 100 when no active personnel", async () => {
      vi.mocked(prisma.assetPersonnel.count)
        .mockResolvedValueOnce(0) // totalActive
        .mockResolvedValueOnce(0); // mfaEnabled

      const rate = await getMfaAdoptionRate("org-1");
      expect(rate).toBe(100);
    });

    it("calculates MFA rate: mfaEnabled / totalActive * 100", async () => {
      vi.mocked(prisma.assetPersonnel.count)
        .mockResolvedValueOnce(10) // totalActive
        .mockResolvedValueOnce(8); // mfaEnabled

      const rate = await getMfaAdoptionRate("org-1");
      expect(rate).toBeCloseTo(80, 1);
    });

    it("returns 0 when no active personnel have MFA", async () => {
      vi.mocked(prisma.assetPersonnel.count)
        .mockResolvedValueOnce(5) // totalActive
        .mockResolvedValueOnce(0); // mfaEnabled

      const rate = await getMfaAdoptionRate("org-1");
      expect(rate).toBe(0);
    });

    it("returns 100 when all active personnel have MFA", async () => {
      vi.mocked(prisma.assetPersonnel.count)
        .mockResolvedValueOnce(7) // totalActive
        .mockResolvedValueOnce(7); // mfaEnabled

      const rate = await getMfaAdoptionRate("org-1");
      expect(rate).toBe(100);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getTrainingDashboard
  // ─────────────────────────────────────────────────────────────────────────

  describe("getTrainingDashboard", () => {
    it("returns complete dashboard with all required fields", async () => {
      vi.mocked(prisma.assetPersonnel.count)
        .mockResolvedValueOnce(15) // totalActive
        .mockResolvedValueOnce(10) // trainingCompliant
        .mockResolvedValueOnce(3); // trainingOverdue

      vi.mocked(prisma.assetPersonnel.findMany).mockResolvedValue([
        { role: "OPERATOR" },
        { role: "OPERATOR" },
        { role: "ADMINISTRATOR" },
        { role: "VIEWER" },
      ] as never);

      const dashboard = await getTrainingDashboard("org-1");

      expect(dashboard).toMatchObject({
        totalActive: 15,
        trainingCompliant: 10,
        trainingOverdue: 3,
        byRole: expect.any(Object),
      });
    });

    it("queries trainingCompliant with lastTraining within 1 year", async () => {
      vi.mocked(prisma.assetPersonnel.count)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(3);

      vi.mocked(prisma.assetPersonnel.findMany).mockResolvedValue([] as never);

      await getTrainingDashboard("org-1");

      const compliantCall = vi.mocked(prisma.assetPersonnel.count).mock
        .calls[1][0] as { where: Record<string, unknown> };
      expect(compliantCall.where).toMatchObject({
        isActive: true,
        trainingRequired: true,
        lastTraining: expect.objectContaining({ gte: expect.any(Date) }),
      });
    });

    it("counts overdue training: trainingRequired=true AND (lastTraining < 1yr or null)", async () => {
      vi.mocked(prisma.assetPersonnel.count)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5);

      vi.mocked(prisma.assetPersonnel.findMany).mockResolvedValue([] as never);

      await getTrainingDashboard("org-1");

      const overdueCall = vi.mocked(prisma.assetPersonnel.count).mock
        .calls[2][0] as { where: Record<string, unknown> };
      expect(overdueCall.where).toMatchObject({
        isActive: true,
        trainingRequired: true,
        OR: expect.arrayContaining([
          expect.objectContaining({
            lastTraining: expect.objectContaining({ lt: expect.any(Date) }),
          }),
          expect.objectContaining({ lastTraining: null }),
        ]),
      });
    });

    it("builds role distribution from personnel data", async () => {
      vi.mocked(prisma.assetPersonnel.count)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);

      vi.mocked(prisma.assetPersonnel.findMany).mockResolvedValue([
        { role: "OPERATOR" },
        { role: "OPERATOR" },
        { role: "OPERATOR" },
        { role: "ADMINISTRATOR" },
        { role: "VIEWER" },
      ] as never);

      const dashboard = await getTrainingDashboard("org-1");

      expect(dashboard.byRole).toMatchObject({
        OPERATOR: 3,
        ADMINISTRATOR: 1,
        VIEWER: 1,
      });
    });

    it("returns empty byRole when no active personnel", async () => {
      vi.mocked(prisma.assetPersonnel.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      vi.mocked(prisma.assetPersonnel.findMany).mockResolvedValue([] as never);

      const dashboard = await getTrainingDashboard("org-1");

      expect(dashboard.totalActive).toBe(0);
      expect(dashboard.byRole).toEqual({});
    });
  });
});
