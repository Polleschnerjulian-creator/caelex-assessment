/**
 * Tests for src/lib/astra/citation-validator.ts.
 *
 * Coverage:
 *
 *   1. Real EU Space Act articles → verified
 *   2. Hallucinated article numbers (Art. 999) → unverified
 *   3. NIS2 article 21 (in our space-sector index) → verified
 *   4. NIS2 article 9999 → unverified
 *   5. Paragraph + subparagraph captured but don't affect validation
 *   6. Both naming patterns: "EU Space Act Art. X" and "Art. X of EU Space Act"
 *   7. Empty / no-citation text → total=0
 *   8. Multiple citations in a paragraph
 *   9. Mixed verified + unverified in one text
 *  10. Case insensitivity (ART., article, etc.)
 */

import { describe, it, expect } from "vitest";
import { validateCitations } from "./citation-validator";

describe("validateCitations — EU Space Act", () => {
  it("verifies a real article number (Art. 14)", () => {
    const r = validateCitations("Per EU Space Act Art. 14, you must …");
    expect(r.total).toBe(1);
    expect(r.verified).toHaveLength(1);
    expect(r.verified[0].regulation).toBe("eu_space_act");
    expect(r.verified[0].article).toBe("14");
    expect(r.unverified).toHaveLength(0);
  });

  it("flags a hallucinated article number (Art. 999)", () => {
    const r = validateCitations("Per EU Space Act Art. 999, …");
    expect(r.total).toBe(1);
    expect(r.unverified).toHaveLength(1);
    expect(r.unverified[0].article).toBe("999");
  });

  it("captures paragraph + subparagraph but validates only the article", () => {
    const r = validateCitations("EU Space Act Art. 14(2)(a) requires …");
    expect(r.verified).toHaveLength(1);
    expect(r.verified[0].article).toBe("14");
    expect(r.verified[0].paragraph).toBe("2");
    expect(r.verified[0].subparagraph).toBe("a");
  });

  it("accepts the post-positioned form 'Article 6 of the EU Space Act'", () => {
    const r = validateCitations(
      "This is governed by Article 6 of the EU Space Act.",
    );
    expect(r.verified).toHaveLength(1);
    expect(r.verified[0].article).toBe("6");
  });

  it("matches case-insensitively (ART., article, Art.)", () => {
    const r = validateCitations(
      "First per EU SPACE ACT ART. 14, then per EU Space Act Article 6 …",
    );
    expect(r.verified).toHaveLength(2);
  });
});

describe("validateCitations — NIS2", () => {
  it("verifies NIS2 Art. 21(2)(a) (a real article in our index)", () => {
    const r = validateCitations(
      "NIS2 Art. 21(2)(a) requires policy documentation …",
    );
    expect(r.verified).toHaveLength(1);
    expect(r.verified[0].regulation).toBe("nis2");
    expect(r.verified[0].article).toBe("21");
    expect(r.verified[0].paragraph).toBe("2");
    expect(r.verified[0].subparagraph).toBe("a");
  });

  it("flags NIS2 Art. 9999 as unverified", () => {
    const r = validateCitations("NIS2 Art. 9999 says …");
    expect(r.unverified).toHaveLength(1);
    expect(r.unverified[0].article).toBe("9999");
  });

  it("accepts post-positioned 'Art. 21 of NIS2'", () => {
    const r = validateCitations(
      "Under Art. 21 of NIS2, your obligations include …",
    );
    expect(r.verified).toHaveLength(1);
    expect(r.verified[0].regulation).toBe("nis2");
    expect(r.verified[0].article).toBe("21");
  });
});

describe("validateCitations — edge cases", () => {
  it("returns total=0 on text with no citations", () => {
    const r = validateCitations(
      "Compliance is important. Stay safe out there.",
    );
    expect(r.total).toBe(0);
    expect(r.verified).toEqual([]);
    expect(r.unverified).toEqual([]);
  });

  it("returns total=0 on empty string", () => {
    const r = validateCitations("");
    expect(r.total).toBe(0);
  });

  it("captures multiple citations in a single paragraph", () => {
    const r = validateCitations(`
      Per EU Space Act Art. 14, your operator-class triggers
      authorization. NIS2 Art. 21(2)(a) further requires a documented
      security policy. EU Space Act Art. 6 establishes the gatekeeper
      duty.
    `);
    expect(r.total).toBeGreaterThanOrEqual(3);
    expect(r.verified.map((c) => c.article)).toEqual(
      expect.arrayContaining(["14", "21", "6"]),
    );
  });

  it("partitions mixed verified + unverified", () => {
    const r = validateCitations(
      "Per EU Space Act Art. 14 you must comply, and EU Space Act Art. 999 is fake.",
    );
    expect(r.verified.map((c) => c.article)).toContain("14");
    expect(r.unverified.map((c) => c.article)).toContain("999");
  });

  it("does not match generic 'Art. 14' without a regulation name", () => {
    const r = validateCitations("Refer to Art. 14 for details.");
    // No regulation context — must NOT be matched (avoids over-flagging
    // ambiguous prose). Could equally match either side though, so we
    // just assert nothing is captured when no regulation token is near.
    expect(r.total).toBe(0);
  });
});
