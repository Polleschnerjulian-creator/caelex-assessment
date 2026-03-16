/**
 * Generate 2.0 — Smart Document Order
 *
 * Defines document-level dependencies and computes optimal generation order
 * using Kahn's topological sort algorithm. Later documents can reference
 * specific findings from earlier ones.
 */

import type { NCADocumentType } from "./types";
import { NCA_DOC_TYPE_MAP } from "./types";

export interface DocumentDependency {
  document: NCADocumentType;
  dependsOn: NCADocumentType;
  relationship: string;
  dataPassed: string;
}

export const DOCUMENT_DEPENDENCIES: DocumentDependency[] = [
  // ── Debris Chain ──
  {
    document: "DMP",
    dependsOn: "ORBITAL_LIFETIME",
    relationship: "A1 summarizes A2 lifetime results",
    dataPassed: "predicted decay time, compliance determination",
  },
  {
    document: "DMP",
    dependsOn: "COLLISION_AVOIDANCE",
    relationship: "A1 Section 6 summarizes A3 CA procedures",
    dataPassed: "CA approach summary",
  },
  {
    document: "DMP",
    dependsOn: "EOL_DISPOSAL",
    relationship: "A1 Section 7 summarizes A4 disposal plan",
    dataPassed: "disposal strategy summary",
  },
  {
    document: "DMP",
    dependsOn: "PASSIVATION",
    relationship: "A1 Section 8 summarizes A5 passivation",
    dataPassed: "passivation approach summary",
  },
  {
    document: "EOL_DISPOSAL",
    dependsOn: "ORBITAL_LIFETIME",
    relationship: "A4 derives disposal delta-V from A2 decay analysis",
    dataPassed: "final orbit altitude, required delta-V",
  },
  {
    document: "REENTRY_RISK",
    dependsOn: "ORBITAL_LIFETIME",
    relationship: "A6 uses A2 decay scenario for re-entry trajectory",
    dataPassed: "re-entry epoch, altitude profile",
  },
  {
    document: "REENTRY_RISK",
    dependsOn: "EOL_DISPOSAL",
    relationship: "A6 analyzes the disposal approach defined in A4",
    dataPassed: "disposal method, controlled vs uncontrolled",
  },
  {
    document: "PASSIVATION",
    dependsOn: "EOL_DISPOSAL",
    relationship: "A5 passivation sequence precedes A4 disposal maneuver",
    dataPassed: "pre-disposal sequence timing",
  },
  {
    document: "DEBRIS_SUPPLY_CHAIN",
    dependsOn: "DMP",
    relationship: "A7 flows down requirements identified in A1",
    dataPassed: "debris mitigation requirements list",
  },

  // ── Cybersecurity Chain ──
  {
    document: "CYBER_RISK_ASSESSMENT",
    dependsOn: "CYBER_POLICY",
    relationship: "B2 operates within B1 governance framework",
    dataPassed: "policy scope, security objectives",
  },
  {
    document: "INCIDENT_RESPONSE",
    dependsOn: "CYBER_RISK_ASSESSMENT",
    relationship: "B3 incident scenarios derived from B2 risk assessment",
    dataPassed: "identified threats, risk scenarios",
  },
  {
    document: "INCIDENT_RESPONSE",
    dependsOn: "CYBER_POLICY",
    relationship: "B3 notification chain defined by B1 governance",
    dataPassed: "roles, escalation structure",
  },
  {
    document: "BCP_RECOVERY",
    dependsOn: "INCIDENT_RESPONSE",
    relationship: "B4 extends B3 recovery procedures",
    dataPassed: "recovery procedures baseline",
  },
  {
    document: "BCP_RECOVERY",
    dependsOn: "CYBER_RISK_ASSESSMENT",
    relationship: "B4 BIA based on B2 asset criticality",
    dataPassed: "critical asset list, impact ratings",
  },
  {
    document: "ACCESS_CONTROL",
    dependsOn: "CYBER_POLICY",
    relationship: "B5 implements B1 access policy",
    dataPassed: "access policy framework",
  },
  {
    document: "ACCESS_CONTROL",
    dependsOn: "CYBER_RISK_ASSESSMENT",
    relationship: "B5 access controls address B2 risk treatments",
    dataPassed: "access-related risk treatments",
  },
  {
    document: "SUPPLY_CHAIN_SECURITY",
    dependsOn: "CYBER_RISK_ASSESSMENT",
    relationship: "B6 addresses B2 supply chain risks",
    dataPassed: "supply chain risk findings",
  },
  {
    document: "EUSRN_PROCEDURES",
    dependsOn: "INCIDENT_RESPONSE",
    relationship: "B7 extends B3 notification chain to EUSRN",
    dataPassed: "notification procedures, timelines",
  },
  {
    document: "COMPLIANCE_MATRIX",
    dependsOn: "CYBER_POLICY",
    relationship: "B8 consolidates all B-series compliance",
    dataPassed: "all compliance determinations",
  },
  {
    document: "COMPLIANCE_MATRIX",
    dependsOn: "CYBER_RISK_ASSESSMENT",
    relationship: "B8 includes B2 risk treatment status",
    dataPassed: "risk treatment status",
  },

  // ── Cross-Cutting ──
  {
    document: "AUTHORIZATION_APPLICATION",
    dependsOn: "DMP",
    relationship: "C1 Section 4 summarizes debris compliance from A1",
    dataPassed: "debris compliance summary",
  },
  {
    document: "AUTHORIZATION_APPLICATION",
    dependsOn: "CYBER_POLICY",
    relationship: "C1 Section 4 summarizes cyber compliance from B1",
    dataPassed: "cyber compliance summary",
  },
  {
    document: "AUTHORIZATION_APPLICATION",
    dependsOn: "INSURANCE_COMPLIANCE",
    relationship: "C1 Section 4 includes insurance status from C3",
    dataPassed: "insurance coverage summary",
  },
  {
    document: "AUTHORIZATION_APPLICATION",
    dependsOn: "ENVIRONMENTAL_FOOTPRINT",
    relationship: "C1 Section 4 includes environmental status from C2",
    dataPassed: "EFD grade",
  },
  {
    document: "INSURANCE_COMPLIANCE",
    dependsOn: "ORBITAL_LIFETIME",
    relationship: "C3 liability exposure depends on orbital characteristics",
    dataPassed: "orbit regime, lifetime",
  },
];

