import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
    },
    spacecraft: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock audit
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import {
  MISSION_TYPES,
  ORBIT_TYPES,
  STATUS_CONFIG,
  createSpacecraft,
  getSpacecraft,
  getSpacecraftList,
  updateSpacecraft,
  deleteSpacecraft,
  canTransitionStatus,
  updateSpacecraftStatus,
  getSpacecraftStats,
  formatSpacecraftForExport,
} from "@/lib/services/spacecraft-service";

describe("Spacecraft Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Constants", () => {
    describe("MISSION_TYPES", () => {
      it("should have communication mission type", () => {
        const comm = MISSION_TYPES.find((m) => m.value === "communication");
        expect(comm).toBeDefined();
        expect(comm?.label).toBe("Communication");
      });

      it("should have earth_observation mission type", () => {
        const eo = MISSION_TYPES.find((m) => m.value === "earth_observation");
        expect(eo).toBeDefined();
        expect(eo?.label).toBe("Earth Observation");
      });

      it("should have all expected mission types", () => {
        const values = MISSION_TYPES.map((m) => m.value);
        expect(values).toContain("communication");
        expect(values).toContain("earth_observation");
        expect(values).toContain("navigation");
        expect(values).toContain("scientific");
        expect(values).toContain("debris_removal");
      });
    });

    describe("ORBIT_TYPES", () => {
      it("should have LEO orbit type", () => {
        const leo = ORBIT_TYPES.find((o) => o.value === "LEO");
        expect(leo).toBeDefined();
        expect(leo?.label).toContain("Low Earth Orbit");
      });

      it("should have GEO orbit type", () => {
        const geo = ORBIT_TYPES.find((o) => o.value === "GEO");
        expect(geo).toBeDefined();
        expect(geo?.label).toContain("Geostationary");
      });

      it("should have all expected orbit types", () => {
        const values = ORBIT_TYPES.map((o) => o.value);
        expect(values).toContain("LEO");
        expect(values).toContain("MEO");
        expect(values).toContain("GEO");
        expect(values).toContain("HEO");
        expect(values).toContain("SSO");
      });
    });

    describe("STATUS_CONFIG", () => {
      it("should have PRE_LAUNCH status", () => {
        expect(STATUS_CONFIG.PRE_LAUNCH).toBeDefined();
        expect(STATUS_CONFIG.PRE_LAUNCH.label).toBe("Pre-Launch");
        expect(STATUS_CONFIG.PRE_LAUNCH.color).toBe("blue");
      });

      it("should have OPERATIONAL status", () => {
        expect(STATUS_CONFIG.OPERATIONAL).toBeDefined();
        expect(STATUS_CONFIG.OPERATIONAL.label).toBe("Operational");
        expect(STATUS_CONFIG.OPERATIONAL.color).toBe("green");
      });

      it("should have LOST status", () => {
        expect(STATUS_CONFIG.LOST).toBeDefined();
        expect(STATUS_CONFIG.LOST.label).toBe("Lost");
        expect(STATUS_CONFIG.LOST.color).toBe("red");
      });

      it("should have all statuses with descriptions", () => {
        const statuses = Object.keys(STATUS_CONFIG);
        expect(statuses).toHaveLength(6);
        for (const status of statuses) {
          expect(
            STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].description,
          ).toBeDefined();
        }
      });
    });
  });

  describe("createSpacecraft", () => {
    it("should create spacecraft successfully", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        maxSpacecraft: 10,
        name: "Test Org",
        _count: { spacecraft: 5 },
      } as never);
      vi.mocked(prisma.spacecraft.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.spacecraft.create).mockResolvedValue({
        id: "sc-1",
        name: "Test Satellite",
        missionType: "communication",
        orbitType: "LEO",
      } as never);

      const spacecraft = await createSpacecraft(
        {
          organizationId: "org-1",
          name: "Test Satellite",
          missionType: "communication",
          orbitType: "LEO",
        },
        "user-1",
      );

      expect(spacecraft.id).toBe("sc-1");
      expect(spacecraft.name).toBe("Test Satellite");
    });

    it("should throw if organization not found", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await expect(
        createSpacecraft(
          {
            organizationId: "org-1",
            name: "Test Satellite",
            missionType: "communication",
            orbitType: "LEO",
          },
          "user-1",
        ),
      ).rejects.toThrow("Organization not found");
    });

    it("should throw if spacecraft limit exceeded", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        maxSpacecraft: 5,
        name: "Test Org",
        _count: { spacecraft: 5 },
      } as never);

      await expect(
        createSpacecraft(
          {
            organizationId: "org-1",
            name: "Test Satellite",
            missionType: "communication",
            orbitType: "LEO",
          },
          "user-1",
        ),
      ).rejects.toThrow("maximum spacecraft limit");
    });

    it("should allow unlimited spacecraft when maxSpacecraft is -1", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        maxSpacecraft: -1,
        name: "Test Org",
        _count: { spacecraft: 1000 },
      } as never);
      vi.mocked(prisma.spacecraft.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.spacecraft.create).mockResolvedValue({
        id: "sc-1",
        name: "Test Satellite",
      } as never);

      const spacecraft = await createSpacecraft(
        {
          organizationId: "org-1",
          name: "Test Satellite",
          missionType: "communication",
          orbitType: "LEO",
        },
        "user-1",
      );

      expect(spacecraft).toBeDefined();
    });

    it("should throw if COSPAR ID already exists", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        maxSpacecraft: 10,
        name: "Test Org",
        _count: { spacecraft: 5 },
      } as never);
      vi.mocked(prisma.spacecraft.findFirst).mockResolvedValue({
        id: "existing",
        cosparId: "2024-001A",
      } as never);

      await expect(
        createSpacecraft(
          {
            organizationId: "org-1",
            name: "Test Satellite",
            missionType: "communication",
            orbitType: "LEO",
            cosparId: "2024-001A",
          },
          "user-1",
        ),
      ).rejects.toThrow("COSPAR ID already exists");
    });
  });

  describe("getSpacecraft", () => {
    it("should return spacecraft by id", async () => {
      vi.mocked(prisma.spacecraft.findFirst).mockResolvedValue({
        id: "sc-1",
        name: "Test Satellite",
      } as never);

      const spacecraft = await getSpacecraft("sc-1", "org-1");

      expect(spacecraft).toBeDefined();
      expect(spacecraft?.id).toBe("sc-1");
    });

    it("should return null if not found", async () => {
      vi.mocked(prisma.spacecraft.findFirst).mockResolvedValue(null);

      const spacecraft = await getSpacecraft("nonexistent", "org-1");

      expect(spacecraft).toBeNull();
    });
  });

  describe("getSpacecraftList", () => {
    it("should return spacecraft list with total", async () => {
      vi.mocked(prisma.spacecraft.findMany).mockResolvedValue([
        { id: "sc-1", name: "Sat 1" },
        { id: "sc-2", name: "Sat 2" },
      ] as never);
      vi.mocked(prisma.spacecraft.count).mockResolvedValue(2);

      const result = await getSpacecraftList("org-1");

      expect(result.spacecraft).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should apply status filter", async () => {
      vi.mocked(prisma.spacecraft.findMany).mockResolvedValue([]);
      vi.mocked(prisma.spacecraft.count).mockResolvedValue(0);

      await getSpacecraftList("org-1", { status: "OPERATIONAL" });

      expect(prisma.spacecraft.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "OPERATIONAL" }),
        }),
      );
    });

    it("should apply search filter", async () => {
      vi.mocked(prisma.spacecraft.findMany).mockResolvedValue([]);
      vi.mocked(prisma.spacecraft.count).mockResolvedValue(0);

      await getSpacecraftList("org-1", { search: "test" });

      expect(prisma.spacecraft.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.anything() }),
            ]),
          }),
        }),
      );
    });

    it("should apply pagination", async () => {
      vi.mocked(prisma.spacecraft.findMany).mockResolvedValue([]);
      vi.mocked(prisma.spacecraft.count).mockResolvedValue(0);

      await getSpacecraftList("org-1", {}, { limit: 10, offset: 20 });

      expect(prisma.spacecraft.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });
  });

  describe("updateSpacecraft", () => {
    it("should update spacecraft", async () => {
      vi.mocked(prisma.spacecraft.findFirst).mockResolvedValue({
        id: "sc-1",
        name: "Old Name",
        status: "PRE_LAUNCH",
      } as never);
      vi.mocked(prisma.spacecraft.update).mockResolvedValue({
        id: "sc-1",
        name: "New Name",
        status: "PRE_LAUNCH",
      } as never);

      const spacecraft = await updateSpacecraft(
        "sc-1",
        "org-1",
        { name: "New Name" },
        "user-1",
      );

      expect(spacecraft.name).toBe("New Name");
    });

    it("should throw if spacecraft not found", async () => {
      vi.mocked(prisma.spacecraft.findFirst).mockResolvedValue(null);

      await expect(
        updateSpacecraft(
          "nonexistent",
          "org-1",
          { name: "New Name" },
          "user-1",
        ),
      ).rejects.toThrow("Spacecraft not found");
    });

    it("should throw if COSPAR ID conflicts", async () => {
      vi.mocked(prisma.spacecraft.findFirst)
        .mockResolvedValueOnce({
          id: "sc-1",
          cosparId: "OLD-ID",
        } as never)
        .mockResolvedValueOnce({
          id: "sc-2",
          cosparId: "NEW-ID",
        } as never);

      await expect(
        updateSpacecraft("sc-1", "org-1", { cosparId: "NEW-ID" }, "user-1"),
      ).rejects.toThrow("COSPAR ID already exists");
    });
  });

  describe("deleteSpacecraft", () => {
    it("should delete spacecraft", async () => {
      vi.mocked(prisma.spacecraft.findFirst).mockResolvedValue({
        id: "sc-1",
        name: "Test Sat",
      } as never);
      vi.mocked(prisma.spacecraft.delete).mockResolvedValue({} as never);

      await deleteSpacecraft("sc-1", "org-1", "user-1");

      expect(prisma.spacecraft.delete).toHaveBeenCalledWith({
        where: { id: "sc-1" },
      });
    });

    it("should throw if spacecraft not found", async () => {
      vi.mocked(prisma.spacecraft.findFirst).mockResolvedValue(null);

      await expect(
        deleteSpacecraft("nonexistent", "org-1", "user-1"),
      ).rejects.toThrow("Spacecraft not found");
    });
  });

  describe("canTransitionStatus", () => {
    it("should allow same status", () => {
      expect(canTransitionStatus("PRE_LAUNCH", "PRE_LAUNCH")).toBe(true);
      expect(canTransitionStatus("OPERATIONAL", "OPERATIONAL")).toBe(true);
    });

    it("should allow PRE_LAUNCH to LAUNCHED", () => {
      expect(canTransitionStatus("PRE_LAUNCH", "LAUNCHED")).toBe(true);
    });

    it("should allow PRE_LAUNCH to LOST", () => {
      expect(canTransitionStatus("PRE_LAUNCH", "LOST")).toBe(true);
    });

    it("should allow LAUNCHED to OPERATIONAL", () => {
      expect(canTransitionStatus("LAUNCHED", "OPERATIONAL")).toBe(true);
    });

    it("should allow OPERATIONAL to DECOMMISSIONING", () => {
      expect(canTransitionStatus("OPERATIONAL", "DECOMMISSIONING")).toBe(true);
    });

    it("should allow DECOMMISSIONING to DEORBITED", () => {
      expect(canTransitionStatus("DECOMMISSIONING", "DEORBITED")).toBe(true);
    });

    it("should not allow backwards transitions", () => {
      expect(canTransitionStatus("OPERATIONAL", "PRE_LAUNCH")).toBe(false);
      expect(canTransitionStatus("DEORBITED", "OPERATIONAL")).toBe(false);
    });

    it("should not allow transitions from terminal states", () => {
      expect(canTransitionStatus("DEORBITED", "OPERATIONAL")).toBe(false);
      expect(canTransitionStatus("LOST", "OPERATIONAL")).toBe(false);
    });
  });

  describe("updateSpacecraftStatus", () => {
    it("should update status for valid transition", async () => {
      vi.mocked(prisma.spacecraft.findFirst).mockResolvedValue({
        id: "sc-1",
        name: "Test Sat",
        status: "PRE_LAUNCH",
      } as never);
      vi.mocked(prisma.spacecraft.update).mockResolvedValue({
        id: "sc-1",
        status: "LAUNCHED",
      } as never);

      const spacecraft = await updateSpacecraftStatus(
        "sc-1",
        "org-1",
        "LAUNCHED",
        "user-1",
      );

      expect(spacecraft.status).toBe("LAUNCHED");
    });

    it("should throw for invalid transition", async () => {
      vi.mocked(prisma.spacecraft.findFirst).mockResolvedValue({
        id: "sc-1",
        status: "DEORBITED",
      } as never);

      await expect(
        updateSpacecraftStatus("sc-1", "org-1", "OPERATIONAL", "user-1"),
      ).rejects.toThrow("Cannot transition");
    });

    it("should throw if spacecraft not found", async () => {
      vi.mocked(prisma.spacecraft.findFirst).mockResolvedValue(null);

      await expect(
        updateSpacecraftStatus("nonexistent", "org-1", "LAUNCHED", "user-1"),
      ).rejects.toThrow("Spacecraft not found");
    });
  });

  describe("getSpacecraftStats", () => {
    it("should calculate stats correctly", async () => {
      vi.mocked(prisma.spacecraft.findMany).mockResolvedValue([
        {
          status: "OPERATIONAL",
          orbitType: "LEO",
          missionType: "communication",
        },
        {
          status: "OPERATIONAL",
          orbitType: "LEO",
          missionType: "communication",
        },
        {
          status: "PRE_LAUNCH",
          orbitType: "GEO",
          missionType: "earth_observation",
        },
      ] as never);

      const stats = await getSpacecraftStats("org-1");

      expect(stats.total).toBe(3);
      expect(stats.operational).toBe(2);
      expect(stats.preLaunch).toBe(1);
      expect(stats.byStatus.OPERATIONAL).toBe(2);
      expect(stats.byStatus.PRE_LAUNCH).toBe(1);
      expect(stats.byOrbitType.LEO).toBe(2);
      expect(stats.byOrbitType.GEO).toBe(1);
      expect(stats.byMissionType.communication).toBe(2);
    });

    it("should handle empty spacecraft list", async () => {
      vi.mocked(prisma.spacecraft.findMany).mockResolvedValue([]);

      const stats = await getSpacecraftStats("org-1");

      expect(stats.total).toBe(0);
      expect(stats.operational).toBe(0);
      expect(stats.preLaunch).toBe(0);
    });
  });

  describe("formatSpacecraftForExport", () => {
    it("should format spacecraft for export", () => {
      const spacecraft = {
        id: "sc-1",
        name: "Test Satellite",
        cosparId: "2024-001A",
        noradId: "12345",
        missionType: "communication",
        orbitType: "LEO",
        status: "OPERATIONAL" as const,
        launchDate: new Date("2024-01-15"),
        endOfLifeDate: new Date("2034-01-15"),
        altitudeKm: 400,
        inclinationDeg: 51.6,
        description: "Test description",
      };

      const formatted = formatSpacecraftForExport(spacecraft as never);

      expect(formatted.Name).toBe("Test Satellite");
      expect(formatted["COSPAR ID"]).toBe("2024-001A");
      expect(formatted["NORAD ID"]).toBe("12345");
      expect(formatted["Mission Type"]).toBe("Communication");
      expect(formatted["Orbit Type"]).toContain("Low Earth Orbit");
      expect(formatted.Status).toBe("Operational");
      expect(formatted["Launch Date"]).toBe("2024-01-15");
      expect(formatted["Altitude (km)"]).toBe("400");
      expect(formatted.Description).toBe("Test description");
    });

    it("should use dash for missing optional fields", () => {
      const spacecraft = {
        id: "sc-1",
        name: "Basic Satellite",
        missionType: "communication",
        orbitType: "LEO",
        status: "PRE_LAUNCH" as const,
      };

      const formatted = formatSpacecraftForExport(spacecraft as never);

      expect(formatted["COSPAR ID"]).toBe("-");
      expect(formatted["NORAD ID"]).toBe("-");
      expect(formatted["Launch Date"]).toBe("-");
      expect(formatted["Altitude (km)"]).toBe("-");
      expect(formatted.Description).toBe("-");
    });
  });
});
