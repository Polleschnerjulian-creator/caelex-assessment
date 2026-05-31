/**
 * Tests for src/lib/trade/euc/annex-iiia-template.ts and ./annex-iiia-pdf.ts
 *
 * Caelex Trade Sprint Z6 (Tier 5). Coverage (7 cases):
 *   1. Builder produces the canonical Annex IIIa section sequence
 *   2. All required Annex IIIa sections are present (importer,
 *      end-user, goods, end-use, re-export prohibition, signature)
 *   3. End-user "Same as importer" when operation.endUserName is empty
 *   4. Custom end-user copied through when distinct from importer
 *   5. Blanket EUC (no operation) still produces a valid template
 *   6. Goods bullets enumerate every operation line
 *   7. PDF renderer returns a non-empty Buffer for a populated doc
 */

import { describe, it, expect } from "vitest";
import {
  buildAnnexIIIaDocument,
  type AnnexEUCInput,
  type AnnexSection,
  type AnnexSectionId,
} from "./annex-iiia-template";
import { renderAnnexIIIaPdf } from "./annex-iiia-pdf";

// ─── Fixtures ───────────────────────────────────────────────────────

function baseEucInput(overrides: Partial<AnnexEUCInput> = {}): AnnexEUCInput {
  return {
    euc: {
      id: "euc_test_1",
      formType: "BAFA_C1",
      status: "REQUESTED",
      requestedAt: new Date("2026-05-22T00:00:00Z"),
      sentAt: null,
      receivedAt: null,
      validatedAt: null,
      validUntil: new Date("2027-05-22T00:00:00Z"),
      notes: null,
    },
    counterparty: {
      legalName: "Hellenic Avionics S.A.",
      tradeName: "HelAv",
      countryCode: "GR",
      addressLines: ["Mesogeion 12", "11526 Athens", "Greece"],
    },
    operation: {
      reference: "ISAR-2026-Q1-001",
      description: "Integration of S-band TT&C transceivers into GEO bus.",
      shipToCountry: "GR",
      endUseCountry: "GR",
      declaredEndUse: "CIVIL",
      endUserName: null,
      endUserSector: "Commercial satellite communications",
      lines: [
        {
          itemName: "S-band Transceiver Mk II",
          internalSku: "SBT-MK2",
          description: "On-board TT&C transceiver",
          quantity: 4,
          eccnEU: "5A001.b.5",
          eccnUS: "5A001.b.5",
          usmlCategory: null,
        },
        {
          itemName: "Cryogenic Filter Bank",
          internalSku: "CFB-001",
          description: "Helium-cooled RF filter assembly",
          quantity: 2,
          eccnEU: "3A001.b.4",
          eccnUS: null,
          usmlCategory: null,
        },
      ],
    },
    exporterOrgName: "Caelex Trade GmbH",
    ...overrides,
  };
}

