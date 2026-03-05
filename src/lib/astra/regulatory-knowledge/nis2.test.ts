import { describe, it, expect } from "vitest";
import {
  SPACE_SECTOR_CLASSIFICATION,
  classifyNIS2Entity,
  NIS2_REQUIREMENT_CATEGORIES,
  NIS2_KEY_REQUIREMENTS,
  NIS2_PENALTIES,
  INCIDENT_NOTIFICATION_TIMELINE,
  getRequirementsByCategory,
  getRequirementsForEntityType,
  searchRequirements,
  NIS2_SUMMARY,
} from "./nis2";

// ─── SPACE_SECTOR_CLASSIFICATION ───

describe("SPACE_SECTOR_CLASSIFICATION", () => {
  it("has correct sector", () => {
    expect(SPACE_SECTOR_CLASSIFICATION.sector).toBe("Space");
  });

  it("has employee threshold of 50", () => {
    expect(SPACE_SECTOR_CLASSIFICATION.employeeThreshold).toBe(50);
  });

  it("has turnover threshold of 10M", () => {
    expect(SPACE_SECTOR_CLASSIFICATION.turnoverThreshold).toBe(10_000_000);
  });

  it("has balance sheet threshold of 10M", () => {
    expect(SPACE_SECTOR_CLASSIFICATION.balanceSheetThreshold).toBe(10_000_000);
  });

  it("has special criteria", () => {
    expect(Array.isArray(SPACE_SECTOR_CLASSIFICATION.specialCriteria)).toBe(
      true,
    );
    expect(SPACE_SECTOR_CLASSIFICATION.specialCriteria!.length).toBeGreaterThan(
      0,
    );
  });
});

// ─── classifyNIS2Entity ───

describe("classifyNIS2Entity", () => {
  it("classifies small entity as out_of_scope", () => {
    const result = classifyNIS2Entity(10, 1_000_000, 500_000);
    expect(result).toBe("out_of_scope");
  });

  it("classifies medium entity as important", () => {
    const result = classifyNIS2Entity(100, 20_000_000, 15_000_000);
    expect(result).toBe("important");
  });

  it("classifies large entity by employee count as essential", () => {
    const result = classifyNIS2Entity(300, 20_000_000, 15_000_000);
    expect(result).toBe("essential");
  });

  it("classifies large entity by turnover as essential", () => {
    const result = classifyNIS2Entity(100, 60_000_000, 15_000_000);
    expect(result).toBe("essential");
  });

  it("classifies large entity by balance sheet as essential", () => {
    const result = classifyNIS2Entity(100, 20_000_000, 50_000_000);
    expect(result).toBe("essential");
  });

  it("classifies critical service provider as essential regardless of size", () => {
    const result = classifyNIS2Entity(10, 1_000_000, 500_000, true);
    expect(result).toBe("essential");
  });

  it("50 employees threshold makes entity important", () => {
    const result = classifyNIS2Entity(50, 5_000_000, 5_000_000);
    expect(result).toBe("important");
  });

  it("49 employees with low turnover is out_of_scope", () => {
    const result = classifyNIS2Entity(49, 5_000_000, 5_000_000);
    expect(result).toBe("out_of_scope");
  });

  it("turnover threshold of 10M makes entity important", () => {
    const result = classifyNIS2Entity(30, 10_000_000, 5_000_000);
    expect(result).toBe("important");
  });

  it("balance sheet threshold of 10M makes entity important", () => {
    const result = classifyNIS2Entity(30, 5_000_000, 10_000_000);
    expect(result).toBe("important");
  });

  it("250 employees makes entity essential", () => {
    const result = classifyNIS2Entity(250, 5_000_000, 5_000_000);
    expect(result).toBe("essential");
  });

  it("turnover 50M makes entity essential", () => {
    const result = classifyNIS2Entity(50, 50_000_000, 5_000_000);
    expect(result).toBe("essential");
  });

  it("balance sheet 43M makes entity essential", () => {
    const result = classifyNIS2Entity(50, 5_000_000, 43_000_000);
    expect(result).toBe("essential");
  });
});

