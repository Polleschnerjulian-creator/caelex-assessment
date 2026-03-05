import { describe, it, expect, vi } from "vitest";
import React from "react";

vi.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: any) => <div>{children}</div>,
  Page: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (styles: any) => styles },
  Font: { register: vi.fn() },
}));

import {
  buildDebrisMitigationPlanConfig,
  DebrisMitigationPlanPDF,
} from "./debris-mitigation-plan";
import type { DebrisMitigationPlanData } from "./debris-mitigation-plan";

function makeData(
  overrides: Partial<DebrisMitigationPlanData> = {},
): DebrisMitigationPlanData {
  return {
    reportNumber: "DMP-2025-001",
    reportDate: new Date("2025-06-15"),
    organization: "SpaceCo Ltd",
    generatedBy: "admin@spaceco.eu",
    missionName: "Constellation Alpha",
    operator: "SpaceCo Ltd",
    orbitType: "LEO",
    orbitParameters: "550 km, 53 deg",
    missionDuration: "5 years",
    plannedDurationYears: 5,
    satelliteCount: 20,
    constellationTier: "Tier 1",
    spacecraft: {
      mass: "150 kg",
      hasPropulsion: true,
      propellantType: "Xenon",
      maneuverability: "full",
    },
    collisionAvoidance: {
      strategy: "Automated CA",
      serviceProvider: "18 SDS",
      maneuverCapability: "3-axis",
      procedures: ["Monitor CDMs", "Execute avoidance"],
    },
    endOfLifeDisposal: {
      method: "Controlled deorbit",
      methodDescription: "Lowering orbit to ensure reentry within 25 years",
      timeline: "6 months before EOL",
      propellantBudget: "10 kg reserved",
      backupStrategy: "Natural decay within 10 years",
    },
    fragmentationAvoidance: {
      designMeasures: ["No pyrotechnics", "Shielded batteries"],
      operationalProcedures: ["Avoid collision", "Monitor pressure"],
    },
    passivation: {
      energySources: ["Battery", "Propellant"],
      procedures: ["Discharge battery", "Vent propellant"],
      timeline: "End of mission",
      hasCapability: true,
    },
    complianceVerification: {
      twentyFiveYearCompliance: true,
      calculationMethod: "STELA orbit propagation",
      uncertaintyMargin: "±10%",
      complianceStatement: "Fully compliant with 25-year rule",
    },
    requirementsMatrix: [
      {
        id: "R1",
        title: "Collision Avoidance",
        articleRef: "Art. 12(2)(a)",
        status: "compliant",
        notes: "Automated CA implemented",
      },
      {
        id: "R2",
        title: "End-of-Life Disposal",
        articleRef: "Art. 12(2)(b)",
        status: "in_progress",
        notes: null,
      },
    ],
    complianceScore: 85,
    riskLevel: "low",
    ...overrides,
  };
}

