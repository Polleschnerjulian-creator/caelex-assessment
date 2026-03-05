import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock constants with controlled TRACKED_DEADLINES ───────────────────────
vi.mock("../core/constants", () => ({
  TRACKED_DEADLINES: [
    {
      id: "pentest",
      name: "Penetration Test",
      regulationRef: "nis2_art_21_2_e",
      intervalDays: 365,
      leadTimeDays: 56,
      sourceMetric: "days_since_last_pentest",
      severity: "HIGH",
      action: "Commission penetration test from certified provider",
    },
    {
      id: "vuln_scan",
      name: "Vulnerability Scan",
      regulationRef: "nis2_art_21_2_e",
      intervalDays: 90,
      leadTimeDays: 7,
      sourceMetric: "days_since_last_vuln_scan",
      severity: "MEDIUM",
      action: "Run automated vulnerability scan",
    },
    {
      id: "access_review",
      name: "Access Review",
      regulationRef: "nis2_art_21_2_i",
      intervalDays: 180,
      leadTimeDays: 14,
      sourceMetric: "days_since_last_access_review",
      severity: "MEDIUM",
      action: "Conduct access rights review",
    },
    {
      id: "security_training",
      name: "Security Awareness Training",
      regulationRef: "nis2_art_21_2_g",
      intervalDays: 365,
      leadTimeDays: 30,
      sourceMetric: "days_since_last_training",
      severity: "MEDIUM",
      action: "Schedule security awareness training for staff",
    },
    {
      id: "insurance_renewal",
      name: "TPL Insurance Renewal",
      regulationRef: "eu_space_act_art_8",
      intervalDays: 365,
      leadTimeDays: 90,
      sourceMetric: "insurance_expiry_date",
      severity: "CRITICAL",
      action: "Initiate insurance renewal process with broker",
    },
  ],
}));

import { calculateDeadlineEvents, getDeadlineFactors } from "./deadline-events";
import type { AssessmentDataBundle } from "../core/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000;

function emptyBundle(): AssessmentDataBundle {
  return {
    debris: null,
    cyber: null,
    insurance: null,
    environmental: null,
    nis2: null,
  };
}

