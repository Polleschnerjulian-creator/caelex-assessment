/**
 * Cross-Verification Service — Server-only.
 * Compares agent-reported orbital data against public CelesTrak TLE data
 * using SGP4 propagation via satellite.js.
 * Also computes Trust Scores based on verification results.
 */
import "server-only";
import * as sat from "satellite.js";
import { prisma } from "@/lib/prisma";
import type { CelesTrakGPRecord } from "@/lib/satellites/types";

// ═══════════════════════════════════════════════════════════════════════
// CELESTRAK TLE FETCH
// ═══════════════════════════════════════════════════════════════════════

interface TLECache {
  data: Map<string, CelesTrakGPRecord>;
  fetchedAt: number;
}

let tleCache: TLECache | null = null;
const TLE_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Fetch GP data for a specific NORAD ID from CelesTrak.
 * Uses in-memory cache to avoid hammering the API.
 */
const NORAD_ID_RE = /^\d{1,8}$/;

async function fetchTLE(noradId: string): Promise<CelesTrakGPRecord | null> {
  // Validate NORAD ID to prevent URL injection (SVA-20)
  if (!NORAD_ID_RE.test(noradId)) return null;

  // Check cache
  if (tleCache && Date.now() - tleCache.fetchedAt < TLE_CACHE_TTL) {
    return tleCache.data.get(noradId) ?? null;
  }

  // Fetch single satellite GP data
  try {
    const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${encodeURIComponent(noradId)}&FORMAT=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const records: CelesTrakGPRecord[] = await res.json();
    if (!records || records.length === 0) return null;

    // Cache the record
    if (!tleCache) {
      tleCache = { data: new Map(), fetchedAt: Date.now() };
    }
    tleCache.data.set(noradId, records[0]!);
    tleCache.fetchedAt = Date.now();

    return records[0]!;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SGP4 PROPAGATION
// ═══════════════════════════════════════════════════════════════════════

interface PropagatedPosition {
  altitude_km: number;
  latitude_deg: number;
  longitude_deg: number;
  velocity_km_s: number;
}

/**
 * Propagate a satellite's position using SGP4 from GP elements.
 */
function propagatePosition(
  gp: CelesTrakGPRecord,
  targetDate: Date,
): PropagatedPosition | null {
  try {
    // Build TLE-equivalent satrec from GP elements
    const satrec = sat.twoline2satrec(buildTLELine1(gp), buildTLELine2(gp));

    const posVel = sat.propagate(satrec, targetDate);
    if (!posVel || !posVel.position || typeof posVel.position === "boolean")
      return null;

    const gmst = sat.gstime(targetDate);
    const geodetic = sat.eciToGeodetic(posVel.position, gmst);

    const velocity =
      posVel.velocity && typeof posVel.velocity !== "boolean"
        ? Math.sqrt(
            posVel.velocity.x ** 2 +
              posVel.velocity.y ** 2 +
              posVel.velocity.z ** 2,
          )
        : 0;

    return {
      altitude_km: geodetic.height,
      latitude_deg: sat.degreesLat(geodetic.latitude),
      longitude_deg: sat.degreesLong(geodetic.longitude),
      velocity_km_s: velocity,
    };
  } catch {
    return null;
  }
}

/**
 * Build TLE Line 1 from GP record.
 * Format: https://celestrak.org/columns/v04n03/
 */
function buildTLELine1(gp: CelesTrakGPRecord): string {
  const norad = String(gp.NORAD_CAT_ID).padStart(5, "0");
  const classification = gp.CLASSIFICATION_TYPE || "U";
  const cospar = (gp.OBJECT_ID || "00000A").replace("-", "");
  const intlDesig = cospar.padEnd(8, " ");

  // Parse epoch
  const epochDate = new Date(gp.EPOCH);
  const year = epochDate.getUTCFullYear() % 100;
  const startOfYear = new Date(Date.UTC(epochDate.getUTCFullYear(), 0, 1));
  const dayOfYear =
    (epochDate.getTime() - startOfYear.getTime()) / 86400000 + 1;
  const epochStr = `${String(year).padStart(2, "0")}${dayOfYear.toFixed(8).padStart(12, "0")}`;

  const mmDot = formatTLEDecimal(gp.MEAN_MOTION_DOT ?? 0, 10);
  const mmDdot = formatTLEExponential(gp.MEAN_MOTION_DDOT ?? 0);
  const bstar = formatTLEExponential(gp.BSTAR ?? 0);
  const ephType = gp.EPHEMERIS_TYPE ?? 0;
  const elsetNo = String(gp.ELEMENT_SET_NO ?? 0).padStart(4, " ");

  const line = `1 ${norad}${classification} ${intlDesig}${epochStr} ${mmDot} ${mmDdot} ${bstar} ${ephType} ${elsetNo}`;
  const checksum = tleChecksum(line);
  return line + checksum;
}

/**
 * Build TLE Line 2 from GP record.
 */
function buildTLELine2(gp: CelesTrakGPRecord): string {
  const norad = String(gp.NORAD_CAT_ID).padStart(5, "0");
  const inc = (gp.INCLINATION ?? 0).toFixed(4).padStart(8, " ");
  const raan = (gp.RA_OF_ASC_NODE ?? 0).toFixed(4).padStart(8, " ");
  const ecc = (gp.ECCENTRICITY ?? 0).toFixed(7).replace("0.", "");
  const argp = (gp.ARG_OF_PERICENTER ?? 0).toFixed(4).padStart(8, " ");
  const ma = (gp.MEAN_ANOMALY ?? 0).toFixed(4).padStart(8, " ");
  const mm = (gp.MEAN_MOTION ?? 0).toFixed(8).padStart(11, " ");
  const rev = String(gp.REV_AT_EPOCH ?? 0).padStart(5, " ");

  const line = `2 ${norad} ${inc} ${raan} ${ecc} ${argp} ${ma} ${mm}${rev}`;
  const checksum = tleChecksum(line);
  return line + checksum;
}

function formatTLEDecimal(val: number, width: number): string {
  const sign = val >= 0 ? " " : "-";
  const str = Math.abs(val).toFixed(8);
  return (sign + str).padStart(width, " ");
}

function formatTLEExponential(val: number): string {
  if (val === 0) return " 00000-0";
  const sign = val >= 0 ? " " : "-";
  const abs = Math.abs(val);
  const exp = Math.floor(Math.log10(abs));
  const mantissa = abs / 10 ** exp;
  const mantissaStr = (mantissa * 100000).toFixed(0).padStart(5, "0");
  const expSign = exp >= 0 ? "+" : "-";
  return `${sign}${mantissaStr}${expSign}${Math.abs(exp)}`;
}

function tleChecksum(line: string): number {
  let sum = 0;
  for (const ch of line) {
    if (ch >= "0" && ch <= "9") sum += parseInt(ch);
    else if (ch === "-") sum += 1;
  }
  return sum % 10;
}

// ═══════════════════════════════════════════════════════════════════════
// CROSS-VERIFICATION
// ═══════════════════════════════════════════════════════════════════════

interface VerificationResult {
  verified: boolean;
  checks: CrossCheck[];
  confidence: number;
  public_source: string;
}

interface CrossCheck {
  field: string;
  agent_value: number;
  public_value: number;
  delta: number;
  threshold: number;
  result: "MATCH" | "CLOSE" | "MISMATCH";
}

/**
 * Cross-verify a Sentinel packet's orbital data against CelesTrak.
 * Only applies to packets with satellite_norad and orbital_parameters data.
 */
export async function crossVerifyPacket(
  packetId: string,
): Promise<VerificationResult | null> {
  const packet = await prisma.sentinelPacket.findUnique({
    where: { id: packetId },
  });

  if (
    !packet ||
    !packet.satelliteNorad ||
    packet.dataPoint !== "orbital_parameters"
  ) {
    return null; // Not applicable
  }

  const gp = await fetchTLE(packet.satelliteNorad);
  if (!gp) {
    return null; // CelesTrak unavailable
  }

  // SVA-71: Reject stale TLE data — SGP4 unreliable beyond 14 days from epoch
  if (gp.EPOCH) {
    const epochAge =
      (Date.now() - new Date(gp.EPOCH).getTime()) / (1000 * 60 * 60 * 24);
    if (epochAge > 14) {
      return null; // TLE too old for reliable propagation
    }
  }

  const collectedAt = new Date(packet.collectedAt);
  const propagated = propagatePosition(gp, collectedAt);
  if (!propagated) {
    return null; // SGP4 failed
  }

  const values = packet.values as Record<string, unknown>;
  const checks: CrossCheck[] = [];

  // Compare altitude
  if (typeof values.altitude_km === "number") {
    const delta = Math.abs(values.altitude_km - propagated.altitude_km);
    checks.push({
      field: "altitude_km",
      agent_value: values.altitude_km,
      public_value: Math.round(propagated.altitude_km * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      threshold: 50, // 50km tolerance for SGP4 vs. real telemetry
      result: delta < 10 ? "MATCH" : delta < 50 ? "CLOSE" : "MISMATCH",
    });
  }

  // Compare inclination
  if (typeof values.inclination_deg === "number") {
    const delta = Math.abs(values.inclination_deg - (gp.INCLINATION ?? 0));
    checks.push({
      field: "inclination_deg",
      agent_value: values.inclination_deg,
      public_value: gp.INCLINATION ?? 0,
      delta: Math.round(delta * 10000) / 10000,
      threshold: 0.5,
      result: delta < 0.1 ? "MATCH" : delta < 0.5 ? "CLOSE" : "MISMATCH",
    });
  }

  // Compare period
  if (typeof values.period_min === "number") {
    const delta = Math.abs(values.period_min - (gp.PERIOD ?? 0));
    checks.push({
      field: "period_min",
      agent_value: values.period_min,
      public_value: Math.round((gp.PERIOD ?? 0) * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      threshold: 2,
      result: delta < 0.5 ? "MATCH" : delta < 2 ? "CLOSE" : "MISMATCH",
    });
  }

  // Compare eccentricity
  if (typeof values.eccentricity === "number") {
    const delta = Math.abs(values.eccentricity - (gp.ECCENTRICITY ?? 0));
    checks.push({
      field: "eccentricity",
      agent_value: values.eccentricity,
      public_value: gp.ECCENTRICITY ?? 0,
      delta: Math.round(delta * 1000000) / 1000000,
      threshold: 0.001,
      result: delta < 0.0001 ? "MATCH" : delta < 0.001 ? "CLOSE" : "MISMATCH",
    });
  }

  // Compute confidence
  const matchCount = checks.filter((c) => c.result === "MATCH").length;
  const closeCount = checks.filter((c) => c.result === "CLOSE").length;
  const totalChecks = checks.length;

  let confidence = 0;
  if (totalChecks > 0) {
    confidence = (matchCount * 1.0 + closeCount * 0.6) / totalChecks;
    confidence = Math.round(confidence * 100) / 100;
  }

  const verified =
    confidence >= 0.7 && checks.every((c) => c.result !== "MISMATCH");

  // Store cross-verification results
  for (const check of checks) {
    await prisma.crossVerification.create({
      data: {
        packetId,
        agentId: packet.agentId,
        dataPoint: check.field,
        agentValue: check.agent_value,
        publicValue: check.public_value,
        publicSource: `CelesTrak GP (NORAD ${packet.satelliteNorad})`,
        delta: check.delta,
        result: check.result,
        confidence:
          check.result === "MATCH" ? 1.0 : check.result === "CLOSE" ? 0.6 : 0.1,
      },
    });
  }

  // Update packet trust score
  const trustScore = computeTrustScore({
    signatureValid: packet.signatureValid,
    chainValid: packet.chainValid,
    crossVerified: verified,
    crossConfidence: confidence,
  });

  await prisma.sentinelPacket.update({
    where: { id: packetId },
    data: {
      trustScore,
      crossVerified: verified,
    },
  });

  return {
    verified,
    checks,
    confidence,
    public_source: `CelesTrak GP (NORAD ${packet.satelliteNorad})`,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// TRUST SCORE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Trust Score Hierarchy:
 *
 * Level 0: Self-assessment only (no agent)         → 0.50
 * Level 1: Agent collected, no signature            → 0.60
 * Level 2: Agent + valid signature                  → 0.70
 * Level 3: Agent + signature + valid chain          → 0.80
 * Level 4: Agent + signature + chain + cross-check  → 0.90
 * Level 5: All above + high cross confidence        → 0.95
 * Level 6: All above + multiple sources confirmed   → 0.98
 */
export function computeTrustScore(input: {
  signatureValid: boolean;
  chainValid: boolean;
  crossVerified: boolean;
  crossConfidence: number;
}): number {
  let score = 0.6; // Base: agent collected

  if (input.signatureValid) score = 0.7;
  if (input.signatureValid && input.chainValid) score = 0.8;
  if (input.signatureValid && input.chainValid && input.crossVerified) {
    score = 0.9;
    if (input.crossConfidence >= 0.9) score = 0.95;
    if (input.crossConfidence >= 0.98) score = 0.98;
  }

  return score;
}

const BATCH_CONCURRENCY = 5;
const BATCH_TIMEOUT_MS = 50_000; // 10s buffer for Vercel's 60s limit

/**
 * Batch cross-verify all unverified orbital packets for an agent.
 * Processes in parallel batches of 5 with timeout guard.
 * Pre-warms TLE cache to avoid duplicate HTTP calls.
 */
export async function crossVerifyAgent(agentId: string): Promise<{
  total: number;
  verified: number;
  failed: number;
  skipped: number;
}> {
  const startTime = Date.now();

  const packets = await prisma.sentinelPacket.findMany({
    where: {
      agentId,
      dataPoint: "orbital_parameters",
      crossVerified: false,
      satelliteNorad: { not: null },
    },
    orderBy: { chainPosition: "asc" },
    take: 100,
    select: { id: true, satelliteNorad: true },
  });

  if (packets.length === 0) {
    return { total: 0, verified: 0, failed: 0, skipped: 0 };
  }

  // Pre-warm TLE cache: fetch unique NORAD IDs upfront
  const uniqueNorads = [...new Set(packets.map((p) => p.satelliteNorad!))];
  await Promise.allSettled(uniqueNorads.map((n) => fetchTLE(n)));

  let verified = 0;
  let failed = 0;
  let skipped = 0;

  // Process in parallel batches
  for (let i = 0; i < packets.length; i += BATCH_CONCURRENCY) {
    // Timeout guard: abort if approaching serverless limit
    if (Date.now() - startTime > BATCH_TIMEOUT_MS) {
      skipped += packets.length - i;
      break;
    }

    const batch = packets.slice(i, i + BATCH_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((p) => crossVerifyPacket(p.id)),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        failed++;
      } else if (result.value === null) {
        skipped++;
      } else if (result.value.verified) {
        verified++;
      } else {
        failed++;
      }
    }
  }

  return { total: packets.length, verified, failed, skipped };
}
