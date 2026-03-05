import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";

vi.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: any) => <div data-testid="document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="page">{children}</div>,
  Text: ({ children, render: renderProp, ...props }: any) => (
    <span {...props}>
      {renderProp ? renderProp({ pageNumber: 1, totalPages: 1 }) : children}
    </span>
  ),
  View: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (styles: any) => styles },
  Font: { register: vi.fn() },
}));

import {
  buildAuthorizationApplicationConfig,
  AuthorizationApplicationPDF,
} from "./authorization-application";
import type { AuthorizationApplicationData } from "./authorization-application";

function makeData(
  overrides: Partial<AuthorizationApplicationData> = {},
): AuthorizationApplicationData {
  return {
    reportNumber: "APP-2025-001",
    reportDate: new Date("2025-06-01"),
    organization: "SpaceCo Ltd",
    generatedBy: "admin@spaceco.eu",
    applicationType: "new",
    applicationCategory: "Standard Authorization",
    applicant: {
      legalName: "SpaceCo Ltd",
      registrationNumber: "HRB-12345",
      incorporationDate: "2020-01-15",
      jurisdiction: "Germany",
      registeredAddress: "Berlin, Germany",
      contactPerson: "Jane Doe",
      contactEmail: "jane@spaceco.eu",
      contactPhone: "+49 30 123456",
    },
    operatorQualification: {
      operatorType: "Satellite Operator",
      entitySize: "Medium",
      isResearchEntity: false,
      lightRegimeEligible: false,
      previousAuthorizations: [],
      relevantExperience: ["5 years satellite operations"],
      technicalCapabilities: ["TT&C", "Ground segment"],
    },
    missionDetails: {
      missionName: "Alpha Mission",
      missionObjective: "Earth observation",
      missionType: "EO",
      operationalConcept: "Continuous monitoring",
      plannedLaunchDate: "2026-Q1",
      missionDurationYears: 5,
      endOfMissionDate: "2031-Q1",
    },
    spaceSegment: {
      spacecraftCount: 3,
      spacecraftType: "3U CubeSat",
      massKg: 4.5,
      orbitType: "SSO",
      altitudeKm: 550,
      inclinationDeg: 97.5,
      expectedLifetimeYears: 5,
      hasPropulsion: false,
      payloads: ["Multispectral camera"],
    },
    groundSegment: {
      controlCenterLocation: "Berlin, Germany",
      groundStations: ["Svalbard", "Berlin"],
      cybersecurityMeasures: ["Encryption", "MFA"],
    },
    launchDetails: {
      launchProvider: "SpaceX",
      launchVehicle: "Falcon 9",
      launchSite: "Vandenberg SFB",
      launchContract: "signed",
      deploymentMethod: "Rideshare",
    },
    complianceDocumentation: {
      debrisMitigationPlan: "attached",
      insuranceCertificate: "pending",
      cybersecurityAssessment: "attached",
      environmentalAssessment: "not_required",
      frequencyCoordination: "pending",
      financialStatements: "attached",
      technicalDossier: "attached",
    },
    regulatoryRequirements: [
      {
        article: "Art. 7",
        requirement: "Authorization required",
        complianceStatus: "compliant",
      },
    ],
    euSpaceActChecklist: [
      {
        category: "Authorization",
        items: [
          {
            requirement: "Operator qualification verified",
            articleRef: "Art. 8",
            status: "yes",
          },
        ],
      },
    ],
    declarations: {
      accuracyDeclaration: true,
      complianceCommitment: true,
      changeNotificationCommitment: true,
      supervisoryCooperation: true,
      dataProtectionCompliance: true,
      sanctionsCompliance: true,
    },
    ...overrides,
  };
}

