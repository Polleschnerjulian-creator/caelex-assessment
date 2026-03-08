/**
 * Sentinel Service — Server-only business logic for Sentinel agents.
 * Handles registration, packet ingestion, chain verification, and trust scoring.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { createHash, createPublicKey, verify } from "node:crypto";
import { randomBytes } from "node:crypto";

// ═══════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════

/**
 * Authenticate a Sentinel agent by its bearer token.
 * Returns the agent record or null.
 */
export async function authenticateSentinelAgent(token: string) {
  const tokenHash = hashToken(token);
  const agent = await prisma.sentinelAgent.findUnique({
    where: { token: tokenHash },
  });
  return agent;
}

function hashToken(raw: string): string {
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
  const hashed = hashToken(raw);
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
    return { error: "Organization not found", status: 404 };
  }

  // Check if agent already exists
  const existing = await prisma.sentinelAgent.findUnique({
    where: { sentinelId: input.sentinel_id },
  });

  if (existing) {
    // Update existing agent
    const updated = await prisma.sentinelAgent.update({
      where: { sentinelId: input.sentinel_id },
      data: {
        publicKey: input.public_key,
        version: input.version,
        enabledCollectors: input.collectors,
        lastSeen: new Date(),
      },
    });
    return { agent: updated, status: 200 };
  }

  // Create new agent
  const agent = await prisma.sentinelAgent.create({
    data: {
      organizationId: org.id,
      name: `Sentinel ${input.sentinel_id.slice(0, 12)}`,
      sentinelId: input.sentinel_id,
      publicKey: input.public_key,
      token: input.tokenHash,
      status: "ACTIVE",
      version: input.version,
      enabledCollectors: input.collectors,
      lastSeen: new Date(),
    },
  });

  return { agent, status: 201 };
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
  const chainValid =
    agent.chainPosition === 0 ||
    (packet.integrity.previous_hash ===
      (agent.lastChainHash ?? "sha256:genesis") &&
      packet.integrity.chain_position === agent.chainPosition);

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

  return {
    accepted: true,
    chain_position: packet.integrity.chain_position,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// CHAIN VERIFICATION
// ═══════════════════════════════════════════════════════════════════════

export async function verifyChain(agentId: string) {
  const packets = await prisma.sentinelPacket.findMany({
    where: { agentId },
    orderBy: { chainPosition: "asc" },
    select: {
      packetId: true,
      chainPosition: true,
      contentHash: true,
      previousHash: true,
      signatureValid: true,
    },
  });

  if (packets.length === 0) {
    return { valid: true, total_packets: 0, breaks: [] };
  }

  const breaks: Array<{
    position: number;
    expected: string;
    actual: string;
  }> = [];

  let expectedPrevHash = "sha256:genesis";
  let expectedPosition = 0;

  for (const pkt of packets) {
    // Check position continuity
    if (pkt.chainPosition !== expectedPosition) {
      breaks.push({
        position: expectedPosition,
        expected: `position ${expectedPosition}`,
        actual: `position ${pkt.chainPosition} (gap)`,
      });
    }

    // Check hash chain
    if (pkt.previousHash !== expectedPrevHash) {
      breaks.push({
        position: pkt.chainPosition,
        expected: expectedPrevHash.slice(0, 20) + "...",
        actual: pkt.previousHash.slice(0, 20) + "...",
      });
    }

    expectedPrevHash = pkt.contentHash;
    expectedPosition = pkt.chainPosition + 1;
  }

  return {
    valid: breaks.length === 0,
    total_packets: packets.length,
    first_position: packets[0]!.chainPosition,
    last_position: packets[packets.length - 1]!.chainPosition,
    breaks,
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
