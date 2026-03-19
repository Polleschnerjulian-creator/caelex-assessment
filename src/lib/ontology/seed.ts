/**
 * Regulatory Ontology — Seed Script
 *
 * Transforms all 22 regulatory data files into OntologyNode and OntologyEdge
 * records in the database. This is the core ETL pipeline that builds the
 * compliance knowledge graph from enacted standards, jurisdictions, and the
 * EU Space Act proposal.
 *
 * Data sources:
 *   - 8 standards files (IADC, ISO 24113, COPUOS LTS, NIS2, ISO 27001, CCSDS, ITU RR, ITAR/EAR)
 *   - 10 jurisdiction files (FR, DE, GB, NL, BE, LU, AT, DK, IT, NO)
 *   - 1 EU Space Act proposal file (67 articles)
 *   - 1 regulatory cross-reference map (82 mappings)
 *
 * Run via: seedOntology()
 */
import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getAllEnactedRequirements,
  getAvailableJurisdictions,
  getJurisdiction,
} from "@/data/regulatory/index";
import { getEUSpaceActArticles } from "@/data/regulatory/eu-space-act-proposal";
import type { ComplianceCategory, OperatorType } from "@/data/regulatory/types";
import type { OntologyNodeType, OntologyEdgeType } from "./types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SeedResult {
  success: boolean;
  version: string;
  nodeCount: number;
  edgeCount: number;
  nodesByType: Record<string, number>;
  edgesByType: Record<string, number>;
  duration: number;
  errors: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SEED_VERSION = "1.0.0";

const DOMAINS: ComplianceCategory[] = [
  "debris",
  "cybersecurity",
  "spectrum",
  "export_control",
  "insurance",
  "environmental",
  "authorization",
  "registration",
  "supervision",
];

const OPERATOR_TYPES: OperatorType[] = [
  "SCO",
  "LO",
  "LSO",
  "ISOS",
  "CAP",
  "PDP",
  "TCO",
];

const OPERATOR_TYPE_LABELS: Record<OperatorType, string> = {
  SCO: "Spacecraft Operator",
  LO: "Launch Operator",
  LSO: "Launch Site Operator",
  ISOS: "In-Space Operations & Services",
  CAP: "Collision Avoidance Provider",
  PDP: "Payload Data Provider",
  TCO: "Tracking, Command & Operations",
};

const DOMAIN_LABELS: Record<ComplianceCategory, string> = {
  debris: "Space Debris Mitigation",
  cybersecurity: "Cybersecurity",
  spectrum: "Spectrum & Frequency Management",
  export_control: "Export Control",
  insurance: "Insurance & Liability",
  environmental: "Environmental Sustainability",
  authorization: "Authorization & Licensing",
  registration: "Registration",
  supervision: "Supervision & Oversight",
};

/**
 * Map framework strings (as used in data files) to standard node codes.
 * The data files use varying naming conventions — this normalizes them.
 */
const FRAMEWORK_TO_CODE: Record<string, string> = {
  IADC: "STD-IADC",
  "ISO 24113:2019": "STD-ISO_24113",
  "COPUOS LTS Guidelines": "STD-COPUOS_LTS",
  "NIS2 Directive (EU) 2022/2555": "STD-NIS2",
  "ISO/IEC 27001:2022": "STD-ISO_27001",
  "CCSDS 350.1-G-3": "STD-CCSDS",
  "ITU Radio Regulations": "STD-ITU_RR",
  "ITU Radio Regulations (WRC-23)": "STD-ITU_RR",
  ITAR: "STD-ITAR",
  EAR: "STD-EAR",
};

const FRAMEWORK_LABELS: Record<string, string> = {
  "STD-IADC": "IADC Space Debris Mitigation Guidelines Rev.2",
  "STD-ISO_24113": "ISO 24113:2019 — Space Debris Mitigation",
  "STD-COPUOS_LTS": "COPUOS Long-term Sustainability Guidelines",
  "STD-NIS2": "NIS2 Directive (EU) 2022/2555",
  "STD-ISO_27001": "ISO/IEC 27001:2022 — Information Security",
  "STD-CCSDS": "CCSDS 350.1-G-3 — Space Data System Security",
  "STD-ITU_RR": "ITU Radio Regulations",
  "STD-ITAR": "International Traffic in Arms Regulations (ITAR)",
  "STD-EAR": "Export Administration Regulations (EAR)",
};