describe("buildAuthorizationApplicationConfig", () => {
  it("returns valid metadata", () => {
    const config = buildAuthorizationApplicationConfig(makeData());
    expect(config.metadata.reportId).toBe("APP-2025-001");
    expect(config.metadata.title).toBe("Authorization Application");
  });

  it("sets header with mission name", () => {
    const config = buildAuthorizationApplicationConfig(makeData());
    expect(config.header.title).toContain("Space Activity Authorization");
    expect(config.header.subtitle).toContain("Alpha Mission");
  });

  it("includes application summary section", () => {
    const config = buildAuthorizationApplicationConfig(makeData());
    const section = config.sections.find(
      (s) => s.title === "Application Summary",
    );
    expect(section).toBeDefined();
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.message).toContain("NEW APPLICATION");
  });

  it("includes optional applicant fields", () => {
    const data = makeData({
      applicant: {
        ...makeData().applicant,
        tradingName: "SpaceCo",
        operationalAddress: "Munich, Germany",
        website: "https://spaceco.eu",
        parentCompany: "MegaCorp",
        ultimateBeneficialOwners: ["John Smith (51%)"],
      },
    });
    const config = buildAuthorizationApplicationConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Applicant Information"),
    );
    const kvBlocks = section!.content.filter(
      (c) => c.type === "keyValue",
    ) as any[];
    const keys = kvBlocks[0].items.map((i: any) => i.key);
    expect(keys).toContain("Trading Name");
    expect(keys).toContain("Operational Address");
    expect(keys).toContain("Website");
    expect(keys).toContain("Parent Company");
  });

  it("excludes optional applicant fields when not provided", () => {
    const config = buildAuthorizationApplicationConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Applicant Information"),
    );
    const kvBlocks = section!.content.filter(
      (c) => c.type === "keyValue",
    ) as any[];
    const keys = kvBlocks[0].items.map((i: any) => i.key);
    expect(keys).not.toContain("Trading Name");
  });

  it("includes beneficial owners when provided", () => {
    const data = makeData({
      applicant: {
        ...makeData().applicant,
        ultimateBeneficialOwners: ["Owner A", "Owner B"],
      },
    });
    const config = buildAuthorizationApplicationConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Applicant Information"),
    );
    const headings = section!.content
      .filter((c) => c.type === "heading")
      .map((c: any) => c.value);
    expect(headings).toContain("1.3 Beneficial Ownership");
  });

  it("shows No previous authorizations when empty", () => {
    const config = buildAuthorizationApplicationConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Operator Qualification"),
    );
    const list = section!.content.find(
      (c) => c.type === "list" && (c as any).items[0]?.includes("No previous"),
    );
    expect(list).toBeDefined();
  });

  it("includes QMS when provided", () => {
    const data = makeData({
      operatorQualification: {
        ...makeData().operatorQualification,
        qualityManagementSystem: "ISO 9001",
      },
    });
    const config = buildAuthorizationApplicationConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Operator Qualification"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const qms = kv.items.find((i: any) => i.key === "QMS Certification");
    expect(qms.value).toBe("ISO 9001");
  });

  it("includes services when provided", () => {
    const data = makeData({
      missionDetails: {
        ...makeData().missionDetails,
        servicesToBeProvided: ["EO data", "Analytics"],
      },
    });
    const config = buildAuthorizationApplicationConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Mission Description"),
    );
    const headings = section!.content
      .filter((c) => c.type === "heading")
      .map((c: any) => c.value);
    expect(headings).toContain("3.3 Services to be Provided");
  });

  it("includes space segment with optional fields", () => {
    const data = makeData({
      spaceSegment: {
        ...makeData().spaceSegment,
        manufacturer: "SSTL",
        dimensions: "10x10x30 cm",
        hasPropulsion: true,
        propulsionType: "Electric",
        frequencies: ["UHF", "S-band"],
      },
    });
    const config = buildAuthorizationApplicationConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Space Segment"),
    );
    const kvBlocks = section!.content.filter(
      (c) => c.type === "keyValue",
    ) as any[];
    const detailKeys = kvBlocks[0].items.map((i: any) => i.key);
    expect(detailKeys).toContain("Manufacturer");
    expect(detailKeys).toContain("Dimensions");
  });

  it("includes frequencies section when provided", () => {
    const data = makeData({
      spaceSegment: {
        ...makeData().spaceSegment,
        frequencies: ["UHF"],
      },
    });
    const config = buildAuthorizationApplicationConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Space Segment"),
    );
    const headings = section!.content
      .filter((c) => c.type === "heading")
      .map((c: any) => c.value);
    expect(headings).toContain("4.5 Radio Frequencies");
  });

  it("includes ground segment with optional fields", () => {
    const data = makeData({
      groundSegment: {
        ...makeData().groundSegment,
        backupControlCenter: "Munich, Germany",
        dataProcessingLocation: "Frankfurt, Germany",
      },
    });
    const config = buildAuthorizationApplicationConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Ground Segment"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const keys = kv.items.map((i: any) => i.key);
    expect(keys).toContain("Backup Control Center");
    expect(keys).toContain("Data Processing Location");
  });

  it("builds compliance documentation table with correct statuses", () => {
    const config = buildAuthorizationApplicationConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Compliance Documentation"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows).toHaveLength(7);
    expect(table.rows[0][1]).toContain("Attached");
    expect(table.rows[1][1]).toContain("Pending");
    expect(table.rows[3][1]).toBe("N/A");
  });

  it("builds EU Space Act checklist sections", () => {
    const config = buildAuthorizationApplicationConfig(makeData());
    const checklistSections = config.sections.filter((s) =>
      s.title.includes("Section 8:"),
    );
    expect(checklistSections).toHaveLength(1);
  });

  it("truncates long checklist requirement text", () => {
    const data = makeData({
      euSpaceActChecklist: [
        {
          category: "Auth",
          items: [
            {
              requirement: "A".repeat(50),
              articleRef: "Art. 8",
              status: "yes",
              notes: "B".repeat(30),
            },
          ],
        },
      ],
    });
    const config = buildAuthorizationApplicationConfig(data);
    const checklistSection = config.sections.find((s) =>
      s.title.includes("Section 8:"),
    );
    const table = checklistSection!.content.find(
      (c) => c.type === "table",
    ) as any;
    expect(table.rows[0][0]).toContain("...");
    expect(table.rows[0][3]).toContain("B");
  });

  it("builds declarations with checked/unchecked markers", () => {
    const config = buildAuthorizationApplicationConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Declarations"),
    );
    const list = section!.content.find((c) => c.type === "list") as any;
    expect(list.items).toHaveLength(6);
    expect(list.items[0]).toContain("\u2713");
  });

  it("shows unchecked declarations", () => {
    const data = makeData({
      declarations: {
        accuracyDeclaration: false,
        complianceCommitment: false,
        changeNotificationCommitment: false,
        supervisoryCooperation: false,
        dataProtectionCompliance: false,
        sanctionsCompliance: false,
      },
    });
    const config = buildAuthorizationApplicationConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Declarations"),
    );
    const list = section!.content.find((c) => c.type === "list") as any;
    expect(list.items[0]).toContain("\u2610");
  });

  it("includes application fee section when fee provided", () => {
    const data = makeData({
      applicationFee: {
        amount: "5000",
        currency: "EUR",
        paymentMethod: "Bank Transfer",
        paymentReference: "PAY-001",
      },
    });
    const config = buildAuthorizationApplicationConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Application Fee"),
    );
    expect(section).toBeDefined();
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const ref = kv.items.find((i: any) => i.key === "Payment Reference");
    expect(ref.value).toBe("PAY-001");
  });

  it("omits application fee section when not provided", () => {
    const config = buildAuthorizationApplicationConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Application Fee"),
    );
    expect(section).toBeUndefined();
  });

  it("includes signature section", () => {
    const config = buildAuthorizationApplicationConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Certification & Signature"),
    );
    expect(section).toBeDefined();
  });
});

