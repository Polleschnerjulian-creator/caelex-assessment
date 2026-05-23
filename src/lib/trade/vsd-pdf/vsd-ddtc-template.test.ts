/**
 * Tests for src/lib/trade/vsd-pdf/vsd-ddtc-template.ts (DDTC § 127.12).
 *
 * Caelex Trade Sprint Z6d (Tier 5). Coverage (7 cases):
 *   1. Builder produces the canonical DDTC section sequence
 *   2. Initial notification section anchors at § 127.12(c)(1) + the 60-day clock
 *   3. ITAR predicate surfaces the USML category
 *   4. Circumstances section anchors at § 127.12(b)
 *   5. Parties section names the foreign end-user + countdown of intermediaries
 *   6. Corrective-measures section anchors at § 127.12(b)(2)
 *   7. PDF renderer returns a non-empty Buffer that starts with %PDF-
 */

import { describe, it, expect } from "vitest";
import { buildVsdDdtcDocument } from "./vsd-ddtc-template";
import { renderVsdPdf } from "./vsd-pdf-renderer";
import type { VsdBuilderInput, VsdSection } from "./vsd-shared";

// ─── Fixtures ───────────────────────────────────────────────────────

function baseInput(overrides: Partial<VsdBuilderInput> = {}): VsdBuilderInput {
  return {
    vsd: {
      id: "vsd_ddtc_test_1",
      authority: "DDTC",
      violationType: "DEEMED_EXPORT",
      title: "Foreign-national engineer accessed USML XV(e) source code",
      description:
        "A foreign-national software engineer (FR citizenship, on a " +
        "B-1 visa) accessed unreleased flight-software source code " +
        "classified under USML category XV(e) without a DSP-5 license " +
        "on file. The deemed export persisted for approximately three " +
        "weeks before the access control was rectified.",
      discoveredAt: new Date("2026-04-25T00:00:00Z"),
      occurredAt: new Date("2026-03-30T00:00:00Z"),
      status: "DRAFTED",
      filingReference: null,
      submittedAt: null,
      notes: "Privileged — counsel preparing the 60-day full disclosure.",
    },
    counterparty: {
      legalName: "Internal — no foreign counterparty",
      tradeName: null,
      countryCode: "US",
      addressLines: ["1500 California St", "Mountain View, CA 94043", "USA"],
    },
    operation: null,
    item: {
      name: "Mission Computer Flight Software (FCS-2)",
      internalSku: "FCS-2-SRC",
      eccnEU: null,
      eccnUS: null,
      usmlCategory: "XV(e)",
    },
    filerOrgName: "Caelex Trade Demo Corp.",
    ...overrides,
  };
}

function getSection(
  doc: ReturnType<typeof buildVsdDdtcDocument>,
  id: string,
): VsdSection | undefined {
  return doc.sections.find((s) => s.id === id);
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("buildVsdDdtcDocument", () => {
  it("produces the canonical DDTC section sequence", () => {
    const doc = buildVsdDdtcDocument(baseInput());
    expect(doc.sections.map((s) => s.id)).toEqual([
      "header",
      "addressee",
      "initial_notification",
      "registrant",
      "itar_predicate",
      "circumstances",
      "classification_license",
      "parties",
      "corrective_measures",
      "certification",
    ]);
    expect(doc.title).toBe("DDTC Voluntary Disclosure");
    expect(doc.jurisdiction).toBe("ddtc");
    expect(doc.documentCode).toContain("DDTC");
    expect(doc.documentCode).toContain("127.12");
  });

  it("anchors the initial notification at § 127.12(c)(1) with the 60-day clock", () => {
    const doc = buildVsdDdtcDocument(baseInput());
    const initial = getSection(doc, "initial_notification");
    expect(initial).toBeDefined();
    expect(initial?.title).toContain("§ 127.12(c)(1)");
    expect(initial?.paragraph).toContain("60 calendar days");
  });

  it("surfaces the USML category in the ITAR predicate section", () => {
    const doc = buildVsdDdtcDocument(baseInput());
    const predicate = getSection(doc, "itar_predicate");
    expect(predicate).toBeDefined();
    expect(
      predicate?.fields.find((f) => f.label === "USML category at issue")
        ?.value,
    ).toBe("XV(e)");
    const article = predicate?.fields.find(
      (f) => f.label === "Defense article / service / technical data",
    );
    expect(article?.value).toContain("Mission Computer Flight Software");
  });

  it("anchors the circumstances section at § 127.12(b)", () => {
    const doc = buildVsdDdtcDocument(baseInput());
    const circumstances = getSection(doc, "circumstances");
    expect(circumstances).toBeDefined();
    expect(circumstances?.title).toContain("§ 127.12(b)");
    expect(circumstances?.paragraph).toContain("§ 127.12(b)");
    const narrative = circumstances?.fields.find(
      (f) => f.label === "Narrative of circumstances",
    );
    expect(narrative?.value).toContain("foreign-national");
    expect(narrative?.value).toContain("XV(e)");
  });

  it("parties section names the foreign end-user when present and falls back when not", () => {
    const doc = buildVsdDdtcDocument(baseInput());
    const parties = getSection(doc, "parties");
    expect(parties).toBeDefined();
    const bulletText = parties?.bullets?.join(" ") ?? "";
    expect(bulletText).toContain("Internal — no foreign counterparty");
    // Deemed-export hint should be in the standing bullets.
    expect(bulletText).toContain("foreign-person employees");

    // Drop counterparty — should fall back to a placeholder bullet.
    const doc2 = buildVsdDdtcDocument(baseInput({ counterparty: null }));
    const parties2 = getSection(doc2, "parties");
    const bulletText2 = parties2?.bullets?.join(" ") ?? "";
    expect(bulletText2).toContain("[to be completed");
  });

  it("corrective-measures section anchors at § 127.12(b)(2)", () => {
    const doc = buildVsdDdtcDocument(baseInput());
    const corrective = getSection(doc, "corrective_measures");
    expect(corrective).toBeDefined();
    expect(corrective?.paragraph).toContain("§ 127.12(b)(2)");
    // Reference to DDTC Compliance Program Guidelines (May 2022).
    expect(corrective?.paragraph).toContain("Compliance Program Guidelines");
  });
});

describe("renderVsdPdf (DDTC)", () => {
  it("returns a non-empty PDF Buffer that starts with %PDF-", () => {
    const doc = buildVsdDdtcDocument(baseInput());
    const pdf = renderVsdPdf(doc);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
  });
});
