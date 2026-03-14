/**
 * Sentinel Service — Server-only business logic for Sentinel agents.
 * Handles registration, packet ingestion, chain verification, and trust scoring.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  createHash,
  createHmac,
  createPublicKey,
  verify,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";

/** Sentinel chain genesis sentinel — first packet's previousHash must match this. */
export const CHAIN_GENESIS_HASH = "sha256:genesis";

// ═══════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════

/**
 * Authenticate a Sentinel agent by its bearer token.
 * Returns the agent record or null.
 */
export async function authenticateSentinelAgent(token: string) {
  const tokenHash = hashSentinelToken(token);
  const agent = await prisma.sentinelAgent.findUnique({
    where: { token: tokenHash },
  });
  return agent;
}

/**
 * Hash a token using HMAC-SHA256 with a server-side secret (SVA-39).
 * Falls back to plain SHA-256 if AUTH_SECRET is not set (dev only).
 */
export function hashSentinelToken(raw: string): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) {
    return createHmac("sha256", secret).update(raw).digest("hex");
  }
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Generate a new Sentinel token (returned raw to user once).
 */
export function generateSentinelToken(): {
  raw: string;
  hashed: string;
} {
  const raw = `snt_${randomBytes(24).toString("base64url")}`;
  const hashed = hashSentinelToken(raw);
  return { raw, hashed };
}

// ═══════════════════════════════════════════════════════════════════════
// REGISTRATION
// ═══════════════════════════════════════════════════════════════════════