// ─── NIS2_REQUIREMENT_CATEGORIES ───

describe("NIS2_REQUIREMENT_CATEGORIES", () => {
  it("has all expected categories", () => {
    expect(NIS2_REQUIREMENT_CATEGORIES.policies_risk_analysis).toBeDefined();
    expect(NIS2_REQUIREMENT_CATEGORIES.incident_handling).toBeDefined();
    expect(NIS2_REQUIREMENT_CATEGORIES.business_continuity).toBeDefined();
    expect(NIS2_REQUIREMENT_CATEGORIES.supply_chain).toBeDefined();
    expect(NIS2_REQUIREMENT_CATEGORIES.acquisition_security).toBeDefined();
    expect(NIS2_REQUIREMENT_CATEGORIES.effectiveness_assessment).toBeDefined();
    expect(NIS2_REQUIREMENT_CATEGORIES.cyber_hygiene).toBeDefined();
    expect(NIS2_REQUIREMENT_CATEGORIES.cryptography).toBeDefined();
    expect(NIS2_REQUIREMENT_CATEGORIES.hr_security).toBeDefined();
    expect(NIS2_REQUIREMENT_CATEGORIES.authentication).toBeDefined();
    expect(NIS2_REQUIREMENT_CATEGORIES.incident_notification).toBeDefined();
    expect(NIS2_REQUIREMENT_CATEGORIES.governance).toBeDefined();
  });

  it("each category has code, title, articleRef, description", () => {
    for (const [, cat] of Object.entries(NIS2_REQUIREMENT_CATEGORIES)) {
      expect(cat.code).toBeTruthy();
      expect(cat.title).toBeTruthy();
      expect(cat.articleRef).toBeTruthy();
      expect(cat.description).toBeTruthy();
    }
  });
});

// ─── NIS2_KEY_REQUIREMENTS ───

describe("NIS2_KEY_REQUIREMENTS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(NIS2_KEY_REQUIREMENTS)).toBe(true);
    expect(NIS2_KEY_REQUIREMENTS.length).toBeGreaterThan(0);
  });

  it("each requirement has required fields", () => {
    for (const req of NIS2_KEY_REQUIREMENTS) {
      expect(req.id).toBeTruthy();
      expect(req.category).toBeTruthy();
      expect(req.categoryCode).toBeTruthy();
      expect(req.title).toBeTruthy();
      expect(req.description).toBeTruthy();
      expect(Array.isArray(req.implementationGuidance)).toBe(true);
      expect(req.articleReference).toBeTruthy();
      expect(Array.isArray(req.applicableEntityTypes)).toBe(true);
    }
  });

  it("has incident notification requirements", () => {
    const notificationReqs = NIS2_KEY_REQUIREMENTS.filter(
      (r) => r.category === "incident_notification",
    );
    expect(notificationReqs.length).toBeGreaterThan(0);
  });
});

// ─── NIS2_PENALTIES ───

describe("NIS2_PENALTIES", () => {
  it("has essential and important penalties", () => {
    expect(NIS2_PENALTIES.essential).toBeDefined();
    expect(NIS2_PENALTIES.important).toBeDefined();
  });

  it("essential has correct max fine", () => {
    expect(NIS2_PENALTIES.essential.maxFine).toBe(10_000_000);
    expect(NIS2_PENALTIES.essential.maxTurnoverPercent).toBe(2);
  });

  it("important has correct max fine", () => {
    expect(NIS2_PENALTIES.important.maxFine).toBe(7_000_000);
    expect(NIS2_PENALTIES.important.maxTurnoverPercent).toBe(1.4);
  });

  it("each penalty has description", () => {
    expect(NIS2_PENALTIES.essential.description).toBeTruthy();
    expect(NIS2_PENALTIES.important.description).toBeTruthy();
  });
});

// ─── INCIDENT_NOTIFICATION_TIMELINE ───

