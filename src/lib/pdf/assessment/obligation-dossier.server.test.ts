/**
 * Tests for the lawyer-grade obligation-dossier PDF module (plan Task 3.4).
 *
 * The content composition is PURE (composeObligationDossierContent) so the
 * honesty assertions run on structured text — no PDF text extraction
 * (the quick-summary sibling's established pattern):
 *   - rulebook stamp + EVERY rulebook source with its as-of date;
 *   - the FULL check-your-answers echo: every stored answer, including
 *     `{state:"unsure"}` and `{state:"not_asked"}`, rendered AS SUCH, with
 *     question titles resolved from the question graph — counsel verifies
 *     line by line; an answer key the graph no longer knows is echoed
 *     verbatim, never dropped;
 *   - per-finding citations (EVERY cluster finding printed in full — not
 *     headline-only like the quick summary);
 *   - the accuracy-responsibility statement, verbatim;
 *   - the three-text scenario tables (application date × CDR window ×
 *     cyber architecture) in the APPENDIX ONLY (founder §11.4 — the PDF
 *     appendix is the only full-matrix surface);
 *   - NO overall score string anywhere (invariant #6);
 *   - §7.1 leak guard: no "general approach", no "Art 75a";
 *   - the withhold guard for incomplete envelopes.
 *
 * buildObligationDossierPdf is smoke-tested: real PDF bytes, 64-hex SHA-256
 * self-attesting content hash (verdict-dossier pre-footer-stamp pattern),
 * deterministic filename — and an honest throw on unrecognizable input.
 */

import { describe, it, expect } from "vitest";
import {
  composeObligationDossierContent,
  buildObligationDossierPdf,
  ACCURACY_RESPONSIBILITY_STATEMENT,
  type ObligationDossierContent,
} from "./obligation-dossier.server";
import { RULEBOOK } from "@/data/assessment/rulebook";
import {
  buildFullQuickResultFixture,
  incompleteFinding,
} from "@/components/assessment/spine/quick-result.fixtures";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const RECIPIENT = { name: "Ada Lovelace", email: "ada@startup.space" };

const BASIS = {
  label: "EU Space Act proposal — Commission text",
  citation: "COM(2025) 335 Art. 6 (authorisation requirement)",
  asOf: "2025-06-25",
  verified: true,
};

/** The stored FULL-tier ObligationMapResult: the quick fixture's verdict
 *  spine + the optional full-tier readiness/creditMap/roadmap blocks. */
function buildFullResultFixture(): Record<string, unknown> {
  return {
    ...buildFullQuickResultFixture(),
    tier: "full",
    readiness: [
      {
        clusterId: "authorization_registration",
        evidenced: 2,
        undocumented: 1,
        partial: 1,
        missing: 0,
        unsure: 1,
        total: 5,
      },
    ],
    creditMap: [
      {
        source: "ISO/IEC 27001",
        covers: ["risk management", "access control"],
        basis: "Certificate declared — partial NIS2 Art. 21 coverage",
      },
    ],
    roadmap: [
      {
        due: "2026-09-01",
        action: "File the ITU coordination request",
        basis: [BASIS],
      },
      {
        due: "contested",
        action: "Prepare the critical design review package",
        basis: [BASIS],
      },
    ],
  };
}

/** Stored tri-state answers: answered (single + multi), unsure, not_asked,
 *  plus one key the current graph does not know (must never be dropped). */
function buildAnswersFixture(): Record<string, unknown> {
  return {
    q1_1_roles: { state: "answered", value: ["spacecraft_operator"] },
    q1_5_headcount: { state: "answered", value: "h_10_49" },
    q4_8_launching_state: { state: "unsure" },
    q9_2_itu_filing: { state: "unsure" },
    q2_12_human_spaceflight: { state: "not_asked" },
    q_legacy_removed: { state: "answered", value: "legacy-value" },
  };
}

function fullText(content: ObligationDossierContent): string {
  return [
    content.title,
    content.rulebookStamp,
    content.computedAtLine,
    ...content.preparedForLines,
    ...content.provenanceLines,
    ...content.sections.flatMap((s) => [s.heading, ...s.lines]),
    content.disclaimer,
  ].join("\n");
}

function compose(): ObligationDossierContent {
  const content = composeObligationDossierContent(
    buildFullResultFixture(),
    buildAnswersFixture(),
    RECIPIENT,
    { snapshotId: "snap_full_1", profileVersion: 3 },
  );
  if (!content) throw new Error("fixture must compose");
  return content;
}

function sectionByHeading(
  content: ObligationDossierContent,
  prefix: string,
): { heading: string; lines: string[] } {
  const section = content.sections.find((s) => s.heading.startsWith(prefix));
  if (!section) throw new Error(`section not found: ${prefix}`);
  return section;
}