describe("deadline-events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // calculateDeadlineEvents
  // ═══════════════════════════════════════════════════════════════════════════

  describe("calculateDeadlineEvents", () => {
    // ─── Periodic deadline (pentest) ──────────────────────────────────────

    it("pentest overdue produces OVERDUE event", () => {
      // Last pentest was 400 days ago → 400 + 365 interval = next due was 35 days ago
      const lastPentest = new Date(Date.now() - 400 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: lastPentest,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const pentestEvent = events.find((e) => e.name === "Penetration Test");
      expect(pentestEvent).toBeDefined();
      expect(pentestEvent!.eventType).toBe("OVERDUE");
      expect(pentestEvent!.isOverdue).toBe(true);
      expect(pentestEvent!.daysFromNow).toBeLessThan(0);
    });

    it("pentest not yet due produces RENEWAL event", () => {
      // Last pentest was 100 days ago → next due in 265 days
      const lastPentest = new Date(Date.now() - 100 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: lastPentest,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const pentestEvent = events.find((e) => e.name === "Penetration Test");
      expect(pentestEvent).toBeDefined();
      expect(pentestEvent!.eventType).toBe("RENEWAL");
      expect(pentestEvent!.isOverdue).toBe(false);
      expect(pentestEvent!.daysFromNow).toBeGreaterThan(0);
    });

    it("periodic deadline calculates correct due date: lastDate + intervalDays", () => {
      const lastPentest = new Date(Date.now() - 100 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: lastPentest,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const pentestEvent = events.find((e) => e.name === "Penetration Test");
      // next due = lastPentest + 365 days => ~265 days from now
      expect(pentestEvent!.daysFromNow).toBeGreaterThanOrEqual(264);
      expect(pentestEvent!.daysFromNow).toBeLessThanOrEqual(266);
    });

    // ─── Insurance renewal ───────────────────────────────────────────────

    it("insurance renewal with expiry in the future produces EXPIRY event", () => {
      const futureExpiry = new Date(Date.now() + 60 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: {
          ...emptyBundle(),
          insurance: {
            hasActivePolicy: true,
            coverageEur: 1_000_000,
            expiresAt: futureExpiry.toISOString(),
            lastUpdated: "2025-01-01",
          },
        },
        lastPentestDate: null,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const insuranceEvent = events.find(
        (e) => e.name === "TPL Insurance Renewal",
      );
      expect(insuranceEvent).toBeDefined();
      expect(insuranceEvent!.eventType).toBe("EXPIRY");
      expect(insuranceEvent!.daysFromNow).toBeGreaterThan(0);
    });

    it("insurance renewal with expiry in the past produces OVERDUE event", () => {
      const pastExpiry = new Date(Date.now() - 10 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: {
          ...emptyBundle(),
          insurance: {
            hasActivePolicy: false,
            coverageEur: null,
            expiresAt: pastExpiry.toISOString(),
            lastUpdated: "2025-01-01",
          },
        },
        lastPentestDate: null,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const insuranceEvent = events.find(
        (e) => e.name === "TPL Insurance Renewal",
      );
      expect(insuranceEvent).toBeDefined();
      expect(insuranceEvent!.eventType).toBe("OVERDUE");
      expect(insuranceEvent!.isOverdue).toBe(true);
    });

    it("insurance renewal with no insurance data is skipped", () => {
      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: null,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const insuranceEvent = events.find(
        (e) => e.name === "TPL Insurance Renewal",
      );
      expect(insuranceEvent).toBeUndefined();
    });

    it("insurance with expiresAt null is skipped", () => {
      const events = calculateDeadlineEvents({
        assessmentData: {
          ...emptyBundle(),
          insurance: {
            hasActivePolicy: true,
            coverageEur: 1_000_000,
            expiresAt: null,
            lastUpdated: "2025-01-01",
          },
        },
        lastPentestDate: null,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const insuranceEvent = events.find(
        (e) => e.name === "TPL Insurance Renewal",
      );
      expect(insuranceEvent).toBeUndefined();
    });

    // ─── Authorization renewal ───────────────────────────────────────────

    it("authorization renewal with future expiry adds 180-day lead event", () => {
      const futureExpiry = new Date(Date.now() + 300 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: null,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: futureExpiry,
      });

      const authEvent = events.find(
        (e) => e.name === "Space Activity Authorization Renewal",
      );
      expect(authEvent).toBeDefined();
      expect(authEvent!.leadTimeDays).toBe(180);
      expect(authEvent!.regulationRef).toBe("eu_space_act_art_5");
      expect(authEvent!.eventType).toBe("RENEWAL");
    });

    it("authorization overdue produces OVERDUE event", () => {
      const pastExpiry = new Date(Date.now() - 10 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: null,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: pastExpiry,
      });

      const authEvent = events.find(
        (e) => e.name === "Space Activity Authorization Renewal",
      );
      expect(authEvent!.eventType).toBe("OVERDUE");
      expect(authEvent!.isOverdue).toBe(true);
    });

    it("no authorizationExpiryDate means no authorization event", () => {
      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: null,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const authEvent = events.find(
        (e) => e.name === "Space Activity Authorization Renewal",
      );
      expect(authEvent).toBeUndefined();
    });

    // ─── No lastDate for non-insurance deadline → skipped ────────────────

    it("no lastDate for non-insurance periodic deadline is skipped", () => {
      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: null, // no pentest date → skip
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      // None of the periodic deadlines should appear
      expect(events.filter((e) => e.name === "Penetration Test")).toHaveLength(
        0,
      );
      expect(
        events.filter((e) => e.name === "Vulnerability Scan"),
      ).toHaveLength(0);
      expect(events.filter((e) => e.name === "Access Review")).toHaveLength(0);
      expect(
        events.filter((e) => e.name === "Security Awareness Training"),
      ).toHaveLength(0);
    });

    // ─── Events sorted by daysFromNow ────────────────────────────────────

    it("events are sorted by daysFromNow ascending", () => {
      // Create multiple events with different timings
      const events = calculateDeadlineEvents({
        assessmentData: {
          ...emptyBundle(),
          insurance: {
            hasActivePolicy: true,
            coverageEur: 1_000_000,
            expiresAt: new Date(Date.now() + 30 * DAY_MS).toISOString(),
            lastUpdated: "2025-01-01",
          },
        },
        lastPentestDate: new Date(Date.now() - 100 * DAY_MS), // due in 265 days
        lastVulnScanDate: new Date(Date.now() - 50 * DAY_MS), // due in 40 days
        lastAccessReviewDate: new Date(Date.now() - 150 * DAY_MS), // due in 30 days
        lastTrainingDate: new Date(Date.now() - 300 * DAY_MS), // due in 65 days
        authorizationExpiryDate: new Date(Date.now() + 500 * DAY_MS),
      });

      for (let i = 1; i < events.length; i++) {
        expect(events[i]!.daysFromNow).toBeGreaterThanOrEqual(
          events[i - 1]!.daysFromNow,
        );
      }
    });

    // ─── getSeverityFromDays ─────────────────────────────────────────────

    it("overdue → CRITICAL severity", () => {
      const lastPentest = new Date(Date.now() - 400 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: lastPentest,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const pentestEvent = events.find((e) => e.name === "Penetration Test");
      expect(pentestEvent!.severity).toBe("CRITICAL");
    });

    it("within leadTime/4 → HIGH severity", () => {
      // pentest: leadTime=56, so leadTime/4=14
      // Set lastPentest so that daysFromNow is ~10 (between 0 and 14)
      // lastPentest + 365 = due date, we want daysFromNow = 10
      // so lastPentest = now - (365-10) = now - 355 days
      const lastPentest = new Date(Date.now() - 355 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: lastPentest,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const pentestEvent = events.find((e) => e.name === "Penetration Test");
      expect(pentestEvent!.severity).toBe("HIGH");
    });

    it("within leadTime but >= leadTime/4 → baseSeverity", () => {
      // pentest: leadTime=56, baseSeverity=HIGH, leadTime/4=14
      // We want daysFromNow between 14 and 56
      // lastPentest + 365 = due, want daysFromNow = 30
      // so lastPentest = now - (365-30) = now - 335
      const lastPentest = new Date(Date.now() - 335 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: lastPentest,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const pentestEvent = events.find((e) => e.name === "Penetration Test");
      // baseSeverity for pentest is HIGH
      expect(pentestEvent!.severity).toBe("HIGH");
    });

    it(">= leadTime → LOW severity", () => {
      // pentest: leadTime=56
      // want daysFromNow > 56 → say 200
      // lastPentest = now - (365-200) = now - 165
      const lastPentest = new Date(Date.now() - 165 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: lastPentest,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const pentestEvent = events.find((e) => e.name === "Penetration Test");
      expect(pentestEvent!.severity).toBe("LOW");
    });

    // ─── Multiple deadlines at once ──────────────────────────────────────

    it("produces events for all provided deadlines", () => {
      const events = calculateDeadlineEvents({
        assessmentData: {
          ...emptyBundle(),
          insurance: {
            hasActivePolicy: true,
            coverageEur: 1_000_000,
            expiresAt: new Date(Date.now() + 60 * DAY_MS).toISOString(),
            lastUpdated: "2025-01-01",
          },
        },
        lastPentestDate: new Date(Date.now() - 100 * DAY_MS),
        lastVulnScanDate: new Date(Date.now() - 50 * DAY_MS),
        lastAccessReviewDate: new Date(Date.now() - 100 * DAY_MS),
        lastTrainingDate: new Date(Date.now() - 200 * DAY_MS),
        authorizationExpiryDate: new Date(Date.now() + 500 * DAY_MS),
      });

      const names = events.map((e) => e.name);
      expect(names).toContain("Penetration Test");
      expect(names).toContain("Vulnerability Scan");
      expect(names).toContain("Access Review");
      expect(names).toContain("Security Awareness Training");
      expect(names).toContain("TPL Insurance Renewal");
      expect(names).toContain("Space Activity Authorization Renewal");
    });

    // vuln_scan: intervalDays=90
    it("vuln_scan uses correct intervalDays (90)", () => {
      // Last scan was 50 days ago → next due in 40 days
      const lastScan = new Date(Date.now() - 50 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: null,
        lastVulnScanDate: lastScan,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const scanEvent = events.find((e) => e.name === "Vulnerability Scan");
      expect(scanEvent!.daysFromNow).toBeGreaterThanOrEqual(39);
      expect(scanEvent!.daysFromNow).toBeLessThanOrEqual(41);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getDeadlineFactors
  // ═══════════════════════════════════════════════════════════════════════════

  describe("getDeadlineFactors", () => {
    it("maps overdue event to NON_COMPLIANT", () => {
      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: new Date(Date.now() - 400 * DAY_MS),
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const factors = getDeadlineFactors(events);
      const pentestFactor = factors.find((f) =>
        f.id.includes("penetration_test"),
      );

      expect(pentestFactor).toBeDefined();
      expect(pentestFactor!.status).toBe("NON_COMPLIANT");
    });

    it("maps event within lead time to WARNING", () => {
      // vuln_scan: leadTime=7, intervalDays=90
      // last scan 86 days ago → due in 4 days (within leadTime of 7)
      const lastScan = new Date(Date.now() - 86 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: null,
        lastVulnScanDate: lastScan,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const factors = getDeadlineFactors(events);
      const scanFactor = factors.find((f) =>
        f.id.includes("vulnerability_scan"),
      );

      expect(scanFactor).toBeDefined();
      expect(scanFactor!.status).toBe("WARNING");
    });

    it("maps future event beyond lead time to COMPLIANT", () => {
      // pentest: leadTime=56, intervalDays=365
      // last pentest 100 days ago → due in 265 days (well beyond leadTime)
      const lastPentest = new Date(Date.now() - 100 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: lastPentest,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const factors = getDeadlineFactors(events);
      const pentestFactor = factors.find((f) =>
        f.id.includes("penetration_test"),
      );

      expect(pentestFactor).toBeDefined();
      expect(pentestFactor!.status).toBe("COMPLIANT");
    });

    it("id format is deadline_name_with_underscores", () => {
      const lastPentest = new Date(Date.now() - 100 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: lastPentest,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const factors = getDeadlineFactors(events);
      expect(factors[0]!.id).toBe("deadline_penetration_test");
    });

    it("confidence is always 0.95", () => {
      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: new Date(Date.now() - 100 * DAY_MS),
        lastVulnScanDate: new Date(Date.now() - 50 * DAY_MS),
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const factors = getDeadlineFactors(events);
      for (const factor of factors) {
        expect(factor.confidence).toBe(0.95);
      }
    });

    it("daysToThreshold: overdue → 0", () => {
      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: new Date(Date.now() - 400 * DAY_MS),
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const factors = getDeadlineFactors(events);
      const pentestFactor = factors.find((f) =>
        f.id.includes("penetration_test"),
      );
      expect(pentestFactor!.daysToThreshold).toBe(0);
    });

    it("daysToThreshold: future → daysFromNow", () => {
      const lastPentest = new Date(Date.now() - 100 * DAY_MS);

      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: lastPentest,
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const factors = getDeadlineFactors(events);
      const pentestFactor = factors.find((f) =>
        f.id.includes("penetration_test"),
      );
      // daysFromNow ~ 265, daysToThreshold should match
      expect(pentestFactor!.daysToThreshold).toBe(pentestFactor!.currentValue);
      expect(pentestFactor!.daysToThreshold).toBeGreaterThan(0);
    });

    it("returns empty array for empty events", () => {
      const factors = getDeadlineFactors([]);
      expect(factors).toHaveLength(0);
    });

    it("maps all events to factors", () => {
      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: new Date(Date.now() - 100 * DAY_MS),
        lastVulnScanDate: new Date(Date.now() - 50 * DAY_MS),
        lastAccessReviewDate: new Date(Date.now() - 100 * DAY_MS),
        lastTrainingDate: null,
        authorizationExpiryDate: new Date(Date.now() + 500 * DAY_MS),
      });

      const factors = getDeadlineFactors(events);
      expect(factors).toHaveLength(events.length);
    });

    it("factor source is always 'derived'", () => {
      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: new Date(Date.now() - 100 * DAY_MS),
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const factors = getDeadlineFactors(events);
      for (const f of factors) {
        expect(f.source).toBe("derived");
      }
    });

    it("factor unit is always 'days'", () => {
      const events = calculateDeadlineEvents({
        assessmentData: emptyBundle(),
        lastPentestDate: new Date(Date.now() - 100 * DAY_MS),
        lastVulnScanDate: null,
        lastAccessReviewDate: null,
        lastTrainingDate: null,
        authorizationExpiryDate: null,
      });

      const factors = getDeadlineFactors(events);
      for (const f of factors) {
        expect(f.unit).toBe("days");
      }
    });
  });
});
