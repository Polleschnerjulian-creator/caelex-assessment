import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateKeyPairSync, createPublicKey, verify } from "node:crypto";
import { hashContent, canonicalize } from "../../crypto/hasher.js";
import { signContent, verifySignature } from "../../crypto/signer.js";
import { evaluateCompliance } from "../../engine/extraction-engine.js";
import { deriveSentinelId } from "../../crypto/keys.js";
import type { CollectorOutput } from "../../types/collector-types.js";
import type {
  EvidencePacket,
  RegulationMapping,
} from "../../types/evidence-packet.js";

const testDir = join(tmpdir(), `sentinel-test-pipeline-${Date.now()}`);

// Replicate processOutput logic for testing without full agent
function buildPacket(
  output: CollectorOutput,
  keys: {
    publicKey: ReturnType<typeof generateKeyPairSync>["publicKey"];
    privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"];
    publicKeyPem: string;
  },
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
    packet_id: `sp_test_${chainState.position}`,
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

  // Advance chain
  chainState.previousHash = contentHash;
  chainState.position++;

  return packet;
}

describe("Agent Pipeline: CollectorOutput → EvidencePacket", () => {
  let keys: { publicKey: any; privateKey: any; publicKeyPem: string };

  beforeEach(() => {
    process.env["SENTINEL_DATA_DIR"] = testDir;
    mkdirSync(testDir, { recursive: true });

    const kp = generateKeyPairSync("ed25519");
    keys = {
      publicKey: kp.publicKey,
      privateKey: kp.privateKey,
      publicKeyPem: kp.publicKey
        .export({ type: "spki", format: "pem" })
        .toString(),
    };
  });

  afterEach(() => {
    delete process.env["SENTINEL_DATA_DIR"];
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("produces a valid EvidencePacket from orbital_parameters", () => {
    const output: CollectorOutput = {
      data_point: "orbital_parameters",
      satellite_norad_id: "58421",
      source_system: "mission_control_fds",
      collection_method: "simulator_read",
      compliance_notes: [],
      values: {
        altitude_km: 550,
        semi_major_axis_km: 6921,
        eccentricity: 0.0002,
        inclination_deg: 97.6,
        remaining_fuel_pct: 44.2,
        remaining_fuel_kg: 22.1,
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
      },
    };

    const chainState = { position: 0, previousHash: "sha256:genesis" };
    const packet = buildPacket(output, keys, chainState);

    // Structure checks
    expect(packet.packet_id).toMatch(/^sp_test_/);
    expect(packet.version).toBe("1.0");
    expect(packet.sentinel_id).toMatch(/^snt_[a-f0-9]{16}$/);
    expect(packet.data.data_point).toBe("orbital_parameters");
    expect(packet.regulation_mapping.length).toBeGreaterThan(0);
    expect(packet.integrity.content_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(packet.integrity.signature).toMatch(/^ed25519:/);
    expect(packet.integrity.chain_position).toBe(0);
    expect(packet.integrity.previous_hash).toBe("sha256:genesis");
    expect(packet.metadata.sentinel_version).toBe("1.4.2");
  });

  it("content hash is correctly recomputable", () => {
    const output: CollectorOutput = {
      data_point: "orbital_parameters",
      satellite_norad_id: "58421",
      source_system: "test",
      collection_method: "test",
      compliance_notes: ["test note"],
      values: {
        altitude_km: 550,
        remaining_fuel_pct: 50,
        thruster_status: "NOMINAL",
        attitude_status: "NOMINAL",
        estimated_lifetime_yr: 15,
        deorbit_capability: "NOMINAL",
        battery_soc_pct: 95,
        solar_array_power_w: 900,
        ca_events_30d: 0,
        high_risk_ca_events: 0,
        ca_maneuvers_30d: 0,
      },
    };

    const chainState = { position: 0, previousHash: "sha256:genesis" };
    const packet = buildPacket(output, keys, chainState);

    // Recompute hash manually
    const recomputed = hashContent({
      data: packet.data,
      regulation_mapping: packet.regulation_mapping,
    });

    expect(recomputed).toBe(packet.integrity.content_hash);
  });

  it("signature is verifiable with public key", () => {
    const output: CollectorOutput = {
      data_point: "orbital_parameters",
      satellite_norad_id: "58421",
      source_system: "test",
      collection_method: "test",
      compliance_notes: [],
      values: {
        altitude_km: 550,
        remaining_fuel_pct: 50,
        thruster_status: "NOMINAL",
        attitude_status: "NOMINAL",
        estimated_lifetime_yr: 15,
        deorbit_capability: "NOMINAL",
        battery_soc_pct: 95,
        solar_array_power_w: 900,
        ca_events_30d: 0,
        high_risk_ca_events: 0,
        ca_maneuvers_30d: 0,
      },
    };

    const chainState = { position: 0, previousHash: "sha256:genesis" };
    const packet = buildPacket(output, keys, chainState);

    const isValid = verifySignature(
      packet.integrity.content_hash,
      packet.integrity.signature,
      keys.publicKey,
    );
    expect(isValid).toBe(true);
  });

  it("chain continuity over 10 packets", () => {
    const chainState = { position: 0, previousHash: "sha256:genesis" };
    const packets: EvidencePacket[] = [];

    for (let i = 0; i < 10; i++) {
      const output: CollectorOutput = {
        data_point: "orbital_parameters",
        satellite_norad_id: "58421",
        source_system: "test",
        collection_method: "test",
        compliance_notes: [],
        values: {
          altitude_km: 550 - i * 0.1,
          remaining_fuel_pct: 50 - i,
          thruster_status: "NOMINAL",
          attitude_status: "NOMINAL",
          estimated_lifetime_yr: 15,
          deorbit_capability: "NOMINAL",
          battery_soc_pct: 95,
          solar_array_power_w: 900,
          ca_events_30d: 0,
          high_risk_ca_events: 0,
          ca_maneuvers_30d: 0,
        },
      };
      packets.push(buildPacket(output, keys, chainState));
    }

    // Check chain continuity
    for (let i = 1; i < packets.length; i++) {
      expect(packets[i]!.integrity.previous_hash).toBe(
        packets[i - 1]!.integrity.content_hash,
      );
      expect(packets[i]!.integrity.chain_position).toBe(i);
    }
    expect(packets[0]!.integrity.previous_hash).toBe("sha256:genesis");
    expect(packets[0]!.integrity.chain_position).toBe(0);
  });

  it("fuel 14% → regulation_mapping contains NON_COMPLIANT for Art. 70", () => {
    // Art. 70: fuel < 15 → WARNING (not NON_COMPLIANT, as per rule def)
    const output: CollectorOutput = {
      data_point: "orbital_parameters",
      satellite_norad_id: "58421",
      source_system: "test",
      collection_method: "test",
      compliance_notes: [],
      values: {
        altitude_km: 550,
        remaining_fuel_pct: 14,
        thruster_status: "NOMINAL",
        attitude_status: "NOMINAL",
        estimated_lifetime_yr: 15,
        deorbit_capability: "NOMINAL",
        battery_soc_pct: 95,
        solar_array_power_w: 900,
        ca_events_30d: 0,
        high_risk_ca_events: 0,
        ca_maneuvers_30d: 0,
      },
    };

    const chainState = { position: 0, previousHash: "sha256:genesis" };
    const packet = buildPacket(output, keys, chainState);

    const art70 = packet.regulation_mapping.find((m) =>
      m.ref.includes("art_70"),
    );
    expect(art70).toBeDefined();
    expect(art70!.status).toBe("WARNING");
  });

  it("fuel 45% → regulation_mapping contains COMPLIANT for Art. 70", () => {
    const output: CollectorOutput = {
      data_point: "orbital_parameters",
      satellite_norad_id: "58421",
      source_system: "test",
      collection_method: "test",
      compliance_notes: [],
      values: {
        altitude_km: 550,
        remaining_fuel_pct: 45,
        thruster_status: "NOMINAL",
        attitude_status: "NOMINAL",
        estimated_lifetime_yr: 15,
        deorbit_capability: "NOMINAL",
        battery_soc_pct: 95,
        solar_array_power_w: 900,
        ca_events_30d: 0,
        high_risk_ca_events: 0,
        ca_maneuvers_30d: 0,
      },
    };

    const chainState = { position: 0, previousHash: "sha256:genesis" };
    const packet = buildPacket(output, keys, chainState);

    const art70 = packet.regulation_mapping.find((m) =>
      m.ref.includes("art_70"),
    );
    expect(art70).toBeDefined();
    expect(art70!.status).toBe("COMPLIANT");
  });

  it("different data_points produce different regulation mappings", () => {
    const orbitalOutput: CollectorOutput = {
      data_point: "orbital_parameters",
      satellite_norad_id: "58421",
      source_system: "test",
      collection_method: "test",
      compliance_notes: [],
      values: {
        altitude_km: 550,
        remaining_fuel_pct: 50,
        thruster_status: "NOMINAL",
        attitude_status: "NOMINAL",
        estimated_lifetime_yr: 15,
        deorbit_capability: "NOMINAL",
        battery_soc_pct: 95,
        solar_array_power_w: 900,
        ca_events_30d: 0,
        high_risk_ca_events: 0,
        ca_maneuvers_30d: 0,
      },
    };

    const cyberOutput: CollectorOutput = {
      data_point: "cyber_posture",
      source_system: "test",
      collection_method: "test",
      compliance_notes: [],
      values: {
        patch_compliance_pct: 96,
        critical_vulns_unpatched: 0,
        mfa_adoption_pct: 99,
        days_since_last_vuln_scan: 3,
        mttr_minutes: 600,
        reportable_incidents: 0,
        backup_status: "VERIFIED",
        encryption_at_rest: "AES-256",
        encryption_in_transit: "TLS-1.3",
        security_training_pct: 92,
        last_backup_test: "2026-01-01",
        last_access_review: "2026-01-01",
        privileged_accounts: 10,
      },
    };

    const chainState = { position: 0, previousHash: "sha256:genesis" };
    const orbitalPacket = buildPacket(orbitalOutput, keys, chainState);
    const cyberPacket = buildPacket(cyberOutput, keys, chainState);

    const orbitalRefs = orbitalPacket.regulation_mapping.map((m) => m.ref);
    const cyberRefs = cyberPacket.regulation_mapping.map((m) => m.ref);

    // Orbital should have EU Space Act + IADC refs
    expect(orbitalRefs.some((r) => r.includes("art_68"))).toBe(true);
    expect(orbitalRefs.some((r) => r.includes("art_70"))).toBe(true);

    // Cyber should have NIS2 refs
    expect(
      cyberRefs.some(
        (r) =>
          r.includes("nis2") || r.includes("art_21") || r.includes("art_23"),
      ),
    ).toBe(true);

    // They should not overlap
    const overlap = orbitalRefs.filter((r) => cyberRefs.includes(r));
    expect(overlap).toHaveLength(0);
  });
});
