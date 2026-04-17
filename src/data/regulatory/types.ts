/**
 * Regulatory Data Layer — Type Definitions
 *
 * Core types for the enacted-law-first regulatory architecture.
 * Every requirement maps primarily to enacted international standards
 * or national law. The EU Space Act proposal is a secondary mapping.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

export type RegulatoryStatus = "enacted" | "published" | "proposal" | "draft";

export type ComplianceCategory =
  | "debris"
  | "cybersecurity"
  | "spectrum"
  | "export_control"
  | "insurance"
  | "environmental"
  | "authorization"
  | "registration"
  | "supervision";

export type RequirementPriority = "mandatory" | "recommended" | "best_practice";

export type OperatorType =
  | "SCO"
  | "LO"
  | "LSO"
  | "ISOS"
  | "CAP"
  | "PDP"
  | "TCO";

export type ProposalRelationship =
  | "codifies" // Enacted standard exists, EU Space Act makes it EU-wide binding
  | "extends" // Enacted standard exists, EU Space Act goes further
  | "new_obligation"; // No enacted equivalent — entirely new

export type MappingConfidence = "verified" | "interpreted";

export type ProposalConfidence = "direct" | "partial" | "inferred";

// ─── Layer 1: International Standards ────────────────────────────────────────

export interface EnactedRequirement {
  /** Unique ID: "IADC-5.3.2" or "NIS2-21-2-a" */
  id: string;

  /** Primary source — always enacted or published */
  source: {
    framework: string;
    reference: string;
    title: string;
    fullText: string;
    status: "enacted" | "published";
    citation: string;
    lastVerified: string;
  };

  /** National implementations of this requirement */
  nationalImplementations: Array<{
    jurisdiction: string;
    reference: string;
    notes: string;
  }>;

  /** EU Space Act proposal mapping (secondary, always marked) */
  euSpaceActProposal: {
    articleRef: string;
    confidence: ProposalConfidence;
    relationship: ProposalRelationship;
    disclaimer: "Based on COM(2025) 335 legislative proposal. Article numbers may change.";
  } | null;

  category: ComplianceCategory;
  applicableTo: OperatorType[] | "all";
  priority: RequirementPriority;
}

// ─── Layer 2: National Law ───────────────────────────────────────────────────

export interface JurisdictionData {
  code: string;
  name: string;

  nca: {
    name: string;
    fullName: string;
    website: string;
    language: string;
    executiveSummaryLanguage: string;
  };

  spaceLaw: {
    name: string;
    citation: string;
    yearEnacted: number;
    yearAmended: number | null;
    status: "enacted" | "draft" | "none";
    url: string | null;
  } | null;

  additionalLaws: Array<{
    name: string;
    citation: string;
    scope: string;
    status: "enacted" | "draft";
  }>;

  requirements: NationalRequirement[];

  insurance: {
    minimumTPL: number | null;
    formula: string | null;
    cap: number | null;
    governmentGuarantee: boolean;
    legalBasis: string;
  };

  complianceMatrixFormat: {
    statusValues: string[];
    columns: string[];
    language: string;
  };

  rigor: Record<
    "debris" | "cybersecurity" | "general" | "safety",
    1 | 2 | 3 | 4 | 5
  >;

  requiredTools: Array<{
    name: string;
    description: string;
    mandatory: boolean;
  }>;

  acceptedEvidence: Array<{
    type: string;
    description: string;
    acceptedAsShortcut: boolean;
  }>;

  documentGuidance: Record<
    string,
    {
      depthExpectation: "standard" | "detailed" | "extensive";
      specificRequirements: string[];
      commonRejectionReasons: string[];
    }
  >;

  /** Full knowledge base text for prompt injection */
  knowledgeBase: string;
}

export interface NationalRequirement {
  id: string;

  nationalRef: {
    law: string;
    article: string;
    title: string;
    fullText: string;
  };

  standardsMapping: Array<{
    framework: string;
    reference: string;
    relationship: "implements" | "exceeds" | "equivalent";
  }>;

  euSpaceActProposal: {
    articleRef: string;
    confidence: ProposalConfidence;
  } | null;

  category: ComplianceCategory;
}

// ─── Layer 3: EU Space Act Proposal ──────────────────────────────────────────

export interface EUSpaceActArticle {
  articleNumber: string;
  title: string;
  summary: string;
  titleNumber: number;
  chapter: string;

  /** Always "LEGISLATIVE_PROPOSAL" — never "enacted" */
  status: "LEGISLATIVE_PROPOSAL";
  proposalRef: "COM(2025) 335";
  proposalDate: "2025-06-25";
  councilUpdate: "2025-12-05";
  disclaimer: string;

  /** What enacted standards this article codifies, extends, or creates */
  enactedEquivalents: Array<{
    framework: string;
    reference: string;
    relationship: ProposalRelationship;
  }>;

  category: ComplianceCategory;
  applicableTo: OperatorType[] | "all";

  /** Canonical EUR-Lex URL for the COM(2025) 335 proposal document. */
  officialUrl?: string;
}

// ─── Layer 4: Cross-Reference Map ────────────────────────────────────────────

export interface RegulatoryMapping {
  id: string;
  name: string;
  description: string;
  category: ComplianceCategory;

  references: {
    /** Layer 1: enacted international standards */
    international: Array<{
      framework: string;
      reference: string;
      status: "enacted" | "published";
    }>;
    /** Layer 2: enacted national law */
    national: Array<{
      jurisdiction: string;
      reference: string;
      status: "enacted";
    }>;
    /** Layer 3: EU Space Act proposal (always marked) */
    euSpaceAct: {
      articleRef: string;
      relationship: ProposalRelationship;
      status: "proposal";
    } | null;
  };

  confidence: MappingConfidence;
}

// ─── Global Disclaimer ───────────────────────────────────────────────────────

export const REGULATORY_DISCLAIMER =
  "REGULATORY BASIS: This document references enacted international standards " +
  "(IADC, ISO, COPUOS), enacted national law, and the NIS2 Directive (EU) 2022/2555. " +
  "EU Space Act references are based on the legislative proposal COM(2025) 335 and " +
  "may change during the legislative process. This document does not constitute legal advice.";

export const EU_SPACE_ACT_DISCLAIMER =
  "Based on COM(2025) 335 legislative proposal. " +
  "Article numbers and content may change during trilogue negotiations. Not enacted law.";
