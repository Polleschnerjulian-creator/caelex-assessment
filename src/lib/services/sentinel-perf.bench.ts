/**
 * SVA-77: Sentinel Performance Benchmarks
 *
 * Benchmarks pure computation functions used in the Sentinel pipeline:
 * - audit hash computation
 * - canonicalization of nested packet data
 * - SHA-256 content hashing
 * - trust score computation
 *
 * Run with: npx vitest bench src/lib/services/sentinel-perf.bench.ts
 */
import { describe, bench, vi } from "vitest";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Mocks — must be registered before any source imports that pull them in
// ---------------------------------------------------------------------------
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("satellite.js", () => ({}));

// ---------------------------------------------------------------------------
// Imports from source modules
// ---------------------------------------------------------------------------
import { computeEntryHash } from "@/lib/audit-hash.server";
import { computeTrustScore } from "./cross-verification.server";

// ---------------------------------------------------------------------------
// Inline replicas of private helpers from sentinel-service.server.ts
// (these are not exported, so we recreate them here for benchmarking)
// ---------------------------------------------------------------------------
function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(
      (k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`,
    );
    return "{" + pairs.join(",") + "}";
  }
  return String(value);
}

function computeContentHash(data: unknown): string {
  const canonical = canonicalize(data);
  const hash = createHash("sha256").update(canonical).digest("hex");
  return `sha256:${hash}`;
}

// ---------------------------------------------------------------------------
// Realistic test fixtures
// ---------------------------------------------------------------------------
const auditEntry = {
  userId: "usr_a1b2c3d4e5f6g7h8i9j0",
  action: "COMPLIANCE_UPDATE",
  entityType: "SentinelPacket",
  entityId: "pkt_9f8e7d6c5b4a3210",
  timestamp: new Date("2026-02-15T14:32:11.000Z"),
  previousValue: JSON.stringify({
    trustScore: 0.6,
    crossVerified: false,
    chainValid: true,
  }),
  newValue: JSON.stringify({
    trustScore: 0.95,
    crossVerified: true,
    chainValid: true,
  }),
  description: "Trust score elevated after cross-verification with CelesTrak",
  ipAddress: "203.0.113.42",
  userAgent:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/121.0.0.0",
  previousHash:
    "b3a7c9f1e4d8026a5c1b7f3e9d4a8c2b6e0f1a3d5c7b9e1f3a5d7c9b1e3f5a7",
};

const nestedPacketData = {
  data: {
    data_point: "orbital_parameters",
    values: {
      altitude_km: 408.2,
      inclination_deg: 51.6434,
      eccentricity: 0.0001234,
      period_min: 92.68,
      velocity_km_s: 7.66,
      apogee_km: 410.5,
      perigee_km: 405.9,
    },
    source_system: "sentinel-agent-v2",
    collection_method: "tle_propagation",
    collection_timestamp: "2026-02-15T14:32:11.000Z",
    compliance_notes: [
      "Orbit within ITU-registered parameters",
      "Altitude above minimum safe threshold",
      "Inclination matches licensed filing",
    ],
  },
  regulation_mapping: [
    {
      ref: "EU-SPACE-ACT-Art42",
      status: "compliant",
      note: "Orbital slot within authorized range",
    },
    {
      ref: "ITU-RR-Art22",
      status: "compliant",
      note: "Station-keeping within ±0.1° tolerance",
    },
    {
      ref: "IADC-GL-2.1",
      status: "conditional",
      note: "Debris mitigation plan filed, awaiting review",
    },
    {
      ref: "NIS2-Art21",
      status: "compliant",
      note: "Telemetry chain integrity verified",
    },
  ],
};

const trustInputs = {
  level1: {
    signatureValid: false,
    chainValid: false,
    crossVerified: false,
    crossConfidence: 0,
  },
  level2: {
    signatureValid: true,
    chainValid: false,
    crossVerified: false,
    crossConfidence: 0,
  },
  level3: {
    signatureValid: true,
    chainValid: true,
    crossVerified: false,
    crossConfidence: 0,
  },
  level4: {
    signatureValid: true,
    chainValid: true,
    crossVerified: true,
    crossConfidence: 0.75,
  },
  level5: {
    signatureValid: true,
    chainValid: true,
    crossVerified: true,
    crossConfidence: 0.92,
  },
  level6: {
    signatureValid: true,
    chainValid: true,
    crossVerified: true,
    crossConfidence: 0.99,
  },
};

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------
describe("Sentinel Performance Benchmarks", () => {
  bench("computeEntryHash — single audit entry", () => {
    computeEntryHash(auditEntry);
  });

  bench("canonicalize — nested packet data", () => {
    canonicalize(nestedPacketData);
  });

  bench("sha256 content hash — full packet", () => {
    computeContentHash(nestedPacketData);
  });

  bench("computeTrustScore — all trust levels", () => {
    computeTrustScore(trustInputs.level1);
    computeTrustScore(trustInputs.level2);
    computeTrustScore(trustInputs.level3);
    computeTrustScore(trustInputs.level4);
    computeTrustScore(trustInputs.level5);
    computeTrustScore(trustInputs.level6);
  });
});
