import { describe, it, expect } from "vitest";
import { deriveExpiryState } from "./license-renewal";

// Fixed clock: 2026-06-01T00:00:00Z
const NOW = new Date("2026-06-01T00:00:00Z");
const inDays = (d: number) =>
  new Date(NOW.getTime() + d * 24 * 60 * 60 * 1000).toISOString();

describe("deriveExpiryState", () => {
  it("null validUntil → ok, no days, sorts last", () => {
    const s = deriveExpiryState(null, NOW);
    expect(s.daysRemaining).toBeNull();
    expect(s.urgency).toBe("ok");
    expect(s.isRenewalDue).toBe(false);
    expect(s.label).toBe("—");
    expect(s.sortValue).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("91 days → ok (outside 90 window)", () => {
    const s = deriveExpiryState(inDays(91), NOW);
    expect(s.urgency).toBe("ok");
    expect(s.isRenewalDue).toBe(false);
  });

  it("90 days → info, not yet renewal-due", () => {
    const s = deriveExpiryState(inDays(90), NOW);
    expect(s.daysRemaining).toBe(90);
    expect(s.urgency).toBe("info");
    expect(s.isRenewalDue).toBe(false);
  });

  it("30 days → warning, renewal-due", () => {
    const s = deriveExpiryState(inDays(30), NOW);
    expect(s.urgency).toBe("warning");
    expect(s.isRenewalDue).toBe(true);
    expect(s.label).toBe("30d left");
  });

  it("7 days → critical, renewal-due", () => {
    const s = deriveExpiryState(inDays(7), NOW);
    expect(s.urgency).toBe("critical");
    expect(s.isRenewalDue).toBe(true);
  });

  it("0 days (today) → critical", () => {
    const s = deriveExpiryState(inDays(0), NOW);
    expect(s.daysRemaining).toBe(0);
    expect(s.urgency).toBe("critical");
  });

  it("past → expired, renewal-due, negative-ish sort first", () => {
    const s = deriveExpiryState(inDays(-3), NOW);
    expect(s.daysRemaining).toBe(-3);
    expect(s.urgency).toBe("expired");
    expect(s.isRenewalDue).toBe(true);
    expect(s.label).toBe("Expired 3d ago");
    expect(s.sortValue).toBeLessThan(0);
  });

  it("sortValue orders soonest-first: expired < critical < info < null", () => {
    const expired = deriveExpiryState(inDays(-1), NOW).sortValue;
    const crit = deriveExpiryState(inDays(5), NOW).sortValue;
    const info = deriveExpiryState(inDays(80), NOW).sortValue;
    const none = deriveExpiryState(null, NOW).sortValue;
    expect(expired).toBeLessThan(crit);
    expect(crit).toBeLessThan(info);
    expect(info).toBeLessThan(none);
  });

  it("accepts a Date as well as an ISO string", () => {
    expect(deriveExpiryState(new Date(inDays(7)), NOW).urgency).toBe(
      "critical",
    );
  });
});

import { buildLicenseRenewalDraft } from "./license-renewal";

describe("buildLicenseRenewalDraft", () => {
  const prior = {
    id: "lic_123",
    licenseType: "BAFA_AGG_12",
    licenseNumber: "AGG-12-2024-987",
    validUntil: "2026-06-30T00:00:00Z",
    totalCapValue: 500000,
    capCurrency: "EUR",
    conditions: {
      coveredCodes: ["9A001.a"],
      coveredCountries: ["US", "JP"],
      endUseRestrictions: ["civilian only"],
      valueCap: { amount: 500000, currency: "EUR" },
    },
  };

  it("carries type, cap, currency", () => {
    const d = buildLicenseRenewalDraft(prior);
    expect(d.licenseType).toBe("BAFA_AGG_12");
    expect(d.totalCapValue).toBe(500000);
    expect(d.capCurrency).toBe("EUR");
    expect(d.status).toBe("DRAFT");
  });

  it("NEVER carries number / issuedAt / validUntil (new authorisation)", () => {
    const d = buildLicenseRenewalDraft(prior);
    expect(d.licenseNumber).toBeUndefined();
    expect(d.issuedAt).toBeUndefined();
    expect(d.validUntil).toBeUndefined();
  });

  it("carries conditions and stamps renewalOf = prior.id", () => {
    const d = buildLicenseRenewalDraft(prior);
    expect(d.conditions.coveredCodes).toEqual(["9A001.a"]);
    expect(d.conditions.coveredCountries).toEqual(["US", "JP"]);
    expect(d.conditions.renewalOf).toBe("lic_123");
  });

  it("does not mutate the prior licence's conditions", () => {
    const snapshot = JSON.stringify(prior.conditions);
    buildLicenseRenewalDraft(prior);
    expect(JSON.stringify(prior.conditions)).toBe(snapshot);
  });

  it("includes a non-empty disclaimer and a carried summary", () => {
    const d = buildLicenseRenewalDraft(prior);
    expect(d.disclaimer.length).toBeGreaterThan(0);
    expect(d.carriedSummary).toMatch(/BAFA_AGG_12|AGG/);
  });

  it("handles a prior with null number / null cap / empty conditions", () => {
    const d = buildLicenseRenewalDraft({
      id: "lic_x",
      licenseType: "OTHER",
      licenseNumber: null,
      validUntil: null,
      totalCapValue: null,
      capCurrency: "EUR",
      conditions: {},
    });
    expect(d.licenseType).toBe("OTHER");
    expect(d.totalCapValue).toBeNull();
    expect(d.conditions.renewalOf).toBe("lic_x");
  });
});
