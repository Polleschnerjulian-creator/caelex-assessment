import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    spaceObjectRegistration: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    registrationStatusHistory: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createRegistration,
  getRegistration,
  listRegistrations,
  updateRegistration,
  deleteRegistration,
  submitToURSO,
  validateRegistrationData,
  generateCOSPARSuggestion,
  checkDuplicateRegistration,
  exportForUNOOSA,
  updateRegistrationStatus,
} from "@/lib/services/registration-service";
import type { CreateRegistrationInput } from "@/lib/services/registration-service";

// ─── Helpers ───

function makeRegistrationInput(
  overrides?: Partial<CreateRegistrationInput>,
): CreateRegistrationInput {
  return {
    organizationId: "org-1",
    spacecraftId: "sc-1",
    createdBy: "user-1",
    objectName: "Sentinel-3A",
    objectType: "SATELLITE",
    ownerOperator: "ESA",
    stateOfRegistry: "DE",
    orbitalRegime: "LEO",
    ...overrides,
  } as CreateRegistrationInput;
}

function makeRegistrationRecord(overrides?: Record<string, unknown>) {
  return {
    id: "reg-1",
    organizationId: "org-1",
    spacecraftId: "sc-1",
    createdBy: "user-1",
    objectName: "Sentinel-3A",
    objectType: "SATELLITE",
    ownerOperator: "ESA",
    stateOfRegistry: "DE",
    orbitalRegime: "LEO",
    status: "DRAFT",
    internationalDesignator: null,
    noradCatalogNumber: null,
    launchDate: null,
    launchSite: null,
    launchVehicle: null,
    launchState: null,
    perigee: null,
    apogee: null,
    inclination: null,
    period: null,
    nodeLongitude: null,
    jurisdictionState: null,
    generalFunction: null,
    ncaReference: null,
    ursoReference: null,
    submittedAt: null,
    submittedBy: null,
    registeredAt: null,
    deregisteredAt: null,
    lastAmendmentDate: null,
    createdAt: new Date("2025-01-15"),
    updatedAt: new Date("2025-01-15"),
    spacecraft: { id: "sc-1", name: "Sentinel-3A" },
    organization: { id: "org-1", name: "Test Org" },
    ...overrides,
  };
}

// ─── Tests ───

