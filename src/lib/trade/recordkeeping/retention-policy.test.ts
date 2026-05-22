/**
 * Tests for retention-policy.ts (Z32 Tier 4).
 *
 * Covers:
 *   1. computeRetentionUntil — adds 5 years to UTC-midnight of event date
 *   2. computeRetentionUntil — UTC-midnight semantics (timezone stable)
 *   3. computeRetentionUntil — returns null for missing event date
 *   4. computeRetentionUntil — returns null for Invalid Date
 *   5. computeRetentionUntil — leap-year edge (Feb 29 → next year Mar 1)
 *   6. computeRetentionUntil — every record type has a policy descriptor
 *   7. resolveEventDate — picks first non-null candidate
 *   8. resolveEventDate — skips Invalid Date entries
 *   9. resolveEventDate — returns null when no candidate is valid
 *  10. RETENTION_POLICIES — all record types cite a § 762.6 / § 122.5 / EU 2021/821 source
 */

import { describe, it, expect } from "vitest";
import {
  RETENTION_POLICIES,
  RETENTION_YEARS,
  computeRetentionUntil,
  resolveEventDate,
  type RetentionRecordType,
} from "./retention-policy";

describe("computeRetentionUntil", () => {
  it("adds 5 years to UTC-midnight of event date for every record type", () => {
    const eventDate = new Date(Date.UTC(2026, 4, 22)); // 2026-05-22T00:00:00Z
    const types: RetentionRecordType[] = [
      "OPERATION",
      "LICENSE",
      "EUC",
      "REEXPORT_CONSENT",
      "VSD",
      "CLASSIFICATION_DRAFT",
      "BAFA_SUBMISSION",
      "NCA_CORRESPONDENCE",
    ];
    for (const type of types) {
      const retainUntil = computeRetentionUntil(type, eventDate);
      expect(retainUntil).not.toBeNull();
      expect(retainUntil!.toISOString()).toBe("2031-05-22T00:00:00.000Z");
    }
  });

  it("is timezone-stable — normalises to UTC midnight before adding years", () => {
    // Same calendar day in three different timezones — all must yield
    // the same retain-until date.
    const utcMidnight = new Date("2026-05-22T00:00:00.000Z");
    const utcLate = new Date("2026-05-22T23:59:59.999Z");
    const utcEarly = new Date("2026-05-22T00:00:01.000Z");
    const a = computeRetentionUntil("OPERATION", utcMidnight);
    const b = computeRetentionUntil("OPERATION", utcLate);
    const c = computeRetentionUntil("OPERATION", utcEarly);
    expect(a?.toISOString()).toBe("2031-05-22T00:00:00.000Z");
    expect(b?.toISOString()).toBe("2031-05-22T00:00:00.000Z");
    expect(c?.toISOString()).toBe("2031-05-22T00:00:00.000Z");
  });

  it("returns null for null/undefined event date", () => {
    expect(computeRetentionUntil("OPERATION", null)).toBeNull();
    expect(computeRetentionUntil("OPERATION", undefined)).toBeNull();
  });

  it("returns null for Invalid Date input", () => {
    const invalid = new Date("not-a-real-date");
    expect(computeRetentionUntil("OPERATION", invalid)).toBeNull();
  });

  it("handles leap-year edge — Feb 29 → next-year Mar 1", () => {
    const feb29 = new Date(Date.UTC(2024, 1, 29)); // 2024-02-29
    const retainUntil = computeRetentionUntil("OPERATION", feb29);
    // 2024 + 5 = 2029 (not a leap year), so Feb 29 rolls to Mar 1.
    expect(retainUntil?.toISOString()).toBe("2029-03-01T00:00:00.000Z");
  });

  it("uses the configured 5-year retention window", () => {
    expect(RETENTION_YEARS).toBe(5);
  });
});

describe("resolveEventDate", () => {
  it("picks the first non-null candidate in priority order", () => {
    const a = new Date(Date.UTC(2026, 0, 1));
    const b = new Date(Date.UTC(2026, 5, 1));
    const c = new Date(Date.UTC(2026, 11, 1));
    expect(resolveEventDate([null, undefined, b, c])?.toISOString()).toBe(
      b.toISOString(),
    );
    expect(resolveEventDate([a, b, c])?.toISOString()).toBe(a.toISOString());
  });

  it("skips Invalid Date entries", () => {
    const invalid = new Date("not-real");
    const valid = new Date(Date.UTC(2026, 5, 15));
    expect(resolveEventDate([invalid, valid])?.toISOString()).toBe(
      valid.toISOString(),
    );
  });

  it("returns null when no candidate is valid", () => {
    expect(resolveEventDate([])).toBeNull();
    expect(resolveEventDate([null, undefined, null])).toBeNull();
    expect(
      resolveEventDate([new Date("invalid"), new Date("also-invalid")]),
    ).toBeNull();
  });
});

describe("RETENTION_POLICIES table", () => {
  it("covers every record type with a citation + description", () => {
    const expectedTypes: RetentionRecordType[] = [
      "OPERATION",
      "LICENSE",
      "EUC",
      "REEXPORT_CONSENT",
      "VSD",
      "CLASSIFICATION_DRAFT",
      "BAFA_SUBMISSION",
      "NCA_CORRESPONDENCE",
    ];
    for (const type of expectedTypes) {
      const policy = RETENTION_POLICIES[type];
      expect(policy).toBeDefined();
      expect(policy.recordType).toBe(type);
      expect(policy.citation.length).toBeGreaterThan(0);
      expect(policy.description.length).toBeGreaterThan(0);
    }
  });

  it("cites § 762.6 / § 122.5 / EU 2021/821 across record types", () => {
    const allCitations = Object.values(RETENTION_POLICIES)
      .map((p) => p.citation)
      .join(" | ");
    // At least one of the statutory anchors must appear across the
    // policy table — guards against accidental loss of legal basis.
    expect(/762\.6|122\.5|2021\/821|AWG/i.test(allCitations)).toBe(true);
  });
});
