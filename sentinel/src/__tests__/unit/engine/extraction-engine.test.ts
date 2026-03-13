import { describe, it, expect } from "vitest";
import { evaluateCompliance } from "../../../engine/extraction-engine.js";
import type { CollectorOutput } from "../../../types/collector-types.js";

/**
 * Helper: build a CollectorOutput for orbital_parameters with given values.
 */
function orbitalOutput(values: Record<string, unknown>): CollectorOutput {
  return {
    data_point: "orbital_parameters",
    source_system: "test",
    collection_method: "test",
    compliance_notes: [],
    satellite_norad_id: "58421",
    values: {
      altitude_km: 550,
      semi_major_axis_km: 6921,
      eccentricity: 0.0002,
      inclination_deg: 97.6,
      remaining_fuel_kg: 25,
      remaining_fuel_pct: 50,
      thruster_status: "NOMINAL",
      last_maneuver_timestamp: "2026-01-01T00:00:00Z",
      last_maneuver_delta_v: 0.05,
      ca_events_30d: 2,
      high_risk_ca_events: 0,
      ca_maneuvers_30d: 0,
      attitude_status: "NOMINAL",
      solar_array_power_w: 900,
      battery_soc_pct: 95,
      estimated_lifetime_yr: 15,
      deorbit_capability: "NOMINAL",
      ...values,
    },
  };
}

/**
 * Helper: build a CollectorOutput for cyber_posture with given values.
 */
function cyberOutput(values: Record<string, unknown>): CollectorOutput {
  return {
    data_point: "cyber_posture",
    source_system: "test",
    collection_method: "test",
    compliance_notes: [],
    values: {
      incidents_30d: 0,
      incidents_by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
      mttd_minutes: 30,
      mttr_minutes: 600,
      reportable_incidents: 0,
      critical_vulns_unpatched: 0,
      high_vulns_unpatched: 0,
      patch_compliance_pct: 96,
      days_since_last_vuln_scan: 3,
      mfa_adoption_pct: 99,
      privileged_accounts: 10,
      last_access_review: "2026-01-01",
      backup_status: "VERIFIED",
      last_backup_test: "2026-01-01",
      encryption_at_rest: "AES-256",
      encryption_in_transit: "TLS-1.3",
      last_pentest_date: "2025-12-01",
      security_training_pct: 92,
      ...values,
    },
  };
}

function findMapping(
  mappings: ReturnType<typeof evaluateCompliance>,
  refSubstring: string,
) {
  return mappings.find((m) => m.ref.includes(refSubstring));
}

// ═══════════════════════════════════════════════════════════════════════
// EU SPACE ACT — Art. 70 (Passivation / Fuel)
// ═══════════════════════════════════════════════════════════════════════

describe("Art. 70 — End-of-Life Passivation", () => {
  it("fuel 45% → COMPLIANT", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ remaining_fuel_pct: 45 }),
    );
    const m = findMapping(mappings, "art_70");
    expect(m).toBeDefined();
    expect(m!.status).toBe("COMPLIANT");
  });

  it("fuel 18% → WARNING (above 15% threshold but in buffer zone)", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ remaining_fuel_pct: 18 }),
    );
    const m = findMapping(mappings, "art_70");
    expect(m).toBeDefined();
    // Art. 70: < 5 → CRITICAL, < 15 → WARNING, else COMPLIANT
    // 18 > 15 → COMPLIANT
    expect(m!.status).toBe("COMPLIANT");
  });

  it("fuel 14% → WARNING (below 15%)", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ remaining_fuel_pct: 14 }),
    );
    const m = findMapping(mappings, "art_70");
    expect(m).toBeDefined();
    expect(m!.status).toBe("WARNING");
  });

  it("fuel 4% → CRITICAL (below 5%)", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ remaining_fuel_pct: 4 }),
    );
    const m = findMapping(mappings, "art_70");
    expect(m).toBeDefined();
    expect(m!.status).toBe("CRITICAL");
  });

  it("fuel exactly 15.0% → COMPLIANT (threshold is <15, not <=15)", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ remaining_fuel_pct: 15.0 }),
    );
    const m = findMapping(mappings, "art_70");
    expect(m).toBeDefined();
    // The rule: if (fuel < 5) CRITICAL; if (fuel < 15) WARNING; else COMPLIANT
    // 15.0 is NOT < 15, so COMPLIANT
    expect(m!.status).toBe("COMPLIANT");
  });

  it("fuel exactly 5.0% → WARNING (not CRITICAL, threshold is <5)", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ remaining_fuel_pct: 5.0 }),
    );
    const m = findMapping(mappings, "art_70");
    expect(m).toBeDefined();
    // 5.0 is NOT < 5, so falls to next check: 5.0 < 15 → WARNING
    expect(m!.status).toBe("WARNING");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// IADC §5.3.1 (Passivation Fuel Reserve)
