/**
 * Lineage Graph Builder (Sprint C1 — data layer)
 *
 * Given any "subject" entity (currently: a ComplianceItem id, an
 * OperatorProfile field, or an AstraProposal id), reconstructs the
 * provenance subgraph: which DerivationTraces, AstraProposals,
 * EnrichmentSources, OntologyObligations, and AuditLog entries
 * contributed to its existence.
 *
 * Output is consumed by:
 *   - /dashboard/lineage page (Sprint C1.2 — adds the React-Flow viz)
 *   - GET /api/v1/lineage/:subjectType/:subjectId
 *   - Astra tool: query_lineage_for_subject
 *
 * Design contract:
 *   - Read-only. Never mutates. Never throws.
 *   - Soft-fail per source: a Prisma query that errors returns
 *     null and the corresponding bucket stays empty.
 *   - Bounded: walks at most MAX_DEPTH levels and stops at
 *     MAX_NODES total to keep the graph renderable.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";

// ─── Public types ──────────────────────────────────────────────────────────

export type LineageSubjectType =
  | "compliance-item"
  | "operator-profile-field"
  | "astra-proposal"
  | "audit-log-entry";

export interface LineageSubject {
  type: LineageSubjectType;
  /** For "compliance-item": "{regulationRef}:{requirementCode}".
   *  For "operator-profile-field": "{operatorProfileId}:{fieldName}".
   *  For "astra-proposal": "{proposalId}".
   *  For "audit-log-entry": "{auditLogId}". */
  id: string;
}

export type LineageNodeKind =
  | "subject" // the root
  | "derivation-trace"
  | "astra-proposal"
  | "audit-log"
  | "enrichment-source"
  | "ontology-obligation"
  | "operator-profile";

export interface LineageNode {
  id: string;
  kind: LineageNodeKind;
  label: string;
  /** ISO-8601. */
  timestamp?: string;
  /** 0..1 confidence if known. */
  confidence?: number;
  /** T0..T5 — DerivationTrace verification tier when applicable. */
  verificationTier?: string;
  /** Free-form metadata for the UI to drill into. */
  metadata?: Record<string, unknown>;
}

export interface LineageEdge {
  /** Source node id (upstream — the cause). */
  fromId: string;
  /** Target node id (downstream — the effect). */
  toId: string;
  /** What kind of relationship (drives the edge styling). */
  kind:
    | "derives-from"
    | "proposed-by"
    | "audited-by"
    | "sources-from"
    | "matched-from-ontology";
  /** Free-form note shown on hover. */
  note?: string;
}

export interface LineageGraphResult {
  subject: LineageSubject;
  nodes: LineageNode[];
  edges: LineageEdge[];
  meta: {
    startedAt: string;
    durationMs: number;
    nodeCount: number;
    edgeCount: number;
    truncated: boolean;
    warnings: string[];
  };
}

// ─── Configuration ─────────────────────────────────────────────────────────

const MAX_NODES = 200;
const DERIVATION_TRACE_LOOKBACK_DAYS = 180;

// ─── Public API ────────────────────────────────────────────────────────────

