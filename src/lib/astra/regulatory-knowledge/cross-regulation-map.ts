/**
 * ASTRA Regulatory Knowledge: Cross-Regulation Mappings
 *
 * Maps relationships between NIS2, EU Space Act, ENISA Space controls, and ISO 27001.
 * Identifies overlaps that can save implementation effort.
 */

import type { CrossRegulationMapping } from "../types";

// ─── Cross-Regulation Mappings ───

export const CROSS_REGULATION_MAPPINGS: CrossRegulationMapping[] = [
  // ═══════════════════════════════════════════════════════════════════
  // Risk Analysis & Information Security Policy
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "xref-001",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 21(2)(a)",
    targetRegulation: "EU Space Act",
    targetArticle: "Art. 74-76",
    overlapType: "single_implementation",
    description:
      "Both require cybersecurity risk management frameworks. EU Space Act Art. 74-76 mandates space-specific risk management that fully satisfies NIS2 Art. 21(2)(a) requirements for space operators.",
    timeSavingsPercent: 90,
    implementationNotes:
      "Implement EU Space Act requirements first; they exceed NIS2 scope for space operations.",
  },
  {
    id: "xref-002",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 21(2)(a)",
    targetRegulation: "ISO 27001",
    targetArticle: "A.5.1, 6.1.2",
    overlapType: "single_implementation",
    description:
      "ISO 27001 information security policies and risk assessment provide the framework for implementing NIS2 Art. 21(2)(a).",
    timeSavingsPercent: 85,
    implementationNotes:
      "ISO 27001 certification demonstrates NIS2 compliance for this control area.",
  },
  {
    id: "xref-003",
    sourceRegulation: "EU Space Act",
    sourceArticle: "Art. 74-76",
    targetRegulation: "ENISA Space",
    targetArticle: "Controls 1.1-1.8",
    overlapType: "single_implementation",
    description:
      "ENISA Space Threat Landscape governance controls provide detailed implementation guidance for EU Space Act risk management requirements.",
    timeSavingsPercent: 80,
    implementationNotes:
      "Use ENISA controls as implementation checklist for EU Space Act compliance.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Incident Handling
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "xref-004",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 21(2)(b)",
    targetRegulation: "EU Space Act",
    targetArticle: "Art. 83-85",
    overlapType: "single_implementation",
    description:
      "EU Space Act Art. 83-85 covers incident detection and response with space-specific requirements that satisfy NIS2 incident handling for space operators.",
    timeSavingsPercent: 95,
    implementationNotes:
      "EU Space Act incident handling is lex specialis; compliance satisfies NIS2.",
  },
  {
    id: "xref-005",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 23",
    targetRegulation: "EU Space Act",
    targetArticle: "Art. 83(4)",
    overlapType: "single_implementation",
    description:
      "Incident notification timelines (24h/72h/1 month) are identical between NIS2 Art. 23 and EU Space Act Art. 83(4).",
    timeSavingsPercent: 100,
    implementationNotes:
      "Single notification process satisfies both regulations.",
  },
  {
    id: "xref-006",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 21(2)(b)",
    targetRegulation: "ISO 27001",
    targetArticle: "A.5.24-A.5.28",
    overlapType: "single_implementation",
    description:
      "ISO 27001 incident management controls (A.5.24-A.5.28) provide implementation framework for NIS2 incident handling.",
    timeSavingsPercent: 80,
    implementationNotes:
      "ISO 27001 incident management satisfies NIS2 procedural requirements.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Business Continuity
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "xref-007",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 21(2)(c)",
    targetRegulation: "EU Space Act",
    targetArticle: "Art. 79-82",
    overlapType: "partial_overlap",
    description:
      "EU Space Act Art. 79-82 covers space operations continuity but NIS2 Art. 21(2)(c) has broader organizational BCM requirements.",
    timeSavingsPercent: 60,
    implementationNotes:
      "EU Space Act covers operational continuity; supplement with organizational BCM for full NIS2 compliance.",
  },
  {
    id: "xref-008",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 21(2)(c)",
    targetRegulation: "ISO 27001",
    targetArticle: "A.5.29-A.5.30",
    overlapType: "single_implementation",
    description:
      "ISO 27001 business continuity controls (A.5.29-A.5.30) satisfy NIS2 BCM requirements.",
    timeSavingsPercent: 85,
    implementationNotes:
      "ISO 27001 BCM controls plus space-specific additions for full compliance.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Supply Chain Security
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "xref-009",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 21(2)(d)",
    targetRegulation: "EU Space Act",
    targetArticle: "Art. 77-78",
    overlapType: "partial_overlap",
    description:
      "EU Space Act Art. 77-78 addresses supply chain for space components; NIS2 has broader ICT supply chain scope.",
    timeSavingsPercent: 50,
    implementationNotes:
      "EU Space Act covers flight hardware/software supply chain; extend to all ICT suppliers for NIS2.",
  },
  {
    id: "xref-010",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 21(2)(d)",
    targetRegulation: "ISO 27001",
    targetArticle: "A.5.19-A.5.23",
    overlapType: "single_implementation",
    description:
      "ISO 27001 supplier relationship security controls (A.5.19-A.5.23) implement NIS2 supply chain requirements.",
    timeSavingsPercent: 80,
    implementationNotes:
      "ISO 27001 supplier controls provide comprehensive framework.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Security in Acquisition/Development
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "xref-011",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 21(2)(e)",
    targetRegulation: "EU Space Act",
    targetArticle: "Art. 74(3)",
    overlapType: "single_implementation",
    description:
      "EU Space Act Art. 74(3) mandates security-by-design for space systems, satisfying NIS2 acquisition/development security.",
    timeSavingsPercent: 85,
    implementationNotes:
      "EU Space Act security-by-design requirements are comprehensive for space systems.",
  },
  {
    id: "xref-012",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 21(2)(e)",
    targetRegulation: "ISO 27001",
    targetArticle: "A.8.25-A.8.31",
    overlapType: "single_implementation",
    description:
      "ISO 27001 secure development lifecycle controls (A.8.25-A.8.31) implement NIS2 Art. 21(2)(e).",
    timeSavingsPercent: 80,
    implementationNotes:
      "Combine ISO 27001 SDL controls with ECSS-Q-ST-80C for space software.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Cryptography
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "xref-013",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 21(2)(h)",
    targetRegulation: "EU Space Act",
    targetArticle: "Art. 75",
    overlapType: "single_implementation",
    description:
      "EU Space Act Art. 75 specifies encryption requirements for space communications, exceeding NIS2 cryptography requirements.",
    timeSavingsPercent: 95,
    implementationNotes:
      "EU Space Act crypto requirements (CCSDS standards) satisfy NIS2 for space operations.",
  },
  {
    id: "xref-014",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 21(2)(h)",
    targetRegulation: "ISO 27001",
    targetArticle: "A.8.24",
    overlapType: "single_implementation",
    description:
      "ISO 27001 cryptography control (A.8.24) provides policy framework for NIS2 Art. 21(2)(h).",
    timeSavingsPercent: 75,
    implementationNotes:
      "ISO 27001 provides policy; add space-specific crypto standards (CCSDS).",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Access Control & Authentication
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "xref-015",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 21(2)(i)",
    targetRegulation: "EU Space Act",
    targetArticle: "Art. 74(2)",
    overlapType: "partial_overlap",
    description:
      "EU Space Act Art. 74(2) covers access control for space systems; NIS2 has broader HR security scope.",
    timeSavingsPercent: 60,
    implementationNotes:
      "EU Space Act covers technical access control; add HR security policies for full NIS2 compliance.",
  },
  {
    id: "xref-016",
    sourceRegulation: "NIS2",
    sourceArticle: "Art. 21(2)(j)",
    targetRegulation: "EU Space Act",
    targetArticle: "Art. 75(2)",
    overlapType: "single_implementation",
    description:
      "EU Space Act Art. 75(2) mandates authenticated command/control, satisfying NIS2 MFA requirements for space operations.",
    timeSavingsPercent: 90,
    implementationNotes:
      "Space command authentication requirements exceed typical MFA requirements.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Debris Mitigation Cross-References
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "xref-017",
    sourceRegulation: "EU Space Act",
    sourceArticle: "Art. 31-37",
    targetRegulation: "IADC Guidelines",
    targetArticle: "Guidelines 1-7",
    overlapType: "single_implementation",
    description:
      "EU Space Act debris mitigation requirements are based on and reference IADC Guidelines.",
    timeSavingsPercent: 95,
    implementationNotes:
      "IADC Guidelines compliance demonstrates EU Space Act debris mitigation compliance.",
  },
  {
    id: "xref-018",
    sourceRegulation: "EU Space Act",
    sourceArticle: "Art. 31-37",
    targetRegulation: "ISO 24113",
    targetArticle: "Full Standard",
    overlapType: "single_implementation",
    description:
      "ISO 24113 debris mitigation standard is referenced as implementation path for EU Space Act requirements.",
    timeSavingsPercent: 90,
    implementationNotes:
      "ISO 24113 certification pathway for EU Space Act debris compliance.",
  },
];

