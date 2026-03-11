import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only so the service can be imported
vi.mock("server-only", () => ({}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    asset: { findFirst: vi.fn() },
    assetSupplier: {
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
  addSupplier,
  updateSupplier,
  getSuppliersForAsset,
  getSupplyChainRiskDashboard,
} from "@/lib/nexus/supplier-service.server";

const mockAsset = {
  id: "asset-1",
  organizationId: "org-1",
  name: "Test Asset",
  isDeleted: false,
};

const mockSupplier = {
  id: "supplier-1",
  assetId: "asset-1",
  supplierName: "Acme Corp",
  supplierType: "MANUFACTURER",
  jurisdiction: "DE",
  riskLevel: "MEDIUM",
  certifications: [],
  lastAssessed: null,
  contractExpiry: null,
  singlePointOfFailure: false,
  alternativeAvailable: false,
  notes: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("Supplier Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(logAuditEvent).mockResolvedValue(undefined);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // addSupplier
  // ─────────────────────────────────────────────────────────────────────────

  describe("addSupplier", () => {
    it("creates a supplier when asset belongs to the org", async () => {
      vi.mocked(prisma.asset.findFirst).mockResolvedValue(mockAsset as never);
      vi.mocked(prisma.assetSupplier.create).mockResolvedValue(
        mockSupplier as never,
      );

      const result = await addSupplier(
        "asset-1",
        { supplierName: "Acme Corp", supplierType: "MANUFACTURER" },
        "org-1",
        "user-1",
      );

      expect(prisma.asset.findFirst).toHaveBeenCalledWith({
        where: { id: "asset-1", organizationId: "org-1", isDeleted: false },
      });
      expect(prisma.assetSupplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assetId: "asset-1",
            supplierName: "Acme Corp",
            supplierType: "MANUFACTURER",
          }),
        }),
      );
      expect(result).toEqual(mockSupplier);
    });

    it("throws when asset does not exist in org", async () => {
      vi.mocked(prisma.asset.findFirst).mockResolvedValue(null);

      await expect(
        addSupplier(
          "asset-missing",
          { supplierName: "Test", supplierType: "MANUFACTURER" },
          "org-1",
          "user-1",
        ),
      ).rejects.toThrow("Asset not found");
    });

    it("logs nexus_supplier_added audit event", async () => {
      vi.mocked(prisma.asset.findFirst).mockResolvedValue(mockAsset as never);
      vi.mocked(prisma.assetSupplier.create).mockResolvedValue(
        mockSupplier as never,
      );

      await addSupplier(
        "asset-1",
        { supplierName: "Acme Corp", supplierType: "MANUFACTURER" },
        "org-1",
        "user-1",
      );

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "nexus_supplier_added",
          entityType: "nexus_supplier",
          entityId: "supplier-1",
          userId: "user-1",
          organizationId: "org-1",
        }),
      );
    });

    it("defaults riskLevel to MEDIUM when not provided", async () => {
      vi.mocked(prisma.asset.findFirst).mockResolvedValue(mockAsset as never);
      vi.mocked(prisma.assetSupplier.create).mockResolvedValue(
        mockSupplier as never,
      );

      await addSupplier(
        "asset-1",
        { supplierName: "Test", supplierType: "SOFTWARE_VENDOR" },
        "org-1",
        "user-1",
      );

      expect(prisma.assetSupplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ riskLevel: "MEDIUM" }),
        }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updateSupplier
  // ─────────────────────────────────────────────────────────────────────────

  describe("updateSupplier", () => {
    it("updates supplier and logs audit", async () => {
      const supplierWithAsset = {
        ...mockSupplier,
        asset: { organizationId: "org-1" },
      };
      const updatedSupplier = { ...mockSupplier, supplierName: "New Corp" };

      vi.mocked(prisma.assetSupplier.findFirst).mockResolvedValue(
        supplierWithAsset as never,
      );
      vi.mocked(prisma.assetSupplier.update).mockResolvedValue(
        updatedSupplier as never,
      );

      const result = await updateSupplier(
        "supplier-1",
        { supplierName: "New Corp" },
        "org-1",
        "user-1",
      );

      expect(prisma.assetSupplier.update).toHaveBeenCalledWith({
        where: { id: "supplier-1" },
        data: expect.objectContaining({ supplierName: "New Corp" }),
      });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "nexus_supplier_updated",
          entityType: "nexus_supplier",
          entityId: "supplier-1",
        }),
      );
      expect(result).toEqual(updatedSupplier);
    });

    it("throws when supplier does not exist", async () => {
      vi.mocked(prisma.assetSupplier.findFirst).mockResolvedValue(null);

      await expect(
        updateSupplier(
          "supplier-missing",
          { supplierName: "X" },
          "org-1",
          "user-1",
        ),
      ).rejects.toThrow("Supplier not found");
    });

    it("throws when supplier belongs to a different org", async () => {
      const supplierOtherOrg = {
        ...mockSupplier,
        asset: { organizationId: "org-other" },
      };
      vi.mocked(prisma.assetSupplier.findFirst).mockResolvedValue(
        supplierOtherOrg as never,
      );

      await expect(
        updateSupplier("supplier-1", { supplierName: "X" }, "org-1", "user-1"),
      ).rejects.toThrow("Supplier not found");
    });

    it("includes previousValue and newValue in audit log", async () => {
      const supplierWithAsset = {
        ...mockSupplier,
        supplierName: "Old Corp",
        asset: { organizationId: "org-1" },
      };
      const updatedSupplier = { ...mockSupplier, supplierName: "New Corp" };

      vi.mocked(prisma.assetSupplier.findFirst).mockResolvedValue(
        supplierWithAsset as never,
      );
      vi.mocked(prisma.assetSupplier.update).mockResolvedValue(
        updatedSupplier as never,
      );

      await updateSupplier(
        "supplier-1",
        { supplierName: "New Corp" },
        "org-1",
        "user-1",
      );

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          previousValue: expect.objectContaining({ supplierName: "Old Corp" }),
          newValue: expect.objectContaining({ supplierName: "New Corp" }),
        }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getSuppliersForAsset
  // ─────────────────────────────────────────────────────────────────────────

  describe("getSuppliersForAsset", () => {
    it("returns all suppliers for an asset", async () => {
      const suppliers = [mockSupplier, { ...mockSupplier, id: "supplier-2" }];
      vi.mocked(prisma.assetSupplier.findMany).mockResolvedValue(
        suppliers as never,
      );

      const result = await getSuppliersForAsset("asset-1", "org-1");

      expect(prisma.assetSupplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assetId: "asset-1" }),
        }),
      );
      expect(result).toEqual(suppliers);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getSupplyChainRiskDashboard
  // ─────────────────────────────────────────────────────────────────────────

  describe("getSupplyChainRiskDashboard", () => {
    it("returns complete dashboard with all required fields", async () => {
      vi.mocked(prisma.assetSupplier.count)
        .mockResolvedValueOnce(20) // totalSuppliers
        .mockResolvedValueOnce(3) // spofCount
        .mockResolvedValueOnce(1) // CRITICAL
        .mockResolvedValueOnce(5) // HIGH
        .mockResolvedValueOnce(10) // MEDIUM
        .mockResolvedValueOnce(4) // LOW
        .mockResolvedValueOnce(2); // expiringContracts

      vi.mocked(prisma.assetSupplier.findMany).mockResolvedValue([
        { jurisdiction: "DE" },
        { jurisdiction: "FR" },
        { jurisdiction: "DE" },
        { jurisdiction: null },
      ] as never);

      const dashboard = await getSupplyChainRiskDashboard("org-1");

      expect(dashboard).toMatchObject({
        totalSuppliers: 20,
        spofCount: 3,
        byRiskLevel: { CRITICAL: 1, HIGH: 5, MEDIUM: 10, LOW: 4 },
        expiringContracts: 2,
        jurisdictionDistribution: expect.any(Object),
      });
    });

    it("counts SPOFs: singlePointOfFailure=true AND alternativeAvailable=false", async () => {
      vi.mocked(prisma.assetSupplier.count)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      vi.mocked(prisma.assetSupplier.findMany).mockResolvedValue([] as never);

      const dashboard = await getSupplyChainRiskDashboard("org-1");

      // The second count call should be for SPOFs with both conditions
      const spofCall = vi.mocked(prisma.assetSupplier.count).mock.calls[1][0];
      expect(spofCall).toMatchObject({
        where: expect.objectContaining({
          singlePointOfFailure: true,
          alternativeAvailable: false,
        }),
      });

      expect(dashboard.spofCount).toBe(2);
    });

    it("identifies expiring contracts within 90 days", async () => {
      vi.mocked(prisma.assetSupplier.count)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(3); // 3 expiring contracts

      vi.mocked(prisma.assetSupplier.findMany).mockResolvedValue([] as never);

      const dashboard = await getSupplyChainRiskDashboard("org-1");
      expect(dashboard.expiringContracts).toBe(3);
    });

    it("builds jurisdiction distribution from supplier data", async () => {
      vi.mocked(prisma.assetSupplier.count)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      vi.mocked(prisma.assetSupplier.findMany).mockResolvedValue([
        { jurisdiction: "DE" },
        { jurisdiction: "DE" },
        { jurisdiction: "FR" },
      ] as never);

      const dashboard = await getSupplyChainRiskDashboard("org-1");

      expect(dashboard.jurisdictionDistribution).toMatchObject({
        DE: 2,
        FR: 1,
      });
    });

    it("handles null jurisdiction as 'Unknown'", async () => {
      vi.mocked(prisma.assetSupplier.count)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      vi.mocked(prisma.assetSupplier.findMany).mockResolvedValue([
        { jurisdiction: null },
        { jurisdiction: "US" },
      ] as never);

      const dashboard = await getSupplyChainRiskDashboard("org-1");

      expect(dashboard.jurisdictionDistribution).toMatchObject({
        Unknown: 1,
        US: 1,
      });
    });
  });
});