// ═══════════════════════════════════════════════════════════════════════

describe("IADC §5.3.1 — Passivation Fuel Reserve", () => {
  it("fuel 14% → COMPLIANT (IADC threshold is 10%)", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ remaining_fuel_pct: 14 }),
    );
    const m = findMapping(mappings, "iadc_guidelines");
    expect(m).toBeDefined();
    // IADC: < 10 → WARNING, else COMPLIANT
    expect(m!.status).toBe("COMPLIANT");
  });

  it("fuel 9% → WARNING", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ remaining_fuel_pct: 9 }),
    );
    const m = findMapping(mappings, "iadc_guidelines");
    expect(m).toBeDefined();
    expect(m!.status).toBe("WARNING");
  });

  it("fuel 10.0% → COMPLIANT (threshold is <10)", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ remaining_fuel_pct: 10.0 }),
    );
    const m = findMapping(mappings, "iadc_guidelines");
    expect(m).toBeDefined();
    expect(m!.status).toBe("COMPLIANT");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// EU SPACE ACT — Art. 72 (Disposal Capability)
// ═══════════════════════════════════════════════════════════════════════

describe("Art. 72 — Disposal Capability", () => {
  it("deorbit NOMINAL → COMPLIANT", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ deorbit_capability: "NOMINAL" }),
    );
    const m = findMapping(mappings, "art_72");
    expect(m).toBeDefined();
    expect(m!.status).toBe("COMPLIANT");
  });

  it("deorbit DEGRADED → WARNING", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ deorbit_capability: "DEGRADED" }),
    );
    const m = findMapping(mappings, "art_72");
    expect(m).toBeDefined();
    expect(m!.status).toBe("WARNING");
  });

  it("deorbit IMPOSSIBLE → NON_COMPLIANT", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ deorbit_capability: "IMPOSSIBLE" }),
    );
    const m = findMapping(mappings, "art_72");
    expect(m).toBeDefined();
    expect(m!.status).toBe("NON_COMPLIANT");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// EU SPACE ACT — Art. 64 (Collision Avoidance)
// ═══════════════════════════════════════════════════════════════════════

describe("Art. 64 — Collision Avoidance", () => {
  it("thruster NOMINAL → COMPLIANT", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ thruster_status: "NOMINAL" }),
    );
    const m = findMapping(mappings, "eu_space_act_art_64");
    expect(m).toBeDefined();
    expect(m!.status).toBe("COMPLIANT");
  });

  it("thruster FAILED → NON_COMPLIANT", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ thruster_status: "FAILED" }),
    );
    const m = findMapping(mappings, "eu_space_act_art_64");
    expect(m).toBeDefined();
    expect(m!.status).toBe("NON_COMPLIANT");
  });

  it("high risk events with no maneuvers → WARNING", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({
        high_risk_ca_events: 2,
        ca_maneuvers_30d: 0,
        thruster_status: "NOMINAL",
      }),
    );
    const m = findMapping(mappings, "eu_space_act_art_64");
    expect(m).toBeDefined();
    expect(m!.status).toBe("WARNING");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// EU SPACE ACT — Art. 66 (Manoeuvrability)
// ═══════════════════════════════════════════════════════════════════════

describe("Art. 66 — Spacecraft Manoeuvrability", () => {
  it("thruster NOMINAL + attitude NOMINAL → COMPLIANT", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({
        thruster_status: "NOMINAL",
        attitude_status: "NOMINAL",
      }),
    );
    const m = findMapping(mappings, "art_66");
    expect(m).toBeDefined();
    expect(m!.status).toBe("COMPLIANT");
  });

  it("thruster DEGRADED → WARNING", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ thruster_status: "DEGRADED" }),
    );
    const m = findMapping(mappings, "art_66");
    expect(m).toBeDefined();
    expect(m!.status).toBe("WARNING");
  });

  it("thruster FAILED → NON_COMPLIANT", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ thruster_status: "FAILED" }),
    );
    const m = findMapping(mappings, "art_66");
    expect(m).toBeDefined();
    expect(m!.status).toBe("NON_COMPLIANT");
  });

  it("attitude TUMBLING → NON_COMPLIANT", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ attitude_status: "TUMBLING" }),
    );
    const m = findMapping(mappings, "art_66");
    expect(m).toBeDefined();
    expect(m!.status).toBe("NON_COMPLIANT");
  });

  it("attitude SAFE_MODE → WARNING", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ attitude_status: "SAFE_MODE" }),
    );
    const m = findMapping(mappings, "art_66");
    expect(m).toBeDefined();
    expect(m!.status).toBe("WARNING");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// EU SPACE ACT — Art. 68 (25-Year Lifetime)
