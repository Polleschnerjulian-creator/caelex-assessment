import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOperatorProfile } = vi.hoisted(() => ({
  mockOperatorProfile: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    operatorProfile: mockOperatorProfile,
  },
}));

vi.mock("@/lib/compliance/operator-types", () => ({
  CANONICAL_TO_EU: { satellite_operator: "SCO", launch_operator: "LO" },
}));

import {
  getOrCreateProfile,
  updateProfile,
  calculateCompleteness,
  toEUSpaceActAnswers,
  toNIS2Answers,
  deleteProfile,
  type OperatorProfile,
} from "@/lib/services/operator-profile-service";

/**
 * Helper to create an OperatorProfile with defaults.
 *
 * NOTE: The `isConstellation` and `offersEUServices` boolean fields default
 * to false, and `isFieldFilled(false)` returns true since booleans are always
 * considered "answered". This means an "empty" profile already has 2 optional
 * fields filled (weight 2/17).
 */
function makeProfile(
  overrides: Partial<OperatorProfile> = {},
): OperatorProfile {
  return {
    id: "profile-1",
    organizationId: "org-1",
    operatorType: null,
    euOperatorCode: null,
    entitySize: null,
    isResearch: false,
    isDefenseOnly: false,
    primaryOrbit: null,
    orbitAltitudeKm: null,
    satelliteMassKg: null,
    isConstellation: false,
    constellationSize: null,
    missionDurationMonths: null,
    plannedLaunchDate: null,
    establishment: null,
    operatingJurisdictions: [],
    offersEUServices: false,
    completeness: 0,
    lastUpdated: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

// Total weight = 4 required * 2 + 9 optional * 1 = 17
const TOTAL_WEIGHT = 17;

// In the default empty profile, isConstellation (false) and offersEUServices (false)
// are booleans. isFieldFilled returns true for any boolean, so the base weight = 2.
const BASE_BOOL_WEIGHT = 2; // isConstellation(1) + offersEUServices(1)

function expectedCompleteness(filledWeight: number): number {
  return Math.round((filledWeight / TOTAL_WEIGHT) * 100) / 100;
}

describe("Operator Profile Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrCreateProfile", () => {
    it("should return existing profile if found", async () => {
      const existing = makeProfile();
      mockOperatorProfile.findUnique.mockResolvedValue(existing);

      const result = await getOrCreateProfile("org-1");

      expect(result).toEqual(existing);
      expect(mockOperatorProfile.findUnique).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
      });
      expect(mockOperatorProfile.create).not.toHaveBeenCalled();
    });

    it("should create new profile if none exists", async () => {
      mockOperatorProfile.findUnique.mockResolvedValue(null);
      const newProfile = makeProfile({ completeness: 0 });
      mockOperatorProfile.create.mockResolvedValue(newProfile);

      const result = await getOrCreateProfile("org-1");

      expect(result).toEqual(newProfile);
      expect(mockOperatorProfile.create).toHaveBeenCalledWith({
        data: {
          organizationId: "org-1",
          completeness: 0,
        },
      });
    });
  });

  describe("updateProfile", () => {
    it("should update profile with provided fields", async () => {
      const existingProfile = makeProfile();
      mockOperatorProfile.findUnique.mockResolvedValue(existingProfile);

      const updatedProfile = makeProfile({
        operatorType: "satellite_operator",
        entitySize: "large",
        completeness: 0,
      });
      mockOperatorProfile.update.mockResolvedValueOnce(updatedProfile);

      // completeness changes: 2 required(4) + 2 booleans(2) = 6/17
      const newCompleteness = expectedCompleteness(BASE_BOOL_WEIGHT + 4);
      const recalculated = makeProfile({
        operatorType: "satellite_operator",
        entitySize: "large",
        completeness: newCompleteness,
      });
      mockOperatorProfile.update.mockResolvedValueOnce(recalculated);

      const result = await updateProfile("org-1", {
        operatorType: "satellite_operator",
        entitySize: "large",
      });

      expect(mockOperatorProfile.update).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        data: {
          operatorType: "satellite_operator",
          entitySize: "large",
        },
      });
      expect(result).toEqual(recalculated);
    });

    it("should not update completeness if it has not changed", async () => {
      // Set completeness to match what calculateCompleteness would return for the empty profile
      const baseCompleteness = expectedCompleteness(BASE_BOOL_WEIGHT);
      const existingProfile = makeProfile({ completeness: baseCompleteness });
      mockOperatorProfile.findUnique.mockResolvedValue(existingProfile);

      const updatedProfile = makeProfile({ completeness: baseCompleteness });
      mockOperatorProfile.update.mockResolvedValueOnce(updatedProfile);

      const result = await updateProfile("org-1", {});

      // update called once for the data, not a second time for completeness
      expect(mockOperatorProfile.update).toHaveBeenCalledTimes(1);
      expect(result).toEqual(updatedProfile);
    });

    it("should handle all input fields", async () => {
      const existingProfile = makeProfile();
      mockOperatorProfile.findUnique.mockResolvedValue(existingProfile);

      const fullUpdate = makeProfile({
        operatorType: "satellite_operator",
        euOperatorCode: "SCO",
        entitySize: "medium",
        isResearch: true,
        isDefenseOnly: false,
        primaryOrbit: "LEO",
        orbitAltitudeKm: 500,
        satelliteMassKg: 200,
        isConstellation: true,
        constellationSize: 50,
        missionDurationMonths: 60,
        plannedLaunchDate: new Date("2025-06-01"),
        establishment: "DE",
        operatingJurisdictions: ["DE", "FR"],
        offersEUServices: true,
        completeness: 0,
      });
      mockOperatorProfile.update.mockResolvedValueOnce(fullUpdate);

      // Completeness will be 1.0 with all fields filled
      const recalculated = { ...fullUpdate, completeness: 1.0 };
      mockOperatorProfile.update.mockResolvedValueOnce(recalculated);

      const result = await updateProfile("org-1", {
        operatorType: "satellite_operator",
        euOperatorCode: "SCO",
        entitySize: "medium",
        isResearch: true,
        isDefenseOnly: false,
        primaryOrbit: "LEO",
        orbitAltitudeKm: 500,
        satelliteMassKg: 200,
        isConstellation: true,
        constellationSize: 50,
        missionDurationMonths: 60,
        plannedLaunchDate: "2025-06-01",
        establishment: "DE",
        operatingJurisdictions: ["DE", "FR"],
        offersEUServices: true,
      });

      const updateCall = mockOperatorProfile.update.mock.calls[0][0];
      expect(updateCall.data).toHaveProperty(
        "operatorType",
        "satellite_operator",
      );
      expect(updateCall.data).toHaveProperty("euOperatorCode", "SCO");
      expect(updateCall.data).toHaveProperty("entitySize", "medium");
      expect(updateCall.data).toHaveProperty("isResearch", true);
      expect(updateCall.data).toHaveProperty("isDefenseOnly", false);
      expect(updateCall.data).toHaveProperty("primaryOrbit", "LEO");
      expect(updateCall.data).toHaveProperty("orbitAltitudeKm", 500);
      expect(updateCall.data).toHaveProperty("satelliteMassKg", 200);
      expect(updateCall.data).toHaveProperty("isConstellation", true);
      expect(updateCall.data).toHaveProperty("constellationSize", 50);
      expect(updateCall.data).toHaveProperty("missionDurationMonths", 60);
      expect(updateCall.data).toHaveProperty(
        "plannedLaunchDate",
        expect.any(Date),
      );
      expect(updateCall.data).toHaveProperty("establishment", "DE");
      expect(updateCall.data).toHaveProperty("operatingJurisdictions", [
        "DE",
        "FR",
      ]);
      expect(updateCall.data).toHaveProperty("offersEUServices", true);
    });

    it("should set plannedLaunchDate to null when null is provided", async () => {
      const existingProfile = makeProfile({
        plannedLaunchDate: new Date("2025-06-01"),
      });
      mockOperatorProfile.findUnique.mockResolvedValue(existingProfile);

      const updatedProfile = makeProfile({
        plannedLaunchDate: null,
        completeness: expectedCompleteness(BASE_BOOL_WEIGHT),
      });
      mockOperatorProfile.update.mockResolvedValueOnce(updatedProfile);

      await updateProfile("org-1", {
        plannedLaunchDate: null,
      });

      const updateCall = mockOperatorProfile.update.mock.calls[0][0];
      expect(updateCall.data.plannedLaunchDate).toBeNull();
    });

    it("should create profile if it does not exist before update", async () => {
      mockOperatorProfile.findUnique.mockResolvedValue(null);
      const newProfile = makeProfile();
      mockOperatorProfile.create.mockResolvedValue(newProfile);

      const updatedProfile = makeProfile({
        entitySize: "small",
        completeness: 0,
      });
      mockOperatorProfile.update.mockResolvedValueOnce(updatedProfile);

      // completeness: 1 required(2) + 2 booleans(2) = 4/17
      const recalc = makeProfile({
        entitySize: "small",
        completeness: expectedCompleteness(BASE_BOOL_WEIGHT + 2),
      });
      mockOperatorProfile.update.mockResolvedValueOnce(recalc);

      await updateProfile("org-1", { entitySize: "small" });

      expect(mockOperatorProfile.create).toHaveBeenCalled();
    });
  });

  describe("calculateCompleteness", () => {
    it("should return base weight for default profile (booleans counted as filled)", () => {
      const profile = makeProfile();
      const result = calculateCompleteness(profile);
      // isConstellation(false) + offersEUServices(false) = 2 optional = 2/17
      expect(result).toBe(expectedCompleteness(BASE_BOOL_WEIGHT));
    });

    it("should return 1 for fully filled profile", () => {
      const profile = makeProfile({
        operatorType: "satellite_operator",
        entitySize: "large",
        primaryOrbit: "LEO",
        establishment: "DE",
        euOperatorCode: "SCO",
        orbitAltitudeKm: 500,
        satelliteMassKg: 200,
        isConstellation: true,
        constellationSize: 50,
        missionDurationMonths: 60,
        plannedLaunchDate: new Date("2025-01-01"),
        operatingJurisdictions: ["DE", "FR"],
        offersEUServices: true,
      });
      const result = calculateCompleteness(profile);
      expect(result).toBe(1);
    });

    it("should weight required fields at 2x", () => {
      // 1 required field (2) + 2 base booleans (2) = 4/17
      const profile = makeProfile({
        operatorType: "satellite_operator",
      });
      const result = calculateCompleteness(profile);
      expect(result).toBe(expectedCompleteness(BASE_BOOL_WEIGHT + 2));
    });

    it("should weight optional fields at 1x", () => {
      // 1 optional field (1) + 2 base booleans (2) = 3/17
      const profile = makeProfile({
        orbitAltitudeKm: 500,
      });
      const result = calculateCompleteness(profile);
      expect(result).toBe(expectedCompleteness(BASE_BOOL_WEIGHT + 1));
    });

    it("should handle all four required fields filled", () => {
      const profile = makeProfile({
        operatorType: "satellite_operator",
        entitySize: "large",
        primaryOrbit: "LEO",
        establishment: "DE",
      });
      const result = calculateCompleteness(profile);
      // 4 required (8) + 2 booleans (2) = 10/17
      expect(result).toBe(expectedCompleteness(BASE_BOOL_WEIGHT + 8));
    });

    it("should not count empty strings as filled", () => {
      const profile = makeProfile({
        operatorType: "",
        entitySize: "  ",
      });
      const result = calculateCompleteness(profile);
      // Only booleans counted
      expect(result).toBe(expectedCompleteness(BASE_BOOL_WEIGHT));
    });

    it("should not count empty arrays as filled", () => {
      const profile = makeProfile({
        operatingJurisdictions: [],
      });
      const result = calculateCompleteness(profile);
      expect(result).toBe(expectedCompleteness(BASE_BOOL_WEIGHT));
    });

    it("should count booleans (even false) as filled", () => {
      // isConstellation(false) is already in default profile and is counted
      const profile = makeProfile({
        isConstellation: false,
      });
      const result = calculateCompleteness(profile);
      // Same as base: 2 booleans
      expect(result).toBe(expectedCompleteness(BASE_BOOL_WEIGHT));
    });

    it("should count true booleans as filled", () => {
      const profile = makeProfile({
        offersEUServices: true,
      });
      const result = calculateCompleteness(profile);
      // offersEUServices was already counted (false is also counted), so same
      expect(result).toBe(expectedCompleteness(BASE_BOOL_WEIGHT));
    });

    it("should handle partial profile with mix of required and optional", () => {
      const profile = makeProfile({
        operatorType: "satellite_operator", // required, weight 2
        entitySize: "small", // required, weight 2
        orbitAltitudeKm: 400, // optional, weight 1
        satelliteMassKg: 100, // optional, weight 1
      });
      const result = calculateCompleteness(profile);
      // 2 required (4) + 2 optional (2) + 2 booleans (2) = 8/17
      expect(result).toBe(expectedCompleteness(BASE_BOOL_WEIGHT + 4 + 2));
    });

    it("should handle null values in optional numeric fields", () => {
      const profile = makeProfile({
        orbitAltitudeKm: null,
        satelliteMassKg: null,
        constellationSize: null,
        missionDurationMonths: null,
      });
      const result = calculateCompleteness(profile);
      expect(result).toBe(expectedCompleteness(BASE_BOOL_WEIGHT));
    });
  });

  describe("toEUSpaceActAnswers", () => {
    it("should return empty object for empty profile", () => {
      const profile = makeProfile();
      const answers = toEUSpaceActAnswers(profile);
      expect(answers).toEqual({});
    });

    it("should map operatorType to EU code using euOperatorCode", () => {
      const profile = makeProfile({
        operatorType: "satellite_operator",
        euOperatorCode: "SCO",
      });
      const answers = toEUSpaceActAnswers(profile);
      expect(answers.operator_type).toBe("SCO");
    });

    it("should map operatorType via CANONICAL_TO_EU when no euOperatorCode set", () => {
      const profile = makeProfile({
        operatorType: "satellite_operator",
        euOperatorCode: null,
      });
      const answers = toEUSpaceActAnswers(profile);
      expect(answers.operator_type).toBe("SCO");
    });

    it("should map entitySize", () => {
      const profile = makeProfile({ entitySize: "large" });
      const answers = toEUSpaceActAnswers(profile);
      expect(answers.entity_size).toBe("large");
    });

    it("should map primaryOrbit", () => {
      const profile = makeProfile({ primaryOrbit: "LEO" });
      const answers = toEUSpaceActAnswers(profile);
      expect(answers.primary_orbit).toBe("LEO");
    });

    it("should map establishment", () => {
      const profile = makeProfile({ establishment: "DE" });
      const answers = toEUSpaceActAnswers(profile);
      expect(answers.establishment_jurisdiction).toBe("DE");
    });

    it("should map isResearch flag", () => {
      const profile = makeProfile({ isResearch: true });
      const answers = toEUSpaceActAnswers(profile);
      expect(answers.is_research).toBe(true);
    });

    it("should not include isResearch when false", () => {
      const profile = makeProfile({ isResearch: false });
      const answers = toEUSpaceActAnswers(profile);
      expect(answers).not.toHaveProperty("is_research");
    });

    it("should map isDefenseOnly flag", () => {
      const profile = makeProfile({ isDefenseOnly: true });
      const answers = toEUSpaceActAnswers(profile);
      expect(answers.is_defense_only).toBe(true);
    });

    it("should map constellation with size", () => {
      const profile = makeProfile({
        isConstellation: true,
        constellationSize: 120,
      });
      const answers = toEUSpaceActAnswers(profile);
      expect(answers.is_constellation).toBe(true);
      expect(answers.constellation_size).toBe(120);
    });

    it("should not include constellation_size when constellation is false", () => {
      const profile = makeProfile({
        isConstellation: false,
        constellationSize: 10,
      });
      const answers = toEUSpaceActAnswers(profile);
      expect(answers).not.toHaveProperty("is_constellation");
      expect(answers).not.toHaveProperty("constellation_size");
    });

    it("should map satelliteMassKg", () => {
      const profile = makeProfile({ satelliteMassKg: 500 });
      const answers = toEUSpaceActAnswers(profile);
      expect(answers.satellite_mass_kg).toBe(500);
    });

    it("should map offersEUServices", () => {
      const profile = makeProfile({ offersEUServices: true });
      const answers = toEUSpaceActAnswers(profile);
      expect(answers.offers_eu_services).toBe(true);
    });

    it("should not include offersEUServices when false", () => {
      const profile = makeProfile({ offersEUServices: false });
      const answers = toEUSpaceActAnswers(profile);
      expect(answers).not.toHaveProperty("offers_eu_services");
    });

    it("should map a fully filled profile", () => {
      const profile = makeProfile({
        operatorType: "launch_operator",
        euOperatorCode: null,
        entitySize: "medium",
        primaryOrbit: "GEO",
        establishment: "FR",
        isResearch: true,
        isDefenseOnly: true,
        isConstellation: true,
        constellationSize: 30,
        satelliteMassKg: 1000,
        offersEUServices: true,
      });
      const answers = toEUSpaceActAnswers(profile);
      expect(answers.operator_type).toBe("LO");
      expect(answers.entity_size).toBe("medium");
      expect(answers.primary_orbit).toBe("GEO");
      expect(answers.establishment_jurisdiction).toBe("FR");
      expect(answers.is_research).toBe(true);
      expect(answers.is_defense_only).toBe(true);
      expect(answers.is_constellation).toBe(true);
      expect(answers.constellation_size).toBe(30);
      expect(answers.satellite_mass_kg).toBe(1000);
      expect(answers.offers_eu_services).toBe(true);
    });
  });

  describe("toNIS2Answers", () => {
    it("should return empty object for empty profile", () => {
      const profile = makeProfile();
      const answers = toNIS2Answers(profile);
      expect(answers).toEqual({});
    });

    it("should map entitySize", () => {
      const profile = makeProfile({ entitySize: "large" });
      const answers = toNIS2Answers(profile);
      expect(answers.entity_size).toBe("large");
    });

    it("should map operatorType as sector and operator_type", () => {
      const profile = makeProfile({ operatorType: "satellite_operator" });
      const answers = toNIS2Answers(profile);
      expect(answers.sector).toBe("space");
      expect(answers.operator_type).toBe("satellite_operator");
    });

    it("should map establishment as establishment_member_state", () => {
      const profile = makeProfile({ establishment: "DE" });
      const answers = toNIS2Answers(profile);
      expect(answers.establishment_member_state).toBe("DE");
    });

    it("should map operatingJurisdictions when non-empty", () => {
      const profile = makeProfile({
        operatingJurisdictions: ["DE", "FR", "NL"],
      });
      const answers = toNIS2Answers(profile);
      expect(answers.operating_jurisdictions).toEqual(["DE", "FR", "NL"]);
    });

    it("should not include operatingJurisdictions when empty", () => {
      const profile = makeProfile({
        operatingJurisdictions: [],
      });
      const answers = toNIS2Answers(profile);
      expect(answers).not.toHaveProperty("operating_jurisdictions");
    });

    it("should map offersEUServices", () => {
      const profile = makeProfile({ offersEUServices: true });
      const answers = toNIS2Answers(profile);
      expect(answers.offers_services_in_eu).toBe(true);
    });

    it("should not include offersEUServices when false", () => {
      const profile = makeProfile({ offersEUServices: false });
      const answers = toNIS2Answers(profile);
      expect(answers).not.toHaveProperty("offers_services_in_eu");
    });

    it("should map constellation", () => {
      const profile = makeProfile({
        isConstellation: true,
        constellationSize: 50,
      });
      const answers = toNIS2Answers(profile);
      expect(answers.is_constellation).toBe(true);
      expect(answers).not.toHaveProperty("large_constellation");
    });

    it("should mark large_constellation when size > 100", () => {
      const profile = makeProfile({
        isConstellation: true,
        constellationSize: 150,
      });
      const answers = toNIS2Answers(profile);
      expect(answers.is_constellation).toBe(true);
      expect(answers.large_constellation).toBe(true);
    });

    it("should not set large_constellation when size <= 100", () => {
      const profile = makeProfile({
        isConstellation: true,
        constellationSize: 100,
      });
      const answers = toNIS2Answers(profile);
      expect(answers.is_constellation).toBe(true);
      expect(answers).not.toHaveProperty("large_constellation");
    });

    it("should not include constellation fields when isConstellation is false", () => {
      const profile = makeProfile({
        isConstellation: false,
        constellationSize: 200,
      });
      const answers = toNIS2Answers(profile);
      expect(answers).not.toHaveProperty("is_constellation");
      expect(answers).not.toHaveProperty("large_constellation");
    });

    it("should map a fully filled profile", () => {
      const profile = makeProfile({
        entitySize: "medium",
        operatorType: "satellite_operator",
        establishment: "NL",
        operatingJurisdictions: ["NL", "BE"],
        offersEUServices: true,
        isConstellation: true,
        constellationSize: 200,
      });
      const answers = toNIS2Answers(profile);
      expect(answers.entity_size).toBe("medium");
      expect(answers.sector).toBe("space");
      expect(answers.operator_type).toBe("satellite_operator");
      expect(answers.establishment_member_state).toBe("NL");
      expect(answers.operating_jurisdictions).toEqual(["NL", "BE"]);
      expect(answers.offers_services_in_eu).toBe(true);
      expect(answers.is_constellation).toBe(true);
      expect(answers.large_constellation).toBe(true);
    });
  });

  describe("deleteProfile", () => {
    it("should delete the operator profile by organizationId", async () => {
      mockOperatorProfile.delete.mockResolvedValue({} as never);

      await deleteProfile("org-1");

      expect(mockOperatorProfile.delete).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
      });
    });
  });
});
