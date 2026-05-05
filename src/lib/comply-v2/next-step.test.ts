/**
 * Tests for the NextStep derivation engine. Pure function — no mocks
 * needed beyond a ComplianceItem fixture builder.
 *
 * Coverage target: every kind in the NextStepKind union must be
 * reached by at least one test, plus the ATTESTED / EXPIRED /
 * NOT_APPLICABLE terminal cases. The "no opaque status pill" promise
 * of Sprint 1.2 is locked in by the per-status assertions.
 */

import { describe, it, expect } from "vitest";
import { deriveNextStep, NEXT_STEP_ICON_NAMES } from "./next-step";
import type { ComplianceItem, ComplianceStatus, RegulationKey } from "./types";

function makeItem(overrides: Partial<ComplianceItem> = {}): ComplianceItem {
  return {
    id: "DEBRIS:row_1",
    rowId: "row_1",
    regulation: "DEBRIS",
    userId: "user_1",
    requirementId: "Art.7",
    status: "PENDING",
    notes: null,
    evidenceNotes: null,
    targetDate: null,
    updatedAt: new Date("2026-05-01T00:00:00Z"),
    priority: "MEDIUM",
    ...overrides,
  };
}

describe("deriveNextStep — terminal statuses", () => {
  it("ATTESTED → kind=ATTEST, ctaLabel=Open record, slate tone", () => {
    const r = deriveNextStep(makeItem({ status: "ATTESTED" }));
    expect(r.kind).toBe("ATTEST");
    expect(r.ctaLabel).toBe("Open record");
    expect(r.tone).toBe("slate");
    expect(r.selfActionable).toBe(true);
  });

  it("EXPIRED → kind=ATTEST, ctaLabel=Re-attest now, amber tone", () => {
    const r = deriveNextStep(makeItem({ status: "EXPIRED" }));
    expect(r.kind).toBe("ATTEST");
    expect(r.ctaLabel).toBe("Re-attest now");
    expect(r.tone).toBe("amber");
    expect(r.selfActionable).toBe(true);
  });

  it("NOT_APPLICABLE → kind=ATTEST, slate tone, helper mentions N/A", () => {
    const r = deriveNextStep(makeItem({ status: "NOT_APPLICABLE" }));
    expect(r.kind).toBe("ATTEST");
    expect(r.tone).toBe("slate");
    expect(r.helper).toMatch(/not applicable/i);
  });

  it("UNDER_REVIEW → kind=WAIT_FOR_APPROVAL, selfActionable=false", () => {
    const r = deriveNextStep(makeItem({ status: "UNDER_REVIEW" }));
    expect(r.kind).toBe("WAIT_FOR_APPROVAL");
    expect(r.tone).toBe("slate");
    expect(r.selfActionable).toBe(false);
  });
});

describe("deriveNextStep — EVIDENCE_REQUIRED branches by regulation", () => {
  const sentinelBacked: RegulationKey[] = ["CYBERSECURITY", "NIS2", "DEBRIS"];
  const documentBacked: RegulationKey[] = [
    "SPECTRUM",
    "UK_SPACE_ACT",
    "US_REGULATORY",
  ];

  for (const reg of sentinelBacked) {
    it(`${reg} EVIDENCE_REQUIRED → CONNECT_SENTINEL`, () => {
      const r = deriveNextStep(
        makeItem({ regulation: reg, status: "EVIDENCE_REQUIRED" }),
      );
      expect(r.kind).toBe("CONNECT_SENTINEL");
      expect(r.ctaLabel).toBe("Connect Sentinel");
      expect(r.tone).toBe("emerald");
    });
  }

  for (const reg of documentBacked) {
    it(`${reg} EVIDENCE_REQUIRED → UPLOAD_EVIDENCE`, () => {
      const r = deriveNextStep(
        makeItem({ regulation: reg, status: "EVIDENCE_REQUIRED" }),
      );
      expect(r.kind).toBe("UPLOAD_EVIDENCE");
      expect(r.ctaLabel).toBe("Upload evidence");
      expect(r.tone).toBe("emerald");
    });
  }
});

describe("deriveNextStep — PENDING branches by regulation", () => {
  it("UK_SPACE_ACT PENDING → RUN_ASSESSMENT", () => {
    const r = deriveNextStep(
      makeItem({ regulation: "UK_SPACE_ACT", status: "PENDING" }),
    );
    expect(r.kind).toBe("RUN_ASSESSMENT");
    expect(r.ctaLabel).toBe("Start assessment");
  });

  it("EXPORT_CONTROL PENDING → RUN_ASSESSMENT", () => {
    const r = deriveNextStep(
      makeItem({ regulation: "EXPORT_CONTROL", status: "PENDING" }),
    );
    expect(r.kind).toBe("RUN_ASSESSMENT");
  });

  it("CRA PENDING → RUN_ASSESSMENT", () => {
    const r = deriveNextStep(
      makeItem({ regulation: "CRA", status: "PENDING" }),
    );
    expect(r.kind).toBe("RUN_ASSESSMENT");
  });

  it("SPECTRUM PENDING → UPLOAD_EVIDENCE (non-assessment regime)", () => {
    const r = deriveNextStep(
      makeItem({ regulation: "SPECTRUM", status: "PENDING" }),
    );
    expect(r.kind).toBe("UPLOAD_EVIDENCE");
    // Non-urgent → slate tone (PENDING is less acute than EVIDENCE_REQUIRED).
    expect(r.tone).toBe("slate");
  });
});