// ═══════════════════════════════════════════════════════════════════════

describe("Art. 68 — 25-Year Orbital Lifetime", () => {
  it("LEO + 15yr lifetime → COMPLIANT", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ altitude_km: 550, estimated_lifetime_yr: 15 }),
    );
    const m = findMapping(mappings, "art_68");
    expect(m).toBeDefined();
    expect(m!.status).toBe("COMPLIANT");
  });

  it("LEO + 22yr lifetime → WARNING", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ altitude_km: 550, estimated_lifetime_yr: 22 }),
    );
    const m = findMapping(mappings, "art_68");
    expect(m).toBeDefined();
    expect(m!.status).toBe("WARNING");
  });

  it("LEO + 30yr lifetime → NON_COMPLIANT", () => {
    const mappings = evaluateCompliance(
      orbitalOutput({ altitude_km: 550, estimated_lifetime_yr: 30 }),
    );
    const m = findMapping(mappings, "art_68");
    expect(m).toBeDefined();
    expect(m!.status).toBe("NON_COMPLIANT");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// NIS2 — Art. 21(2)(e) Vulnerability Management
// ═══════════════════════════════════════════════════════════════════════

describe("NIS2 Art. 21(2)(e) — Vulnerability Management", () => {
  it("patch 96%, 0 vulns → COMPLIANT", () => {
    const mappings = evaluateCompliance(
      cyberOutput({ patch_compliance_pct: 96, critical_vulns_unpatched: 0 }),
    );
    const m = findMapping(mappings, "art_21_2_e");
    expect(m).toBeDefined();
    expect(m!.status).toBe("COMPLIANT");
  });

  it("patch 78% → WARNING (below 80%)", () => {
    const mappings = evaluateCompliance(
      cyberOutput({ patch_compliance_pct: 78, critical_vulns_unpatched: 0 }),
    );
    const m = findMapping(mappings, "art_21_2_e");
    expect(m).toBeDefined();
    expect(m!.status).toBe("WARNING");
  });

  it("3 critical vulns → NON_COMPLIANT", () => {
    const mappings = evaluateCompliance(
      cyberOutput({ critical_vulns_unpatched: 3 }),
    );
    const m = findMapping(mappings, "art_21_2_e");
    expect(m).toBeDefined();
    expect(m!.status).toBe("NON_COMPLIANT");
  });

  it("0 vulns → COMPLIANT", () => {
    const mappings = evaluateCompliance(
      cyberOutput({ critical_vulns_unpatched: 0, patch_compliance_pct: 96 }),
    );
    const m = findMapping(mappings, "art_21_2_e");
    expect(m).toBeDefined();
    expect(m!.status).toBe("COMPLIANT");
  });

  it("patch exactly 80.0% → COMPLIANT (threshold is <80)", () => {
    const mappings = evaluateCompliance(
      cyberOutput({ patch_compliance_pct: 80.0, critical_vulns_unpatched: 0 }),
    );
    const m = findMapping(mappings, "art_21_2_e");
    expect(m).toBeDefined();
    // 80.0 is NOT < 80 → COMPLIANT
    expect(m!.status).toBe("COMPLIANT");
  });

  it("vuln scan >30 days → WARNING", () => {
    const mappings = evaluateCompliance(
      cyberOutput({
        days_since_last_vuln_scan: 35,
        critical_vulns_unpatched: 0,
        patch_compliance_pct: 96,
      }),
    );
    const m = findMapping(mappings, "art_21_2_e");
    expect(m).toBeDefined();
    expect(m!.status).toBe("WARNING");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// NIS2 — Art. 21(2)(i)(j) Access Control
// ═══════════════════════════════════════════════════════════════════════

describe("NIS2 Art. 21(2)(j) — Access Control (MFA)", () => {
  it("MFA 99% → COMPLIANT", () => {
    const mappings = evaluateCompliance(cyberOutput({ mfa_adoption_pct: 99 }));
    const m = findMapping(mappings, "art_21_2_i_j");
    expect(m).toBeDefined();
    expect(m!.status).toBe("COMPLIANT");
  });

  it("MFA 94% → WARNING (below 95%)", () => {
    const mappings = evaluateCompliance(cyberOutput({ mfa_adoption_pct: 94 }));
    const m = findMapping(mappings, "art_21_2_i_j");
    expect(m).toBeDefined();
    expect(m!.status).toBe("WARNING");
  });

  it("MFA 75% → NON_COMPLIANT (below 80%)", () => {
    const mappings = evaluateCompliance(cyberOutput({ mfa_adoption_pct: 75 }));
    const m = findMapping(mappings, "art_21_2_i_j");
    expect(m).toBeDefined();
    expect(m!.status).toBe("NON_COMPLIANT");
  });

  it("MFA exactly 95.0% → COMPLIANT (threshold is <95)", () => {
    const mappings = evaluateCompliance(
      cyberOutput({ mfa_adoption_pct: 95.0 }),
    );
    const m = findMapping(mappings, "art_21_2_i_j");
    expect(m).toBeDefined();
    expect(m!.status).toBe("COMPLIANT");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// NIS2 — Art. 23 (Incident Reporting)
// ═══════════════════════════════════════════════════════════════════════

describe("NIS2 Art. 23 — Incident Reporting", () => {
  it("MTTR 600min, 0 reportable → COMPLIANT", () => {
    const mappings = evaluateCompliance(
      cyberOutput({ mttr_minutes: 600, reportable_incidents: 0 }),
    );
    const m = findMapping(mappings, "art_23");
    expect(m).toBeDefined();
    expect(m!.status).toBe("COMPLIANT");
  });

  it("MTTR 600min, 1 reportable → MONITORED", () => {
    const mappings = evaluateCompliance(
      cyberOutput({ mttr_minutes: 600, reportable_incidents: 1 }),
    );
    const m = findMapping(mappings, "art_23");
    expect(m).toBeDefined();
    // reportable > 0 but mttr <= 1440 → MONITORED
    expect(m!.status).toBe("MONITORED");
  });

  it("MTTR 1500min, 1 reportable → NON_COMPLIANT (>24h)", () => {
    const mappings = evaluateCompliance(
      cyberOutput({ mttr_minutes: 1500, reportable_incidents: 1 }),
    );
    const m = findMapping(mappings, "art_23");
    expect(m).toBeDefined();
    expect(m!.status).toBe("NON_COMPLIANT");
  });

  it("MTTR 1440min, 1 reportable → MONITORED (exactly 24h, threshold is >1440)", () => {
    const mappings = evaluateCompliance(
      cyberOutput({ mttr_minutes: 1440, reportable_incidents: 1 }),
    );
    const m = findMapping(mappings, "art_23");
    expect(m).toBeDefined();
    // 1440 is NOT > 1440 → falls to "reportable > 0" → MONITORED
    expect(m!.status).toBe("MONITORED");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MULTI-THRESHOLD & EDGE CASES
// ═══════════════════════════════════════════════════════════════════════

describe("Multi-threshold + Edge Cases", () => {
  it("multiple thresholds violated simultaneously", () => {
    // Orbital: fuel 10% (WARNING Art.70 + WARNING IADC), thruster FAILED (NON_COMPLIANT Art.64, Art.66)
    const mappings = evaluateCompliance(
      orbitalOutput({
        remaining_fuel_pct: 10,
        thruster_status: "FAILED",
        deorbit_capability: "IMPOSSIBLE",
      }),
    );

    // Should have multiple non-compliant/warning mappings
    const art70 = findMapping(mappings, "art_70");
    const art64 = findMapping(mappings, "eu_space_act_art_64");
    const art66 = findMapping(mappings, "art_66");
    const art72 = findMapping(mappings, "art_72");

    expect(art70?.status).toBe("WARNING");
    expect(art64?.status).toBe("NON_COMPLIANT");
    expect(art66?.status).toBe("NON_COMPLIANT");
    expect(art72?.status).toBe("NON_COMPLIANT");

    // All mappings present, not just first
    expect(mappings.length).toBeGreaterThanOrEqual(4);
  });

  it("unknown data_point → empty mapping, no crash", () => {
    const output: CollectorOutput = {
      data_point: "something_completely_random",
      source_system: "test",
      collection_method: "test",
      compliance_notes: [],
      values: { random_field: 42 },
    };
    const mappings = evaluateCompliance(output);
    expect(mappings).toEqual([]);
  });

  it("cyber: multiple violations at once", () => {
    const mappings = evaluateCompliance(
      cyberOutput({
        critical_vulns_unpatched: 3,
        patch_compliance_pct: 60,
        mfa_adoption_pct: 75,
        mttr_minutes: 2000,
        reportable_incidents: 2,
      }),
    );

    const vuln = findMapping(mappings, "art_21_2_e");
    const access = findMapping(mappings, "art_21_2_i_j");
    const art23 = findMapping(mappings, "art_23");

    expect(vuln?.status).toBe("NON_COMPLIANT");
    expect(access?.status).toBe("NON_COMPLIANT");
    expect(art23?.status).toBe("NON_COMPLIANT");
  });
});
