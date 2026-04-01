/**
 * Unit tests for CRA Requirements data integrity and filter function.
 */

import {
  CRA_REQUIREMENTS,
  getApplicableCRARequirements,
} from "./cra-requirements";
import type { CRAAssessmentAnswers } from "@/lib/cra-types";

// ─── Base answers fixture ───

const defaultAnswers: CRAAssessmentAnswers = {
  economicOperatorRole: "manufacturer",
  isEUEstablished: true,
  spaceProductTypeId: null,
  productName: "Test Product",
  productVersion: "1.0",
  hasNetworkFunction: false,
  processesAuthData: false,
  usedInCriticalInfra: false,
  performsCryptoOps: false,
  controlsPhysicalSystem: false,
  hasMicrocontroller: false,
  isOSSComponent: false,
  isCommerciallySupplied: false,
  segments: ["space"],
  isSafetyCritical: false,
  hasRedundancy: false,
  processesClassifiedData: false,
  hasIEC62443: false,
  hasETSIEN303645: false,
  hasCommonCriteria: false,
  hasISO27001: false,
};

// ─── Data Integrity Tests ───

describe("CRA Requirements", () => {
  it("contains 40 requirements", () => {
    expect(CRA_REQUIREMENTS).toHaveLength(40);
  });

  it("all requirements have unique IDs", () => {
    const ids = CRA_REQUIREMENTS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("IDs follow cra-001 to cra-040 pattern", () => {
    for (const req of CRA_REQUIREMENTS) {
      expect(req.id).toMatch(/^cra-\d{3}$/);
    }
  });

  it("all requirements have assessmentFields", () => {
    for (const req of CRA_REQUIREMENTS) {
      expect(req.assessmentFields.length).toBeGreaterThan(0);
    }
  });

  it("all requirements have complianceRule", () => {
    for (const req of CRA_REQUIREMENTS) {
      expect(req.complianceRule).toBeDefined();
    }
  });

  it("all requirements have spaceSpecificGuidance", () => {
    for (const req of CRA_REQUIREMENTS) {
      expect(req.spaceSpecificGuidance).toBeTruthy();
      expect(req.spaceSpecificGuidance.length).toBeGreaterThan(20);
    }
  });

  // ─── getApplicableCRARequirements ───

  describe("getApplicableCRARequirements", () => {
    it("returns requirements for class_II products", () => {
      const reqs = getApplicableCRARequirements("class_II", defaultAnswers);
      expect(reqs.length).toBeGreaterThan(0);
    });

    it("returns fewer requirements for default class (cra-024 excluded)", () => {
      const classIIReqs = getApplicableCRARequirements(
        "class_II",
        defaultAnswers,
      );
      const defaultReqs = getApplicableCRARequirements(
        "default",
        defaultAnswers,
      );
      // cra-024 (Notified Body) applies only to class_I / class_II
      const nb024InDefault = defaultReqs.find((r) => r.id === "cra-024");
      expect(nb024InDefault).toBeUndefined();
      // class_II should include cra-024
      const nb024InClassII = classIIReqs.find((r) => r.id === "cra-024");
      expect(nb024InClassII).toBeDefined();
    });

    it("filters by segment when specified", () => {
      const groundAnswers: CRAAssessmentAnswers = {
        ...defaultAnswers,
        segments: ["ground"],
      };
      const spaceAnswers: CRAAssessmentAnswers = {
        ...defaultAnswers,
        segments: ["space"],
      };
      const groundReqs = getApplicableCRARequirements(
        "class_II",
        groundAnswers,
      );
      const spaceReqs = getApplicableCRARequirements("class_II", spaceAnswers);
      expect(groundReqs.length).toBeGreaterThan(0);
      expect(spaceReqs.length).toBeGreaterThan(0);
    });

    it("includes cra-024 for class_I products", () => {
      const reqs = getApplicableCRARequirements("class_I", defaultAnswers);
      const nb024 = reqs.find((r) => r.id === "cra-024");
      expect(nb024).toBeDefined();
    });
  });

  // ─── NIS2 Cross-References ───

  describe("NIS2 cross-references", () => {
    it("some requirements have nis2RequirementIds", () => {
      const withNIS2 = CRA_REQUIREMENTS.filter(
        (r) => r.nis2RequirementIds && r.nis2RequirementIds.length > 0,
      );
      expect(withNIS2.length).toBeGreaterThan(0);
    });

    it("requirements with nis2RequirementIds also have nis2Ref", () => {
      const withNIS2Ids = CRA_REQUIREMENTS.filter(
        (r) => r.nis2RequirementIds && r.nis2RequirementIds.length > 0,
      );
      for (const req of withNIS2Ids) {
        expect(req.nis2Ref).toBeTruthy();
      }
    });
  });
});