const APPENDIX_PREFIX = "Appendix — contested legislative positions";

/** Every composed line OUTSIDE the appendix (for appendix-ONLY assertions). */
function nonAppendixText(content: ObligationDossierContent): string {
  return [
    content.title,
    content.rulebookStamp,
    content.computedAtLine,
    ...content.preparedForLines,
    ...content.provenanceLines,
    ...content.sections
      .filter((s) => !s.heading.startsWith(APPENDIX_PREFIX))
      .flatMap((s) => [s.heading, ...s.lines]),
    content.disclaimer,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Rulebook stamp + sources
// ─────────────────────────────────────────────────────────────────────────────

describe("composeObligationDossierContent — rulebook stamp + sources", () => {
  it("stamps the rulebook semver the stored verdict was computed against", () => {
    const content = compose();
    expect(content.rulebookStamp).toBe(
      "Assessed against Caelex Rulebook v1.0.0",
    );
  });

  it("lists EVERY rulebook source label with its as-of date", () => {
    const content = compose();
    const sources = sectionByHeading(content, "Rulebook sources");
    expect(sources.lines.length).toBe(RULEBOOK.sources.length);
    for (const src of RULEBOOK.sources) {
      const line = sources.lines.find((l) => l.startsWith(src.label));
      expect(line, `source missing: ${src.id}`).toBeDefined();
      expect(line).toContain(`(as of ${src.asOf})`);
    }
  });

  it("never prints the §7.1-forbidden labels (no 'general approach', no 'Art 75a')", () => {
    const text = fullText(compose());
    expect(text).not.toMatch(/general approach/i);
    expect(text).not.toMatch(/Art\.? 75a/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The FULL check-your-answers echo
// ─────────────────────────────────────────────────────────────────────────────

describe("composeObligationDossierContent — check-your-answers echo", () => {
  it("resolves question titles from the question graph and renders answered option labels", () => {
    const echo = sectionByHeading(compose(), "Check your answers");
    const text = echo.lines.join("\n");
    expect(text).toContain("Which roles describe your organisation?");
    expect(text).toContain("Spacecraft operator");
    expect(text).toContain("Headcount band?");
    expect(text).toContain("10–49");
  });

  it('renders {state:"unsure"} AS unsure — never coerced to a value or a "no"', () => {
    const echo = sectionByHeading(compose(), "Check your answers");
    const text = echo.lines.join("\n");
    expect(text).toContain("Which country is your launch provider from?");
    expect(text).toContain(
      "I'm not sure — recorded as unsure (the verdict takes the conservative reading)",
    );
    // Two unsure answers in the fixture → the marker appears twice.
    expect(
      echo.lines.filter((l) => l.includes("recorded as unsure")).length,
    ).toBe(2);
  });

  it('renders {state:"not_asked"} AS not asked — the skipped branch is explicit', () => {
    const echo = sectionByHeading(compose(), "Check your answers");
    expect(echo.lines.join("\n")).toContain(
      "Not asked — this branch was not part of your assessment path (recorded explicitly)",
    );
  });

  it("echoes an answer key the current graph does not know verbatim — never dropped", () => {
    const echo = sectionByHeading(compose(), "Check your answers");
    const text = echo.lines.join("\n");
    expect(text).toContain(
      "q_legacy_removed (not in the current question graph — echoed verbatim)",
    );
    expect(text).toContain("legacy-value");
  });

  it("echoes EVERY stored answer (one title line + one answer line per entry)", () => {
    const echo = sectionByHeading(compose(), "Check your answers");
    const answerLines = echo.lines.filter((l) =>
      l.trimStart().startsWith("Answer:"),
    );
    expect(answerLines.length).toBe(Object.keys(buildAnswersFixture()).length);
  });

  it("says an empty answers map is empty — not silently omitted", () => {
    const content = composeObligationDossierContent(
      buildFullResultFixture(),
      {},
      RECIPIENT,
    )!;
    const echo = sectionByHeading(content, "Check your answers");
    expect(echo.lines.join("\n")).toContain(
      "No stored answers were found on this profile",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Per-finding citations — every finding, full tier
// ─────────────────────────────────────────────────────────────────────────────

describe("composeObligationDossierContent — obligation map", () => {
  it("prints EVERY cluster finding in full (not headline-only like the quick summary)", () => {
    const map = sectionByHeading(compose(), "Obligation map");
    const text = map.lines.join("\n");
    expect(text).toContain("Operator authorisation is required");
    // The SECOND cluster finding is printed too — the quick summary omits it.
    expect(text).toContain("Space-object registration duties attach");
    expect(text).toContain(
      "Authorisation & registration — 2 applicable · 0 conditional · 0 contested · 0 advisory",
    );
  });

  it("every printed finding carries a legal basis with an as-of date and the rulebook pin", () => {
    const map = sectionByHeading(compose(), "Obligation map");
    const legalBasisLines = map.lines.filter((l) =>
      /^Legal basis: .+\(as of \d{4}-\d{2}-\d{2}\)/.test(l),
    );
    // 3 cluster findings in the fixture, ≥1 source each.
    expect(legalBasisLines.length).toBeGreaterThanOrEqual(3);
    expect(
      map.lines.some((l) => l.includes("computed against rulebook v1.0.0")),
    ).toBe(true);
  });

  it("scope, regime and NIS2 gateway findings carry their citations too", () => {
    const content = compose();
    for (const prefix of [
      "Scope determination",
      "Regime direction",
      "NIS2 gateway",
    ]) {
      const section = sectionByHeading(content, prefix);
      expect(
        section.lines.some((l) =>
          /Legal basis: .+\(as of \d{4}-\d{2}-\d{2}\)/.test(l),
        ),
        `${prefix} must cite`,
      ).toBe(true);
    }
  });

  it("withholds an incomplete envelope with the explicit notice — never partially prints it", () => {
    const fixture = buildFullResultFixture();
    (fixture.clusters as Record<string, unknown>[])[0].findings = [
      incompleteFinding(),
    ];
    const content = composeObligationDossierContent(
      fixture,
      buildAnswersFixture(),
      RECIPIENT,
    )!;
    const text = fullText(content);
    expect(text).not.toMatch(/Half-baked obligation that must never render/);
    expect(text).toMatch(/\[withheld\]/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Full-tier blocks re-stated (readiness / credit map / roadmap)
// ─────────────────────────────────────────────────────────────────────────────

describe("composeObligationDossierContent — full-tier blocks", () => {
  it('re-states readiness as per-cluster "N of M evidenced" bands', () => {
    const readiness = sectionByHeading(compose(), "Readiness");
    expect(readiness.lines.join("\n")).toContain(
      "Authorisation & registration: 2 of 5 evidenced · 1 partial · 0 missing · 1 undocumented · 1 unsure",
    );
  });

  it("re-states the credit map and the roadmap with dated actions", () => {
    const content = compose();
    const credit = sectionByHeading(content, "Credit map");
    expect(credit.lines.join("\n")).toContain(
      "ISO/IEC 27001 — covers: risk management, access control",
    );
    const roadmap = sectionByHeading(content, "Roadmap");
    const text = roadmap.lines.join("\n");
    expect(text).toContain("Due 2026-09-01: File the ITU coordination request");
    expect(text).toMatch(/Legal basis: .+\(as of \d{4}-\d{2}-\d{2}\)/);
  });

  it("a contested roadmap item gets NO fabricated date", () => {
    const roadmap = sectionByHeading(compose(), "Roadmap");
    expect(roadmap.lines.join("\n")).toContain(
      "Due date contested between the legislative texts — no date fabricated",
    );
  });

  it("says when the optional full-tier blocks are absent on the stored result — never synthesises them", () => {
    const fixture = buildFullResultFixture();
    delete fixture.readiness;
    delete fixture.creditMap;
    delete fixture.roadmap;
    const content = composeObligationDossierContent(
      fixture,
      buildAnswersFixture(),
      RECIPIENT,
    )!;
    const text = fullText(content);
    expect(text).toContain(
      "Not present on this stored result — readiness bands are computed on the full tier only.",
    );
    expect(text).toContain(
      "Not present on this stored result — the credit map is computed on the full tier only.",
    );
    expect(text).toContain(
      "Not present on this stored result — the roadmap is computed on the full tier only.",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Accuracy statement + appendix-only scenario tables
// ─────────────────────────────────────────────────────────────────────────────

describe("composeObligationDossierContent — accuracy + appendix", () => {
  it("carries the accuracy-responsibility statement verbatim", () => {
    const accuracy = sectionByHeading(compose(), "Accuracy and responsibility");
    expect(accuracy.lines).toContain(ACCURACY_RESPONSIBILITY_STATEMENT);
  });

  it("renders the THREE scenario tables (application date × CDR window × cyber architecture) in the appendix", () => {
    const appendix = sectionByHeading(compose(), APPENDIX_PREFIX);
    const text = appendix.lines.join("\n");
    expect(text).toContain("Table 1 — Application date");
    expect(text).toContain("Table 2 — Critical design review (CDR) window");
    expect(text).toContain("Table 3 — Cybersecurity architecture");
    // Application-date positions (§7.1 #7 — contested three ways).
    expect(text).toContain("1 January 2030");
    expect(text).toContain("1 January 2032 for certain assets (second prong)");
    expect(text).toContain("36 months after entry into force");
    // CDR-window positions.
    expect(text).toContain("CDR within 12 months of entry into force");
    expect(text).toContain("CDR within 24 months");
    // Cyber-architecture positions.
    expect(text).toContain("lex specialis");
    expect(text).toContain(
      "resilience chapter deleted; NIS2 extended via new Art 117a",
    );
    // Source ids are resolved to their rulebook labels.
    expect(text).toContain("EU Space Act proposal — Commission text:");
    expect(text).toContain("Danish Presidency compromise text");
  });

  it("keeps the full matrix in the appendix ONLY (founder §11.4) — finding lines carry just the collapsed flux summary", () => {
    const content = compose();
    const outside = nonAppendixText(content);
    // Position strings never leak outside the appendix.
    expect(outside).not.toContain("1 January 2030");
    expect(outside).not.toContain("CDR within 24 months");
    expect(outside).not.toContain("Art 117a");
    // The contested finding still points at the appendix, collapsed.
    expect(outside).toContain(
      "contested — conservative reading shown — see the contested-positions appendix.",
    );
    // And the appendix is the LAST section (it is an appendix).
    expect(
      content.sections[content.sections.length - 1].heading.startsWith(
        APPENDIX_PREFIX,
      ),
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Honesty invariants
// ─────────────────────────────────────────────────────────────────────────────

describe("composeObligationDossierContent — honesty invariants", () => {
  it("contains NO overall score string (no N/100 figure, no 'compliance score', no 'overall score')", () => {
    const text = fullText(compose());
    expect(text).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(text).not.toMatch(/compliance score/i);
    expect(text).not.toMatch(/overall score/i);
    expect(text).not.toMatch(/\bscore\b/i);
  });

  it("prints honest empties for a missing recipient — never a fabricated value", () => {
    const content = composeObligationDossierContent(
      buildFullResultFixture(),
      buildAnswersFixture(),
      {},
    )!;
    expect(content.preparedForLines).toContain("Prepared for: not provided");
    expect(content.preparedForLines).toContain("Account email: not provided");
  });

  it("prints the provided recipient + snapshot provenance when given", () => {
    const content = compose();
    expect(content.preparedForLines).toContain("Prepared for: Ada Lovelace");
    expect(content.preparedForLines).toContain(
      "Account email: ada@startup.space",
    );
    expect(content.provenanceLines).toContain("Verdict snapshot: snap_full_1");
    expect(content.provenanceLines).toContain(
      "Computed from profile version 3",
    );
  });

  it('says "None identified" for empty overlaps — never fabricated rows (invariant #4)', () => {
    const overlaps = sectionByHeading(compose(), "Cross-framework overlaps");
    expect(overlaps.lines).toContain("None identified on this result.");
  });

  it("describes the SHA-256 self-attestation in the integrity section", () => {
    const attestation = sectionByHeading(compose(), "Integrity attestation");
    const text = attestation.lines.join("\n");
    expect(text).toContain("SHA-256");
    expect(text).toContain("BEFORE the footer stamp");
  });

  it("includes the §6 (7) scope-limiting disclaimer verbatim", () => {
    expect(compose().disclaimer).toBe(
      "This maps the obligations that attach to the facts you provided; it is general information, not legal advice on your specific situation, and does not prove compliance.",
    );
  });

  it("returns null on an unrecognizable stored result — never an empty fabricated document", () => {
    expect(
      composeObligationDossierContent(null, buildAnswersFixture(), RECIPIENT),
    ).toBeNull();
    expect(
      composeObligationDossierContent(
        { nonsense: true },
        buildAnswersFixture(),
        RECIPIENT,
      ),
    ).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PDF bytes + self-attesting hash (verdict-dossier pattern)
// ─────────────────────────────────────────────────────────────────────────────

describe("buildObligationDossierPdf — bytes + self-attesting hash", () => {
  it("renders real PDF bytes with a 64-hex SHA-256 content hash and a dated filename", () => {
    const result = buildObligationDossierPdf(
      buildFullResultFixture(),
      buildAnswersFixture(),
      RECIPIENT,
      { snapshotId: "snap_full_1", profileVersion: 3 },
    );
    expect(result.bytes.length).toBeGreaterThan(500);
    // %PDF magic bytes.
    expect(String.fromCharCode(...result.bytes.slice(0, 5))).toBe("%PDF-");
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.filename).toMatch(
      /^caelex-obligation-dossier-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
  });

  it("throws on an unrecognizable stored result instead of fabricating a document", () => {
    expect(() => buildObligationDossierPdf({ junk: 1 }, {}, RECIPIENT)).toThrow(
      /refusing to fabricate/,
    );
  });
});