/**
 * Compute optimal document generation order using Kahn's topological sort.
 * Priority-based tiebreaking: P0 before P1 before P2 within the same depth.
 */
export function computeOptimalOrder(
  documentsToGenerate: NCADocumentType[],
): NCADocumentType[] {
  const docSet = new Set(documentsToGenerate);

  // Filter dependencies to only include documents we're generating
  const relevantDeps = DOCUMENT_DEPENDENCIES.filter(
    (d) => docSet.has(d.document) && docSet.has(d.dependsOn),
  );

  // Build in-degree map and adjacency list
  const inDegree = new Map<NCADocumentType, number>();
  const adjacency = new Map<NCADocumentType, NCADocumentType[]>();

  for (const doc of documentsToGenerate) {
    inDegree.set(doc, 0);
    adjacency.set(doc, []);
  }

  for (const dep of relevantDeps) {
    inDegree.set(dep.document, (inDegree.get(dep.document) || 0) + 1);
    adjacency.get(dep.dependsOn)?.push(dep.document);
  }

  // Priority comparator: P0 < P1 < P2
  const prioritySort = (a: NCADocumentType, b: NCADocumentType) => {
    const pa = NCA_DOC_TYPE_MAP[a]?.priority || "P2";
    const pb = NCA_DOC_TYPE_MAP[b]?.priority || "P2";
    return pa.localeCompare(pb);
  };

  // Start with documents that have no dependencies
  let currentWave: NCADocumentType[] = [];
  for (const [doc, degree] of inDegree) {
    if (degree === 0) currentWave.push(doc);
  }
  currentWave.sort(prioritySort);

  const order: NCADocumentType[] = [];

  while (currentWave.length > 0) {
    const nextWave: NCADocumentType[] = [];

    for (const current of currentWave) {
      order.push(current);

      for (const neighbor of adjacency.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          nextWave.push(neighbor);
        }
      }
    }

    nextWave.sort(prioritySort);
    currentWave = nextWave;
  }

  // Cycle protection: append any remaining documents
  for (const doc of documentsToGenerate) {
    if (!order.includes(doc)) {
      order.push(doc);
    }
  }

  return order;
}