export async function buildLineageGraph(
  organizationId: string,
  subject: LineageSubject,
): Promise<LineageGraphResult> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const warnings: string[] = [];

  const nodes = new Map<string, LineageNode>();
  const edges: LineageEdge[] = [];
  let truncated = false;

  // Root node.
  const subjectNode: LineageNode = {
    id: `subject:${subject.type}:${subject.id}`,
    kind: "subject",
    label: subjectLabel(subject),
  };
  nodes.set(subjectNode.id, subjectNode);

  // ─── DerivationTrace pull ─────────────────────────────────────────────
  const traces = await fetchDerivationTraces(organizationId, subject, warnings);
  for (const trace of traces) {
    if (nodes.size >= MAX_NODES) {
      truncated = true;
      break;
    }
    const node: LineageNode = {
      id: `trace:${trace.id}`,
      kind: "derivation-trace",
      label: `${trace.fieldName} = ${truncateValue(trace.value)}`,
      timestamp: trace.derivedAt?.toISOString(),
      confidence: trace.confidence ?? undefined,
      verificationTier: trace.verificationTier ?? undefined,
      metadata: {
        origin: trace.origin,
        sourceRef: trace.sourceRef,
        modelVersion: trace.modelVersion ?? undefined,
        entryHash: trace.entryHash ?? undefined,
      },
    };
    nodes.set(node.id, node);
    edges.push({
      fromId: node.id,
      toId: subjectNode.id,
      kind: "derives-from",
      note: `${trace.origin} · confidence=${trace.confidence?.toFixed(2) ?? "n/a"}`,
    });

    // Drill into sourceRef for enrichment-origin marker.
    if (
      trace.sourceRef &&
      typeof trace.sourceRef === "object" &&
      "system" in (trace.sourceRef as Record<string, unknown>)
    ) {
      const sys = (trace.sourceRef as Record<string, unknown>).system;
      if (typeof sys === "string") {
        const enrichmentNodeId = `enrichment:${sys}`;
        if (!nodes.has(enrichmentNodeId)) {
          nodes.set(enrichmentNodeId, {
            id: enrichmentNodeId,
            kind: "enrichment-source",
            label: `External source: ${sys}`,
            metadata: { system: sys },
          });
        }
        edges.push({
          fromId: enrichmentNodeId,
          toId: node.id,
          kind: "sources-from",
          note: `Trace was sourced from ${sys}`,
        });
      }
    }
  }

  // ─── AstraProposal pull (if applicable) ───────────────────────────────
  if (subject.type === "compliance-item" || subject.type === "astra-proposal") {
    const proposals = await fetchAstraProposals(
      organizationId,
      subject,
      warnings,
    );
    for (const p of proposals) {
      if (nodes.size >= MAX_NODES) {
        truncated = true;
        break;
      }
      const node: LineageNode = {
        id: `proposal:${p.id}`,
        kind: "astra-proposal",
        label: `AstraProposal: ${p.actionName} (${p.status})`,
        timestamp: p.createdAt?.toISOString(),
        metadata: {
          status: p.status,
          modelName: p.modelName ?? undefined,
          engineVersion: p.engineVersion ?? undefined,
          rationale: p.rationale ?? undefined,
        },
      };
      nodes.set(node.id, node);
      edges.push({
        fromId: node.id,
        toId: subjectNode.id,
        kind: "proposed-by",
        note: `${p.actionName} via ${p.modelName ?? "Astra"}`,
      });
    }
  }

  // ─── AuditLog pull ────────────────────────────────────────────────────
  const auditEntries = await fetchAuditEntries(
    organizationId,
    subject,
    warnings,
  );
  for (const a of auditEntries) {
    if (nodes.size >= MAX_NODES) {
      truncated = true;
      break;
    }
    const node: LineageNode = {
      id: `audit:${a.id}`,
      kind: "audit-log",
      label: `${a.action} on ${a.entityType}`,
      timestamp: a.timestamp?.toISOString(),
      metadata: { actor: a.userId ?? undefined },
    };
    nodes.set(node.id, node);
    edges.push({
      fromId: node.id,
      toId: subjectNode.id,
      kind: "audited-by",
      note: a.action,
    });
  }

  return {
    subject,
    nodes: Array.from(nodes.values()),
    edges,
    meta: {
      startedAt,
      durationMs: Date.now() - t0,
      nodeCount: nodes.size,
      edgeCount: edges.length,
      truncated,
      warnings,
    },
  };
}

// ─── Internals ─────────────────────────────────────────────────────────────

function subjectLabel(s: LineageSubject): string {
  switch (s.type) {
    case "compliance-item":
      return `ComplianceItem ${s.id}`;
    case "operator-profile-field":
      return `OperatorProfile field ${s.id}`;
    case "astra-proposal":
      return `AstraProposal ${s.id}`;
    case "audit-log-entry":
      return `AuditLog entry ${s.id}`;
  }
}