function getSection(
  doc: ReturnType<typeof buildAnnexIIIaDocument>,
  id: AnnexSectionId,
): AnnexSection | undefined {
  return doc.sections.find((s) => s.id === id);
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("buildAnnexIIIaDocument", () => {
  it("produces the canonical Annex IIIa section sequence", () => {
    const doc = buildAnnexIIIaDocument(baseEucInput());
    const ids = doc.sections.map((s) => s.id);
    expect(ids).toEqual([
      "header",
      "exporter",
      "importer",
      "end_user",
      "goods",
      "end_use_statement",
      "no_diversion",
      "re_export_prohibition",
      "signature",
    ]);
    expect(doc.title).toBe("End-Use Certificate");
    expect(doc.documentCode).toContain("EU 2021/821 — Annex IIIa");
    expect(doc.formType).toBe("BAFA_C1");
    expect(doc.preparedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(doc.validUntil).toBe("2027-05-22");
  });

  it("includes all required Annex IIIa sections with expected fields", () => {
    const doc = buildAnnexIIIaDocument(baseEucInput());

    // Importer section: legal name, country, address
    const importer = getSection(doc, "importer");
    expect(importer).toBeDefined();
    const importerFieldLabels = importer?.fields.map((f) => f.label) ?? [];
    expect(importerFieldLabels).toEqual(
      expect.arrayContaining([
        "Legal name",
        "Address",
        "Country of destination",
      ]),
    );
    expect(importer?.fields.find((f) => f.label === "Legal name")?.value).toBe(
      "Hellenic Avionics S.A.",
    );
    expect(
      importer?.fields.find((f) => f.label === "Country of destination")?.value,
    ).toBe("GR");

    // End-user section present
    expect(getSection(doc, "end_user")).toBeDefined();

    // Goods section present + has a bullet entry
    const goods = getSection(doc, "goods");
    expect(goods).toBeDefined();
    expect(goods?.bullets?.length).toBeGreaterThan(0);

    // End-use statement present + declared end-use value populated
    const endUse = getSection(doc, "end_use_statement");
    expect(endUse).toBeDefined();
    expect(
      endUse?.fields.find((f) => f.label === "Declared end-use category")
        ?.value,
    ).toBe("Civilian / commercial");

    // Re-export prohibition section present + 4 explicit bullets
    const reexport = getSection(doc, "re_export_prohibition");
    expect(reexport).toBeDefined();
    expect(reexport?.bullets?.length ?? 0).toBeGreaterThanOrEqual(3);
    // Must mention the Article 11 anchor.
    expect(reexport?.paragraph).toContain("Article 11");

    // Signature section present + signature/date/title field
    const signature = getSection(doc, "signature");
    expect(signature).toBeDefined();
    const sigLabels = signature?.fields.map((f) => f.label) ?? [];
    expect(sigLabels).toEqual(
      expect.arrayContaining([
        "Name of signatory",
        "Title / function",
        "Date of signature",
        "Signature",
      ]),
    );
  });

  it("uses 'Same as importer' when end-user name is missing", () => {
    const input = baseEucInput();
    if (input.operation) {
      input.operation.endUserName = null;
    }
    const doc = buildAnnexIIIaDocument(input);
    const endUser = getSection(doc, "end_user");
    const endUserName = endUser?.fields.find(
      (f) => f.label === "End-user (legal name)",
    )?.value;
    expect(endUserName).toBe("Same as importer");
  });

  it("copies a distinct end-user name through to the section", () => {
    const input = baseEucInput();
    if (input.operation) {
      input.operation.endUserName = "Aegean Aerospace Research Center";
    }
    const doc = buildAnnexIIIaDocument(input);
    const endUser = getSection(doc, "end_user");
    const endUserName = endUser?.fields.find(
      (f) => f.label === "End-user (legal name)",
    )?.value;
    expect(endUserName).toBe("Aegean Aerospace Research Center");
  });

  it("handles a blanket EUC (no operation) without crashing", () => {
    const doc = buildAnnexIIIaDocument(baseEucInput({ operation: null }));
    // Still produces the canonical 9-section structure.
    expect(doc.sections.length).toBe(9);

    // Goods section falls back to a placeholder bullet rather than
    // an empty list.
    const goods = getSection(doc, "goods");
    expect(goods?.bullets?.length).toBeGreaterThan(0);
    expect(goods?.bullets?.[0]).toContain("To be completed");

    // End-use country falls back to the importer's country.
    const endUser = getSection(doc, "end_user");
    expect(
      endUser?.fields.find((f) => f.label === "Country of end-use")?.value,
    ).toBe("GR");

    // Operation-reference field reflects the blanket nature.
    expect(
      goods?.fields.find((f) => f.label === "Operation reference")?.value,
    ).toBe("Blanket certificate");
  });

  it("enumerates every operation line in the goods section", () => {
    const doc = buildAnnexIIIaDocument(baseEucInput());
    const goods = getSection(doc, "goods");
    expect(goods?.bullets?.length).toBe(2);
    expect(goods?.bullets?.[0]).toContain("S-band Transceiver Mk II");
    expect(goods?.bullets?.[0]).toContain("EU Annex I 5A001.b.5");
    expect(goods?.bullets?.[1]).toContain("Cryogenic Filter Bank");
    expect(goods?.bullets?.[1]).toContain("EU Annex I 3A001.b.4");
  });
});

// ─── T-H11: humanEndUse must map real TradeEndUseClass values ─────────────────
// Tests go through buildAnnexIIIaDocument because humanEndUse is not exported.
// The rendered "Declared end-use category" field value is what appears on the
// legally-signed Annex IIIa EUC, so it must never contain raw SCREAMING_SNAKE.

describe("humanEndUse (T-H11) — end-use label rendering", () => {
  function endUseLabelFor(declaredEndUse: string): string | null | undefined {
    const input = baseEucInput();
    if (input.operation) {
      input.operation.declaredEndUse = declaredEndUse;
    }
    const doc = buildAnnexIIIaDocument(input);
    const endUseSection = doc.sections.find(
      (s) => s.id === "end_use_statement",
    );
    return endUseSection?.fields.find(
      (f) => f.label === "Declared end-use category",
    )?.value;
  }

  it("CIVIL → human label (regression guard)", () => {
    expect(endUseLabelFor("CIVIL")).toBe("Civilian / commercial");
  });

  it("MILITARY → human label (regression guard)", () => {
    expect(endUseLabelFor("MILITARY")).toBe("Military");
  });

  it("UNKNOWN → human label (regression guard)", () => {
    expect(endUseLabelFor("UNKNOWN")).toBe("Not yet determined");
  });

  it("DUAL_USE → contains 'dual-use', not the raw enum token", () => {
    const label = endUseLabelFor("DUAL_USE");
    expect(label).toContain("dual-use");
    expect(label).not.toBe("DUAL_USE");
    expect(label).not.toContain("_");
  });

  it("WMD_RELATED → contains 'WMD', not the raw enum token", () => {
    const label = endUseLabelFor("WMD_RELATED");
    expect(label).toContain("WMD");
    expect(label).not.toBe("WMD_RELATED");
    // Raw SCREAMING_SNAKE must not appear on the signed certificate.
    expect(label).not.toMatch(/^WMD_RELATED$/);
  });

  it("RESEARCH (BAFA superset) → human label", () => {
    const label = endUseLabelFor("RESEARCH");
    expect(label).toBe("Research");
  });

  it("GOVERNMENT (BAFA superset) → human label", () => {
    const label = endUseLabelFor("GOVERNMENT");
    expect(label).toBe("Government / institutional");
  });

  it("unknown token (FOO_BAR) → Title Case fallback, no underscores, not all-caps", () => {
    const label = endUseLabelFor("FOO_BAR");
    expect(label).toBe("Foo Bar");
    expect(label).not.toContain("_");
    expect(label).not.toBe("FOO_BAR");
  });
});

describe("renderAnnexIIIaPdf", () => {
  it("returns a non-empty PDF Buffer for a populated document", () => {
    const doc = buildAnnexIIIaDocument(baseEucInput());
    const pdf = renderAnnexIIIaPdf(doc);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    // PDF files always start with "%PDF-".
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    // Sanity check on size: a multi-section A4 doc should easily clear 2 kB.
    expect(pdf.length).toBeGreaterThan(2000);
  });
});
