/**
 * Tests for src/lib/trade/vsd-pdf/vsd-ofac-template.ts and the shared
 * jsPDF renderer for OFAC filings.
 *
 * Caelex Trade Sprint Z6b (Tier 5). Coverage (7 cases):
 *   1. Builder produces the canonical OFAC section sequence
 *   2. Section IV "Description" mirrors the operator's narrative
 *   3. Section III "Subject matter" exposes counterparty + item
 *   4. Section V transactions section enumerates known facts
 *   5. Filing reference is rendered when present, placeholder otherwise
 *   6. PDF renderer returns a non-empty Buffer that starts with %PDF-
 *   7. Document code anchors at 31 CFR § 501.806
 */

import { describe, it, expect } from "vitest";
import { buildVsdOfacDocument } from "./vsd-ofac-template";
import { renderVsdPdf } from "./vsd-pdf-renderer";
import type { VsdBuilderInput, VsdSection } from "./vsd-shared";

// ─── Fixtures ───────────────────────────────────────────────────────

function baseInput(overrides: Partial<VsdBuilderInput> = {}): VsdBuilderInput {
  return {
    vsd: {
      id: "vsd_ofac_test_1",
      authority: "OFAC",
      violationType: "PROHIBITED_PARTY",
      title: "Wire to sanctioned bank on 2026-02-14",
      description:
        "Outbound wire of USD 47,300 routed via an intermediary " +
        "correspondent to a Russian bank later identified as an SDN " +
        "match. Pre-screening returned 'no match' due to a stale " +
        "consolidated list snapshot.",
      discoveredAt: new Date("2026-03-02T00:00:00Z"),
      occurredAt: new Date("2026-02-14T00:00:00Z"),
      status: "DRAFTED",
      filingReference: null,
      submittedAt: null,
      notes: "Privileged — counsel reviewing root cause",
    },
    counterparty: {
      legalName: "Volgograd Maritime Trading Co.",
      tradeName: null,
      countryCode: "RU",
      addressLines: ["Ulitsa Lenina 14", "Volgograd 400005", "Russia"],
    },
    operation: {
      reference: "WIRE-2026-02-14-008",
      description: "Trade-finance payment for marine surveying services.",
      shipToCountry: "RU",
    },
    item: null,
    filerOrgName: "Caelex Trade Demo Corp.",
    ...overrides,
  };
}

function getSection(
  doc: ReturnType<typeof buildVsdOfacDocument>,
  id: string,
): VsdSection | undefined {
  return doc.sections.find((s) => s.id === id);
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("buildVsdOfacDocument", () => {
  it("produces the canonical OFAC section sequence", () => {
    const doc = buildVsdOfacDocument(baseInput());
    expect(doc.sections.map((s) => s.id)).toEqual([
      "header",
      "addressee",
      "discloser",
      "subject_matter",
      "description",
      "transactions",
      "remedial_measures",
      "certification",
      "closing",
    ]);
    expect(doc.title).toBe("OFAC Voluntary Self-Disclosure");
    expect(doc.jurisdiction).toBe("ofac");
    expect(doc.documentCode).toContain("OFAC");
    expect(doc.documentCode).toContain("501.806");
    expect(doc.preparedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(doc.filerOrgName).toBe("Caelex Trade Demo Corp.");
  });

  it("mirrors the operator's narrative into the description section", () => {
    const doc = buildVsdOfacDocument(baseInput());
    const description = getSection(doc, "description");
    expect(description).toBeDefined();
    const narrative = description?.fields.find((f) => f.label === "Narrative");
    expect(narrative?.value).toContain("Outbound wire");
    expect(narrative?.value).toContain("SDN match");
    expect(narrative?.required).toBe(true);
  });

  it("exposes counterparty + item facts in the subject-matter section", () => {
    const doc = buildVsdOfacDocument(baseInput());
    const subject = getSection(doc, "subject_matter");
    expect(subject).toBeDefined();
    const counterparty = subject?.fields.find(
      (f) => f.label === "Counterparty",
    );
    expect(counterparty?.value).toContain("Volgograd Maritime Trading Co.");
    expect(counterparty?.value).toContain("RU");
    const violationType = subject?.fields.find(
      (f) => f.label === "Apparent violation type",
    );
    expect(violationType?.value).toContain("prohibited");
  });

  it("enumerates known transaction facts as bullets", () => {
    const doc = buildVsdOfacDocument(baseInput());
    const tx = getSection(doc, "transactions");
    expect(tx).toBeDefined();
    expect(tx?.bullets?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(tx?.bullets?.some((b) => b.includes("WIRE-2026-02-14-008"))).toBe(
      true,
    );
    expect(
      tx?.bullets?.some((b) => b.includes("Volgograd Maritime Trading Co.")),
    ).toBe(true);
    expect(tx?.bullets?.some((b) => b.includes("Ulitsa Lenina 14"))).toBe(true);
  });

  it("renders OFAC filing reference when present, placeholder when null", () => {
    const withRef = buildVsdOfacDocument(
      baseInput({
        vsd: { ...baseInput().vsd, filingReference: "OFAC-VSD-2026-0042" },
      }),
    );
    const headerRef = withRef.sections[0]?.fields.find(
      (f) => f.label === "OFAC case / filing reference",
    );
    expect(headerRef?.value).toBe("OFAC-VSD-2026-0042");

    const noRef = buildVsdOfacDocument(baseInput());
    const headerRef2 = noRef.sections[0]?.fields.find(
      (f) => f.label === "OFAC case / filing reference",
    );
    expect(headerRef2?.value).toContain("[To be assigned");
  });

  it("certification section requires entity, name, title, place, date, signature", () => {
    const doc = buildVsdOfacDocument(baseInput());
    const cert = getSection(doc, "certification");
    expect(cert).toBeDefined();
    const required = cert?.fields.filter((f) => f.required).map((f) => f.label);
    expect(required).toEqual(
      expect.arrayContaining([
        "Certified for (legal entity)",
        "Name of certifying officer",
        "Title / function",
        "Place of signature",
        "Date of signature",
        "Signature",
      ]),
    );
  });
});

describe("renderVsdPdf (OFAC)", () => {
  it("returns a non-empty PDF Buffer that starts with %PDF-", () => {
    const doc = buildVsdOfacDocument(baseInput());
    const pdf = renderVsdPdf(doc);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    // Eight sections of dense content easily clear 2 kB.
    expect(pdf.length).toBeGreaterThan(2000);
  });
});