describe("buildDebrisMitigationPlanConfig", () => {
  it("returns valid metadata", () => {
    const config = buildDebrisMitigationPlanConfig(makeData());
    expect(config.metadata.reportId).toBe("DMP-2025-001");
    expect(config.metadata.reportType).toBe("debris_event");
    expect(config.metadata.title).toBe("Debris Mitigation Plan");
  });

  it("sets header and footer correctly", () => {
    const config = buildDebrisMitigationPlanConfig(makeData());
    expect(config.header.title).toBe("Debris Mitigation Plan");
    expect(config.header.subtitle).toContain("Constellation Alpha");
    expect(config.header.subtitle).toContain("Art. 12");
    expect(config.footer.confidentialityNotice).toBe("CONFIDENTIAL");
  });

  it("uses info alert for high compliance score >= 80", () => {
    const config = buildDebrisMitigationPlanConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("info");
    expect(alert.message).toContain("Substantially compliant");
  });

  it("uses warning alert for score 60-79", () => {
    const data = makeData({ complianceScore: 65 });
    const config = buildDebrisMitigationPlanConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("warning");
  });

  it("uses error alert for score < 60", () => {
    const data = makeData({ complianceScore: 40 });
    const config = buildDebrisMitigationPlanConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("error");
  });

  it("includes optional altitude and inclination when provided", () => {
    const data = makeData({ altitudeKm: 550, inclinationDeg: 53 });
    const config = buildDebrisMitigationPlanConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Mission Overview"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const altItem = kv.items.find((i: any) => i.key === "Altitude");
    expect(altItem.value).toBe("550 km");
  });

  it("excludes altitude/inclination when not provided", () => {
    const config = buildDebrisMitigationPlanConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Mission Overview"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const altItem = kv.items.find((i: any) => i.key === "Altitude");
    expect(altItem).toBeUndefined();
  });

  it("includes launch/EOL dates when provided", () => {
    const data = makeData({ launchDate: "2025-Q3", endOfLifeDate: "2030-Q3" });
    const config = buildDebrisMitigationPlanConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Mission Overview"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const launch = kv.items.find((i: any) => i.key === "Planned Launch");
    expect(launch.value).toBe("2025-Q3");
  });

  it("handles spacecraft without dimensions", () => {
    const config = buildDebrisMitigationPlanConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Mission Overview"),
    );
    const kvBlocks = section!.content.filter(
      (c) => c.type === "keyValue",
    ) as any[];
    const spacecraftKV = kvBlocks[1]; // second keyValue block
    const dim = spacecraftKV.items.find((i: any) => i.key === "Dimensions");
    expect(dim).toBeUndefined();
  });

  it("shows propulsion type for spacecraft with propulsion", () => {
    const config = buildDebrisMitigationPlanConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Mission Overview"),
    );
    const kvBlocks = section!.content.filter(
      (c) => c.type === "keyValue",
    ) as any[];
    const spacecraftKV = kvBlocks[1];
    const prop = spacecraftKV.items.find(
      (i: any) => i.key === "Propulsion System",
    );
    expect(prop.value).toContain("Xenon");
  });

  it("shows No onboard propulsion for spacecraft without propulsion", () => {
    const data = makeData({
      spacecraft: {
        mass: "5 kg",
        hasPropulsion: false,
        maneuverability: "none",
      },
    });
    const config = buildDebrisMitigationPlanConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Mission Overview"),
    );
    const kvBlocks = section!.content.filter(
      (c) => c.type === "keyValue",
    ) as any[];
    const spacecraftKV = kvBlocks[1];
    const prop = spacecraftKV.items.find(
      (i: any) => i.key === "Propulsion System",
    );
    expect(prop.value).toContain("No onboard");
  });

  it("handles full, limited, and none maneuverability", () => {
    for (const m of ["full", "limited", "none"] as const) {
      const data = makeData({
        spacecraft: { ...makeData().spacecraft, maneuverability: m },
      });
      const config = buildDebrisMitigationPlanConfig(data);
      expect(config.sections).toBeDefined();
    }
  });

  it("includes tracking accuracy when provided", () => {
    const data = makeData({
      collisionAvoidance: {
        ...makeData().collisionAvoidance,
        trackingAccuracy: "10m 3-sigma",
      },
    });
    const config = buildDebrisMitigationPlanConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Collision Avoidance"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const ta = kv.items.find((i: any) => i.key === "Tracking Accuracy");
    expect(ta.value).toBe("10m 3-sigma");
  });

  it("includes success probability when provided", () => {
    const data = makeData({
      endOfLifeDisposal: {
        ...makeData().endOfLifeDisposal,
        successProbability: "95%",
      },
    });
    const config = buildDebrisMitigationPlanConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("End-of-Life Disposal"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const sp = kv.items.find((i: any) => i.key === "Success Probability");
    expect(sp.value).toBe("95%");
  });

  it("shows correct 25-year rule compliance alert", () => {
    const config = buildDebrisMitigationPlanConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("End-of-Life Disposal"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("info");
    expect(alert.message).toContain("verified");
  });

  it("shows warning for 25-year non-compliance", () => {
    const data = makeData({
      complianceVerification: {
        ...makeData().complianceVerification,
        twentyFiveYearCompliance: false,
      },
    });
    const config = buildDebrisMitigationPlanConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("End-of-Life Disposal"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("warning");
  });

  it("includes calculated lifetime when provided", () => {
    const data = makeData({
      complianceVerification: {
        ...makeData().complianceVerification,
        calculatedLifetime: "18 years",
      },
    });
    const config = buildDebrisMitigationPlanConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Compliance Verification"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const lt = kv.items.find(
      (i: any) => i.key === "Calculated Orbital Lifetime",
    );
    expect(lt.value).toBe("18 years");
  });

  it("creates requirements matrix table", () => {
    const config = buildDebrisMitigationPlanConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Requirements Compliance"),
    );
    expect(section).toBeDefined();
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows).toHaveLength(2);
  });

  it("truncates long requirement titles", () => {
    const data = makeData({
      requirementsMatrix: [
        {
          id: "R1",
          title: "A".repeat(50),
          articleRef: "Art. 12",
          status: "compliant",
          notes: null,
        },
      ],
    });
    const config = buildDebrisMitigationPlanConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Requirements Compliance"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows[0][0]).toContain("...");
  });

  it("shows more requirements message when over 15", () => {
    const reqs = Array.from({ length: 20 }, (_, i) => ({
      id: `R${i}`,
      title: `Req ${i}`,
      articleRef: "Art. 12",
      status: "compliant" as const,
      notes: null,
    }));
    const data = makeData({ requirementsMatrix: reqs });
    const config = buildDebrisMitigationPlanConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Requirements Compliance"),
    );
    const moreText = section!.content.find(
      (c) =>
        c.type === "text" && (c as any).value.includes("more requirements"),
    );
    expect(moreText).toBeDefined();
  });

  it("includes certification statement section", () => {
    const config = buildDebrisMitigationPlanConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Certification"),
    );
    expect(section).toBeDefined();
  });
});

describe("DebrisMitigationPlanPDF component", () => {
  it("renders without errors", () => {
    const element = React.createElement(DebrisMitigationPlanPDF, {
      data: makeData(),
    });
    expect(element).toBeTruthy();
  });
});
