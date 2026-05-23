/**
 * Tests for Trade Features Overview knowledge file.
 *
 * Verifies:
 *  - All 17 post-T8 Trade features are present
 *  - Each entry is structurally complete (id, name, anchor, summary,
 *    examples, pagePath)
 *  - The generated summary text references every entry name
 *  - Tool-mapping helpers find entries correctly
 *  - System prompt picks up the summary
 */

import { describe, it, expect } from "vitest";
import {
  TRADE_FEATURE_ENTRIES,
  TRADE_FEATURES_SUMMARY,
  getTradeFeatureById,
  getTradeFeaturesForTool,
} from "./trade-features-overview";
import { buildSystemPrompt } from "../system-prompt";

describe("TRADE_FEATURE_ENTRIES", () => {
  it("contains exactly 17 entries (one per post-T8 feature)", () => {
    expect(TRADE_FEATURE_ENTRIES).toHaveLength(17);
  });

  it("every entry has structurally complete fields", () => {
    for (const entry of TRADE_FEATURE_ENTRIES) {
      expect(entry.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(entry.name).toBeTruthy();
      expect(entry.regulationAnchor).toBeTruthy();
      expect(entry.summary.length).toBeGreaterThan(80);
      expect(entry.examples.length).toBeGreaterThanOrEqual(1);
      expect(entry.examples.length).toBeLessThanOrEqual(3);
      expect(entry.pagePath.startsWith("/")).toBe(true);
    }
  });

  it("entry ids are unique", () => {
    const ids = TRADE_FEATURE_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all required feature areas by name", () => {
    const names = TRADE_FEATURE_ENTRIES.map((e) => e.name.toLowerCase());
    expect(names.some((n) => n.includes("vsd"))).toBe(true);
    expect(names.some((n) => n.includes("sammelgenehmigung"))).toBe(true);
    expect(names.some((n) => n.includes("deemed"))).toBe(true);
    expect(names.some((n) => n.includes("supplement"))).toBe(true);
    expect(names.some((n) => n.includes("aukus"))).toBe(true);
    expect(names.some((n) => n.includes("destination control"))).toBe(true);
    expect(names.some((n) => n.includes("sham"))).toBe(true);
    expect(names.some((n) => n.includes("elan-k2"))).toBe(true);
    expect(names.some((n) => n.includes("atlas") && n.includes("aes"))).toBe(
      true,
    );
    expect(names.some((n) => n.includes("licence-time"))).toBe(true);
    expect(names.some((n) => n.includes("tier-3"))).toBe(true);
    expect(names.some((n) => n.includes("france los"))).toBe(true);
    expect(names.some((n) => n.includes("uk ecju"))).toBe(true);
    expect(names.some((n) => n.includes("faa ast"))).toBe(true);
    expect(names.some((n) => n.includes("comply"))).toBe(true);
    expect(names.some((n) => n.includes("recordkeeping"))).toBe(true);
    expect(names.some((n) => n.includes("opensanctions"))).toBe(true);
  });

  it("every regulationAnchor references at least one CFR / EU / statute", () => {
    for (const entry of TRADE_FEATURE_ENTRIES) {
      const anchor = entry.regulationAnchor;
      const hasReg =
        anchor.includes("CFR") ||
        anchor.includes("EU") ||
        anchor.includes("Regulation") ||
        anchor.includes("Loi") ||
        anchor.includes("Order") ||
        anchor.includes("AWG") ||
        anchor.includes("AWV") ||
        anchor.includes("BAFA") ||
        anchor.includes("Report") ||
        anchor.includes("Cat.") ||
        anchor.includes("USML") ||
        anchor.includes("ITU") ||
        anchor.includes("Space Act") ||
        anchor.includes("OFAC") ||
        anchor.includes("ECJU") ||
        anchor.includes("Annual");
      expect(
        hasReg,
        `entry ${entry.id} anchor missing regulator: ${anchor}`,
      ).toBe(true);
    }
  });

  it("page paths point at trade-side or dashboard routes", () => {
    for (const entry of TRADE_FEATURE_ENTRIES) {
      const ok =
        entry.pagePath.startsWith("/trade/") ||
        entry.pagePath.startsWith("/dashboard/");
      expect(ok, `entry ${entry.id} pagePath invalid: ${entry.pagePath}`).toBe(
        true,
      );
    }
  });
});

describe("TRADE_FEATURES_SUMMARY", () => {
  it("is a non-empty string", () => {
    expect(typeof TRADE_FEATURES_SUMMARY).toBe("string");
    expect(TRADE_FEATURES_SUMMARY.length).toBeGreaterThan(500);
  });

  it("references every entry name", () => {
    for (const entry of TRADE_FEATURE_ENTRIES) {
      expect(
        TRADE_FEATURES_SUMMARY.includes(entry.name),
        `summary missing entry name: ${entry.name}`,
      ).toBe(true);
    }
  });

  it("includes every regulation anchor", () => {
    for (const entry of TRADE_FEATURE_ENTRIES) {
      // Anchor strings can have parentheses / dashes — check by the
      // first 20 chars to be tolerant of escaping.
      const prefix = entry.regulationAnchor.slice(0, 20);
      expect(
        TRADE_FEATURES_SUMMARY.includes(prefix),
        `summary missing anchor prefix: ${prefix} (for ${entry.id})`,
      ).toBe(true);
    }
  });

  it("includes every page path", () => {
    for (const entry of TRADE_FEATURE_ENTRIES) {
      expect(
        TRADE_FEATURES_SUMMARY.includes(entry.pagePath),
        `summary missing page path: ${entry.pagePath}`,
      ).toBe(true);
    }
  });
});

describe("getTradeFeatureById", () => {
  it("returns an entry for a known id", () => {
    const entry = getTradeFeatureById("dcs");
    expect(entry).toBeDefined();
    expect(entry?.name).toContain("Destination Control");
  });

  it("returns undefined for an unknown id", () => {
    expect(getTradeFeatureById("not-a-real-feature")).toBeUndefined();
  });
});

describe("getTradeFeaturesForTool", () => {
  it("returns the DCS entry for generate_dcs", () => {
    const entries = getTradeFeaturesForTool("generate_dcs");
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].id).toBe("dcs");
  });

  it("returns the screening entry for check_sanctions_status", () => {
    const entries = getTradeFeaturesForTool("check_sanctions_status");
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].id).toBe("opensanctions-orbis");
  });

  it("returns the predictor entry for predict_license_time", () => {
    const entries = getTradeFeaturesForTool("predict_license_time");
    expect(entries.some((e) => e.id === "license-analytics")).toBe(true);
  });

  it("returns the sham entry for evaluate_sham_risk", () => {
    const entries = getTradeFeaturesForTool("evaluate_sham_risk");
    expect(entries.some((e) => e.id === "ofac-sham-doctrine")).toBe(true);
  });

  it("returns both Sammelgenehmigung + UK ECJU for find_covering_license", () => {
    const entries = getTradeFeaturesForTool("find_covering_license");
    const ids = entries.map((e) => e.id);
    expect(ids).toContain("sammelgenehmigung");
    expect(ids).toContain("uk-ecju");
  });

  it("returns empty array for an unknown tool", () => {
    expect(getTradeFeaturesForTool("not_a_real_tool")).toEqual([]);
  });
});

describe("system prompt integration", () => {
  it("includes every Trade feature name in the rendered system prompt", () => {
    const prompt = buildSystemPrompt();
    for (const entry of TRADE_FEATURE_ENTRIES) {
      expect(
        prompt.includes(entry.name),
        `system prompt missing Trade feature: ${entry.name}`,
      ).toBe(true);
    }
  });

  it("renders the Trade features header in the system prompt", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Trade-Side Features Astra Knows About");
  });
});
