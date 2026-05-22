/**
 * Sprint Z23b — Tests for the USML Category XV(e) enumeration.
 *
 * Contract enforced by these tests:
 *
 *   1. Paragraph format — every entry uses `XV(e)(N)` or
 *      `XV(e)(N)(i|ii|iii)` exactly. The regex is the source of truth
 *      for the cascade and matcher, which match paragraph codes by
 *      exact string equality.
 *   2. Uniqueness — no two entries share a paragraph code.
 *   3. Completeness — each entry has a non-empty title and description.
 *   4. See-through trigger — exactly one entry, XV(e)(17), is flagged
 *      `isSeeThroughTrigger: true`. Z18 cascade depends on this
 *      invariant.
 *   5. Coverage threshold — ≥ 17 entries (the Living Execution Plan
 *      § 7 Z23b acceptance criterion).
 *   6. Lookup helpers — `findUsmlXvEEntry` and
 *      `getSeeThroughTriggerParagraph` behave correctly.
 *   7. Staleness — the file's `asOfDate` is within 365 days of today,
 *      matching the staleness gate used by other classification files.
 */

import { describe, it, expect } from "vitest";

import {
  USML_XV_E_ENUMERATION,
  USML_XV_E_BY_PARAGRAPH,
  USML_XV_E_AS_OF_DATE,
  findUsmlXvEEntry,
  getSeeThroughTriggerParagraph,
  getUsmlXvESourceCitation,
} from "./usml-xv-e";

// ─── 1. Paragraph format ──────────────────────────────────────────────

describe("USML XV(e) — paragraph format", () => {
  it("every entry uses the format XV(e)(N) or XV(e)(N)(i|ii|iii)", () => {
    const paragraphPattern = /^XV\(e\)\(\d+\)(\((i|ii|iii)\))?$/;
    for (const entry of USML_XV_E_ENUMERATION) {
      expect(
        paragraphPattern.test(entry.paragraph),
        `paragraph '${entry.paragraph}' does not match format XV(e)(N) or XV(e)(N)(i|ii|iii)`,
      ).toBe(true);
    }
  });
});

// ─── 2. Uniqueness ────────────────────────────────────────────────────

describe("USML XV(e) — uniqueness", () => {
  it("no two entries share a paragraph code", () => {
    const codes = USML_XV_E_ENUMERATION.map((e) => e.paragraph);
    const unique = new Set(codes);
    expect(
      unique.size,
      `duplicate paragraph codes detected — total ${codes.length}, unique ${unique.size}`,
    ).toBe(codes.length);
  });

  it("the by-paragraph index covers every entry exactly once", () => {
    expect(Object.keys(USML_XV_E_BY_PARAGRAPH).length).toBe(
      USML_XV_E_ENUMERATION.length,
    );
    for (const entry of USML_XV_E_ENUMERATION) {
      expect(USML_XV_E_BY_PARAGRAPH[entry.paragraph]).toBe(entry);
    }
  });
});

// ─── 3. Completeness ──────────────────────────────────────────────────

describe("USML XV(e) — completeness", () => {
  it("every entry has a non-empty title (≤ 100 chars) and description", () => {
    for (const entry of USML_XV_E_ENUMERATION) {
      expect(entry.title, `title for ${entry.paragraph}`).toBeTruthy();
      expect(
        entry.title.length,
        `title for ${entry.paragraph} exceeds 100 chars`,
      ).toBeLessThanOrEqual(100);
      expect(
        entry.description,
        `description for ${entry.paragraph}`,
      ).toBeTruthy();
      // Descriptions should be operator-facing prose, not single
      // words — require at least 40 chars so the test catches
      // accidental empty-stubs.
      expect(
        entry.description.length,
        `description for ${entry.paragraph} is shorter than 40 chars`,
      ).toBeGreaterThanOrEqual(40);
    }
  });
});

// ─── 4. See-through trigger (XV(e)(17)) ───────────────────────────────

describe("USML XV(e) — see-through trigger", () => {
  it("XV(e)(17) is flagged isSeeThroughTrigger: true", () => {
    const xve17 = findUsmlXvEEntry("XV(e)(17)");
    expect(xve17, "XV(e)(17) must exist in the enumeration").toBeDefined();
    expect(xve17!.isSeeThroughTrigger).toBe(true);
  });

  it("exactly one paragraph is flagged as see-through trigger", () => {
    const triggers = USML_XV_E_ENUMERATION.filter(
      (e) => e.isSeeThroughTrigger === true,
    );
    expect(
      triggers.length,
      `expected exactly one see-through trigger paragraph, found ${triggers.length}`,
    ).toBe(1);
    expect(triggers[0].paragraph).toBe("XV(e)(17)");
  });

  it("getSeeThroughTriggerParagraph returns XV(e)(17)", () => {
    const trigger = getSeeThroughTriggerParagraph();
    expect(trigger.paragraph).toBe("XV(e)(17)");
    expect(trigger.isSeeThroughTrigger).toBe(true);
  });
});