export async function registerSentinelAgent(input: {
  sentinel_id: string;
  operator_id: string;
  public_key: string;
  version: string;
  collectors: string[];
  tokenHash: string;
}) {
  // Find the organization
  const org = await prisma.organization.findFirst({
    where: {
      OR: [{ id: input.operator_id }, { slug: input.operator_id }],
    },
  });

  if (!org) {
    return { error: "Registration failed", status: 400 };
  }

  // Check if agent already exists
  const existing = await prisma.sentinelAgent.findUnique({
    where: { sentinelId: input.sentinel_id },
  });

  if (existing) {
    // Verify caller owns the agent by checking token
    if (existing.token !== input.tokenHash) {
      return { error: "Cannot update agent: invalid token", status: 403 };
    }

    // Update metadata ONLY — do NOT update publicKey (SVA-05)
    const updated = await prisma.sentinelAgent.update({
      where: { sentinelId: input.sentinel_id },
      data: {
        version: input.version,
        enabledCollectors: input.collectors,
        lastSeen: new Date(),
      },
    });
    return { agent: updated, status: 200 };
  }

  // Create new agent — catch unique constraint race condition (SVA-51)
  try {
    const agent = await prisma.sentinelAgent.create({
      data: {
        organizationId: org.id,
        name: `Sentinel ${input.sentinel_id.slice(0, 12)}`,
        sentinelId: input.sentinel_id,
        publicKey: input.public_key,
        token: input.tokenHash,
        status: "PENDING",
        version: input.version,
        enabledCollectors: input.collectors,
        lastSeen: new Date(),
      },
    });
    return { agent, status: 201 };
  } catch (err: unknown) {
    // Concurrent registration won the race — retry as update
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint failed")
    ) {
      return { error: "Agent already registered (concurrent)", status: 409 };
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// PACKET INGESTION
// ═══════════════════════════════════════════════════════════════════════

interface IngestResult {
  accepted: boolean;
  error?: string;
  chain_position?: number;
}

export async function ingestPacket(
  agentId: string,
  packet: EvidencePacketInput,
): Promise<IngestResult> {
  // 1. Fetch agent
  const agent = await prisma.sentinelAgent.findUnique({
    where: { id: agentId },
  });
  if (!agent) return { accepted: false, error: "Agent not found" };
  if (agent.status !== "ACTIVE")
    return { accepted: false, error: "Agent not active" };

  // 2. Verify Ed25519 signature — REJECT if invalid
  const signatureValid = verifyPacketSignature(
    packet.integrity.content_hash,
    packet.integrity.signature,
    agent.publicKey,
  );
  if (!signatureValid) {
    return { accepted: false, error: "SIGNATURE_INVALID" };
  }

  // 3. Verify content hash — REJECT if mismatch
  const expectedHash = computeContentHash({
    data: packet.data,
    regulation_mapping: packet.regulation_mapping,
  });
  if (expectedHash !== packet.integrity.content_hash) {
    return { accepted: false, error: "HASH_MISMATCH" };
  }

  // 4. Verify chain continuity (warn but accept — breaks may indicate packet loss)
  const expectedPrevHash = agent.lastChainHash ?? CHAIN_GENESIS_HASH;
  const chainValid =
    packet.integrity.previous_hash === expectedPrevHash &&
    packet.integrity.chain_position === agent.chainPosition;

  // 5. Store packet + update agent atomically
  try {
    await prisma.$transaction([
      prisma.sentinelPacket.create({
        data: {
          packetId: packet.packet_id,
          agentId,
          satelliteNorad: packet.satellite_norad_id,
          dataPoint: packet.data.data_point,
          values: packet.data.values as object,
          sourceSystem: packet.data.source_system,
          collectionMethod: packet.data.collection_method,
          collectedAt: new Date(packet.data.collection_timestamp),
          complianceNotes: packet.data.compliance_notes,
          regulationMapping: packet.regulation_mapping as object[],
          contentHash: packet.integrity.content_hash,
          previousHash: packet.integrity.previous_hash,
          chainPosition: packet.integrity.chain_position,
          signature: packet.integrity.signature,
          signatureValid: true,
          chainValid,
          trustScore: 0.6, // Base trust: agent-collected (SVA-45)
        },
      }),
      prisma.sentinelAgent.update({
        where: { id: agentId },
        data: {
          lastSeen: new Date(),
          lastPacketAt: new Date(),
          chainPosition: packet.integrity.chain_position + 1,
          lastChainHash: packet.integrity.content_hash,
          version: packet.metadata.sentinel_version,
          configHash: packet.metadata.config_hash,
        },
      }),
    ]);
  } catch (err: unknown) {
    // Handle duplicate packet_id (idempotent retry)
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint failed")
    ) {
      return {
        accepted: true,
        chain_position: packet.integrity.chain_position,
      };
    }
    throw err;
  }

  // 6. Auto-provision Spacecraft + SatelliteComplianceState for new NORAD IDs
  if (packet.satellite_norad_id) {
    autoProvisionSpacecraft(
      agent.organizationId,
      packet.satellite_norad_id,
      packet.data.data_point === "orbital_parameters"
        ? (packet.data.values as Record<string, unknown>)
        : null,
    ).catch((err) => logger.error("[sentinel/auto-provision]", err));
  }

  return {
    accepted: true,
    chain_position: packet.integrity.chain_position,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// AUTO-PROVISION SPACECRAFT
// ═══════════════════════════════════════════════════════════════════════

/**
 * Upserts a Spacecraft record when a Sentinel packet arrives with a NORAD ID
 * that has no matching Spacecraft in the organization. Also ensures an initial
 * SatelliteComplianceState exists so the satellite appears in the Ephemeris fleet.
 */
async function autoProvisionSpacecraft(
  organizationId: string,
  noradId: string,
  orbitalValues: Record<string, unknown> | null,
): Promise<void> {
  // Check if spacecraft already exists for this org + norad
  const existing = await prisma.spacecraft.findFirst({
    where: { organizationId, noradId },
    select: { id: true },
  });

  if (existing) return;

  // Derive orbit type from altitude
  const altitude = orbitalValues
    ? typeof orbitalValues.altitude_km === "number"
      ? orbitalValues.altitude_km
      : typeof orbitalValues.altitude === "number"
        ? orbitalValues.altitude
        : null
    : null;
  const inclination = orbitalValues
    ? typeof orbitalValues.inclination_deg === "number"
      ? orbitalValues.inclination_deg
      : typeof orbitalValues.inclination === "number"
        ? orbitalValues.inclination
        : null
    : null;

  let orbitType = "LEO";
  if (altitude !== null) {
    if (altitude > 35000) orbitType = "GEO";
    else if (altitude > 2000) orbitType = "MEO";
  }

  const spacecraft = await prisma.spacecraft.create({
    data: {
      organizationId,
      name: `SAT-${noradId}`,
      noradId,
      missionType: "unknown",
      orbitType,
      altitudeKm: altitude,
      inclinationDeg: inclination,
      status: "OPERATIONAL",
      metadata: { autoProvisioned: true, source: "sentinel-ingest" },
    },
  });

  logger.info(
    `[sentinel/auto-provision] Created Spacecraft ${spacecraft.id} for NORAD ${noradId}`,
  );

  // Ensure SatelliteComplianceState exists for Ephemeris fleet visibility
  await prisma.satelliteComplianceState.upsert({
    where: {
      noradId_operatorId: { noradId, operatorId: organizationId },
    },
    create: {
      noradId,
      operatorId: organizationId,
      overallScore: 0,
      moduleScores: {},
      dataSources: { sentinel: { active: true } },
      horizonConfidence: "LOW",
      dataFreshness: "LIVE",
      satelliteName: `SAT-${noradId}`,
    },
    update: {},
  });
}

// ═══════════════════════════════════════════════════════════════════════
// CHAIN VERIFICATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Verifies the hash-chain integrity for a Sentinel agent.
 * Incremental: only verifies packets after lastVerifiedPosition.
 * Updates checkpoint atomically on success.
 *
 * @param fullVerify - Re-verify entire chain from genesis (ignores checkpoint)
 */
export async function verifyChain(
  agentId: string,
  fullVerify = false,
): Promise<{
  valid: boolean;
  total_packets: number;
  verified_from: number;
  verified_to: number;
  breaks: Array<{ position: number; expected: string; actual: string }>;
  incremental: boolean;
}> {
  const agent = await prisma.sentinelAgent.findUnique({
    where: { id: agentId },
    select: { lastVerifiedPosition: true, lastVerifiedHash: true },
  });

  const startPosition = fullVerify
    ? null
    : (agent?.lastVerifiedPosition ?? null);
  const startHash = fullVerify ? null : (agent?.lastVerifiedHash ?? null);

  // Fetch only unverified packets (or all if fullVerify / no checkpoint)
  // Include values + regulationMapping to re-compute content hashes (SVA-15)
  const packets = await prisma.sentinelPacket.findMany({
    where: {
      agentId,
      ...(startPosition != null
        ? { chainPosition: { gt: startPosition } }
        : {}),
    },
    orderBy: { chainPosition: "asc" },
    select: {
      packetId: true,
      chainPosition: true,
      contentHash: true,
      previousHash: true,
      signatureValid: true,
      dataPoint: true,
      values: true,
      sourceSystem: true,
      collectionMethod: true,
      collectedAt: true,
      complianceNotes: true,
      regulationMapping: true,
    },
  });

  if (packets.length === 0) {
    return {
      valid: true,
      total_packets: 0,
      verified_from: startPosition ?? 0,
      verified_to: startPosition ?? 0,
      breaks: [],
      incremental: startPosition != null,
    };
  }

  const breaks: Array<{
    position: number;
    expected: string;
    actual: string;
  }> = [];

  let expectedPrevHash = startHash ?? CHAIN_GENESIS_HASH;
  let expectedPosition = (startPosition ?? -1) + 1;

  for (const pkt of packets) {
    if (pkt.chainPosition !== expectedPosition) {
      breaks.push({
        position: expectedPosition,
        expected: `position ${expectedPosition}`,
        actual: `position ${pkt.chainPosition} (gap)`,
      });
    }

    if (pkt.previousHash !== expectedPrevHash) {
      breaks.push({
        position: pkt.chainPosition,
        expected: expectedPrevHash.slice(0, 20) + "...",
        actual: pkt.previousHash.slice(0, 20) + "...",
      });
    }

    // Re-compute content hash from stored data to detect tampering (SVA-15)
    if (fullVerify && pkt.values && pkt.regulationMapping) {
      const recomputed = computeContentHash({
        data: {
          data_point: pkt.dataPoint,
          values: pkt.values,
          source_system: pkt.sourceSystem,
          collection_method: pkt.collectionMethod,
          collection_timestamp: pkt.collectedAt.toISOString(),
          compliance_notes: pkt.complianceNotes,
        },
        regulation_mapping: pkt.regulationMapping,
      });
      if (recomputed !== pkt.contentHash) {
        breaks.push({
          position: pkt.chainPosition,
          expected: pkt.contentHash.slice(0, 20) + "...",
          actual: `TAMPERED (recomputed ${recomputed.slice(0, 20)}...)`,
        });
      }
    }

    expectedPrevHash = pkt.contentHash;
    expectedPosition = pkt.chainPosition + 1;
  }

  const lastPacket = packets[packets.length - 1]!;

  // Update checkpoint atomically if chain is valid
  if (breaks.length === 0) {
    await prisma.sentinelAgent.update({
      where: { id: agentId },
      data: {
        lastVerifiedPosition: lastPacket.chainPosition,
        lastVerifiedHash: lastPacket.contentHash,
      },
    });
  }

  return {
    valid: breaks.length === 0,
    total_packets: packets.length,
    verified_from: packets[0]!.chainPosition,
    verified_to: lastPacket.chainPosition,
    breaks,
    incremental: startPosition != null,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function verifyPacketSignature(
  contentHash: string,
  signatureStr: string,
  publicKeyPem: string,
): boolean {
  try {
    const sigBase64 = signatureStr.replace("ed25519:", "");
    const sigBuffer = Buffer.from(sigBase64, "base64");
    const data = Buffer.from(contentHash, "utf-8");
    const publicKey = createPublicKey(publicKeyPem);
    return verify(null, data, publicKey, sigBuffer);
  } catch {
    return false;
  }
}

function computeContentHash(data: unknown): string {
  const canonical = canonicalize(data);
  const hash = createHash("sha256").update(canonical).digest("hex");
  return `sha256:${hash}`;
}

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

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface EvidencePacketInput {
  packet_id: string;
  version: string;
  sentinel_id: string;
  operator_id: string;
  satellite_norad_id: string | null;
  data: {
    data_point: string;
    values: Record<string, unknown>;
    source_system: string;
    collection_method: string;
    collection_timestamp: string;
    compliance_notes: string[];
  };
  regulation_mapping: Array<{
    ref: string;
    status: string;
    note: string;
  }>;
  integrity: {
    content_hash: string;
    previous_hash: string;
    chain_position: number;
    signature: string;
    agent_public_key: string;
    timestamp_source: string;
  };
  metadata: {
    sentinel_version: string;
    collector: string;
    config_hash: string;
    uptime_seconds: number;
    packets_sent_total: number;
  };
}
