/**
 * Tests for the quick-check summary PDF module (plan Task 2.4).
 *
 * The content composition is PURE (composeQuickSummaryContent) so the
 * honesty assertions run on structured text — no PDF text extraction:
 *   - rulebook stamp ("Assessed against Caelex Rulebook vX.Y.Z") + every
 *     source line carries an as-of date;
 *   - §7.1 leak guard: no "general approach", no "Art 75a" anywhere;
 *   - honest empties ("not provided") — never fabricated;
 *   - the unknowns SECTION;
 *   - the §6 (7) scope-limiting disclaimer;
 *   - contested positions live in the APPENDIX (founder §11.4);
 *   - NO overall score (no N/100, no "compliance score");
 *   - the withhold guard for incomplete envelopes.
 *
 * buildQuickSummaryPdf is smoke-tested: real PDF bytes, 64-hex SHA-256
 * content hash, deterministic filename — and an honest throw on
 * unrecognizable input (never a fabricated document).
 */

import { describe, it, expect } from "vitest";
import {
  composeQuickSummaryContent,
  buildQuickSummaryPdf,
  type QuickSummaryContent,
} from "./quick-summary.server";
import {
  buildFullQuickResultFixture,
  incompleteFinding,
} from "@/components/assessment/spine/quick-result.fixtures";

const RECIPIENT = { email: "founder@startup.space" };

function fullText(content: QuickSummaryContent): string {
  return [
    content.title,
    content.rulebookStamp,
    content.computedAtLine,
    ...content.preparedForLines,
    ...content.sections.flatMap((s) => [s.heading, ...s.lines]),
    content.disclaimer,
  ].join("\n");
}

function compose(): QuickSummaryContent {
  const content = composeQuickSummaryContent(
    buildFullQuickResultFixture(),
    RECIPIENT,
  );
  if (!content) throw new Error("fixture must compose");
  return content;
}

describe("composeQuickSummaryContent — rulebook stamp + sources", () => {
  it("stamps the rulebook version the verdict was computed against", () => {
    const content = compose();
    expect(content.rulebookStamp).toBe(
      "Assessed against Caelex Rulebook v1.0.0",
    );
  });

  it("lists every rulebook source with an as-of date", () => {
    const content = compose();
    const sources = content.sections.find(
      (s) => s.heading === "Rulebook sources",
    );
    expect(sources).toBeDefined();
    expect(sources!.lines.length).toBeGreaterThan(0);
    for (const line of sources!.lines) {
      expect(line).toMatch(/\(as of \d{4}-\d{2}-\d{2}\)/);
    }
  });

  it("never prints the §7.1-forbidden labels (no 'general approach', no 'Art 75a')", () => {
    const text = fullText(compose());
    expect(text).not.toMatch(/general approach/i);
    expect(text).not.toMatch(/Art\.? 75a/i);
  });
});

describe("composeQuickSummaryContent — honest empties", () => {
  it("prints 'not provided' for a missing company — never a fabricated value", () => {
    const content = compose();
    expect(content.preparedForLines).toContain(
      "Prepared for: founder@startup.space",
    );
    expect(content.preparedForLines).toContain("Company: not provided");
  });

  it("prints the provided company when given", () => {
    const content = composeQuickSummaryContent(buildFullQuickResultFixture(), {
      email: "founder@startup.space",
      company: "Startup Space GmbH",
    });
    expect(content!.preparedForLines).toContain("Company: Startup Space GmbH");
  });
});

