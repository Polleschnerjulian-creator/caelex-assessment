import "server-only";

// ============================================================================
// Types
// ============================================================================

export interface SmartAction {
  action: string;
  description: string;
  modulesImpacted: number;
  requirementsSatisfied: Array<{
    module: "enisa" | "nis2" | "cra";
    requirementId: string;
    currentStatus: string;
  }>;
  estimatedScoreImpact: number;
  link?: string;
}

interface ActionTemplate {
  action: string;
  description: string;
  satisfies: {
    cra: string[];
    nis2: string[];
    enisa: string[];
  };
  link?: string;
}

// ============================================================================
// Action Templates — cross-regulation remediation actions
// Each template maps to requirements across ENISA, NIS2, and CRA modules.
// ============================================================================

const ACTION_TEMPLATES: ActionTemplate[] = [
  {
    action: "SBOM hochladen",
    description:
      "Software Bill of Materials erstellen und im CRA-Modul hochladen. Erfüllt gleichzeitig CRA SBOM-Pflicht, NIS2 Supply-Chain-Security und ENISA Supply-Chain-Controls.",
    satisfies: {
      cra: ["cra-038", "cra-039", "cra-040"],
      nis2: ["nis2-015", "nis2-016"],
      enisa: ["supply_chain_risk"],
    },
    link: "/dashboard/modules/cra",
  },
  {
    action: "Vulnerability Disclosure Policy erstellen",
    description:
      "Koordinierte Schwachstellen-Offenlegungsrichtlinie dokumentieren. Erforderlich für CRA Vulnerability Handling und NIS2 Secure Development.",
    satisfies: {
      cra: ["cra-014"],
      nis2: ["nis2-021"],
      enisa: ["network_security"],
    },
    link: "/dashboard/modules/cra",
  },
  {
    action: "Incident Response Plan dokumentieren",
    description:
      "NIS2-konformen Incident Response Plan mit CRA Art. 14 Meldepflichten erstellen. Abdeckt beide Reporting-Timelines (24h/72h).",
    satisfies: {
      cra: ["cra-026", "cra-027"],
      nis2: ["nis2-006", "nis2-007", "nis2-044"],
      enisa: ["incident_response_plan", "early_warning"],
    },
    link: "/dashboard/incidents",
  },
  {
    action: "Penetration Test durchführen",
    description:
      "Security Testing für Space-Produkte und Infrastruktur. Ergebnisse als Evidence für alle 3 Regulierungen nutzbar.",
    satisfies: {
      cra: ["cra-013"],
      nis2: ["nis2-025"],
      enisa: ["network_security"],
    },
    link: "/dashboard/modules/cybersecurity",
  },
  {
    action: "Cryptographic Policy definieren",
    description:
      "Verschlüsselungsrichtlinie für Spacecraft-Kommunikation und Ground-Segment. Deckt CRA Secure Communication und NIS2 Kryptographie ab.",
    satisfies: {
      cra: ["cra-002", "cra-008"],
      nis2: ["nis2-030", "nis2-031", "nis2-033"],
      enisa: ["crypto_policy", "space_link_encryption", "key_management"],
    },
    link: "/dashboard/modules/cybersecurity",
  },
  {
    action: "Risk Assessment durchführen",
    description:
      "Cybersecurity-Risikobewertung für Space-Produkte und Betrieb. Fundament für CRA und NIS2 Compliance.",
    satisfies: {
      cra: ["cra-018"],
      nis2: ["nis2-001", "nis2-002"],
      enisa: ["risk_assessment_regular", "threat_intelligence"],
    },
    link: "/dashboard/modules/nis2",
  },
  {
    action: "Access Control implementieren",
    description:
      "Zugriffskontrolle für Spacecraft-Systeme und Ground-Segment. SpaceWire Bus-Level + Operator RBAC.",
    satisfies: {
      cra: ["cra-001"],
      nis2: ["nis2-035", "nis2-037"],
      enisa: ["access_control"],
    },
    link: "/dashboard/modules/cybersecurity",
  },
  {
    action: "Secure Update Mechanismus einrichten",
    description:
      "Sichere Software-Update-Infrastruktur für Space-Produkte (OTA, Integrity Verification, Rollback).",
    satisfies: {
      cra: ["cra-035", "cra-036", "cra-037"],
      nis2: ["nis2-017"],
      enisa: [],
    },
    link: "/dashboard/modules/cra",
  },
];

// ============================================================================
// Smart Action Generator
// ============================================================================

/**
 * Generate prioritized smart actions based on current requirement statuses.
 * Actions are ranked by cross-regulation impact — the more non-compliant
 * requirements an action would address, the higher it ranks.
 *
 * @param requirementStatuses Map of requirementId → status (compliant, partial, non_compliant, not_assessed)
 * @returns Top 5 actions sorted by estimated impact
 */
export async function generateSmartActions(
  requirementStatuses: Map<string, string>,
): Promise<SmartAction[]> {
  const scoredActions: SmartAction[] = [];

  for (const template of ACTION_TEMPLATES) {
    const requirementsSatisfied: SmartAction["requirementsSatisfied"] = [];
    const modulesImpacted = new Set<string>();

    // Check CRA requirements
    for (const reqId of template.satisfies.cra) {
      const status = requirementStatuses.get(reqId) ?? "not_assessed";
      if (status !== "compliant") {
        requirementsSatisfied.push({
          module: "cra",
          requirementId: reqId,
          currentStatus: status,
        });
        modulesImpacted.add("cra");
      }
    }

    // Check NIS2 requirements
    for (const reqId of template.satisfies.nis2) {
      const status = requirementStatuses.get(reqId) ?? "not_assessed";
      if (status !== "compliant") {
        requirementsSatisfied.push({
          module: "nis2",
          requirementId: reqId,
          currentStatus: status,
        });
        modulesImpacted.add("nis2");
      }
    }

    // Check ENISA requirements
    for (const reqId of template.satisfies.enisa) {
      const status = requirementStatuses.get(reqId) ?? "not_assessed";
      if (status !== "compliant") {
        requirementsSatisfied.push({
          module: "enisa",
          requirementId: reqId,
          currentStatus: status,
        });
        modulesImpacted.add("enisa");
      }
    }

    // Skip if all requirements are already compliant
    if (requirementsSatisfied.length === 0) {
      continue;
    }

    // Impact = non-compliant/not-assessed count × distinct modules touched
    const estimatedScoreImpact =
      requirementsSatisfied.length * modulesImpacted.size;

    scoredActions.push({
      action: template.action,
      description: template.description,
      modulesImpacted: modulesImpacted.size,
      requirementsSatisfied,
      estimatedScoreImpact,
      link: template.link,
    });
  }

  // Sort by impact descending, return top 5
  scoredActions.sort((a, b) => b.estimatedScoreImpact - a.estimatedScoreImpact);

  return scoredActions.slice(0, 5);
}
