/**
 * Task 1.1 — Rulebook semver dataset tests.
 *
 * Codifies the §7.1 source-label corrections as executable assertions so the
 * regulatory errors the spec critique found cannot be recreated:
 *   #1 — the 5 Dec 2025 Council-track text is a Danish PRESIDENCY compromise,
 *        NOT a "Council general approach" (no Council position adopted as of
 *        June 2026).
 *   #2 — "Art 75a" is unverified / likely invented; it must not appear in any
 *        source label or citation.
 *   #7 — the application date is contested THREE ways (Commission 1 Jan 2030,
 *        Commission 1 Jan 2032 second prong, Council/EP 36 months after entry
 *        into force).
 */
import { describe, expect, it } from "vitest";

import { CONTESTED_POSITIONS, RULEBOOK, type RulebookSource } from "./rulebook";

const FORBIDDEN_LABEL_STRINGS = ["general approach", "art 75a", "art. 75a"];

function allSourceText(source: RulebookSource): string {
  return [source.label, source.citation, source.note ?? ""]
    .join(" ")
    .toLowerCase();
}

describe("RULEBOOK (Task 1.1 — §7.1-corrected source dataset)", () => {
  it("(a) version is a semver string", () => {
    expect(RULEBOOK.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("(b) no source label/citation/note contains 'general approach' or 'Art 75a' / 'Art. 75a' (§7.1 #1, #2)", () => {
    for (const source of RULEBOOK.sources) {
      const text = allSourceText(source);
      for (const forbidden of FORBIDDEN_LABEL_STRINGS) {
        expect(
          text.includes(forbidden),
          `source "${source.id}" must not contain "${forbidden}"`,
        ).toBe(false);
      }
    }
  });

  it("(b-supplement) contested-position texts never claim a 'general approach' or 'Art 75a' either", () => {
    const allPositions = [
      ...CONTESTED_POSITIONS.applicationDate,
      ...CONTESTED_POSITIONS.cyberArchitecture,
      ...CONTESTED_POSITIONS.cdrWindow,
    ];
    for (const entry of allPositions) {
      const text = `${entry.source} ${entry.position}`.toLowerCase();
      for (const forbidden of FORBIDDEN_LABEL_STRINGS) {
        expect(
          text.includes(forbidden),
          `contested position "${entry.position}" must not contain "${forbidden}"`,
        ).toBe(false);
      }
    }
  });

  it("(c) the Council-track source is labeled a Presidency compromise and flags that no Council position exists", () => {
    const councilTrack = RULEBOOK.sources.find(
      (s) => s.id === "presidency-compromise",
    );
    expect(councilTrack).toBeDefined();
    expect(councilTrack!.label).toMatch(/presidency compromise/i);
    // §7.1 #1: must not imply a stable Council position exists.
    expect(councilTrack!.label).toMatch(/no council position adopted/i);
  });

  it("(d) every source has an ISO asOf date", () => {
    expect(RULEBOOK.sources.length).toBeGreaterThan(0);
    for (const source of RULEBOOK.sources) {
      expect(
        source.asOf,
        `source "${source.id}" asOf must be ISO yyyy-mm-dd`,
      ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(
        Number.isNaN(Date.parse(source.asOf)),
        `source "${source.id}" asOf must parse as a real date`,
      ).toBe(false);
    }
  });

  it("(d-supplement) source ids are unique and every source carries an explicit verified flag", () => {
    const ids = RULEBOOK.sources.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const source of RULEBOOK.sources) {
      expect(typeof source.verified).toBe("boolean");
      expect(source.label.trim().length).toBeGreaterThan(0);
      expect(source.citation.trim().length).toBeGreaterThan(0);
    }
  });

  it("(e) CONTESTED_POSITIONS.applicationDate has exactly three entries per §7.1 #7", () => {
    const entries = CONTESTED_POSITIONS.applicationDate;
    expect(entries).toHaveLength(3);

    // Commission first prong: 1 January 2030.
    const commission2030 = entries.find(
      (e) => e.source === "com-2025-335" && e.position.includes("2030"),
    );
    expect(commission2030).toBeDefined();

    // Commission second prong: 1 January 2032 for certain assets.
    const commission2032 = entries.find(
      (e) => e.source === "com-2025-335" && e.position.includes("2032"),
    );
    expect(commission2032).toBeDefined();
    expect(commission2032!.position).toMatch(/second prong/i);

    // Council track + EP: 36 months after entry into force.
    const thirtySixMonths = entries.find((e) =>
      e.position.includes("36 months"),
    );
    expect(thirtySixMonths).toBeDefined();
    expect(thirtySixMonths!.source).toBe("presidency-compromise");
  });

  it("(e-supplement) every contested-position source id resolves to a rulebook source", () => {
    const knownIds = new Set(RULEBOOK.sources.map((s) => s.id));
    const allPositions = [
      ...CONTESTED_POSITIONS.applicationDate,
      ...CONTESTED_POSITIONS.cyberArchitecture,
      ...CONTESTED_POSITIONS.cdrWindow,
    ];
    for (const entry of allPositions) {
      expect(
        knownIds.has(entry.source),
        `contested-position source "${entry.source}" must exist in RULEBOOK.sources`,
      ).toBe(true);
    }
  });
});