describe("Registration Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createRegistration ───

  describe("createRegistration", () => {
    it("should create a registration with DRAFT status", async () => {
      const input = makeRegistrationInput();
      const mockRecord = makeRegistrationRecord();

      vi.mocked(prisma.spaceObjectRegistration.create).mockResolvedValue(
        mockRecord as never,
      );
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );

      const result = await createRegistration(input);

      expect(result.id).toBe("reg-1");
      expect(result.objectName).toBe("Sentinel-3A");
      expect(prisma.spaceObjectRegistration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: "org-1",
            spacecraftId: "sc-1",
            objectName: "Sentinel-3A",
            objectType: "SATELLITE",
            status: "DRAFT",
          }),
          include: { spacecraft: true, organization: true },
        }),
      );
    });

    it("should create an initial status history entry", async () => {
      const input = makeRegistrationInput();
      const mockRecord = makeRegistrationRecord();

      vi.mocked(prisma.spaceObjectRegistration.create).mockResolvedValue(
        mockRecord as never,
      );
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );

      await createRegistration(input);

      expect(prisma.registrationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          registrationId: "reg-1",
          toStatus: "DRAFT",
          changedBy: "user-1",
          reason: "Registration created",
        },
      });
    });

    it("should pass optional fields through to prisma", async () => {
      const input = makeRegistrationInput({
        internationalDesignator: "2025-042A",
        noradCatalogNumber: "12345",
        launchDate: new Date("2025-06-01"),
        launchSite: "Kourou",
        launchVehicle: "Ariane 6",
        launchState: "FR",
        perigee: 400,
        apogee: 420,
        inclination: 51.6,
        period: 92,
        nodeLongitude: undefined,
        jurisdictionState: "DE",
        generalFunction: "Earth Observation",
      });
      const mockRecord = makeRegistrationRecord({
        internationalDesignator: "2025-042A",
        noradCatalogNumber: "12345",
      });

      vi.mocked(prisma.spaceObjectRegistration.create).mockResolvedValue(
        mockRecord as never,
      );
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );

      await createRegistration(input);

      expect(prisma.spaceObjectRegistration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            internationalDesignator: "2025-042A",
            noradCatalogNumber: "12345",
            launchSite: "Kourou",
            launchVehicle: "Ariane 6",
            launchState: "FR",
            perigee: 400,
            apogee: 420,
            inclination: 51.6,
            period: 92,
            jurisdictionState: "DE",
            generalFunction: "Earth Observation",
          }),
        }),
      );
    });
  });

  // ─── getRegistration ───

  describe("getRegistration", () => {
    it("should return registration by id and organizationId", async () => {
      const mockRecord = makeRegistrationRecord({
        statusHistory: [],
        attachments: [],
      });
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        mockRecord as never,
      );

      const result = await getRegistration("reg-1", "org-1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("reg-1");
      expect(prisma.spaceObjectRegistration.findFirst).toHaveBeenCalledWith({
        where: { id: "reg-1", organizationId: "org-1" },
        include: {
          spacecraft: true,
          organization: true,
          statusHistory: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          attachments: true,
        },
      });
    });

    it("should return null when registration is not found", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        null,
      );

      const result = await getRegistration("nonexistent", "org-1");

      expect(result).toBeNull();
    });
  });

  // ─── listRegistrations ───

  describe("listRegistrations", () => {
    it("should return registrations with total count", async () => {
      const mockRecords = [
        makeRegistrationRecord({ id: "reg-1" }),
        makeRegistrationRecord({ id: "reg-2", objectName: "Sentinel-3B" }),
      ];

      vi.mocked(prisma.spaceObjectRegistration.findMany).mockResolvedValue(
        mockRecords as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.count).mockResolvedValue(2);

      const result = await listRegistrations("org-1");

      expect(result.registrations).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should filter by status when provided", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findMany).mockResolvedValue(
        [] as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.count).mockResolvedValue(0);

      await listRegistrations("org-1", { status: "SUBMITTED" as never });

      expect(prisma.spaceObjectRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            status: "SUBMITTED",
          }),
        }),
      );
    });

    it("should filter by spacecraftId when provided", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findMany).mockResolvedValue(
        [] as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.count).mockResolvedValue(0);

      await listRegistrations("org-1", { spacecraftId: "sc-42" });

      expect(prisma.spaceObjectRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            spacecraftId: "sc-42",
          }),
        }),
      );
    });

    it("should apply pagination defaults (page 1, pageSize 20)", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findMany).mockResolvedValue(
        [] as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.count).mockResolvedValue(0);

      await listRegistrations("org-1");

      expect(prisma.spaceObjectRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it("should apply custom pagination", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findMany).mockResolvedValue(
        [] as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.count).mockResolvedValue(0);

      await listRegistrations("org-1", { page: 3, pageSize: 10 });

      expect(prisma.spaceObjectRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it("should order by createdAt descending", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findMany).mockResolvedValue(
        [] as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.count).mockResolvedValue(0);

      await listRegistrations("org-1");

      expect(prisma.spaceObjectRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        }),
      );
    });
  });

  // ─── updateRegistration ───

  describe("updateRegistration", () => {
    it("should update a DRAFT registration", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        makeRegistrationRecord({ status: "DRAFT" }) as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue(
        makeRegistrationRecord({
          objectName: "Sentinel-3B",
          status: "DRAFT",
        }) as never,
      );

      const result = await updateRegistration(
        "reg-1",
        "org-1",
        { objectName: "Sentinel-3B" },
        "user-1",
      );

      expect(result.objectName).toBe("Sentinel-3B");
      expect(prisma.spaceObjectRegistration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "reg-1" },
          data: expect.objectContaining({
            objectName: "Sentinel-3B",
            lastAmendmentDate: expect.any(Date),
          }),
        }),
      );
    });

    it("should update an AMENDMENT_REQUIRED registration", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        makeRegistrationRecord({ status: "AMENDMENT_REQUIRED" }) as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue(
        makeRegistrationRecord({
          status: "AMENDMENT_REQUIRED",
          ownerOperator: "DLR",
        }) as never,
      );

      const result = await updateRegistration(
        "reg-1",
        "org-1",
        { ownerOperator: "DLR" },
        "user-1",
      );

      expect(result.ownerOperator).toBe("DLR");
    });

    it("should throw when registration is not found", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        null,
      );

      await expect(
        updateRegistration(
          "nonexistent",
          "org-1",
          { objectName: "New" },
          "user-1",
        ),
      ).rejects.toThrow("Registration not found");
    });

    it("should throw when registration is in SUBMITTED status", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        makeRegistrationRecord({ status: "SUBMITTED" }) as never,
      );

      await expect(
        updateRegistration(
          "reg-1",
          "org-1",
          { objectName: "Changed" },
          "user-1",
        ),
      ).rejects.toThrow("Cannot update registration in SUBMITTED status");
    });

    it("should throw when registration is in REGISTERED status", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        makeRegistrationRecord({ status: "REGISTERED" }) as never,
      );

      await expect(
        updateRegistration(
          "reg-1",
          "org-1",
          { objectName: "Changed" },
          "user-1",
        ),
      ).rejects.toThrow("Cannot update registration in REGISTERED status");
    });

    it("should throw when registration is in UNDER_REVIEW status", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        makeRegistrationRecord({ status: "UNDER_REVIEW" }) as never,
      );

      await expect(
        updateRegistration(
          "reg-1",
          "org-1",
          { objectName: "Changed" },
          "user-1",
        ),
      ).rejects.toThrow("Cannot update registration in UNDER_REVIEW status");
    });

    it("should throw when registration is in DEREGISTERED status", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        makeRegistrationRecord({ status: "DEREGISTERED" }) as never,
      );

      await expect(
        updateRegistration(
          "reg-1",
          "org-1",
          { objectName: "Changed" },
          "user-1",
        ),
      ).rejects.toThrow("Cannot update registration in DEREGISTERED status");
    });
  });

  // ─── deleteRegistration ───

  describe("deleteRegistration", () => {
    it("should delete a DRAFT registration", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        makeRegistrationRecord({ status: "DRAFT" }) as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.delete).mockResolvedValue(
        {} as never,
      );

      await deleteRegistration("reg-1", "org-1");

      expect(prisma.spaceObjectRegistration.delete).toHaveBeenCalledWith({
        where: { id: "reg-1" },
      });
    });

    it("should throw when registration is not found", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        null,
      );

      await expect(deleteRegistration("nonexistent", "org-1")).rejects.toThrow(
        "Registration not found",
      );
    });

    it("should throw when registration is not in DRAFT status", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        makeRegistrationRecord({ status: "SUBMITTED" }) as never,
      );

      await expect(deleteRegistration("reg-1", "org-1")).rejects.toThrow(
        "Only draft registrations can be deleted",
      );
    });

    it("should throw when attempting to delete a REGISTERED entry", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        makeRegistrationRecord({ status: "REGISTERED" }) as never,
      );

      await expect(deleteRegistration("reg-1", "org-1")).rejects.toThrow(
        "Only draft registrations can be deleted",
      );
    });
  });

  // ─── submitToURSO ───

  describe("submitToURSO", () => {
    it("should submit a valid registration and return success", async () => {
      const registration = makeRegistrationRecord({
        status: "DRAFT",
        objectName: "Sentinel-3A",
        objectType: "SATELLITE",
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO",
      });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue({
        ...registration,
        status: "SUBMITTED",
      } as never);
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );

      const result = await submitToURSO("reg-1", "org-1", "user-1");

      expect(result.success).toBe(true);
      expect(result.registrationId).toBe("reg-1");
      expect(result.submittedAt).toBeInstanceOf(Date);
      expect(result.ncaReference).toBeDefined();
      expect(result.ncaReference).toMatch(/^NCA-DE-/);
    });

    it("should return failure when registration is not found", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        null,
      );

      const result = await submitToURSO("nonexistent", "org-1", "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Registration not found");
    });

    it("should return failure when validation fails (missing required fields)", async () => {
      const registration = makeRegistrationRecord({
        objectName: "",
        objectType: null,
        ownerOperator: null,
        stateOfRegistry: null,
        orbitalRegime: null,
      });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );

      const result = await submitToURSO("reg-1", "org-1", "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation failed");
    });

    it("should update status to SUBMITTED in database", async () => {
      const registration = makeRegistrationRecord({
        status: "DRAFT",
      });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue({
        ...registration,
        status: "SUBMITTED",
      } as never);
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );

      await submitToURSO("reg-1", "org-1", "user-1");

      // First update: set status to SUBMITTED
      expect(prisma.spaceObjectRegistration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "reg-1" },
          data: expect.objectContaining({
            status: "SUBMITTED",
            submittedBy: "user-1",
          }),
        }),
      );
    });

    it("should create a status history entry on submission", async () => {
      const registration = makeRegistrationRecord({
        status: "DRAFT",
      });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue({
        ...registration,
        status: "SUBMITTED",
      } as never);
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );

      await submitToURSO("reg-1", "org-1", "user-1");

      expect(prisma.registrationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          registrationId: "reg-1",
          fromStatus: "DRAFT",
          toStatus: "SUBMITTED",
          changedBy: "user-1",
          reason: "Submitted for URSO registration",
        },
      });
    });

    it("should store NCA reference with uppercase state of registry", async () => {
      const registration = makeRegistrationRecord({
        stateOfRegistry: "de",
      });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue({
        ...registration,
        status: "SUBMITTED",
      } as never);
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );

      const result = await submitToURSO("reg-1", "org-1", "user-1");

      expect(result.ncaReference).toMatch(/^NCA-DE-/);
      // Second update: set ncaReference
      expect(prisma.spaceObjectRegistration.update).toHaveBeenCalledTimes(2);
    });

    it("should return failure when registration has invalid orbital params (perigee > apogee)", async () => {
      const registration = makeRegistrationRecord({
        perigee: 500,
        apogee: 400,
      });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );

      const result = await submitToURSO("reg-1", "org-1", "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Perigee cannot be greater than apogee");
    });
  });

  // ─── validateRegistrationData ───

  describe("validateRegistrationData", () => {
    it("should pass validation with all required fields", () => {
      const result = validateRegistrationData({
        objectName: "Sentinel-3A",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when objectName is missing", () => {
      const result = validateRegistrationData({
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Object name is required");
    });

    it("should fail when objectType is missing", () => {
      const result = validateRegistrationData({
        objectName: "Sentinel-3A",
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Object type is required");
    });

    it("should fail when ownerOperator is missing", () => {
      const result = validateRegistrationData({
        objectName: "Sentinel-3A",
        objectType: "SATELLITE" as never,
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Owner/Operator is required");
    });

    it("should fail when stateOfRegistry is missing", () => {
      const result = validateRegistrationData({
        objectName: "Sentinel-3A",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        orbitalRegime: "LEO" as never,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("State of registry is required");
    });

    it("should fail when orbitalRegime is missing", () => {
      const result = validateRegistrationData({
        objectName: "Sentinel-3A",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Orbital regime is required");
    });

    it("should collect all missing required field errors", () => {
      const result = validateRegistrationData({});

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(5);
      expect(result.errors).toContain("Object name is required");
      expect(result.errors).toContain("Object type is required");
      expect(result.errors).toContain("Owner/Operator is required");
      expect(result.errors).toContain("State of registry is required");
      expect(result.errors).toContain("Orbital regime is required");
    });

    it("should warn when launch date is in the future", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const result = validateRegistrationData({
        objectName: "FutureSat",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
        launchDate: futureDate,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain("Launch date is in the future");
    });

    it("should not warn when launch date is in the past", () => {
      const pastDate = new Date("2020-01-01");

      const result = validateRegistrationData({
        objectName: "PastSat",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
        launchDate: pastDate,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).not.toContain("Launch date is in the future");
    });

    it("should fail when perigee is greater than apogee", () => {
      const result = validateRegistrationData({
        objectName: "Sentinel-3A",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
        perigee: 500,
        apogee: 400,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Perigee cannot be greater than apogee");
    });

    it("should pass when perigee equals apogee (circular orbit)", () => {
      const result = validateRegistrationData({
        objectName: "CircularSat",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
        perigee: 400,
        apogee: 400,
      });

      // perigee > apogee is false when equal, so no error
      expect(result.errors).not.toContain(
        "Perigee cannot be greater than apogee",
      );
    });

    it("should pass when perigee is less than apogee", () => {
      const result = validateRegistrationData({
        objectName: "NormalSat",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
        perigee: 400,
        apogee: 420,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).not.toContain(
        "Perigee cannot be greater than apogee",
      );
    });

    it("should fail when inclination is negative", () => {
      const result = validateRegistrationData({
        objectName: "BadIncSat",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
        inclination: -10,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Inclination must be between 0 and 180 degrees",
      );
    });

    it("should fail when inclination exceeds 180 degrees", () => {
      const result = validateRegistrationData({
        objectName: "BadIncSat",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
        inclination: 200,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Inclination must be between 0 and 180 degrees",
      );
    });

    it("should pass when inclination is exactly 0", () => {
      const result = validateRegistrationData({
        objectName: "EquatorialSat",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
        inclination: 0,
      });

      expect(result.valid).toBe(true);
    });

    it("should pass when inclination is exactly 180", () => {
      const result = validateRegistrationData({
        objectName: "RetroCat",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
        inclination: 180,
      });

      expect(result.valid).toBe(true);
    });

    it("should warn for GEO objects without longitude", () => {
      const result = validateRegistrationData({
        objectName: "GeoSat",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "GEO" as never,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        "Longitude is recommended for GEO objects",
      );
    });

    it("should not warn for GEO objects with longitude", () => {
      const result = validateRegistrationData({
        objectName: "GeoSat",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "GEO" as never,
        nodeLongitude: 19.2,
      });

      expect(result.warnings).not.toContain(
        "Longitude is recommended for GEO objects",
      );
    });

    it("should warn for GEO with perigee outside typical range", () => {
      const result = validateRegistrationData({
        objectName: "GeoSat",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "GEO" as never,
        perigee: 30000,
        apogee: 37000,
        nodeLongitude: 19.2,
      });

      expect(result.warnings).toContain(
        "Perigee outside typical GEO range (35,000-36,500 km)",
      );
    });

    it("should not warn for GEO with perigee in typical range", () => {
      const result = validateRegistrationData({
        objectName: "GeoSat",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "GEO" as never,
        perigee: 35786,
        apogee: 35800,
        nodeLongitude: 19.2,
      });

      expect(result.warnings).not.toContain(
        "Perigee outside typical GEO range (35,000-36,500 km)",
      );
    });

    it("should fail for invalid COSPAR ID format", () => {
      const result = validateRegistrationData({
        objectName: "Sentinel-3A",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
        internationalDesignator: "INVALID-FORMAT",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Invalid COSPAR ID format. Expected: YYYY-NNNXXX (e.g., 2025-042A)",
      );
    });

    it("should pass for valid COSPAR ID format", () => {
      const result = validateRegistrationData({
        objectName: "Sentinel-3A",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
        internationalDesignator: "2025-042A",
      });

      expect(result.valid).toBe(true);
    });

    it("should pass for COSPAR ID with multi-character sequence", () => {
      const result = validateRegistrationData({
        objectName: "Starlink-123",
        objectType: "SATELLITE" as never,
        ownerOperator: "SpaceX",
        stateOfRegistry: "US",
        orbitalRegime: "LEO" as never,
        internationalDesignator: "2024-100ABC",
      });

      expect(result.valid).toBe(true);
    });

    it("should fail for NORAD number with non-numeric characters", () => {
      const result = validateRegistrationData({
        objectName: "Sentinel-3A",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
        noradCatalogNumber: "ABC",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Invalid NORAD catalog number. Expected: 1-5 digit number",
      );
    });

    it("should fail for NORAD number exceeding 5 digits", () => {
      const result = validateRegistrationData({
        objectName: "Sentinel-3A",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
        noradCatalogNumber: "123456",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Invalid NORAD catalog number. Expected: 1-5 digit number",
      );
    });

    it("should pass for valid NORAD number (1-5 digits)", () => {
      const result = validateRegistrationData({
        objectName: "Sentinel-3A",
        objectType: "SATELLITE" as never,
        ownerOperator: "ESA",
        stateOfRegistry: "DE",
        orbitalRegime: "LEO" as never,
        noradCatalogNumber: "12345",
      });

      expect(result.valid).toBe(true);
    });

    it("should pass for single-digit NORAD number", () => {
      const result = validateRegistrationData({
        objectName: "EarlySat",
        objectType: "SATELLITE" as never,
        ownerOperator: "NASA",
        stateOfRegistry: "US",
        orbitalRegime: "LEO" as never,
        noradCatalogNumber: "1",
      });

      expect(result.valid).toBe(true);
    });
  });

  // ─── generateCOSPARSuggestion ───

  describe("generateCOSPARSuggestion", () => {
    it("should generate a COSPAR ID with specified year, number, and sequence", () => {
      const result = generateCOSPARSuggestion(2025, 42, "A");

      expect(result.suggestedId).toBe("2025-042A");
      expect(result.launchYear).toBe(2025);
      expect(result.launchNumber).toBe(42);
      expect(result.sequence).toBe("A");
    });

    it("should pad launch number to 3 digits", () => {
      const result = generateCOSPARSuggestion(2025, 1, "A");

      expect(result.suggestedId).toBe("2025-001A");
    });

    it("should handle large launch numbers", () => {
      const result = generateCOSPARSuggestion(2025, 999, "B");

      expect(result.suggestedId).toBe("2025-999B");
    });

    it("should default sequence to A when not provided", () => {
      const result = generateCOSPARSuggestion(2025, 42);

      expect(result.sequence).toBe("A");
      expect(result.suggestedId).toContain("A");
    });

    it("should generate a random launch number when not provided", () => {
      const result = generateCOSPARSuggestion(2025);

      expect(result.launchNumber).toBeGreaterThanOrEqual(1);
      expect(result.launchNumber).toBeLessThanOrEqual(100);
      expect(result.launchYear).toBe(2025);
      expect(result.sequence).toBe("A");
    });

    it("should use custom sequence when provided", () => {
      const result = generateCOSPARSuggestion(2024, 100, "ABC");

      expect(result.suggestedId).toBe("2024-100ABC");
      expect(result.sequence).toBe("ABC");
    });
  });

  // ─── checkDuplicateRegistration ───

  describe("checkDuplicateRegistration", () => {
    it("should detect duplicate by international designator", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue({
        id: "existing-reg",
      } as never);

      const result = await checkDuplicateRegistration({
        organizationId: "org-1",
        internationalDesignator: "2025-042A",
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.existingId).toBe("existing-reg");
    });

    it("should detect duplicate by NORAD catalog number", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue({
        id: "existing-reg",
      } as never);

      const result = await checkDuplicateRegistration({
        organizationId: "org-1",
        noradCatalogNumber: "12345",
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.existingId).toBe("existing-reg");
    });

    it("should detect duplicate by object name", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue({
        id: "existing-reg",
      } as never);

      const result = await checkDuplicateRegistration({
        organizationId: "org-1",
        objectName: "Sentinel-3A",
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.existingId).toBe("existing-reg");
    });

    it("should return no duplicate when nothing matches", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        null,
      );

      const result = await checkDuplicateRegistration({
        organizationId: "org-1",
        internationalDesignator: "2099-001A",
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.existingId).toBeUndefined();
    });

    it("should return no duplicate when no search criteria provided", async () => {
      const result = await checkDuplicateRegistration({
        organizationId: "org-1",
      });

      expect(result.isDuplicate).toBe(false);
      expect(prisma.spaceObjectRegistration.findFirst).not.toHaveBeenCalled();
    });

    it("should build OR query with all provided criteria", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        null,
      );

      await checkDuplicateRegistration({
        organizationId: "org-1",
        internationalDesignator: "2025-042A",
        noradCatalogNumber: "12345",
        objectName: "Sentinel-3A",
      });

      expect(prisma.spaceObjectRegistration.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          OR: [
            { internationalDesignator: "2025-042A" },
            { noradCatalogNumber: "12345" },
            {
              objectName: {
                equals: "Sentinel-3A",
                mode: "insensitive",
              },
            },
          ],
        },
        select: { id: true },
      });
    });
  });

  // ─── exportForUNOOSA ───

  describe("exportForUNOOSA", () => {
    it("should export CSV with correct headers", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findMany).mockResolvedValue(
        [] as never,
      );

      const csv = await exportForUNOOSA("org-1");

      const headerLine = csv.split("\n")[0];
      expect(headerLine).toContain("International Designator");
      expect(headerLine).toContain("NORAD Number");
      expect(headerLine).toContain("Object Name");
      expect(headerLine).toContain("Object Type");
      expect(headerLine).toContain("State of Registry");
      expect(headerLine).toContain("Launch Date");
      expect(headerLine).toContain("Launch Site");
      expect(headerLine).toContain("Launch Vehicle");
      expect(headerLine).toContain("Orbital Regime");
      expect(headerLine).toContain("Perigee (km)");
      expect(headerLine).toContain("Apogee (km)");
      expect(headerLine).toContain("Inclination (deg)");
      expect(headerLine).toContain("Period (min)");
      expect(headerLine).toContain("Owner/Operator");
      expect(headerLine).toContain("General Function");
      expect(headerLine).toContain("Status");
      expect(headerLine).toContain("Registered Date");
      expect(headerLine).toContain("URSO Reference");
    });

    it("should export registration data as CSV rows", async () => {
      const mockRegistrations = [
        makeRegistrationRecord({
          internationalDesignator: "2025-042A",
          noradCatalogNumber: "54321",
          objectName: "Sentinel-3A",
          objectType: "SATELLITE",
          stateOfRegistry: "DE",
          launchDate: new Date("2025-06-01"),
          launchSite: "Kourou",
          launchVehicle: "Ariane 6",
          orbitalRegime: "LEO",
          perigee: 800,
          apogee: 810,
          inclination: 98.6,
          period: 101,
          ownerOperator: "ESA",
          generalFunction: "Earth Observation",
          status: "REGISTERED",
          registeredAt: new Date("2025-07-01"),
          ursoReference: "URSO/DE/2025/1234",
        }),
      ];

      vi.mocked(prisma.spaceObjectRegistration.findMany).mockResolvedValue(
        mockRegistrations as never,
      );

      const csv = await exportForUNOOSA("org-1");
      const lines = csv.split("\n");

      expect(lines).toHaveLength(2); // header + 1 row
      const dataRow = lines[1];
      expect(dataRow).toContain("2025-042A");
      expect(dataRow).toContain("54321");
      expect(dataRow).toContain("Sentinel-3A");
      expect(dataRow).toContain("SATELLITE");
      expect(dataRow).toContain("DE");
      expect(dataRow).toContain("2025-06-01");
      expect(dataRow).toContain("Kourou");
      expect(dataRow).toContain("Ariane 6");
      expect(dataRow).toContain("LEO");
      expect(dataRow).toContain("800");
      expect(dataRow).toContain("810");
      expect(dataRow).toContain("98.6");
      expect(dataRow).toContain("101");
      expect(dataRow).toContain("ESA");
      expect(dataRow).toContain("Earth Observation");
      expect(dataRow).toContain("REGISTERED");
      expect(dataRow).toContain("2025-07-01");
      expect(dataRow).toContain("URSO/DE/2025/1234");
    });

    it("should only export SUBMITTED and REGISTERED registrations", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findMany).mockResolvedValue(
        [] as never,
      );

      await exportForUNOOSA("org-1");

      expect(prisma.spaceObjectRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: "org-1",
            status: { in: ["SUBMITTED", "REGISTERED"] },
          },
        }),
      );
    });

    it("should handle empty registrations (header only)", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findMany).mockResolvedValue(
        [] as never,
      );

      const csv = await exportForUNOOSA("org-1");
      const lines = csv.split("\n");

      expect(lines).toHaveLength(1); // header only
    });

    it("should escape double quotes in object name", async () => {
      const mockRegistrations = [
        makeRegistrationRecord({
          objectName: 'Sat "Alpha"',
          ownerOperator: "ESA",
          status: "SUBMITTED",
        }),
      ];

      vi.mocked(prisma.spaceObjectRegistration.findMany).mockResolvedValue(
        mockRegistrations as never,
      );

      const csv = await exportForUNOOSA("org-1");

      expect(csv).toContain('"Sat ""Alpha"""');
    });

    it("should escape double quotes in owner/operator", async () => {
      const mockRegistrations = [
        makeRegistrationRecord({
          objectName: "TestSat",
          ownerOperator: '"Acme Corp"',
          status: "SUBMITTED",
        }),
      ];

      vi.mocked(prisma.spaceObjectRegistration.findMany).mockResolvedValue(
        mockRegistrations as never,
      );

      const csv = await exportForUNOOSA("org-1");

      expect(csv).toContain('"""Acme Corp"""');
    });

    it("should handle null optional fields as empty strings in CSV", async () => {
      const mockRegistrations = [
        makeRegistrationRecord({
          internationalDesignator: null,
          noradCatalogNumber: null,
          launchDate: null,
          launchSite: null,
          launchVehicle: null,
          perigee: null,
          apogee: null,
          inclination: null,
          period: null,
          generalFunction: null,
          registeredAt: null,
          ursoReference: null,
          status: "SUBMITTED",
        }),
      ];

      vi.mocked(prisma.spaceObjectRegistration.findMany).mockResolvedValue(
        mockRegistrations as never,
      );

      const csv = await exportForUNOOSA("org-1");
      const dataRow = csv.split("\n")[1];

      // The row should still be parseable and not have undefined
      expect(dataRow).not.toContain("undefined");
      expect(dataRow).not.toContain("null");
    });

    it("should export multiple registrations as separate rows", async () => {
      const mockRegistrations = [
        makeRegistrationRecord({
          id: "reg-1",
          objectName: "Sat-A",
          status: "REGISTERED",
        }),
        makeRegistrationRecord({
          id: "reg-2",
          objectName: "Sat-B",
          status: "SUBMITTED",
        }),
        makeRegistrationRecord({
          id: "reg-3",
          objectName: "Sat-C",
          status: "REGISTERED",
        }),
      ];

      vi.mocked(prisma.spaceObjectRegistration.findMany).mockResolvedValue(
        mockRegistrations as never,
      );

      const csv = await exportForUNOOSA("org-1");
      const lines = csv.split("\n");

      expect(lines).toHaveLength(4); // header + 3 rows
    });
  });

  // ─── updateRegistrationStatus ───

  describe("updateRegistrationStatus", () => {
    it("should update status and create history entry", async () => {
      const registration = makeRegistrationRecord({ status: "SUBMITTED" });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue({
        ...registration,
        status: "UNDER_REVIEW",
      } as never);

      const result = await updateRegistrationStatus(
        "reg-1",
        "org-1",
        "UNDER_REVIEW" as never,
        "admin-1",
        "Review initiated",
      );

      expect(result.status).toBe("UNDER_REVIEW");
      expect(prisma.registrationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          registrationId: "reg-1",
          fromStatus: "SUBMITTED",
          toStatus: "UNDER_REVIEW",
          changedBy: "admin-1",
          reason: "Review initiated",
        },
      });
    });

    it("should throw when registration not found", async () => {
      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        null,
      );

      await expect(
        updateRegistrationStatus(
          "nonexistent",
          "org-1",
          "REGISTERED" as never,
          "admin-1",
        ),
      ).rejects.toThrow("Registration not found");
    });

    it("should set registeredAt and generate URSO reference when transitioning to REGISTERED", async () => {
      const registration = makeRegistrationRecord({
        status: "UNDER_REVIEW",
        stateOfRegistry: "FR",
        ursoReference: null,
      });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue({
        ...registration,
        status: "REGISTERED",
      } as never);

      await updateRegistrationStatus(
        "reg-1",
        "org-1",
        "REGISTERED" as never,
        "admin-1",
        "Approved",
      );

      expect(prisma.spaceObjectRegistration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "REGISTERED",
            registeredAt: expect.any(Date),
            ursoReference: expect.stringContaining("URSO/FR/"),
          }),
        }),
      );
    });

    it("should not overwrite existing URSO reference when transitioning to REGISTERED", async () => {
      const registration = makeRegistrationRecord({
        status: "UNDER_REVIEW",
        stateOfRegistry: "DE",
        ursoReference: "URSO/DE/2025/existing",
      });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue({
        ...registration,
        status: "REGISTERED",
      } as never);

      await updateRegistrationStatus(
        "reg-1",
        "org-1",
        "REGISTERED" as never,
        "admin-1",
      );

      // Should NOT contain ursoReference in update data since it already exists
      const updateCall = vi.mocked(prisma.spaceObjectRegistration.update).mock
        .calls[0][0];
      expect(
        (updateCall.data as Record<string, unknown>).ursoReference,
      ).toBeUndefined();
    });

    it("should set deregisteredAt when transitioning to DEREGISTERED", async () => {
      const registration = makeRegistrationRecord({
        status: "REGISTERED",
      });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue({
        ...registration,
        status: "DEREGISTERED",
      } as never);

      await updateRegistrationStatus(
        "reg-1",
        "org-1",
        "DEREGISTERED" as never,
        "admin-1",
        "End of life",
      );

      expect(prisma.spaceObjectRegistration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "DEREGISTERED",
            deregisteredAt: expect.any(Date),
          }),
        }),
      );
    });

    it("should not set registeredAt or deregisteredAt for other status transitions", async () => {
      const registration = makeRegistrationRecord({
        status: "SUBMITTED",
      });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue({
        ...registration,
        status: "UNDER_REVIEW",
      } as never);

      await updateRegistrationStatus(
        "reg-1",
        "org-1",
        "UNDER_REVIEW" as never,
        "admin-1",
      );

      const updateCall = vi.mocked(prisma.spaceObjectRegistration.update).mock
        .calls[0][0];
      const data = updateCall.data as Record<string, unknown>;
      expect(data.registeredAt).toBeUndefined();
      expect(data.deregisteredAt).toBeUndefined();
    });

    it("should allow status update without reason", async () => {
      const registration = makeRegistrationRecord({
        status: "DRAFT",
      });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue({
        ...registration,
        status: "SUBMITTED",
      } as never);

      await updateRegistrationStatus(
        "reg-1",
        "org-1",
        "SUBMITTED" as never,
        "admin-1",
      );

      expect(prisma.registrationStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reason: undefined,
        }),
      });
    });

    it("should include spacecraft and organization in returned result", async () => {
      const registration = makeRegistrationRecord({
        status: "SUBMITTED",
      });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue(
        registration as never,
      );

      await updateRegistrationStatus(
        "reg-1",
        "org-1",
        "UNDER_REVIEW" as never,
        "admin-1",
      );

      expect(prisma.spaceObjectRegistration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            spacecraft: true,
            organization: true,
          },
        }),
      );
    });

    it("should transition from AMENDMENT_REQUIRED to AMENDMENT_PENDING", async () => {
      const registration = makeRegistrationRecord({
        status: "AMENDMENT_REQUIRED",
      });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue({
        ...registration,
        status: "AMENDMENT_PENDING",
      } as never);

      const result = await updateRegistrationStatus(
        "reg-1",
        "org-1",
        "AMENDMENT_PENDING" as never,
        "user-1",
        "Amendments submitted",
      );

      expect(result.status).toBe("AMENDMENT_PENDING");
      expect(prisma.registrationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          registrationId: "reg-1",
          fromStatus: "AMENDMENT_REQUIRED",
          toStatus: "AMENDMENT_PENDING",
          changedBy: "user-1",
          reason: "Amendments submitted",
        },
      });
    });

    it("should transition to REJECTED status", async () => {
      const registration = makeRegistrationRecord({
        status: "UNDER_REVIEW",
      });

      vi.mocked(prisma.spaceObjectRegistration.findFirst).mockResolvedValue(
        registration as never,
      );
      vi.mocked(prisma.registrationStatusHistory.create).mockResolvedValue(
        {} as never,
      );
      vi.mocked(prisma.spaceObjectRegistration.update).mockResolvedValue({
        ...registration,
        status: "REJECTED",
      } as never);

      const result = await updateRegistrationStatus(
        "reg-1",
        "org-1",
        "REJECTED" as never,
        "admin-1",
        "Does not meet requirements",
      );

      expect(result.status).toBe("REJECTED");
    });
  });
});
