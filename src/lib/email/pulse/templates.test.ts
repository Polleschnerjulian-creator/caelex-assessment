/**
 * Pulse email templates — unit tests.
 *
 * Coverage:
 *
 *   1. Each stage renderer returns subject + html + text
 *   2. Day-0 personalises with legalName + field count
 *   3. Day-0 T0 path (no fields) renders different copy
 *   4. Day-1 personalises with detected jurisdiction
 *   5. Day-7 surfaces lead ID for funnel attribution
 *   6. HTML escapes operator-supplied legalName (XSS guard)
 *   7. renderPulseEmail dispatcher routes to the right stage
 */

import { describe, it, expect } from "vitest";
import {
  renderDay0Delivery,
  renderDay1Highlights,
  renderDay3Pitfalls,
  renderDay7FinalNudge,
  renderPulseEmail,
  type PulseEmailContext,
} from "./templates";

const BASE_CTX: PulseEmailContext = {
  legalName: "OneWeb Limited",
  email: "anna@example.com",
  leadId: "cl_lead_xyz_abc12345",
  reportUrl:
    "https://app.caelex.com/api/public/pulse/report/cl_lead_xyz_abc12345",
  signupUrl: "https://app.caelex.com/signup?leadId=cl_lead_xyz_abc12345",
  demoUrl: "https://app.caelex.com/demo?leadId=cl_lead_xyz_abc12345",
  unsubscribeUrl:
    "https://app.caelex.com/api/public/pulse/unsubscribe/cl_lead_xyz_abc12345",
  successfulSourceCount: 2,
  failedSourceCount: 1,
  mergedFields: [
    {
      fieldName: "establishment",
      value: "DE",
      agreementCount: 2,
    },
  ],
  establishment: "DE",
};

const T0_CTX: PulseEmailContext = {
  ...BASE_CTX,
  successfulSourceCount: 0,
  failedSourceCount: 4,
  mergedFields: [],
  establishment: null,
};

// ─── Day-0 ─────────────────────────────────────────────────────────────────

describe("renderDay0Delivery", () => {
  it("returns subject, html, text", () => {
    const r = renderDay0Delivery(BASE_CTX);
    expect(r.subject).toBeTruthy();
    expect(r.html).toBeTruthy();
    expect(r.text).toBeTruthy();
  });

  it("personalises with legalName + field count when fields present", () => {
    const r = renderDay0Delivery(BASE_CTX);
    expect(r.subject).toContain("1 verified field");
    expect(r.html).toContain("OneWeb Limited");
    expect(r.html).toContain("Country of establishment");
    expect(r.html).toContain("DE");
  });

  it("renders T0 copy when no fields", () => {
    const r = renderDay0Delivery(T0_CTX);
    expect(r.subject).not.toContain("verified field");
    // Static template body uses raw apostrophes (not escaped — only
    // operator-supplied input runs through escapeHtml).
    expect(r.html).toContain("didn't have data on your operator");
  });

  it("includes the report download link", () => {
    const r = renderDay0Delivery(BASE_CTX);
    expect(r.html).toContain(BASE_CTX.reportUrl);
    expect(r.text).toContain(BASE_CTX.reportUrl);
  });

  it("includes signup + demo CTAs", () => {
    const r = renderDay0Delivery(BASE_CTX);
    expect(r.html).toContain(BASE_CTX.signupUrl);
    expect(r.html).toContain(BASE_CTX.demoUrl);
  });
});

// ─── Day-1 ─────────────────────────────────────────────────────────────────

describe("renderDay1Highlights", () => {
  it("personalises with detected jurisdiction when present", () => {
    const r = renderDay1Highlights(BASE_CTX);
    expect(r.html).toContain("DE");
    expect(r.html).toContain("multiple authoritative registries");
  });

  it("falls back to generic copy when no jurisdiction detected", () => {
    const r = renderDay1Highlights(T0_CTX);
    expect(r.html).toContain("couldn't auto-detect");
  });

  it("includes 3 takeaway bullets", () => {
    const r = renderDay1Highlights(BASE_CTX);
    expect(r.html).toContain("EU Space Act applicability");
    expect(r.html).toContain("NIS2 incident-reporting");
  });
});

// ─── Day-3 ─────────────────────────────────────────────────────────────────

describe("renderDay3Pitfalls", () => {
  it("renders the 3 pitfalls", () => {
    const r = renderDay3Pitfalls(BASE_CTX);
    expect(r.html).toContain("Authorisation submitted without counsel");
    expect(r.html).toContain("NIS2 mapped only to the 24h deadline");
    expect(r.html).toContain("COPUOS 25-year-rule");
  });
});

// ─── Day-7 ─────────────────────────────────────────────────────────────────

describe("renderDay7FinalNudge", () => {
  it("surfaces the lead ID for funnel attribution", () => {
    const r = renderDay7FinalNudge(BASE_CTX);
    expect(r.html).toContain(BASE_CTX.leadId);
    expect(r.text).toContain(BASE_CTX.leadId);
  });

  it("explains the free tier", () => {
    const r = renderDay7FinalNudge(BASE_CTX);
    expect(r.html).toContain("100 Astra-AI calls");
    expect(r.html).toContain("No expiring trial");
  });
});

// ─── XSS guard ─────────────────────────────────────────────────────────────

describe("HTML escaping (XSS guard)", () => {
  it("escapes < > & in legalName", () => {
    const malicious = {
      ...BASE_CTX,
      legalName: '<script>alert("xss")</script> & evil',
    };
    const r = renderDay0Delivery(malicious);
    expect(r.html).not.toContain("<script>alert");
    expect(r.html).toContain("&lt;script&gt;");
    expect(r.html).toContain("&amp;");
  });
});

// ─── Dispatcher ────────────────────────────────────────────────────────────

describe("renderPulseEmail (dispatcher)", () => {
  it("routes to day0", () => {
    const r = renderPulseEmail("day0", BASE_CTX);
    expect(r.subject).toContain("Pulse report is ready");
  });
  it("routes to day1", () => {
    const r = renderPulseEmail("day1", BASE_CTX);
    expect(r.subject).toContain("3 things to know");
  });
  it("routes to day3", () => {
    const r = renderPulseEmail("day3", BASE_CTX);
    expect(r.subject).toContain("pitfalls");
  });
  it("routes to day7", () => {
    const r = renderPulseEmail("day7", BASE_CTX);
    expect(r.subject).toContain("Last note");
  });
});
