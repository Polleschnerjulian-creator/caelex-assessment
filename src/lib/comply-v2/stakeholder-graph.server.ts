/**
 * Stakeholder network graph data layer — Sprint 10E (Wow-Pattern #11)
 *
 * Reads the operator's compliance ecosystem (org + members + active
 * stakeholder engagements) and shapes it into a node + edge graph
 * suitable for a radial-layout visualization. The graph is the
 * "ecosystem at a glance" view — regulators (NCAs), legal counsel,
 * insurers, suppliers, auditors, consultants, launch providers,
 * plus internal team members.
 *
 * # Layout strategy (radial, no D3)
 *
 * The client uses a deterministic radial layout: operator at the
 * centre, stakeholders on a single ring, internal members on a
 * smaller inner ring. Angular position is `(2π * index) /
 * groupSize` with a small per-type rotation offset so groups
 * cluster visually. No physics simulation, no extra deps — pure
 * SVG transform. Adequate for typical operator scales (≤30
 * stakeholders + ≤10 members).
 *
 * # Why we don't surface DataRoom or attestation rows as nodes
 *
 * Those are documents / events, not actors. They DO appear as edge
 * weights — `dataRoomCount` + `attestationCount` per stakeholder
 * shows engagement intensity. A future drill-down can list them on
 * stakeholder click.
 *
 * # Auth scope
 *
 * Per-org, primary-org-membership read scope (same convention as
 * Sprint 5A's mission aggregator and 10A/D's other graph
 * aggregators). FAILED + REVOKED engagements are hidden by
 * default — the graph shows the *current* network, not history.
 */

import "server-only";

import type { StakeholderType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type StakeholderNodeKind =
  | "operator"
  | "internal" // OrganizationMember
  | "external"; // StakeholderEngagement

export interface StakeholderNode {
  id: string;
  kind: StakeholderNodeKind;
  /** Human-readable label rendered next to the dot. */
  label: string;
  /** Sub-label (role / company / type). Optional. */
  subLabel: string | null;
  /** External-only: stakeholder type (LEGAL_COUNSEL / NCA / etc.). */
  type: StakeholderType | null;
  /** Engagement intensity — number of data rooms + attestations
   *  this node has open. Drives the dot size in the visualization. */
  weight: number;
}

export interface StakeholderEdge {
  /** Always the operator node id; outbound from centre. */
  from: string;
  to: string;
  /** Edge "thickness" indicator — same as the target node's weight
   *  but exposed at edge level so the renderer doesn't need to
   *  cross-reference. */
  weight: number;
}

export interface StakeholderNetworkGraph {
  operatorId: string;
  operatorName: string;
  nodes: StakeholderNode[];
  edges: StakeholderEdge[];
  /** Counts by node kind for the summary bar. */
  totals: {
    internal: number;
    external: number;
    perType: Record<StakeholderType, number>;
  };
}

const ZERO_PER_TYPE: Record<StakeholderType, number> = {
  LEGAL_COUNSEL: 0,
  INSURER: 0,
  AUDITOR: 0,
  SUPPLIER: 0,
  NCA: 0,
  CONSULTANT: 0,
  LAUNCH_PROVIDER: 0,
};

/**
 * Build the stakeholder graph for one organisation. Three parallel
 * fetches, joined in-memory.
 */
export async function getStakeholderNetwork(
  organizationId: string,
): Promise<StakeholderNetworkGraph> {
  const [org, members, engagements] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { joinedAt: "asc" },
      take: 50,
    }),
    prisma.stakeholderEngagement.findMany({
      where: {
        organizationId,
        isRevoked: false,
        status: { in: ["INVITED", "ACTIVE"] },
      },
      select: {
        id: true,
        type: true,
        companyName: true,
        contactName: true,
        status: true,
        _count: {
          select: { dataRooms: true, attestations: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
  ]);

  if (!org) {
    return {
      operatorId: organizationId,
      operatorName: "(unknown organisation)",
      nodes: [],
      edges: [],
      totals: { internal: 0, external: 0, perType: { ...ZERO_PER_TYPE } },
    };
  }

  // Operator node
  const operatorNode: StakeholderNode = {
    id: `operator:${org.id}`,
    kind: "operator",
    label: org.name,
    subLabel: "Operator",
    type: null,
    weight: members.length + engagements.length,
  };

  const internalNodes: StakeholderNode[] = members.map((m) => ({
    id: `member:${m.id}`,
    kind: "internal",
    label: m.user.name ?? m.user.email ?? "(unknown user)",
    subLabel: m.role,
    type: null,
    weight: 1,
  }));

  const externalNodes: StakeholderNode[] = engagements.map((e) => ({
    id: `engagement:${e.id}`,
    kind: "external",
    label: e.companyName,
    subLabel: e.contactName,
    type: e.type,
    weight: e._count.dataRooms + e._count.attestations,
  }));

  // Edges: every internal + external connects radially to the
  // operator. The graph is intentionally star-shaped at this scale;
  // when peer-to-peer relationships matter (e.g. counsel→insurer
  // collaboration on a single submission), Sprint 10F's time-travel
  // slider can surface those.
  const edges: StakeholderEdge[] = [
    ...internalNodes.map((n) => ({
      from: operatorNode.id,
      to: n.id,
      weight: n.weight,
    })),
    ...externalNodes.map((n) => ({
      from: operatorNode.id,
      to: n.id,
      weight: n.weight,
    })),
  ];

  // Type histogram for the summary bar.
  const perType: Record<StakeholderType, number> = { ...ZERO_PER_TYPE };
  for (const e of engagements) {
    perType[e.type] += 1;
  }

  return {
    operatorId: organizationId,
    operatorName: org.name,
    nodes: [operatorNode, ...internalNodes, ...externalNodes],
    edges,
    totals: {
      internal: internalNodes.length,
      external: externalNodes.length,
      perType,
    },
  };
}
