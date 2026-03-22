import "server-only";
import { prisma } from "@/lib/prisma";
import type { DemoCleanupResult } from "./types";

/**
 * Remove all demo data from an organization.
 * Deletes in dependency order (children first) to avoid FK violations.
 * Identifies demo records by [DEMO] prefix in name/title fields
 * and "DEMO-" prefix in conjunction IDs.
 */
export async function cleanupDemoData(
  organizationId: string,
): Promise<DemoCleanupResult> {
  const start = Date.now();
  const deleted: Record<string, number> = {};

  // ── 1. CDM Records + Escalation Logs (via conjunction events) ──
  const demoEvents = await prisma.conjunctionEvent.findMany({
    where: { organizationId, conjunctionId: { startsWith: "DEMO-" } },
    select: { id: true },
  });
  const eventIds = demoEvents.map((e) => e.id);

  if (eventIds.length > 0) {
    const cdmResult = await prisma.cDMRecord.deleteMany({
      where: { conjunctionEventId: { in: eventIds } },
    });
    deleted.cdmRecords = cdmResult.count;

    const escResult = await prisma.cAEscalationLog.deleteMany({
      where: { conjunctionEventId: { in: eventIds } },
    });
    deleted.escalationLogs = escResult.count;
  }

  // ── 2. Conjunction Events ──
  const evtResult = await prisma.conjunctionEvent.deleteMany({
    where: { organizationId, conjunctionId: { startsWith: "DEMO-" } },
  });
  deleted.conjunctionEvents = evtResult.count;

  // ── 3. Sentinel Packets (via agents) ──
  const demoAgents = await prisma.sentinelAgent.findMany({
    where: { organizationId, name: { startsWith: "[DEMO]" } },
    select: { id: true },
  });
  if (demoAgents.length > 0) {
    const pktResult = await prisma.sentinelPacket.deleteMany({
      where: { agentId: { in: demoAgents.map((a) => a.id) } },
    });
    deleted.sentinelPackets = pktResult.count;
  }

  // ── 4. Sentinel Agents ──
  const agentResult = await prisma.sentinelAgent.deleteMany({
    where: { organizationId, name: { startsWith: "[DEMO]" } },
  });
  deleted.sentinelAgents = agentResult.count;

  // ── 5. Generated Documents ──
  const docResult = await prisma.generatedDocument.deleteMany({
    where: { organizationId, title: { startsWith: "[DEMO]" } },
  });
  deleted.documents = docResult.count;

  // ── 6. Verity Attestations ──
  const attResult = await prisma.verityAttestation.deleteMany({
    where: {
      organizationId,
      claimStatement: { contains: "[DEMO]" },
    },
  });
  deleted.attestations = attResult.count;

  // ── 7. Verity Audit Chain ──
  const chainResult = await prisma.verityAuditChainEntry.deleteMany({
    where: { organizationId, entityId: { startsWith: "demo-" } },
  });
  deleted.auditChain = chainResult.count;

  // ── 8. Verity Passports ──
  const passResult = await prisma.verityPassport.deleteMany({
    where: { organizationId, label: { startsWith: "[DEMO]" } },
  });
  deleted.passports = passResult.count;

  // ── 9. Deadlines ──
  const dlResult = await prisma.deadline.deleteMany({
    where: { title: { startsWith: "[DEMO]" } },
  });
  deleted.deadlines = dlResult.count;

  // ── 10. Spacecraft (last — other things may reference it) ──
  const scResult = await prisma.spacecraft.deleteMany({
    where: { organizationId, name: { startsWith: "[DEMO]" } },
  });
  deleted.spacecraft = scResult.count;

  return {
    success: true,
    deleted,
    duration: Date.now() - start,
  };
}
