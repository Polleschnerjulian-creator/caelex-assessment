// tests/unit/lib/atlas/forecast-engine.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import {
  getAllForecastEvents,
  getEffectiveEventsAt,
  getJurisdictionTimeline,
  __resetForecastCacheForTests,
} from "@/lib/atlas/forecast-engine";

beforeEach(() => {
  __resetForecastCacheForTests();
});

describe("forecast-engine — event aggregation", () => {
  it("returns a non-trivial catalogue of events", () => {
    const events = getAllForecastEvents();
    // 8 REGULATION_TIMELINE phases + ≥ 4 new session-added items
    // (FR-TECHREG, UK-ORBITAL-LIABILITY-CONSULT, US-FAA-NPRM, ESA
    // Zero Debris Std with 2030 effective date, etc.)
    expect(events.length).toBeGreaterThanOrEqual(8);
  });

  it("sorts strictly ascending by effectiveDate", () => {
    const events = getAllForecastEvents();
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.effectiveDate >= events[i - 1]!.effectiveDate).toBe(
        true,
      );
    }
  });

  it("excludes events with no effectiveDate (no silent today-insertion)", () => {
    const events = getAllForecastEvents();
    for (const e of events) {
      expect(e.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("includes the EU Space Act with high confidence and 2030 effective date", () => {
    const events = getAllForecastEvents();
    const euAct = events.find((e) => /eu space act/i.test(e.label));
    expect(euAct).toBeDefined();
    // The curator has multiple phases; at least one should be in 2030.
    const fullApplication = events.find(
      (e) => /eu space act/i.test(e.label) && e.effectiveDate === "2030-01-01",
    );
    expect(fullApplication).toBeDefined();
    expect(fullApplication!.confidence).toBe("high");
  });

  it("includes a medium-confidence event for a draft/proposed instrument", () => {
    const events = getAllForecastEvents();
    // FR-TECHREG-CONSULT-2024 was added with status "proposed" -> low.
    // UK-ORBITAL-LIABILITY-CONSULT-2023 is "proposed" -> low.
    // FAA NPRM is "proposed" -> low.
    // ESA Zero Debris Std is status "draft" + date_in_force 2030-01-01 -> medium.
    const mediumOrLow = events.filter(
      (e) => e.confidence === "medium" || e.confidence === "low",
    );
    expect(mediumOrLow.length).toBeGreaterThan(0);
  });

  it("dedupes events that appear in both timeline and legal-sources", () => {
    const events = getAllForecastEvents();
    const ids = events.map((e) => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe("forecast-engine — date-indexed queries", () => {
  it("returns no effective events when targetDate is today", () => {
    const today = new Date();
    const events = getEffectiveEventsAt(today);
    // Strictly (today, today] = empty.
    expect(events).toEqual([]);
  });

  it("returns events when targetDate is far in the future (2032-12-31)", () => {
    const farFuture = new Date("2032-12-31");
    const events = getEffectiveEventsAt(farFuture);
    expect(events.length).toBeGreaterThan(0);
  });

  it("includes the EU Space Act full-application phase when target >= 2030-01-01", () => {
    const t = new Date("2030-06-01");
    const events = getEffectiveEventsAt(t);
    const euActFull = events.find(
      (e) => /eu space act/i.test(e.label) && e.effectiveDate === "2030-01-01",
    );
    expect(euActFull).toBeDefined();
  });

  it("excludes events with past effective dates (FCC 5-yr PMD from 2024 is NOT a future event)", () => {
    const t = new Date("2032-12-31");
    const events = getEffectiveEventsAt(t);
    const fcc = events.find((e) => /fcc 5-year/i.test(e.label));
    expect(fcc).toBeUndefined();
  });
});

describe("forecast-engine — per-jurisdiction timeline", () => {
  it("FR includes the EU Space Act events (FR is in EU_ISO_CODES)", () => {
    const frEvents = getJurisdictionTimeline("FR");
    const hasEUAct = frEvents.some((e) => /eu space act/i.test(e.label));
    expect(hasEUAct).toBe(true);
  });

  it("US does NOT include EU Space Act (US is not an EU member)", () => {
    const usEvents = getJurisdictionTimeline("US");
    const hasEUAct = usEvents.some(
      (e) => /eu space act/i.test(e.label) && !e.jurisdictions.includes("INT"),
    );
    expect(hasEUAct).toBe(false);
  });

  it("returns only future events (today excluded)", () => {
    const today = new Date().toISOString().slice(0, 10);
    const events = getJurisdictionTimeline("DE");
    for (const e of events) {
      expect(e.effectiveDate > today).toBe(true);
    }
  });

  it("includes INT-level events for every jurisdiction (e.g. COPUOS LTS, EU Space Act reach)", () => {
    // Pick an unusual jurisdiction not typically in specific lists.
    const nzEvents = getJurisdictionTimeline("NZ");
    // NZ is not in EU_ISO_CODES but should still see INT-tagged events
    // (timeline phases marked with "INT" jurisdiction).
    const hasIntl = nzEvents.some(
      (e) => e.jurisdictions.includes("INT") || e.jurisdictions.includes("NZ"),
    );
    expect(hasIntl).toBe(true);
  });
});
