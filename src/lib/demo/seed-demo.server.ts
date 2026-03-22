import "server-only";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DemoSeedResult } from "./types";
import { cleanupDemoData } from "./cleanup-demo.server";
import {
  DEMO_SATELLITES,
  DEMO_CONJUNCTION_EVENTS,
  DEMO_CDM_RECORDS,
  DEMO_DOCUMENTS,
  DEMO_ATTESTATIONS,
  DEMO_SENTINEL_AGENT,
  DEMO_SENTINEL_PACKETS,
  DEMO_DEADLINES,
} from "./demo-data";

// ─── Helpers ───

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/** Build a JSON-safe object tagged with _demo:true, cast for Prisma's Json fields */
function demoJson(obj: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify({ _demo: true, ...obj }),
  ) as Prisma.InputJsonValue;
}

// Placeholder Ed25519 public key (hex, 32 bytes)
const DEMO_PUBLIC_KEY =
  "d75a980182b10ab7d54bfed3c964073a0ee172f3daa3f4a18446b7f8b1e04c01";

// ─── Main Seed Function ───

export async function seedDemoData(
  organizationId: string,
  userId: string,
): Promise<DemoSeedResult> {
  const start = Date.now();
  const errors: string[] = [];
  const created = {
    spacecraft: 0,
    conjunctionEvents: 0,
    cdmRecords: 0,
    documents: 0,
    attestations: 0,
    sentinelAgents: 0,
    sentinelPackets: 0,
    ncaSubmissions: 0,
    deadlines: 0,
  };

  // ── Step 0: Idempotent cleanup ──
  try {
    await cleanupDemoData(organizationId);
  } catch (err) {
    errors.push(
      `Cleanup warning: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const now = Date.now();
  const ts = now.toString(36); // compact timestamp for unique IDs

  // ══════════════════════════════════════════════════════════════
  // Step 1: Create Spacecraft
  // ══════════════════════════════════════════════════════════════
  const spacecraftIds: string[] = [];

  for (const sat of DEMO_SATELLITES) {
    try {
      const sc = await prisma.spacecraft.create({
        data: {
          organizationId,
          name: sat.name,
          noradId: sat.noradId,
          cosparId: sat.cosparId,
          missionType: sat.missionType,
          orbitType: sat.orbitType,
          altitudeKm: sat.altitudeKm,
          inclinationDeg: sat.inclinationDeg,
          status: sat.status,
          metadata: demoJson({ source: "demo_seed" }),
        },
      });
      spacecraftIds.push(sc.id);
      created.spacecraft++;
    } catch (err) {
      errors.push(
        `Spacecraft "${sat.name}": ${err instanceof Error ? err.message : String(err)}`,
      );
      spacecraftIds.push(""); // placeholder so indices still work
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Step 2: Create Conjunction Events + CDM Records
  // ══════════════════════════════════════════════════════════════
  const eventIdMap: Record<number, string> = {}; // eventIndex -> db id

  for (let i = 0; i < DEMO_CONJUNCTION_EVENTS.length; i++) {
    const evt = DEMO_CONJUNCTION_EVENTS[i];
    const satIdx = evt.satelliteIndex;
    const sat = DEMO_SATELLITES[satIdx];
    const spacecraftId = spacecraftIds[satIdx];

    if (!spacecraftId) {
      errors.push(
        `Skipping conjunction ${evt.conjunctionId}: spacecraft not created`,
      );
      continue;
    }

    const tca = new Date(now + evt.tcaOffsetHours * 3600_000);

    try {
      const record = await prisma.conjunctionEvent.create({
        data: {
          organizationId,
          spacecraftId,
          noradId: sat.noradId,
          threatNoradId: evt.threatNoradId,
          threatObjectName: evt.threatObjectName,
          threatObjectType: evt.threatObjectType,
          conjunctionId: evt.conjunctionId,
          status: evt.status,
          riskTier: evt.riskTier,
          peakPc: evt.peakPc,
          peakPcAt: tca,
          latestPc: evt.latestPc,
          latestMissDistance: evt.latestMissDistance,
          tca,
          relativeSpeed: evt.relativeSpeed,
          // Decision fields (only on events that have them)
          ...("decision" in evt && evt.decision
            ? {
                decision: evt.decision,
                decisionBy: userId,
                decisionAt: new Date(now - 12 * 3600_000),
                decisionRationale: evt.decisionRationale,
              }
            : {}),
          // Closed event fields
          ...("closedReason" in evt && evt.closedReason
            ? {
                closedAt: new Date(now - 24 * 3600_000),
                closedReason: evt.closedReason,
              }
            : {}),
          ...("ncaNotified" in evt ? { ncaNotified: evt.ncaNotified } : {}),
          ...("reportGenerated" in evt
            ? { reportGenerated: evt.reportGenerated }
            : {}),
        },
      });
      eventIdMap[i] = record.id;
      created.conjunctionEvents++;
    } catch (err) {
      errors.push(
        `ConjunctionEvent "${evt.conjunctionId}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // CDM Records
  for (const cdm of DEMO_CDM_RECORDS) {
    const eventId = eventIdMap[cdm.eventIndex];
    if (!eventId) continue;

    const evt = DEMO_CONJUNCTION_EVENTS[cdm.eventIndex];
    const tca = new Date(now + evt.tcaOffsetHours * 3600_000);
    const creationDate = new Date(now - cdm.hoursBeforeNow * 3600_000);

    try {
      await prisma.cDMRecord.create({
        data: {
          conjunctionEventId: eventId,
          cdmId: cdm.cdmId,
          creationDate,
          tca,
          missDistance: cdm.missDistance,
          relativeSpeed: cdm.relativeSpeed,
          collisionProbability: cdm.collisionProbability,
          probabilityMethod: cdm.probabilityMethod,
          riskTier: cdm.riskTier,
          source: "demo_seed",
          rawCdm: demoJson({
            CCSDS_CDM_VERS: "1.0",
            CREATION_DATE: creationDate.toISOString(),
            ORIGINATOR: "DEMO",
            TCA: tca.toISOString(),
            MISS_DISTANCE: cdm.missDistance,
            RELATIVE_SPEED: cdm.relativeSpeed,
            COLLISION_PROBABILITY: cdm.collisionProbability,
            COLLISION_PROBABILITY_METHOD: cdm.probabilityMethod,
          }),
        },
      });
      created.cdmRecords++;
    } catch (err) {
      errors.push(
        `CDMRecord "${cdm.cdmId}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Step 3: Create Generated Documents
  // ══════════════════════════════════════════════════════════════
  for (const doc of DEMO_DOCUMENTS) {
    try {
      await prisma.generatedDocument.create({
        data: {
          userId,
          organizationId,
          documentType: doc.documentType,
          title: doc.title,
          language: doc.language,
          status: doc.status,
          content: demoJson({
            sections: [
              {
                title: "Executive Summary",
                content:
                  "This is a demo document generated for demonstration purposes.",
              },
            ],
          }),
          modelUsed: "demo-seed",
          generationTimeMs: 0,
        },
      });
      created.documents++;
    } catch (err) {
      errors.push(
        `Document "${doc.title}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Step 4: Create Verity Attestations
  // ══════════════════════════════════════════════════════════════
  const issuerKeyId = `demo-issuer-${ts}`;

  for (let i = 0; i < DEMO_ATTESTATIONS.length; i++) {
    const att = DEMO_ATTESTATIONS[i];
    const attestationId = `demo-att-${ts}-${i}`;
    const collectedAt = new Date(now - (i + 1) * 3600_000 * 24); // stagger by days
    const valueCommitment = sha256(
      `${attestationId}:${att.dataPoint}:${att.trustScore}`,
    );
    const signature = sha256(`sig:${attestationId}:${DEMO_PUBLIC_KEY}`);

    try {
      await prisma.verityAttestation.create({
        data: {
          attestationId,
          operatorId: organizationId,
          organizationId,
          regulationRef: att.regulationRef,
          dataPoint: att.dataPoint,
          thresholdType: att.thresholdType,
          thresholdValue: att.thresholdValue,
          result: att.result,
          claimStatement: att.claimStatement,
          valueCommitment,
          evidenceSource: att.evidenceSource,
          trustScore: att.trustScore,
          trustLevel: att.trustLevel,
          collectedAt,
          issuerKeyId,
          issuerPublicKey: DEMO_PUBLIC_KEY,
          signature,
          fullAttestation: demoJson({
            version: "1.0",
            attestationId,
            regulationRef: att.regulationRef,
            dataPoint: att.dataPoint,
            result: att.result,
            trustScore: att.trustScore,
            trustLevel: att.trustLevel,
            claimStatement: att.claimStatement,
            issuedAt: new Date(now).toISOString(),
          }),
          expiresAt: new Date(now + 365 * 24 * 3600_000), // 1 year
        },
      });
      created.attestations++;
    } catch (err) {
      errors.push(
        `Attestation "${att.regulationRef}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Step 5: Create Sentinel Agent + 15 Packets
  // ══════════════════════════════════════════════════════════════
  let agentId: string | null = null;

  try {
    const agent = await prisma.sentinelAgent.create({
      data: {
        organizationId,
        name: DEMO_SENTINEL_AGENT.name,
        sentinelId: `demo-eurosat-gcs-${ts}`,
        publicKey: DEMO_PUBLIC_KEY,
        token: `demo_token_${ts}`,
        status: "ACTIVE",
        version: DEMO_SENTINEL_AGENT.version,
        enabledCollectors: DEMO_SENTINEL_AGENT.enabledCollectors,
        configHash: sha256(
          JSON.stringify(DEMO_SENTINEL_AGENT.enabledCollectors),
        ),
        lastSeen: new Date(now),
        lastPacketAt: new Date(now),
        chainPosition: DEMO_SENTINEL_PACKETS.length,
        lastChainHash: "", // will be updated after creating packets
      },
    });
    agentId = agent.id;
    created.sentinelAgents++;
  } catch (err) {
    errors.push(
      `SentinelAgent: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Sentinel Packets (with valid hash chain)
  if (agentId) {
    let previousHash = sha256("genesis-demo-chain");

    // Sort packets by hoursAgo descending so oldest is first in chain
    const sortedPackets = [...DEMO_SENTINEL_PACKETS].sort(
      (a, b) => b.hoursAgo - a.hoursAgo,
    );

    for (let i = 0; i < sortedPackets.length; i++) {
      const pkt = sortedPackets[i];
      const packetId = `demo-pkt-${ts}-${String(i).padStart(3, "0")}`;
      const collectedAt = new Date(now - pkt.hoursAgo * 3600_000);
      const chainPosition = i + 1;

      const contentPayload = JSON.stringify({
        packetId,
        dataPoint: pkt.dataPoint,
        values: pkt.values,
        collectedAt: collectedAt.toISOString(),
        chainPosition,
      });
      const contentHash = sha256(contentPayload);
      const signature = sha256(`sig:${contentHash}:${DEMO_PUBLIC_KEY}`);

      try {
        await prisma.sentinelPacket.create({
          data: {
            packetId,
            agentId,
            satelliteNorad: pkt.satelliteNorad,
            dataPoint: pkt.dataPoint,
            values: demoJson(pkt.values),
            sourceSystem: pkt.sourceSystem,
            collectionMethod: pkt.collectionMethod,
            collectedAt,
            complianceNotes: pkt.complianceNotes,
            regulationMapping: demoJson(pkt.regulationMapping),
            contentHash,
            previousHash,
            chainPosition,
            signature,
            signatureValid: true,
            chainValid: true,
            crossVerified: false,
            trustScore: pkt.trustScore,
          },
        });
        created.sentinelPackets++;
        previousHash = contentHash;
      } catch (err) {
        errors.push(
          `SentinelPacket "${packetId}": ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Update agent's lastChainHash to the final hash
    try {
      await prisma.sentinelAgent.update({
        where: { id: agentId },
        data: { lastChainHash: previousHash },
      });
    } catch {
      // non-critical — agent still works
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Step 6: Create Deadlines
  // ══════════════════════════════════════════════════════════════
  for (const dl of DEMO_DEADLINES) {
    try {
      await prisma.deadline.create({
        data: {
          userId,
          title: dl.title,
          description: dl.description,
          dueDate: new Date(now + dl.daysFromNow * 24 * 3600_000),
          category: dl.category,
          priority: dl.priority,
          status: dl.daysFromNow <= 7 ? "DUE_SOON" : "UPCOMING",
        },
      });
      created.deadlines++;
    } catch (err) {
      errors.push(
        `Deadline "${dl.title}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // NCA Submissions: SKIPPED — model has complex required relations
  // Milestones: SKIPPED — require phaseId FK

  return {
    success: errors.length === 0,
    created,
    duration: Date.now() - start,
    errors,
  };
}