describe("composeQuickSummaryContent — result sections", () => {
  it("carries the scope, regime direction and NIS2 needs_clarification (never 'does not apply')", () => {
    const text = fullText(compose());
    expect(text).toMatch(/Dual-use export-control rules can apply/);
    expect(text).toMatch(/Likely light regime — verify group structure/);
    expect(text).toMatch(/needs clarification — an OPEN question/);
    expect(text).not.toMatch(/does not apply/i);
  });

  it("renders per-cluster counts and ONE headline finding each", () => {
    const content = compose();
    const clusters = content.sections.find((s) =>
      s.heading.startsWith("Obligation clusters"),
    );
    expect(clusters).toBeDefined();
    expect(clusters!.heading).toContain("3 identified");
    const text = clusters!.lines.join("\n");
    expect(text).toMatch(
      /Authorisation & registration — 2 applicable · 0 conditional · 0 contested · 0 advisory/,
    );
    expect(text).toMatch(/Operator authorisation is required/);
    // Headlines only — the second cluster finding's body is NOT printed.
    expect(text).not.toMatch(/Space-object registration duties attach/);
    expect(text).toMatch(/1 more obligation identified/);
  });

  it("every printed finding line set carries a legal basis with an as-of date", () => {
    const content = compose();
    const clusters = content.sections.find((s) =>
      s.heading.startsWith("Obligation clusters"),
    )!;
    expect(
      clusters.lines.some((l) =>
        /Legal basis: .+\(as of \d{4}-\d{2}-\d{2}\)/.test(l),
      ),
    ).toBe(true);
  });

  it("renders the unknowns SECTION with priorities and what answering changes", () => {
    const content = compose();
    const unknowns = content.sections.find((s) =>
      s.heading.startsWith("Unknowns to resolve"),
    );
    expect(unknowns).toBeDefined();
    expect(unknowns!.heading).toBe("Unknowns to resolve (2)");
    const text = unknowns!.lines.join("\n");
    expect(text).toMatch(
      /\[HIGH\] Where does your ITU frequency filing stand\?/,
    );
    expect(text).toMatch(/What answering changes: Spectrum is existential/);
    expect(text).toMatch(/\[MEDIUM\] What is your balance-sheet total\?/);
  });

  it("puts the full contested-position table in the APPENDIX (founder §11.4)", () => {
    const content = compose();
    const appendix = content.sections.find((s) =>
      s.heading.startsWith("Appendix — contested legislative positions"),
    );
    expect(appendix).toBeDefined();
    const text = appendix!.lines.join("\n");
    expect(text).toMatch(/Conservative reading:/);
    expect(text).toMatch(/lex specialis/);
    expect(text).toMatch(/resilience chapter deleted; NIS2 extended instead/);
  });

  it("includes the §6 (7) scope-limiting disclaimer verbatim", () => {
    const content = compose();
    expect(content.disclaimer).toBe(
      "This maps the obligations that attach to the facts you provided; it is general information, not legal advice on your specific situation, and does not prove compliance.",
    );
  });
});

describe("composeQuickSummaryContent — honesty invariants", () => {
  it("contains NO overall score (no N/100 figure, no 'compliance score')", () => {
    const text = fullText(compose());
    expect(text).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(text).not.toMatch(/compliance score/i);
    expect(text).not.toMatch(/overall score/i);
  });

  it("withholds an incomplete envelope with an explicit notice — never partially prints it", () => {
    const fixture = buildFullQuickResultFixture();
    (fixture.clusters as Record<string, unknown>[])[0].findings = [
      incompleteFinding(),
    ];
    const content = composeQuickSummaryContent(fixture, RECIPIENT)!;
    const text = fullText(content);
    expect(text).not.toMatch(/Half-baked obligation that must never render/);
    expect(text).toMatch(/\[withheld\]/);
  });

  it("returns null on an unrecognizable stored result — never an empty fabricated document", () => {
    expect(composeQuickSummaryContent(null, RECIPIENT)).toBeNull();
    expect(
      composeQuickSummaryContent({ nonsense: true }, RECIPIENT),
    ).toBeNull();
  });
});

describe("buildQuickSummaryPdf — bytes + self-attesting hash", () => {
  it("renders real PDF bytes with a 64-hex SHA-256 content hash and a dated filename", () => {
    const result = buildQuickSummaryPdf(
      buildFullQuickResultFixture(),
      RECIPIENT,
    );
    expect(result.bytes.length).toBeGreaterThan(500);
    // %PDF magic bytes.
    expect(String.fromCharCode(...result.bytes.slice(0, 5))).toBe("%PDF-");
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.filename).toMatch(
      /^caelex-quick-check-summary-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
  });

  it("throws on an unrecognizable stored result instead of fabricating a document", () => {
    expect(() => buildQuickSummaryPdf({ junk: 1 }, RECIPIENT)).toThrow(
      /refusing to fabricate/,
    );
  });
});