describe("AuthorizationApplicationPDF component", () => {
  it("renders without errors", () => {
    const element = React.createElement(AuthorizationApplicationPDF, {
      data: makeData(),
    });
    expect(element).toBeTruthy();
  });

  it("renders the header title via BaseReport", () => {
    const { container } = render(
      <AuthorizationApplicationPDF data={makeData()} />,
    );
    expect(container.textContent).toContain(
      "Space Activity Authorization Application",
    );
  });

  it("renders section content from the config", () => {
    const { container } = render(
      <AuthorizationApplicationPDF data={makeData()} />,
    );
    expect(container.textContent).toContain("Application Summary");
    expect(container.textContent).toContain("SpaceCo Ltd");
  });

  it("renders footer confidentiality notice", () => {
    const { container } = render(
      <AuthorizationApplicationPDF data={makeData()} />,
    );
    expect(container.textContent).toContain("CONFIDENTIAL");
  });

  it("renders with all optional fields populated", () => {
    const data = makeData({
      applicant: {
        ...makeData().applicant,
        tradingName: "SpaceCo",
        operationalAddress: "Munich",
        website: "https://spaceco.eu",
        parentCompany: "MegaCorp",
        ultimateBeneficialOwners: ["Owner A"],
      },
      operatorQualification: {
        ...makeData().operatorQualification,
        qualityManagementSystem: "ISO 9001",
      },
      missionDetails: {
        ...makeData().missionDetails,
        servicesToBeProvided: ["Data service"],
      },
      spaceSegment: {
        ...makeData().spaceSegment,
        manufacturer: "SSTL",
        dimensions: "10x10x30 cm",
        hasPropulsion: true,
        propulsionType: "Electric",
        frequencies: ["UHF"],
      },
      groundSegment: {
        ...makeData().groundSegment,
        backupControlCenter: "Munich",
        dataProcessingLocation: "Frankfurt",
      },
      applicationFee: {
        amount: "5000",
        currency: "EUR",
        paymentMethod: "Transfer",
        paymentReference: "PAY-001",
      },
    });
    const { container } = render(<AuthorizationApplicationPDF data={data} />);
    expect(container.textContent).toContain("SpaceCo");
    expect(container.textContent).toContain("Application Fee");
  });
});