function truncateValue(v: unknown, max = 60): string {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (!s) return "(empty)";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

interface TraceRow {
  id: string;
  fieldName: string;
  value: unknown;
  origin: string;
  sourceRef: unknown;
  confidence: number | null;
  modelVersion: string | null;
  derivedAt: Date | null;
  verificationTier: string | null;
  entryHash: string | null;
}

async function fetchDerivationTraces(
  organizationId: string,
  subject: LineageSubject,
  warnings: string[],
): Promise<TraceRow[]> {
  try {
    // We filter by entityType + entityId derived from the subject.
    const cutoff = new Date(
      Date.now() - DERIVATION_TRACE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );
    const where: Record<string, unknown> = {
      organizationId,
      derivedAt: { gte: cutoff },
    };

    if (subject.type === "operator-profile-field") {
      const [opId, fieldName] = subject.id.split(":");
      where.entityType = "operator_profile";
      if (opId) where.entityId = opId;
      if (fieldName) where.fieldName = fieldName;
    } else if (subject.type === "compliance-item") {
      where.entityType = "compliance-item";
      where.entityId = subject.id;
    } else {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (await (prisma as any).derivationTrace.findMany({
      where,
      select: {
        id: true,
        fieldName: true,
        value: true,
        origin: true,
        sourceRef: true,
        confidence: true,
        modelVersion: true,
        derivedAt: true,
        verificationTier: true,
        entryHash: true,
      },
      orderBy: { derivedAt: "desc" },
      take: 50,
    })) as TraceRow[];
    return rows;
  } catch (err) {
    warnings.push(
      `DerivationTrace lookup soft-failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
    safeLog("lineage.derivationTrace.fail", {
      organizationId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return [];
  }
}

interface ProposalRow {
  id: string;
  actionName: string;
  status: string;
  itemId: string | null;
  modelName: string | null;
  engineVersion: string | null;
  rationale: string | null;
  createdAt: Date | null;
}

async function fetchAstraProposals(
  organizationId: string,
  subject: LineageSubject,
  warnings: string[],
): Promise<ProposalRow[]> {
  try {
    const where: Record<string, unknown> = {};

    if (subject.type === "astra-proposal") {
      where.id = subject.id;
    } else if (subject.type === "compliance-item") {
      where.itemId = subject.id;
    } else {
      return [];
    }

    // Scope by organization via the user → org-membership join (the
    // AstraProposal model is user-keyed, not org-keyed). We do a
    // best-effort: fetch then filter post-hoc against organization.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (await (prisma as any).astraProposal.findMany({
      where,
      select: {
        id: true,
        actionName: true,
        status: true,
        itemId: true,
        modelName: true,
        engineVersion: true,
        rationale: true,
        createdAt: true,
        userId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    })) as Array<ProposalRow & { userId: string | null }>;

    // Filter by org via OrganizationMember.
    if (rows.length === 0) return [];
    const userIds = Array.from(
      new Set(rows.map((r) => r.userId).filter((u): u is string => Boolean(u))),
    );
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: { in: userIds }, organizationId },
      select: { userId: true },
    });
    const orgUserIds = new Set(memberships.map((m) => m.userId));
    return rows.filter((r) => r.userId && orgUserIds.has(r.userId));
  } catch (err) {
    warnings.push(
      `AstraProposal lookup soft-failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
    safeLog("lineage.astraProposal.fail", {
      organizationId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return [];
  }
}

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  timestamp: Date | null;
  userId: string | null;
}

async function fetchAuditEntries(
  organizationId: string,
  subject: LineageSubject,
  warnings: string[],
): Promise<AuditRow[]> {
  try {
    const where: Record<string, unknown> = { organizationId };

    if (subject.type === "compliance-item") {
      where.entityType = "compliance-item";
      where.entityId = subject.id;
    } else if (subject.type === "astra-proposal") {
      where.entityType = "astra-proposal";
      where.entityId = subject.id;
    } else if (subject.type === "audit-log-entry") {
      where.id = subject.id;
    } else {
      return [];
    }

    const rows = (await prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        timestamp: true,
        userId: true,
      },
      orderBy: { timestamp: "desc" },
      take: 20,
    })) as AuditRow[];
    return rows;
  } catch (err) {
    warnings.push(
      `AuditLog lookup soft-failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
    safeLog("lineage.auditLog.fail", {
      organizationId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return [];
  }
}