// ─── 5. Coverage threshold (≥ 17 entries) ─────────────────────────────

describe("USML XV(e) — coverage threshold", () => {
  it("contains at least 17 enumerated paragraphs", () => {
    // Z23b acceptance: full enumeration of XV(e). 17 is the floor;
    // the file currently ships ≥ 20 entries (parent paragraphs plus
    // (11)(i)–(iii) sub-paragraphs).
    expect(USML_XV_E_ENUMERATION.length).toBeGreaterThanOrEqual(17);
  });

  it("covers all canonical XV(e) sub-paragraphs called out in the build plan", () => {
    const required = [
      "XV(e)(1)", // batteries
      "XV(e)(2)", // optics
      "XV(e)(3)", // FPAs > 900 nm
      "XV(e)(4)", // cryocoolers
      "XV(e)(5)", // vibration suppression
      "XV(e)(6)", // optical bench
      "XV(e)(7)", // directed-energy weapons
      "XV(e)(8)", // rad-hard electronics
      "XV(e)(9)", // atomic clocks
      "XV(e)(10)", // ADCS geolocation
      "XV(e)(11)", // optical inter-sat comms
      "XV(e)(11)(i)", // NTP reactor
      "XV(e)(11)(ii)", // NTP propellant feed
      "XV(e)(11)(iii)", // NTP thrust chamber
      "XV(e)(12)", // chemical thrusters > 150 lbf
      "XV(e)(13)", // star trackers (baseline)
      "XV(e)(14)", // T/R MMICs
      "XV(e)(15)", // oscillators
      "XV(e)(16)", // star trackers (high slew)
      "XV(e)(17)", // host satellite buses — SEE-THROUGH TRIGGER
      "XV(e)(19)", // re-entry heat shields
      "XV(e)(20)", // propulsion modules
      "XV(e)(21)", // classified catch-all
    ];
    for (const paragraph of required) {
      expect(
        findUsmlXvEEntry(paragraph),
        `expected enumeration to include ${paragraph}`,
      ).toBeDefined();
    }
  });
});

// ─── 6. Lookup helpers ────────────────────────────────────────────────

describe("USML XV(e) — lookup helpers", () => {
  it("findUsmlXvEEntry returns undefined for unknown paragraph codes", () => {
    expect(findUsmlXvEEntry("XV(e)(99)")).toBeUndefined();
    expect(findUsmlXvEEntry("XV(a)(1)")).toBeUndefined();
    expect(findUsmlXvEEntry("9A515.a")).toBeUndefined();
  });

  it("findUsmlXvEEntry returns the entry for known paragraph codes", () => {
    const xve1 = findUsmlXvEEntry("XV(e)(1)");
    expect(xve1).toBeDefined();
    expect(xve1!.title).toMatch(/batter/i);

    const xve17 = findUsmlXvEEntry("XV(e)(17)");
    expect(xve17).toBeDefined();
    expect(xve17!.isSeeThroughTrigger).toBe(true);
  });

  it("getUsmlXvESourceCitation returns the eCFR citation", () => {
    const citation = getUsmlXvESourceCitation();
    expect(citation.source).toMatch(/22\s*CFR/);
    expect(citation.source).toMatch(/Category\s+XV/i);
    expect(citation.url).toMatch(/^https:\/\/www\.ecfr\.gov\//);
    expect(citation.asOfDate).toBe(USML_XV_E_AS_OF_DATE);
  });
});

// ─── 7. Staleness gate ────────────────────────────────────────────────

describe("USML XV(e) — staleness gate", () => {
  it("the file's asOfDate is within 365 days of today", () => {
    const d = new Date();
    d.setDate(d.getDate() - 365);
    const threshold = d.toISOString().slice(0, 10);
    expect(
      USML_XV_E_AS_OF_DATE >= threshold,
      `USML_XV_E_AS_OF_DATE ${USML_XV_E_AS_OF_DATE} is older than 365 days (threshold: ${threshold})`,
    ).toBe(true);
  });

  it("the asOfDate follows ISO-8601 YYYY-MM-DD format", () => {
    expect(USML_XV_E_AS_OF_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