// ─── Overlap Analysis ───

export interface OverlapAnalysis {
  regulation1: string;
  regulation2: string;
  totalMappings: number;
  singleImplementation: number;
  partialOverlap: number;
  separateEffort: number;
  estimatedSavingsPercent: number;
}

export function analyzeOverlap(reg1: string, reg2: string): OverlapAnalysis {
  const mappings = CROSS_REGULATION_MAPPINGS.filter(
    (m) =>
      (m.sourceRegulation === reg1 && m.targetRegulation === reg2) ||
      (m.sourceRegulation === reg2 && m.targetRegulation === reg1),
  );

  const singleImpl = mappings.filter(
    (m) => m.overlapType === "single_implementation",
  ).length;
  const partial = mappings.filter(
    (m) => m.overlapType === "partial_overlap",
  ).length;
  const separate = mappings.filter(
    (m) => m.overlapType === "separate_effort",
  ).length;

  const avgSavings =
    mappings.length > 0
      ? mappings.reduce((sum, m) => sum + (m.timeSavingsPercent || 0), 0) /
        mappings.length
      : 0;

  return {
    regulation1: reg1,
    regulation2: reg2,
    totalMappings: mappings.length,
    singleImplementation: singleImpl,
    partialOverlap: partial,
    separateEffort: separate,
    estimatedSavingsPercent: Math.round(avgSavings),
  };
}