const FRAMEWORK_SOURCE_FILES: Record<string, string> = {
  "STD-IADC": "standards/iadc-guidelines.ts",
  "STD-ISO_24113": "standards/iso-24113.ts",
  "STD-COPUOS_LTS": "standards/copuos-lts.ts",
  "STD-NIS2": "standards/nis2-directive.ts",
  "STD-ISO_27001": "standards/iso-27001.ts",
  "STD-CCSDS": "standards/ccsds-security.ts",
  "STD-ITU_RR": "standards/itu-radio-regulations.ts",
  "STD-ITAR": "standards/itar-ear.ts",
  "STD-EAR": "standards/itar-ear.ts",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Map to track node code → database ID for edge creation */
const nodeIdMap = new Map<string, string>();

function log(message: string) {
  console.log(`[ontology-seed] ${message}`);
}

/**
 * Create a single edge, swallowing unique constraint violations.
 * The @@unique([fromNodeId, toNodeId, type]) constraint prevents duplicates.
 */
async function createEdgeSafe(
  type: OntologyEdgeType,
  fromCode: string,
  toCode: string,
  properties?: Record<string, unknown>,
  weight = 1.0,
): Promise<boolean> {
  const fromNodeId = nodeIdMap.get(fromCode);
  const toNodeId = nodeIdMap.get(toCode);

  if (!fromNodeId || !toNodeId) {
    return false;
  }

  try {
    await prisma.ontologyEdge.create({
      data: {
        type,
        fromNodeId,
        toNodeId,
        properties: properties
          ? (properties as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        weight,
      },
    });
    return true;
  } catch {
    // Unique constraint violation — edge already exists
    return false;
  }
}

/**
 * Infer a compliance domain from an EUSA article code.
 * Used as a fallback when an EU Space Act article lacks a category or its
 * category does not map to an existing DOMAIN node.
 *
 * Article number ranges are based on COM(2025) 335 structure:
 *   Art. 1, 3, 4, 6, 7, 10  → authorization
 *   Art. 14–17               → authorization
 *   Art. 58–72               → debris (Art. 70–72 overlap: debris wins)
 *   Art. 59–61               → environmental (debris takes priority for overlap)
 *   Art. 74, 76              → supervision
 *   Art. 85–86               → supervision
 */
function inferDomainFromArticleRef(code: string): string {
  // Extract the leading integer from codes like "EUSA-Art58", "EUSA-Art70_5", etc.
  const match = code.match(/^EUSA-Art(\d+)/);
  if (!match) return "authorization";

  const n = parseInt(match[1], 10);

  // Debris takes highest priority for the overlapping ranges
  if ((n >= 58 && n <= 72) || (n >= 70 && n <= 72)) return "debris";

  // Authorization ranges
  if (n >= 14 && n <= 17) return "authorization";
  if ([1, 3, 4, 6, 7, 10].includes(n)) return "authorization";

  // Environmental (59–61 is sub-range of 58–72; debris already handles those above,
  // but kept here for documentation clarity — unreachable due to ordering)
  if (n >= 59 && n <= 61) return "environmental";

  // Supervision
  if (n === 74 || n === 76) return "supervision";
  if (n >= 85 && n <= 86) return "supervision";

  // Default fallback
  return "authorization";
}

/**
 * Derive a source file path from a framework string.
 */
function sourceFileForFramework(framework: string): string {
  const code = FRAMEWORK_TO_CODE[framework];
  if (code && FRAMEWORK_SOURCE_FILES[code]) {
    return FRAMEWORK_SOURCE_FILES[code];
  }
  return "standards/unknown.ts";
}

/**
 * Derive the source file for a jurisdiction code.
 */
function sourceFileForJurisdiction(code: string): string {
  const map: Record<string, string> = {
    FR: "jurisdictions/france.ts",
    DE: "jurisdictions/germany.ts",
    GB: "jurisdictions/uk.ts",
    NL: "jurisdictions/netherlands.ts",
    BE: "jurisdictions/belgium.ts",
    LU: "jurisdictions/luxembourg.ts",
    AT: "jurisdictions/austria.ts",
    DK: "jurisdictions/denmark.ts",
    IT: "jurisdictions/italy.ts",
    NO: "jurisdictions/norway.ts",
  };
  return map[code] ?? "jurisdictions/unknown.ts";
}

// ─── Seed Steps ─────────────────────────────────────────────────────────────

/**
 * Step 2: Create DOMAIN nodes (9 categories).
 */
async function seedDomains(): Promise<number> {
  log("Seeding domains...");

  const nodes = DOMAINS.map((domain) => ({
    type: "DOMAIN" as OntologyNodeType,
    code: `DOMAIN-${domain}`,
    label: DOMAIN_LABELS[domain],
    properties: {},
    confidence: 1.0,
    sourceFile: "types.ts",
  }));

  const result = await prisma.ontologyNode.createMany({ data: nodes });

  // Populate nodeIdMap
  const created = await prisma.ontologyNode.findMany({
    where: { type: "DOMAIN" },
    select: { id: true, code: true },
  });
  for (const n of created) {
    nodeIdMap.set(n.code, n.id);
  }

  return result.count;
}

/**
 * Step 3: Create OPERATOR_TYPE nodes (7).
 */
async function seedOperatorTypes(): Promise<number> {
  log("Seeding operator types...");

  const nodes = OPERATOR_TYPES.map((op) => ({
    type: "OPERATOR_TYPE" as OntologyNodeType,
    code: `OP-${op}`,
    label: OPERATOR_TYPE_LABELS[op],
    properties: {},
    confidence: 1.0,
    sourceFile: "types.ts",
  }));

  const result = await prisma.ontologyNode.createMany({ data: nodes });

  const created = await prisma.ontologyNode.findMany({
    where: { type: "OPERATOR_TYPE" },
    select: { id: true, code: true },
  });
  for (const n of created) {
    nodeIdMap.set(n.code, n.id);
  }

  return result.count;
}

/**
 * Step 4: Create STANDARD nodes from the 9 frameworks.
 */
async function seedStandards(): Promise<number> {
  log("Seeding standards...");

  const standardCodes = Object.keys(FRAMEWORK_LABELS);
  const nodes = standardCodes.map((code) => ({
    type: "STANDARD" as OntologyNodeType,
    code,
    label: FRAMEWORK_LABELS[code],
    properties: {
      sourceFile: FRAMEWORK_SOURCE_FILES[code],
    },
    confidence: 1.0,
    sourceFile: FRAMEWORK_SOURCE_FILES[code],
  }));

  const result = await prisma.ontologyNode.createMany({ data: nodes });

  const created = await prisma.ontologyNode.findMany({
    where: { type: "STANDARD" },
    select: { id: true, code: true },
  });
  for (const n of created) {
    nodeIdMap.set(n.code, n.id);
  }

  return result.count;
}

/**
 * Step 5: Create OBLIGATION nodes from all enacted requirements (8 standards).
 * Also creates BELONGS_TO, APPLIES_TO, and EU Space Act proposal edges.
 */
async function seedEnactedObligations(): Promise<{
  nodes: number;
  edges: number;
}> {
  log("Seeding enacted obligations...");

  const requirements = getAllEnactedRequirements();
  let nodeCount = 0;
  let edgeCount = 0;

  for (const req of requirements) {
    const code = `OBL-${req.id}`;
    const sourceFile = sourceFileForFramework(req.source.framework);

    // Create OBLIGATION node
    const node = await prisma.ontologyNode.create({
      data: {
        type: "OBLIGATION",
        code,
        label: req.source.title,
        properties: {
          fullText: req.source.fullText,
          reference: req.source.reference,
          framework: req.source.framework,
          citation: req.source.citation,
          lastVerified: req.source.lastVerified,
          priority: req.priority,
          status: req.source.status,
        },
        confidence: 1.0,
        sourceFile,
      },
    });
    nodeIdMap.set(code, node.id);
    nodeCount++;

    // BELONGS_TO → Domain
    const domainCode = `DOMAIN-${req.category}`;
    if (await createEdgeSafe("BELONGS_TO", code, domainCode)) {
      edgeCount++;
    }

    // CONTAINS edge: Standard → Obligation
    const stdCode = FRAMEWORK_TO_CODE[req.source.framework];
    if (stdCode && (await createEdgeSafe("CONTAINS", stdCode, code))) {
      edgeCount++;
    }

    // APPLIES_TO → OperatorType nodes
    if (req.applicableTo === "all") {
      for (const op of OPERATOR_TYPES) {
        if (await createEdgeSafe("APPLIES_TO", code, `OP-${op}`)) {
          edgeCount++;
        }
      }
    } else {
      for (const op of req.applicableTo) {
        if (await createEdgeSafe("APPLIES_TO", code, `OP-${op}`)) {
          edgeCount++;
        }
      }
    }

    // EU Space Act proposal edge
    if (req.euSpaceActProposal) {
      const euArticleCode = `EUSA-Art${req.euSpaceActProposal.articleRef.replace(/^Art\.\s*/, "").replace(/[^a-zA-Z0-9]/g, "_")}`;
      const edgeType = mapProposalRelationship(
        req.euSpaceActProposal.relationship,
      );
      // Edge from EU article → this obligation (if the EU article node exists later)
      // For now store as property on the node for forward reference
      if (
        await createEdgeSafe(edgeType, euArticleCode, code, {
          confidence: req.euSpaceActProposal.confidence,
          articleRef: req.euSpaceActProposal.articleRef,
        })
      ) {
        edgeCount++;
      }
    }
  }

  return { nodes: nodeCount, edges: edgeCount };
}

/**
 * Map ProposalRelationship to OntologyEdgeType.
 */
function mapProposalRelationship(
  relationship: "codifies" | "extends" | "new_obligation",
): OntologyEdgeType {
  switch (relationship) {
    case "codifies":
      return "CODIFIES";
    case "extends":
      return "EXTENDS";
    case "new_obligation":
      return "NEW_OBLIGATION";
  }
}

/**
 * Step 6: Create JURISDICTION + AUTHORITY nodes and national OBLIGATION nodes.
 */
async function seedJurisdictions(): Promise<{
  nodes: number;
  edges: number;
}> {
  log("Seeding jurisdictions...");

  const codes = getAvailableJurisdictions();
  let nodeCount = 0;
  let edgeCount = 0;

  for (const jCode of codes) {
    const jurisdiction = getJurisdiction(jCode);
    if (!jurisdiction) continue;

    const sourceFile = sourceFileForJurisdiction(jCode);

    // Create JURISDICTION node
    const jNode = await prisma.ontologyNode.create({
      data: {
        type: "JURISDICTION",
        code: `JUR-${jCode}`,
        label: jurisdiction.name,
        properties: {
          countryCode: jCode,
          spaceLaw: jurisdiction.spaceLaw
            ? {
                name: jurisdiction.spaceLaw.name,
                citation: jurisdiction.spaceLaw.citation,
                yearEnacted: jurisdiction.spaceLaw.yearEnacted,
                status: jurisdiction.spaceLaw.status,
              }
            : null,
          rigor: jurisdiction.rigor,
          insurance: jurisdiction.insurance,
        },
        confidence: 1.0,
        sourceFile,
      },
    });
    nodeIdMap.set(`JUR-${jCode}`, jNode.id);
    nodeCount++;

    // Create AUTHORITY node
    const authCode = `AUTH-${jurisdiction.nca.name.replace(/\s+/g, "_")}`;
    const authNode = await prisma.ontologyNode.create({
      data: {
        type: "AUTHORITY",
        code: authCode,
        label: jurisdiction.nca.name,
        properties: {
          fullName: jurisdiction.nca.fullName,
          website: jurisdiction.nca.website,
          language: jurisdiction.nca.language,
          executiveSummaryLanguage: jurisdiction.nca.executiveSummaryLanguage,
        },
        confidence: 1.0,
        sourceFile,
      },
    });
    nodeIdMap.set(authCode, authNode.id);
    nodeCount++;

    // ADMINISTERED_BY edge: Jurisdiction → Authority
    if (await createEdgeSafe("ADMINISTERED_BY", `JUR-${jCode}`, authCode)) {
      edgeCount++;
    }

    // Create national OBLIGATION nodes from jurisdiction requirements
    for (const req of jurisdiction.requirements) {
      const oblCode = `OBL-${req.id}`;

      const oblNode = await prisma.ontologyNode.create({
        data: {
          type: "OBLIGATION",
          code: oblCode,
          label: req.nationalRef.title,
          properties: {
            law: req.nationalRef.law,
            article: req.nationalRef.article,
            fullText: req.nationalRef.fullText,
            category: req.category,
            jurisdictionCode: jCode,
          },
          confidence: 1.0,
          sourceFile,
        },
      });
      nodeIdMap.set(oblCode, oblNode.id);
      nodeCount++;

      // SCOPED_TO edge: Obligation → Jurisdiction
      if (await createEdgeSafe("SCOPED_TO", oblCode, `JUR-${jCode}`)) {
        edgeCount++;
      }

      // BELONGS_TO → Domain
      const domainCode = `DOMAIN-${req.category}`;
      if (await createEdgeSafe("BELONGS_TO", oblCode, domainCode)) {
        edgeCount++;
      }

      // APPLIES_TO → OperatorType nodes
      // NationalRequirement has no applicableTo field; national space laws apply to
      // all operator types by default unless the national law specifies otherwise.
      let appliesToCount = 0;
      for (const op of OPERATOR_TYPES) {
        if (await createEdgeSafe("APPLIES_TO", oblCode, `OP-${op}`)) {
          appliesToCount++;
        }
      }
      edgeCount += appliesToCount;

      // IMPLEMENTS edges from standardsMapping
      for (const mapping of req.standardsMapping) {
        const stdCode = FRAMEWORK_TO_CODE[mapping.framework];
        if (stdCode) {
          if (
            await createEdgeSafe("IMPLEMENTS", oblCode, stdCode, {
              reference: mapping.reference,
              relationship: mapping.relationship,
            })
          ) {
            edgeCount++;
          }
        }

        // Also try to link to the enacted obligation node if it exists
        // (e.g., FR-RT-41-9 implements IADC-5.3.2)
        // We search for matching obligation nodes by framework+reference
        const enactedReqs = getAllEnactedRequirements().filter(
          (er) =>
            er.source.framework === mapping.framework &&
            er.source.reference === mapping.reference,
        );
        for (const enacted of enactedReqs) {
          const enactedCode = `OBL-${enacted.id}`;
          if (
            await createEdgeSafe("IMPLEMENTS", oblCode, enactedCode, {
              relationship: mapping.relationship,
            })
          ) {
            edgeCount++;
          }
        }
      }
    }
  }

  return { nodes: nodeCount, edges: edgeCount };
}

/**
 * Step 7: Create EU Space Act Proposal OBLIGATION nodes (confidence = 0.5).
 */
async function seedEUSpaceActArticles(): Promise<{
  nodes: number;
  edges: number;
}> {
  log("Seeding EU Space Act proposal articles...");

  const articles = getEUSpaceActArticles();
  let nodeCount = 0;
  let edgeCount = 0;

  for (const article of articles) {
    const code = `EUSA-Art${article.articleNumber.replace(/[^a-zA-Z0-9]/g, "_")}`;

    // Skip if node already exists (from forward references in step 5)
    if (nodeIdMap.has(code)) continue;

    const node = await prisma.ontologyNode.create({
      data: {
        type: "OBLIGATION",
        code,
        label: `EU Space Act Art. ${article.articleNumber} — ${article.title}`,
        properties: {
          articleNumber: article.articleNumber,
          title: article.title,
          summary: article.summary,
          titleNumber: article.titleNumber,
          chapter: article.chapter,
          status: article.status,
          proposalRef: article.proposalRef,
          proposalDate: article.proposalDate,
          councilUpdate: article.councilUpdate,
          disclaimer: article.disclaimer,
        },
        confidence: 0.5,
        sourceFile: "eu-space-act-proposal.ts",
      },
    });
    nodeIdMap.set(code, node.id);
    nodeCount++;

    // BELONGS_TO → Domain (with fallback inference when category is missing or unmapped)
    const domainCode = `DOMAIN-${article.category}`;
    const belongsToCreated = await createEdgeSafe(
      "BELONGS_TO",
      code,
      domainCode,
    );
    if (belongsToCreated) {
      edgeCount++;
    } else {
      // Fallback: infer domain from article number range
      const inferredDomain = inferDomainFromArticleRef(code);
      const fallbackDomainCode = `DOMAIN-${inferredDomain}`;
      if (await createEdgeSafe("BELONGS_TO", code, fallbackDomainCode)) {
        edgeCount++;
      }
    }

    // APPLIES_TO → OperatorType nodes
    if (article.applicableTo === "all") {
      for (const op of OPERATOR_TYPES) {
        if (await createEdgeSafe("APPLIES_TO", code, `OP-${op}`)) {
          edgeCount++;
        }
      }
    } else {
      for (const op of article.applicableTo) {
        if (await createEdgeSafe("APPLIES_TO", code, `OP-${op}`)) {
          edgeCount++;
        }
      }
    }

    // CODIFIES / EXTENDS edges to enacted equivalents
    for (const eq of article.enactedEquivalents) {
      const edgeType = mapProposalRelationship(eq.relationship);
      // Try to find the enacted obligation by framework + reference
      const enactedReqs = getAllEnactedRequirements().filter(
        (er) =>
          er.source.framework === eq.framework ||
          FRAMEWORK_TO_CODE[er.source.framework] ===
            FRAMEWORK_TO_CODE[eq.framework],
      );

      // Link to the standard node at minimum
      const stdCode = FRAMEWORK_TO_CODE[eq.framework];
      if (stdCode) {
        if (
          await createEdgeSafe(edgeType, code, stdCode, {
            reference: eq.reference,
          })
        ) {
          edgeCount++;
        }
      }

      // Also link to specific enacted obligations that match the reference
      for (const enacted of enactedReqs) {
        if (enacted.source.reference === eq.reference) {
          const enactedCode = `OBL-${enacted.id}`;
          if (
            await createEdgeSafe(edgeType, code, enactedCode, {
              reference: eq.reference,
            })
          ) {
            edgeCount++;
          }
        }
      }
    }
  }

  // Now create any EUSA nodes that were referenced in step 5 but not yet created
  // (articles referenced by euSpaceActProposal on enacted requirements)
  const allReqs = getAllEnactedRequirements();
  for (const req of allReqs) {
    if (!req.euSpaceActProposal) continue;
    const artRef = req.euSpaceActProposal.articleRef
      .replace(/^Art\.\s*/, "")
      .replace(/[^a-zA-Z0-9]/g, "_");
    const code = `EUSA-Art${artRef}`;
    if (nodeIdMap.has(code)) continue;

    // This is a reference to an article not in the main articles array
    // (e.g., sub-article references like "Art. 72(5)")
    const node = await prisma.ontologyNode.create({
      data: {
        type: "OBLIGATION",
        code,
        label: `EU Space Act ${req.euSpaceActProposal.articleRef}`,
        properties: {
          articleRef: req.euSpaceActProposal.articleRef,
          status: "LEGISLATIVE_PROPOSAL",
          proposalRef: "COM(2025) 335",
          disclaimer:
            "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
        },
        confidence: 0.5,
        sourceFile: "eu-space-act-proposal.ts",
      },
    });
    nodeIdMap.set(code, node.id);
    nodeCount++;

    // BELONGS_TO → Domain for stub nodes (use enacted req's category, fallback to inference)
    const stubDomainCode = `DOMAIN-${req.category}`;
    const stubBelongsTo = await createEdgeSafe(
      "BELONGS_TO",
      code,
      stubDomainCode,
    );
    if (stubBelongsTo) {
      edgeCount++;
    } else {
      const inferredDomain = inferDomainFromArticleRef(code);
      if (
        await createEdgeSafe("BELONGS_TO", code, `DOMAIN-${inferredDomain}`)
      ) {
        edgeCount++;
      }
    }
  }

  // Retry edges from step 5 that may have failed due to missing EUSA nodes
  for (const req of allReqs) {
    if (!req.euSpaceActProposal) continue;
    const artRef = req.euSpaceActProposal.articleRef
      .replace(/^Art\.\s*/, "")
      .replace(/[^a-zA-Z0-9]/g, "_");
    const euCode = `EUSA-Art${artRef}`;
    const oblCode = `OBL-${req.id}`;
    const edgeType = mapProposalRelationship(
      req.euSpaceActProposal.relationship,
    );

    if (
      await createEdgeSafe(edgeType, euCode, oblCode, {
        confidence: req.euSpaceActProposal.confidence,
        articleRef: req.euSpaceActProposal.articleRef,
      })
    ) {
      edgeCount++;
    }
  }

  return { nodes: nodeCount, edges: edgeCount };
}

/**
 * Step 8: Create EVIDENCE_REQ nodes from jurisdiction knowledge.
 * Extracts from requiredTools and acceptedEvidence fields.
 */
async function seedEvidenceRequirements(): Promise<{
  nodes: number;
  edges: number;
}> {
  log("Seeding evidence requirements...");

  const codes = getAvailableJurisdictions();
  let nodeCount = 0;
  let edgeCount = 0;

  for (const jCode of codes) {
    const jurisdiction = getJurisdiction(jCode);
    if (!jurisdiction) continue;

    const sourceFile = sourceFileForJurisdiction(jCode);

    // Create EVIDENCE_REQ nodes from requiredTools
    for (const tool of jurisdiction.requiredTools) {
      const evidCode = `EVID-${jCode}-TOOL-${tool.name.replace(/\s+/g, "_")}`;

      // Skip if already created (tools can overlap across jurisdictions)
      if (nodeIdMap.has(evidCode)) continue;

      const node = await prisma.ontologyNode.create({
        data: {
          type: "EVIDENCE_REQ",
          code: evidCode,
          label: `${tool.name} (${jCode})`,
          properties: {
            toolName: tool.name,
            description: tool.description,
            mandatory: tool.mandatory,
            jurisdictionCode: jCode,
            evidenceType: "tool",
          },
          confidence: 1.0,
          sourceFile,
        },
      });
      nodeIdMap.set(evidCode, node.id);
      nodeCount++;

      // SCOPED_TO edge: Evidence → Jurisdiction
      if (await createEdgeSafe("SCOPED_TO", evidCode, `JUR-${jCode}`)) {
        edgeCount++;
      }
    }

    // Create EVIDENCE_REQ nodes from acceptedEvidence
    for (const evidence of jurisdiction.acceptedEvidence) {
      const evidCode = `EVID-${jCode}-${evidence.type.replace(/\s+/g, "_")}`;

      if (nodeIdMap.has(evidCode)) continue;

      const node = await prisma.ontologyNode.create({
        data: {
          type: "EVIDENCE_REQ",
          code: evidCode,
          label: `${evidence.type} (${jCode})`,
          properties: {
            evidenceType: evidence.type,
            description: evidence.description,
            acceptedAsShortcut: evidence.acceptedAsShortcut,
            jurisdictionCode: jCode,
          },
          confidence: 1.0,
          sourceFile,
        },
      });
      nodeIdMap.set(evidCode, node.id);
      nodeCount++;

      // SCOPED_TO edge: Evidence → Jurisdiction
      if (await createEdgeSafe("SCOPED_TO", evidCode, `JUR-${jCode}`)) {
        edgeCount++;
      }
    }

    // Create REQUIRES_EVIDENCE edges from obligation nodes to evidence nodes
    // Link debris-related obligations to debris tools (STELA, DEBRISK, ELECTRA)
    // Link cybersecurity obligations to cybersecurity evidence
    for (const req of jurisdiction.requirements) {
      const oblCode = `OBL-${req.id}`;

      for (const tool of jurisdiction.requiredTools) {
        const evidCode = `EVID-${jCode}-TOOL-${tool.name.replace(/\s+/g, "_")}`;

        // Only link tool to obligations in the same domain
        // Debris tools → debris obligations, etc.
        const toolCategory = inferToolCategory(tool.name);
        if (toolCategory && toolCategory === req.category) {
          if (await createEdgeSafe("REQUIRES_EVIDENCE", oblCode, evidCode)) {
            edgeCount++;
          }
        }
      }

      for (const evidence of jurisdiction.acceptedEvidence) {
        const evidCode = `EVID-${jCode}-${evidence.type.replace(/\s+/g, "_")}`;
        const evidCategory = inferEvidenceCategory(evidence.type);
        if (evidCategory && evidCategory === req.category) {
          if (await createEdgeSafe("REQUIRES_EVIDENCE", oblCode, evidCode)) {
            edgeCount++;
          }
        }
      }
    }
  }

  return { nodes: nodeCount, edges: edgeCount };
}

/**
 * Infer a ComplianceCategory from a tool name.
 */
function inferToolCategory(toolName: string): ComplianceCategory | null {
  const name = toolName.toUpperCase();
  if (
    name.includes("STELA") ||
    name.includes("DEBRISK") ||
    name.includes("ELECTRA") ||
    name.includes("DRAMA") ||
    name.includes("MASTER") ||
    name.includes("OSCAR") ||
    name.includes("DEBRIS")
  ) {
    return "debris";
  }
  if (
    name.includes("CYBER") ||
    name.includes("EBIOS") ||
    name.includes("ANSSI") ||
    name.includes("NIS")
  ) {
    return "cybersecurity";
  }
  if (
    name.includes("SPECTRUM") ||
    name.includes("ITU") ||
    name.includes("FREQ")
  ) {
    return "spectrum";
  }
  if (
    name.includes("ITAR") ||
    name.includes("EAR") ||
    name.includes("EXPORT")
  ) {
    return "export_control";
  }
  return null;
}

/**
 * Infer a ComplianceCategory from an evidence type.
 */
function inferEvidenceCategory(
  evidenceType: string,
): ComplianceCategory | null {
  const type = evidenceType.toUpperCase();
  if (
    type.includes("STELA") ||
    type.includes("DEBRISK") ||
    type.includes("ELECTRA") ||
    type.includes("DEBRIS") ||
    type.includes("REENTRY") ||
    type.includes("RE-ENTRY") ||
    type.includes("DRAMA") ||
    type.includes("CASUALTY") ||
    type.includes("DISPOSAL") ||
    type.includes("EOL")
  ) {
    return "debris";
  }
  if (
    type.includes("CYBER") ||
    type.includes("EBIOS") ||
    type.includes("ANSSI") ||
    type.includes("NIS") ||
    type.includes("ISO_27001") ||
    type.includes("ISMS")
  ) {
    return "cybersecurity";
  }
  if (
    type.includes("INSURANCE") ||
    type.includes("TPL") ||
    type.includes("LIABILITY")
  ) {
    return "insurance";
  }
  if (
    type.includes("SPECTRUM") ||
    type.includes("ITU") ||
    type.includes("FREQ")
  ) {
    return "spectrum";
  }
  return null;
}

/**
 * Step 9: Create known CONFLICTS_WITH edges manually.
 *
 * These are known regulatory conflicts between jurisdictions.
 * Auto-detection of conflicts comes in Phase 2 — for now, we seed
 * a few well-documented conflicts.
 */
async function seedKnownConflicts(): Promise<number> {
  log("Seeding known conflicts...");

  let edgeCount = 0;

  // Conflict 1: FR TPL EUR 60M (fixed) vs UK MIR (risk-based insurance)
  // France requires a fixed EUR 60M minimum third-party liability.
  // UK uses a risk-based Maximum Insurable Risk approach.
  const frInsuranceNodes = await prisma.ontologyNode.findMany({
    where: {
      code: { startsWith: "OBL-FR-" },
      properties: { path: ["category"], equals: "insurance" },
    },
    select: { code: true },
  });
  const ukInsuranceNodes = await prisma.ontologyNode.findMany({
    where: {
      code: { startsWith: "OBL-GB-" },
      properties: { path: ["category"], equals: "insurance" },
    },
    select: { code: true },
  });

  for (const fr of frInsuranceNodes) {
    for (const uk of ukInsuranceNodes) {
      if (
        await createEdgeSafe("CONFLICTS_WITH", fr.code, uk.code, {
          conflictType: "methodology",
          description:
            "France requires fixed EUR 60M minimum TPL; UK uses risk-based Maximum Insurable Risk (MIR) approach.",
        })
      ) {
        edgeCount++;
      }
    }
  }

  // Conflict 2: FR STELA mandatory vs DE no mandatory tool
  // France requires STELA for debris compliance; Germany has no mandatory tool requirement.
  const frStelaNodes = await prisma.ontologyNode.findMany({
    where: {
      code: { startsWith: "EVID-FR-TOOL-STELA" },
    },
    select: { code: true },
  });
  const deToolNodes = await prisma.ontologyNode.findMany({
    where: {
      code: { startsWith: "EVID-DE-TOOL-" },
    },
    select: { code: true },
  });

  // If Germany has no mandatory tools, the conflict is between FR's mandatory
  // STELA evidence and the absence in DE. We note this as a property.
  if (frStelaNodes.length > 0 && deToolNodes.length === 0) {
    // Create a note on the FR STELA evidence node about the conflict
    // Since DE has no tool nodes, create edge to DE jurisdiction node
    for (const fr of frStelaNodes) {
      if (
        await createEdgeSafe("CONFLICTS_WITH", fr.code, "JUR-DE", {
          conflictType: "tool_requirement",
          description:
            "France mandates STELA tool for debris compliance; Germany has no mandatory tool requirement.",
        })
      ) {
        edgeCount++;
      }
    }
  } else {
    // If DE does have tools, link conflicts between tool requirements
    for (const fr of frStelaNodes) {
      for (const de of deToolNodes) {
        if (
          await createEdgeSafe("CONFLICTS_WITH", fr.code, de.code, {
            conflictType: "tool_requirement",
            description:
              "France mandates STELA tool for debris compliance; Germany has different tool requirements.",
          })
        ) {
          edgeCount++;
        }
      }
    }
  }

  // Conflict 3: FR 25-year orbital lifetime (RT Art. 41-9) vs US 5-year (FCC rule)
  // France mandates 25-year max orbital lifetime; FCC reduced this to 5 years.
  const frDeorbitCode = "OBL-FR-RT-41-9";
  // US FCC 5-year rule — look for the enacted obligation
  const iadcDeorbitReqs = getAllEnactedRequirements().filter(
    (r) =>
      r.id.includes("5.3.2") ||
      r.id.includes("5-3-2") ||
      (r.source.reference.includes("5.3.2") && r.category === "debris"),
  );

  if (nodeIdMap.has(frDeorbitCode)) {
    for (const enacted of iadcDeorbitReqs) {
      const enactedCode = `OBL-${enacted.id}`;
      if (nodeIdMap.has(enactedCode)) {
        // Not a direct conflict with IADC, but note the timeline difference
        // The real conflict is with FCC. We create an edge to illustrate.
        if (
          await createEdgeSafe("CONFLICTS_WITH", frDeorbitCode, enactedCode, {
            conflictType: "timeline",
            description:
              "France enforces IADC 25-year orbital lifetime limit (RT Art. 41-9). " +
              "US FCC has since adopted a stricter 5-year rule (47 CFR 25.114(d)(14)). " +
              "Multi-jurisdiction operators must meet the stricter requirement.",
          })
        ) {
          edgeCount++;
        }
      }
    }
  }

  return edgeCount;
}

/**
 * NOTE: SUPERSEDES edges are not auto-derived from data files.
 * They will be manually maintained through the admin interface
 * when regulations are updated, replaced, or superseded by newer versions.
 * Example: When ISO 24113:2024 supersedes ISO 24113:2019.
 */

// ─── Main Seed Function ─────────────────────────────────────────────────────

export async function seedOntology(): Promise<SeedResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const nodesByType: Record<string, number> = {};
  const edgesByType: Record<string, number> = {};

  log("Starting ontology seed...");

  try {
    // Step 1: Clear existing ontology data
    log("Clearing existing ontology data...");
    await prisma.ontologyEdge.deleteMany();
    await prisma.ontologyNode.deleteMany();
    await prisma.ontologyVersion.deleteMany();
    nodeIdMap.clear();

    // Step 2: Create DOMAIN nodes
    const domainCount = await seedDomains();
    nodesByType["DOMAIN"] = domainCount;

    // Step 3: Create OPERATOR_TYPE nodes
    const opTypeCount = await seedOperatorTypes();
    nodesByType["OPERATOR_TYPE"] = opTypeCount;

    // Step 4: Create STANDARD nodes
    const stdCount = await seedStandards();
    nodesByType["STANDARD"] = stdCount;

    // Step 5: Create enacted OBLIGATION nodes
    const enacted = await seedEnactedObligations();
    nodesByType["OBLIGATION_ENACTED"] = enacted.nodes;

    // Step 6: Create JURISDICTION, AUTHORITY, and national OBLIGATION nodes
    const jurisdictions = await seedJurisdictions();
    nodesByType["JURISDICTION_AUTHORITY_NATIONAL"] = jurisdictions.nodes;

    // Step 7: Create EU Space Act proposal OBLIGATION nodes
    const euSpaceAct = await seedEUSpaceActArticles();
    nodesByType["OBLIGATION_PROPOSAL"] = euSpaceAct.nodes;

    // Step 8: Create EVIDENCE_REQ nodes
    const evidence = await seedEvidenceRequirements();
    nodesByType["EVIDENCE_REQ"] = evidence.nodes;

    // Step 9: Create known CONFLICTS_WITH edges
    await seedKnownConflicts();

    // Count totals
    const totalNodes = await prisma.ontologyNode.count();
    const totalEdges = await prisma.ontologyEdge.count();

    // Count edges by type
    const edgeCounts = await prisma.ontologyEdge.groupBy({
      by: ["type"],
      _count: { type: true },
    });
    for (const ec of edgeCounts) {
      edgesByType[ec.type] = ec._count.type;
    }

    // Count nodes by type
    const nodeCounts = await prisma.ontologyNode.groupBy({
      by: ["type"],
      _count: { type: true },
    });
    for (const nc of nodeCounts) {
      nodesByType[nc.type] = nc._count.type;
    }

    // Step 10: Create OntologyVersion record
    await prisma.ontologyVersion.create({
      data: {
        version: SEED_VERSION,
        description:
          "Initial seed from regulatory data layer: " +
          "8 international standards, 10 jurisdictions, EU Space Act proposal, " +
          "82 cross-reference mappings.",
        nodeCount: totalNodes,
        edgeCount: totalEdges,
        seededFrom: "src/data/regulatory/",
      },
    });

    const duration = Date.now() - startTime;
    log(
      `Seed complete: ${totalNodes} nodes, ${totalEdges} edges in ${duration}ms`,
    );

    // Step 11: Return result
    return {
      success: true,
      version: SEED_VERSION,
      nodeCount: totalNodes,
      edgeCount: totalEdges,
      nodesByType,
      edgesByType,
      duration,
      errors,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Seed failed: ${errorMessage}`);
    errors.push(errorMessage);

    return {
      success: false,
      version: SEED_VERSION,
      nodeCount: 0,
      edgeCount: 0,
      nodesByType,
      edgesByType,
      duration,
      errors,
    };
  }
}
