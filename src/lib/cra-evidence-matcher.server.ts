/**
 * CRA Evidence Matcher Service
 * Analyzes document metadata (name, category, tags) and matches to CRA requirements.
 * Uses deterministic keyword matching — no AI/LLM calls.
 */

import "server-only";

export interface EvidenceMatch {
  requirementId: string; // e.g., "cra-013"
  confidence: "high" | "medium" | "low";
  mappingType: "DIRECT" | "PARTIAL" | "SUPPORTING";
  coveragePercent: number; // 0-100
  reason: string; // Why this document matches
}

interface DocumentMatcher {
  keywords: string[]; // Document name/tag keywords
  categories: string[]; // Document vault categories (lowercase)
  requirementId: string;
  mappingType: "DIRECT" | "PARTIAL" | "SUPPORTING";
  coveragePercent: number;
  reason: string;
}

// Keyword-to-requirement mapping for CRA (EU Cyber Resilience Act 2024/2847)
const DOCUMENT_MATCHERS: DocumentMatcher[] = [
  {
    keywords: [
      "penetration test",
      "pentest",
      "security test",
      "vulnerability assessment",
    ],
    categories: ["cybersecurity", "certification"],
    requirementId: "cra-013",
    mappingType: "DIRECT",
    coveragePercent: 80,
    reason:
      "Penetration test report directly satisfies CRA security testing requirement (Annex I Part I §2).",
  },
  {
    keywords: [
      "sbom",
      "software bill of materials",
      "cyclonedx",
      "spdx",
      "dependency list",
    ],
    categories: ["cybersecurity"],
    requirementId: "cra-038",
    mappingType: "DIRECT",
    coveragePercent: 90,
    reason:
      "SBOM document directly satisfies CRA SBOM generation and delivery requirement (Annex I Part II §2).",
  },
  {
    keywords: [
      "risk assessment",
      "threat model",
      "risk analysis",
      "security risk",
    ],
    categories: ["cybersecurity"],
    requirementId: "cra-018",
    mappingType: "DIRECT",
    coveragePercent: 70,
    reason:
      "Risk assessment documentation satisfies CRA risk assessment requirement (Annex I Part I §3).",
  },
  {
    keywords: [
      "vulnerability disclosure",
      "disclosure policy",
      "responsible disclosure",
      "coordinated disclosure",
    ],
    categories: ["cybersecurity"],
    requirementId: "cra-014",
    mappingType: "DIRECT",
    coveragePercent: 85,
    reason:
      "Vulnerability disclosure policy satisfies CRA coordinated vulnerability disclosure requirement.",
  },
  {
    keywords: [
      "incident response",
      "incident handling",
      "security incident",
      "breach response",
    ],
    categories: ["cybersecurity"],
    requirementId: "cra-026",
    mappingType: "PARTIAL",
    coveragePercent: 50,
    reason:
      "Incident response plan partially covers CRA vulnerability reporting obligation (Art. 14). Specific 24h ENISA reporting procedure must be verified.",
  },
  {
    keywords: ["iso 27001", "isms", "information security management"],
    categories: ["certification"],
    requirementId: "cra-001",
    mappingType: "SUPPORTING",
    coveragePercent: 40,
    reason:
      "ISO 27001 certification provides supporting evidence for CRA access control requirements at organizational level.",
  },
  {
    keywords: [
      "iec 62443",
      "industrial cybersecurity",
      "operational technology",
    ],
    categories: ["certification"],
    requirementId: "cra-001",
    mappingType: "PARTIAL",
    coveragePercent: 60,
    reason:
      "IEC 62443 certification provides partial coverage for CRA security-by-design requirements for industrial products.",
  },
  {
    keywords: ["common criteria", "cc evaluation", "eal", "protection profile"],
    categories: ["certification"],
    requirementId: "cra-005",
    mappingType: "PARTIAL",
    coveragePercent: 65,
    reason:
      "Common Criteria evaluation provides partial coverage for CRA integrity protection requirements.",
  },
  {
    keywords: [
      "technical documentation",
      "technical file",
      "design specification",
    ],
    categories: ["general", "authorization"],
    requirementId: "cra-017",
    mappingType: "DIRECT",
    coveragePercent: 60,
    reason:
      "Technical documentation contributes to CRA technical documentation requirement (Annex I Part I §3).",
  },
  {
    keywords: [
      "update policy",
      "patch management",
      "software update",
      "firmware update",
    ],
    categories: ["cybersecurity"],
    requirementId: "cra-035",
    mappingType: "DIRECT",
    coveragePercent: 75,
    reason:
      "Update/patch management policy directly addresses CRA automatic update capability requirement.",
  },
  {
    keywords: [
      "ce marking",
      "declaration of conformity",
      "eu doc",
      "conformity",
    ],
    categories: ["certification", "authorization"],
    requirementId: "cra-023",
    mappingType: "DIRECT",
    coveragePercent: 90,
    reason:
      "CE marking/Declaration of Conformity directly satisfies CRA CE marking requirement (Art. 23).",
  },
  {
    keywords: [
      "access control",
      "rbac",
      "authentication",
      "authorization policy",
    ],
    categories: ["cybersecurity"],
    requirementId: "cra-001",
    mappingType: "PARTIAL",
    coveragePercent: 55,
    reason:
      "Access control documentation partially satisfies CRA access control mechanism requirement.",
  },
];

/**
 * Match a document to relevant CRA requirements based on its metadata.
 *
 * @param documentName  - Human-readable document name
 * @param category      - DocumentCategory enum value from the vault
 * @param tags          - Array of user-supplied tags
 * @param mimeType      - Optional MIME type (reserved for future type-based filtering)
 * @returns Array of EvidenceMatch objects, ordered by coveragePercent desc
 */
export function matchDocumentToCRA(
  documentName: string,
  category: string,
  tags: string[],
  _mimeType?: string,
): EvidenceMatch[] {
  const searchText = [documentName, ...tags].join(" ").toLowerCase();
  const categoryLower = category.toLowerCase();

  const matches: EvidenceMatch[] = [];

  for (const matcher of DOCUMENT_MATCHERS) {
    const keywordMatch = matcher.keywords.some((kw) =>
      searchText.includes(kw.toLowerCase()),
    );
    const categoryMatch = matcher.categories.some((cat) =>
      categoryLower.includes(cat.toLowerCase()),
    );

    // A match requires at least a keyword hit.
    // Category match alone is not sufficient — it would produce too many false positives.
    if (keywordMatch) {
      matches.push({
        requirementId: matcher.requirementId,
        confidence: categoryMatch ? "high" : "medium",
        mappingType: matcher.mappingType,
        coveragePercent: matcher.coveragePercent,
        reason: matcher.reason,
      });
    }
  }

  // Sort best matches first; deduplicate on requirementId (keep highest coverage)
  const seen = new Map<string, EvidenceMatch>();
  for (const match of matches.sort(
    (a, b) => b.coveragePercent - a.coveragePercent,
  )) {
    if (!seen.has(match.requirementId)) {
      seen.set(match.requirementId, match);
    }
  }

  return Array.from(seen.values());
}