describe("INCIDENT_NOTIFICATION_TIMELINE", () => {
  it("has all 4 phases", () => {
    expect(INCIDENT_NOTIFICATION_TIMELINE.earlyWarning).toBeDefined();
    expect(INCIDENT_NOTIFICATION_TIMELINE.initialNotification).toBeDefined();
    expect(INCIDENT_NOTIFICATION_TIMELINE.intermediateReport).toBeDefined();
    expect(INCIDENT_NOTIFICATION_TIMELINE.finalReport).toBeDefined();
  });

  it("early warning deadline is 24 hours", () => {
    expect(INCIDENT_NOTIFICATION_TIMELINE.earlyWarning.deadline).toBe(
      "24 hours",
    );
  });

  it("initial notification deadline is 72 hours", () => {
    expect(INCIDENT_NOTIFICATION_TIMELINE.initialNotification.deadline).toBe(
      "72 hours",
    );
  });

  it("final report deadline is 1 month", () => {
    expect(INCIDENT_NOTIFICATION_TIMELINE.finalReport.deadline).toBe("1 month");
  });

  it("each phase has deadline, content, articleRef", () => {
    for (const [, phase] of Object.entries(INCIDENT_NOTIFICATION_TIMELINE)) {
      expect(phase.deadline).toBeTruthy();
      expect(phase.content).toBeTruthy();
      expect(phase.articleRef).toBeTruthy();
    }
  });
});

// ─── getRequirementsByCategory ───

describe("getRequirementsByCategory", () => {
  it("returns requirements for policies_risk_analysis", () => {
    const results = getRequirementsByCategory("policies_risk_analysis");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.category).toBe("policies_risk_analysis");
    }
  });

  it("returns requirements for incident_handling", () => {
    const results = getRequirementsByCategory("incident_handling");
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns empty array for unknown category", () => {
    const results = getRequirementsByCategory("nonexistent_category");
    expect(results).toEqual([]);
  });
});

// ─── getRequirementsForEntityType ───

describe("getRequirementsForEntityType", () => {
  it("returns requirements for essential entities", () => {
    const results = getRequirementsForEntityType("essential");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.applicableEntityTypes).toContain("essential");
    }
  });

  it("returns requirements for important entities", () => {
    const results = getRequirementsForEntityType("important");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.applicableEntityTypes).toContain("important");
    }
  });

  it("returns empty array for out_of_scope entities", () => {
    const results = getRequirementsForEntityType("out_of_scope");
    expect(results).toEqual([]);
  });
});

// ─── searchRequirements ───

describe("searchRequirements", () => {
  it("finds requirements by title", () => {
    const results = searchRequirements("Incident");
    expect(results.length).toBeGreaterThan(0);
  });

  it("finds requirements by description", () => {
    const results = searchRequirements("encryption");
    expect(results.length).toBeGreaterThan(0);
  });

  it("finds requirements by implementation guidance", () => {
    const results = searchRequirements("CCSDS");
    expect(results.length).toBeGreaterThan(0);
  });

  it("is case-insensitive", () => {
    const lower = searchRequirements("risk");
    const upper = searchRequirements("RISK");
    expect(lower.length).toBe(upper.length);
  });

  it("returns empty array for no matches", () => {
    const results = searchRequirements("zzznonexistentzzzz");
    expect(results).toEqual([]);
  });
});

// ─── NIS2_SUMMARY ───

describe("NIS2_SUMMARY", () => {
  it("is a non-empty string", () => {
    expect(typeof NIS2_SUMMARY).toBe("string");
    expect(NIS2_SUMMARY.length).toBeGreaterThan(100);
  });

  it("mentions key NIS2 concepts", () => {
    expect(NIS2_SUMMARY).toContain("Space");
    expect(NIS2_SUMMARY).toContain("essential");
    expect(NIS2_SUMMARY).toContain("important");
    expect(NIS2_SUMMARY).toContain("24 hours");
  });
});