describe("deriveNextStep — DRAFT branches by content", () => {
  it("DRAFT with notes → REVIEW_DRAFT (Astra-prepared)", () => {
    const r = deriveNextStep(
      makeItem({
        status: "DRAFT",
        notes: "Astra prepared this evidence summary for review.",
      }),
    );
    expect(r.kind).toBe("REVIEW_DRAFT");
    expect(r.ctaLabel).toBe("Review draft");
    expect(r.tone).toBe("emerald");
  });

  it("DRAFT with evidenceNotes only → REVIEW_DRAFT", () => {
    const r = deriveNextStep(
      makeItem({
        status: "DRAFT",
        evidenceNotes: "Telemetry CSV attached, summarized by Astra.",
      }),
    );
    expect(r.kind).toBe("REVIEW_DRAFT");
  });

  it("DRAFT with no content → UPLOAD_EVIDENCE (slate, less urgent)", () => {
    const r = deriveNextStep(
      makeItem({ status: "DRAFT", notes: null, evidenceNotes: null }),
    );
    expect(r.kind).toBe("UPLOAD_EVIDENCE");
    expect(r.tone).toBe("slate");
  });

  it("DRAFT with whitespace-only notes treated as empty", () => {
    const r = deriveNextStep(
      makeItem({ status: "DRAFT", notes: "    \n  ", evidenceNotes: "" }),
    );
    expect(r.kind).toBe("UPLOAD_EVIDENCE");
  });
});

describe("deriveNextStep — universal invariants", () => {
  it("href always points to the item-detail page", () => {
    const item = makeItem({ regulation: "DEBRIS", rowId: "abc-123" });
    const r = deriveNextStep(item);
    expect(r.href).toBe("/dashboard/items/DEBRIS/abc-123");
  });

  it("ctaLabel is ≤ 32 chars (UI no-wrap budget)", () => {
    const allStatuses: ComplianceStatus[] = [
      "PENDING",
      "DRAFT",
      "EVIDENCE_REQUIRED",
      "UNDER_REVIEW",
      "ATTESTED",
      "EXPIRED",
      "NOT_APPLICABLE",
    ];
    const ALL_REGULATIONS: RegulationKey[] = [
      "DEBRIS",
      "CYBERSECURITY",
      "NIS2",
      "CRA",
      "UK_SPACE_ACT",
      "US_REGULATORY",
      "EXPORT_CONTROL",
      "SPECTRUM",
    ];
    for (const status of allStatuses) {
      for (const reg of ALL_REGULATIONS) {
        const r = deriveNextStep(makeItem({ regulation: reg, status }));
        expect(r.ctaLabel.length).toBeLessThanOrEqual(32);
      }
    }
  });

  it("helper is ≤ 90 chars (single-line UI budget)", () => {
    const allStatuses: ComplianceStatus[] = [
      "PENDING",
      "DRAFT",
      "EVIDENCE_REQUIRED",
      "UNDER_REVIEW",
      "ATTESTED",
      "EXPIRED",
      "NOT_APPLICABLE",
    ];
    const ALL_REGULATIONS: RegulationKey[] = [
      "DEBRIS",
      "CYBERSECURITY",
      "NIS2",
      "CRA",
      "UK_SPACE_ACT",
      "US_REGULATORY",
      "EXPORT_CONTROL",
      "SPECTRUM",
    ];
    for (const status of allStatuses) {
      for (const reg of ALL_REGULATIONS) {
        const r = deriveNextStep(makeItem({ regulation: reg, status }));
        expect(r.helper.length).toBeLessThanOrEqual(90);
      }
    }
  });

  it("every NextStepKind has a registered icon name", () => {
    // Sanity: NEXT_STEP_ICON_NAMES covers every kind that
    // deriveNextStep can return.
    const knownKinds = Object.keys(NEXT_STEP_ICON_NAMES);
    expect(knownKinds).toContain("UPLOAD_EVIDENCE");
    expect(knownKinds).toContain("CONNECT_SENTINEL");
    expect(knownKinds).toContain("RUN_ASSESSMENT");
    expect(knownKinds).toContain("REVIEW_DRAFT");
    expect(knownKinds).toContain("ATTEST");
    expect(knownKinds).toContain("REQUEST_FROM_TEAM");
    expect(knownKinds).toContain("WAIT_FOR_APPROVAL");
  });
});

describe("deriveNextStep — pure function (deterministic)", () => {
  it("same item → same result on repeated calls", () => {
    const item = makeItem({
      regulation: "CYBERSECURITY",
      status: "EVIDENCE_REQUIRED",
    });
    const a = deriveNextStep(item);
    const b = deriveNextStep(item);
    expect(a).toEqual(b);
  });

  it("does not mutate the input item", () => {
    const item = makeItem({ regulation: "DEBRIS", status: "DRAFT" });
    // structuredClone preserves Date instances (unlike JSON-roundtrip
    // which serialises them to strings, breaking deep-equal).
    const snapshot = structuredClone(item);
    deriveNextStep(item);
    expect(item).toEqual(snapshot);
  });
});
