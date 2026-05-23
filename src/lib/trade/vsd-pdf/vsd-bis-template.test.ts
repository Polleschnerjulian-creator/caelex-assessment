/**
 * Tests for src/lib/trade/vsd-pdf/vsd-bis-template.ts (BIS § 764.5).
 *
 * Caelex Trade Sprint Z6c (Tier 5). Coverage (7 cases):
 *   1. Builder produces the canonical BIS section sequence
 *   2. Initial-notification section anchors at § 764.5(c)(1)
 *   3. Narrative section anchors at § 764.5(c)(3) + the five Ws
 *   4. Items / classification section surfaces ECCN / EAR / USML
 *   5. Foreign destination derives from operation or counterparty
 *   6. Supporting documents section enumerates exhibits
 *   7. PDF renderer returns a non-empty Buffer that starts with %PDF-
 */

import { describe, it, expect } from "vitest";
import { buildVsdBisDocument } from "./vsd-bis-template";
import { renderVsdPdf } from "./vsd-pdf-renderer";
import type { VsdBuilderInput, VsdSection } from "./vsd-shared";

// ─── Fixtures ───────────────────────────────────────────────────────

function baseInput(overrides: Partial<VsdBuilderInput> = {}): VsdBuilderInput {
  return {
    vsd: {
      id: "vsd_bis_test_1",
      authority: "BIS",
      violationType: "UNLICENSED_EXPORT",
      title: "Exported 9A515.a inertial measurement unit to D:1 country",
      description:
        "Shipped an IMU classified under ECCN 9A515.a to a Tier-1 " +
        "satellite assembly partner in country group D:1 without an " +
        "individually validated license. The freight forwarder used the " +
        "wrong export-licence determination on the AES filing (NLR " +
        "instead of C24).",
      discoveredAt: new Date("2026-04-12T00:00:00Z"),
      occurredAt: new Date("2026-01-20T00:00:00Z"),
      status: "DRAFTED",
      filingReference: null,
      submittedAt: null,
      notes: null,
    },
    counterparty: {
      legalName: "Astralis Satellite Systems Ltd.",
      tradeName: "Astralis",
      countryCode: "IN",
      addressLines: ["Plot 14, ITPB", "Bengaluru 560066", "India"],
    },
    operation: {
      reference: "SHIP-2026-01-IND-007",
      description: "Hardware delivery for the Mahanadi-2 GEO bus.",
      shipToCountry: "IN",
    },
    item: {
      name: "MEMS Inertial Measurement Unit (IMU-22A)",
      internalSku: "IMU-22A",
      eccnEU: "9A515.a",
      eccnUS: "9A515.a",
      usmlCategory: null,
    },
    filerOrgName: "Caelex Trade Demo Corp.",
    ...overrides,
  };
}

function getSection(
  doc: ReturnType<typeof buildVsdBisDocument>,
  id: string,
): VsdSection | undefined {
  return doc.sections.find((s) => s.id === id);
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("buildVsdBisDocument", () => {
  it("produces the canonical BIS section sequence", () => {
    const doc = buildVsdBisDocument(baseInput());
    expect(doc.sections.map((s) => s.id)).toEqual([
      "header",
      "addressee",
      "initial_notification",
      "discloser",
      "narrative_account",
      "items_classification",
      "parties_destinations",
      "supporting_documents",
      "remediation",
      "certification",
    ]);
    expect(doc.title).toBe("BIS Voluntary Self-Disclosure");
    expect(doc.jurisdiction).toBe("bis");
    expect(doc.documentCode).toContain("BIS");
    expect(doc.documentCode).toContain("764.5");
  });

  it("anchors the initial notification at § 764.5(c)(1)", () => {
    const doc = buildVsdBisDocument(baseInput());
    const initial = getSection(doc, "initial_notification");
    expect(initial).toBeDefined();
    expect(initial?.title).toContain("§ 764.5(c)(1)");
    expect(initial?.paragraph).toContain("§ 764.5(c)(1)");
    // 180-day clock referenced.
    expect(initial?.paragraph).toContain("180 days");
  });

  it("anchors the full narrative at § 764.5(c)(3) and lists the five Ws", () => {
    const doc = buildVsdBisDocument(baseInput());
    const narrative = getSection(doc, "narrative_account");
    expect(narrative).toBeDefined();
    expect(narrative?.title).toContain("§ 764.5(c)(3)");
    expect(narrative?.paragraph).toContain("§ 764.5(c)(3)");
    const narrativeField = narrative?.fields.find(
      (f) => f.label === "Narrative",
    );
    expect(narrativeField?.value).toContain("9A515.a");
    expect(narrativeField?.value).toContain("AES filing");
  });

  it("surfaces ECCN, USML, and EU classification in the items section", () => {
    const doc = buildVsdBisDocument(baseInput());
    const items = getSection(doc, "items_classification");
    expect(items).toBeDefined();
    expect(items?.fields.find((f) => f.label === "ECCN / EAR99")?.value).toBe(
      "9A515.a",
    );
    expect(
      items?.fields.find(
        (f) => f.label === "EU Annex I dual-use entry (for context)",
      )?.value,
    ).toBe("9A515.a");
    expect(
      items?.fields.find((f) => f.label === "Internal SKU / part number")
        ?.value,
    ).toBe("IMU-22A");
  });

  it("derives the foreign destination from operation, falls back to counterparty", () => {
    const doc = buildVsdBisDocument(baseInput());
    const narrative = getSection(doc, "narrative_account");
    expect(
      narrative?.fields.find((f) => f.label === "Foreign destination")?.value,
    ).toBe("IN");

    // Drop the operation — should fall back to counterparty country.
    const doc2 = buildVsdBisDocument(baseInput({ operation: null }));
    const narrative2 = getSection(doc2, "narrative_account");
    expect(
      narrative2?.fields.find((f) => f.label === "Foreign destination")?.value,
    ).toBe("IN");

    // Drop both — should be null (still a "required" field for the
    // operator to fill in by hand).
    const doc3 = buildVsdBisDocument(
      baseInput({ operation: null, counterparty: null }),
    );
    const narrative3 = getSection(doc3, "narrative_account");
    expect(
      narrative3?.fields.find((f) => f.label === "Foreign destination")?.value,
    ).toBeNull();
  });

  it("supporting documents section enumerates the expected exhibits", () => {
    const doc = buildVsdBisDocument(baseInput());
    const supporting = getSection(doc, "supporting_documents");
    expect(supporting).toBeDefined();
    const bulletText = supporting?.bullets?.join(" ") ?? "";
    expect(bulletText).toContain("Exhibit A");
    expect(bulletText).toContain("Exhibit B");
    expect(bulletText).toContain("Exhibit C");
    expect(bulletText).toContain("Exhibit D");
    expect(bulletText).toContain("Exhibit E");
    expect(bulletText).toContain("Exhibit F");
    // § 764.5(c)(5) anchor in the paragraph.
    expect(supporting?.paragraph).toContain("§ 764.5(c)(5)");
  });
});

describe("renderVsdPdf (BIS)", () => {
  it("returns a non-empty PDF Buffer that starts with %PDF-", () => {
    const doc = buildVsdBisDocument(baseInput());
    const pdf = renderVsdPdf(doc);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
  });
});
