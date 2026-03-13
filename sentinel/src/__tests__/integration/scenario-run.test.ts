import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateKeyPairSync } from "node:crypto";
import { hashContent } from "../../crypto/hasher.js";
import { signContent, verifySignature } from "../../crypto/signer.js";
import { evaluateCompliance } from "../../engine/extraction-engine.js";
import { deriveSentinelId } from "../../crypto/keys.js";
import {
  ScenarioRunner,
  loadScenarioProfile,
} from "../../simulator/scenario-engine.js";
import type { CollectorOutput } from "../../types/collector-types.js";
import type { EvidencePacket } from "../../types/evidence-packet.js";

const testDir = join(tmpdir(), `sentinel-test-scenario-run-${Date.now()}`);
const SCENARIOS_DIR = join(__dirname, "../../simulator/scenarios");

function makeKeys() {
  const kp = generateKeyPairSync("ed25519");
  return {
    publicKey: kp.publicKey,
    privateKey: kp.privateKey,
    publicKeyPem: kp.publicKey
      .export({ type: "spki", format: "pem" })
      .toString(),
  };
}

/**
 * Simulate a full collection cycle for one day:
 * - 1 orbital_parameters packet (from scenario state)
 * - 1 cyber_posture packet (from scenario state)
 */
function collectDay(
  runner: ScenarioRunner,
  noradId: string,
  keys: ReturnType<typeof makeKeys>,
  chainState: { position: number; previousHash: string },
  day: number,
): EvidencePacket[] {
  const state = runner.getState(noradId);
  if (!state) return [];

  const packets: EvidencePacket[] = [];

  // Orbital parameters packet
  const fuelPct = state.fuelPct;
  const orbitalOutput: CollectorOutput = {
    data_point: "orbital_parameters",
    satellite_norad_id: noradId,
    source_system: "mission_control_fds",
    collection_method: "simulator_read",
    compliance_notes: [],
    values: {
      altitude_km: state.altitudeKm,
      semi_major_axis_km: 6371 + state.altitudeKm,
      eccentricity: state.eccentricity,
      inclination_deg: state.inclinationDeg,
      remaining_fuel_pct: fuelPct,
      remaining_fuel_kg: fuelPct * 0.5, // Approx
      thruster_status: state.thrusterStatus === 1 ? "NOMINAL" : "FAILED",
      last_maneuver_timestamp: "2026-01-01T00:00:00Z",
      last_maneuver_delta_v: 0.05,
      ca_events_30d: 1,
      high_risk_ca_events: 0,
      ca_maneuvers_30d: 0,
      attitude_status: "NOMINAL",
      solar_array_power_w: (state.solarArrayPowerPct / 100) * 1000,
      battery_soc_pct: state.batterySOC * 100,
      estimated_lifetime_yr: 15,
      deorbit_capability: fuelPct < 5 ? "DEGRADED" : "NOMINAL",
    },
  };
  packets.push(buildPacket(orbitalOutput, keys, chainState));

  // Cyber posture packet
  const cyberOutput: CollectorOutput = {
    data_point: "cyber_posture",
    source_system: "siem_aggregator",
    collection_method: "simulator_read",
    compliance_notes: [],
    values: {
      incidents_30d: state.unpatchedCriticalVulns > 0 ? 2 : 0,
      incidents_by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
      mttd_minutes: 30,
      mttr_minutes: state.incidentResponseMttrMin,
      reportable_incidents: state.unpatchedCriticalVulns > 0 ? 1 : 0,
      critical_vulns_unpatched: state.unpatchedCriticalVulns,
      high_vulns_unpatched: 0,
      patch_compliance_pct: state.patchCompliancePct,
      days_since_last_vuln_scan: 3,
      mfa_adoption_pct: state.mfaAdoptionPct,
      privileged_accounts: 10,
      last_access_review: "2026-01-01",
      backup_status: "VERIFIED",
      last_backup_test: "2026-01-01",
      encryption_at_rest: "AES-256",
      encryption_in_transit: "TLS-1.3",
      last_pentest_date: "2025-12-01",
      security_training_pct: 92,
    },
  };
  packets.push(buildPacket(cyberOutput, keys, chainState));

  return packets;
}

function buildPacket(
  output: CollectorOutput,
  keys: ReturnType<typeof makeKeys>,
  chainState: { position: number; previousHash: string },
): EvidencePacket {
  const mappings = evaluateCompliance(output);
  const data = {
    data_point: output.data_point,
    values: output.values,
    source_system: output.source_system,
    collection_method: output.collection_method,
    collection_timestamp: new Date().toISOString(),
    compliance_notes: output.compliance_notes,
  };
  const contentHash = hashContent({ data, regulation_mapping: mappings });
  const signature = signContent(contentHash, keys.privateKey);

  const packet: EvidencePacket = {
    packet_id: `sp_scenario_${chainState.position}`,
    version: "1.0",
    sentinel_id: deriveSentinelId(keys.publicKeyPem),
    operator_id: "test-operator",
    satellite_norad_id: output.satellite_norad_id ?? null,
    data,
    regulation_mapping: mappings,
    integrity: {
      content_hash: contentHash,
      previous_hash: chainState.previousHash,
      chain_position: chainState.position,
      signature,
      agent_public_key: keys.publicKeyPem,
      timestamp_source: "system_clock",
    },
    metadata: {
      sentinel_version: "1.4.2",
      collector: "test",
      config_hash: "test",
      uptime_seconds: 0,
      packets_sent_total: chainState.position + 1,
    },
  };

  chainState.previousHash = contentHash;
  chainState.position++;
  return packet;
}