// ─── Lookup Functions ───

export function getMappingsForRegulation(
  regulation: string,
): CrossRegulationMapping[] {
  return CROSS_REGULATION_MAPPINGS.filter(
    (m) =>
      m.sourceRegulation === regulation || m.targetRegulation === regulation,
  );
}

export function getMappingsForArticle(
  article: string,
): CrossRegulationMapping[] {
  return CROSS_REGULATION_MAPPINGS.filter(
    (m) => m.sourceArticle === article || m.targetArticle === article,
  );
}

export function getSingleImplementationMappings(): CrossRegulationMapping[] {
  return CROSS_REGULATION_MAPPINGS.filter(
    (m) => m.overlapType === "single_implementation",
  );
}

// ─── Summary for ASTRA Context ───

export const CROSS_REGULATION_SUMMARY = `
Cross-regulation analysis identifies overlaps between NIS2, EU Space Act, ENISA Space Threat Landscape, and ISO 27001 that can save implementation effort for space operators.

**Key Overlaps (Single Implementation)**:
- Risk Management: EU Space Act Art. 74-76 satisfies NIS2 Art. 21(2)(a) for space operators (~90% effort savings)
- Incident Handling: EU Space Act Art. 83-85 covers NIS2 Art. 21(2)(b) requirements (~95% savings)
- Incident Notification: Identical 24h/72h/1 month timelines between regulations (100% savings)
- Cryptography: EU Space Act Art. 75 exceeds NIS2 Art. 21(2)(h) for space communications (~95% savings)
- Authentication: EU Space Act command authentication satisfies NIS2 MFA requirements (~90% savings)

**Partial Overlaps (Supplement Required)**:
- Business Continuity: EU Space Act covers operations; supplement with organizational BCM (~60% savings)
- Supply Chain: EU Space Act covers space components; extend to all ICT suppliers (~50% savings)
- Access Control: EU Space Act covers technical access; add HR security policies (~60% savings)

**ISO 27001 as Implementation Framework**:
- ISO 27001 certification provides evidence of compliance for most NIS2 Art. 21(2) requirements
- Supplement with space-specific standards (ECSS, CCSDS) for full EU Space Act compliance

**Debris Mitigation Standards**:
- EU Space Act Art. 31-37 based on IADC Guidelines and ISO 24113
- Compliance with either standard demonstrates EU Space Act compliance

**Strategic Recommendation**:
For space operators, implement EU Space Act requirements first (they are lex specialis and typically exceed NIS2). Use ISO 27001 as the management system framework. This approach minimizes duplicate effort while ensuring comprehensive compliance.
`.trim();