describe("Fuel Depletion Scenario — Full Packet Sequence", () => {
  let keys: ReturnType<typeof makeKeys>;

  beforeEach(() => {
    process.env["SENTINEL_DATA_DIR"] = testDir;
    mkdirSync(testDir, { recursive: true });
    keys = makeKeys();
  });

  afterEach(() => {
    delete process.env["SENTINEL_DATA_DIR"];
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("90 days produce valid packet sequence with compliance transition", () => {
    const profile = loadScenarioProfile(
      join(SCENARIOS_DIR, "fuel-depletion.yaml"),
    );
    const start = new Date("2026-01-01T00:00:00Z");
    const runner = new ScenarioRunner(profile, start);
    const chainState = { position: 0, previousHash: "sha256:genesis" };

    const allPackets: EvidencePacket[] = [];

    for (let day = 0; day <= 90; day++) {
      runner.tick(new Date(start.getTime() + day * 86400000));
      const dayPackets = collectDay(runner, "58421", keys, chainState, day);
      allPackets.push(...dayPackets);
    }

    // Should have 2 packets/day × 91 days = 182 packets
    expect(allPackets.length).toBe(182);

    // All signatures must be valid
    for (const pkt of allPackets) {
      const valid = verifySignature(
        pkt.integrity.content_hash,
        pkt.integrity.signature,
        keys.publicKey,
      );
      expect(valid).toBe(true);
    }

    // Hash chain must be unbroken
    for (let i = 1; i < allPackets.length; i++) {
      expect(allPackets[i]!.integrity.previous_hash).toBe(
        allPackets[i - 1]!.integrity.content_hash,
      );
      expect(allPackets[i]!.integrity.chain_position).toBe(i);
    }

    // Fuel values in orbital packets should be generally decreasing
    const orbitalPackets = allPackets.filter(
      (p) => p.data.data_point === "orbital_parameters",
    );
    const fuelValues = orbitalPackets.map(
      (p) => p.data.values["remaining_fuel_pct"] as number,
    );

    // First fuel should be ~45%, last should be much lower
    expect(fuelValues[0]!).toBeGreaterThan(35);
    expect(fuelValues[fuelValues.length - 1]!).toBeLessThan(25);

    // Check for compliance transition: COMPLIANT → WARNING/CRITICAL
    const art70Statuses = orbitalPackets.map((p) => {
      const mapping = p.regulation_mapping.find((m) =>
        m.ref.includes("art_70"),
      );
      return mapping?.status;
    });

    // Should have some COMPLIANT at the start
    const firstCompliantIdx = art70Statuses.indexOf("COMPLIANT");
    expect(firstCompliantIdx).toBeGreaterThanOrEqual(0);

    // Should eventually transition to WARNING or CRITICAL
    const hasWarningOrCritical = art70Statuses.some(
      (s) => s === "WARNING" || s === "CRITICAL",
    );
    expect(hasWarningOrCritical).toBe(true);
  });
});

describe("Cyber Incident Scenario — NIS2 Violations", () => {
  let keys: ReturnType<typeof makeKeys>;

  beforeEach(() => {
    process.env["SENTINEL_DATA_DIR"] = testDir;
    mkdirSync(testDir, { recursive: true });
    keys = makeKeys();
  });

  afterEach(() => {
    delete process.env["SENTINEL_DATA_DIR"];
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("60 days show NIS2 violation window then recovery", () => {
    const profile = loadScenarioProfile(
      join(SCENARIOS_DIR, "cyber-incident.yaml"),
    );
    const start = new Date("2026-01-01T00:00:00Z");
    const runner = new ScenarioRunner(profile, start);
    const chainState = { position: 0, previousHash: "sha256:genesis" };

    const allPackets: EvidencePacket[] = [];

    for (let day = 0; day <= 60; day++) {
      runner.tick(new Date(start.getTime() + day * 86400000));
      const dayPackets = collectDay(runner, "99001", keys, chainState, day);
      allPackets.push(...dayPackets);
    }

    const cyberPackets = allPackets.filter(
      (p) => p.data.data_point === "cyber_posture",
    );

    // Before day 30 (first 30 cyber packets): NIS2 vulnerability mgmt should be COMPLIANT
    const preCyberPackets = cyberPackets.slice(0, 29);
    for (const pkt of preCyberPackets) {
      const vulnMapping = pkt.regulation_mapping.find((m) =>
        m.ref.includes("art_21_2_e"),
      );
      if (vulnMapping) {
        expect(vulnMapping.status).toBe("COMPLIANT");
      }
    }

    // After incident (day 31-44): should see NON_COMPLIANT
    const incidentPackets = cyberPackets.slice(31, 44);
    const hasNonCompliant = incidentPackets.some((pkt) => {
      const vulnMapping = pkt.regulation_mapping.find((m) =>
        m.ref.includes("art_21_2_e"),
      );
      return vulnMapping?.status === "NON_COMPLIANT";
    });
    expect(hasNonCompliant).toBe(true);

    // After recovery (day 50+): should return to COMPLIANT
    const recoveryPackets = cyberPackets.slice(50);
    if (recoveryPackets.length > 0) {
      const lastPkt = recoveryPackets[recoveryPackets.length - 1]!;
      const vulnMapping = lastPkt.regulation_mapping.find((m) =>
        m.ref.includes("art_21_2_e"),
      );
      if (vulnMapping) {
        expect(vulnMapping.status).toBe("COMPLIANT");
      }
    }

    // Chain integrity
    for (let i = 1; i < allPackets.length; i++) {
      expect(allPackets[i]!.integrity.previous_hash).toBe(
        allPackets[i - 1]!.integrity.content_hash,
      );
    }
  });
});
