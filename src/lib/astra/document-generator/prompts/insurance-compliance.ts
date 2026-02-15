/**
 * Insurance Compliance Report Prompt
 */

import type { InsuranceDataBundle } from "../types";

export function buildInsurancePrompt(data: InsuranceDataBundle): string {
  const a = data.assessment;

  const requiredPolicies = data.policies.filter((p) => p.isRequired);
  const activePolicies = data.policies.filter((p) =>
    ["bound", "active"].includes(p.status),
  );

  return `Generate a comprehensive Insurance Compliance Report for NCA submission. This report must comply with EU Space Act Art. 47-50 and address jurisdiction-specific insurance requirements.

## Organization Risk Profile

**Operator:** ${data.organization.name}
**Primary Jurisdiction:** ${a.primaryJurisdiction}
**Operator Type:** ${a.operatorType}
**Company Size:** ${a.companySize}
**Orbit Regime:** ${a.orbitRegime}
**Satellite Count:** ${a.satelliteCount}
**Satellite Value:** ${a.satelliteValueEur ? `EUR ${a.satelliteValueEur.toLocaleString()}` : "Not specified"}
**Total Mission Value:** ${a.totalMissionValueEur ? `EUR ${a.totalMissionValueEur.toLocaleString()}` : "Not specified"}
**Calculated TPL Requirement:** ${a.calculatedTPL ? `EUR ${a.calculatedTPL.toLocaleString()}` : "Not calculated"}
**Risk Level:** ${a.riskLevel || "Not assessed"}
**Compliance Score:** ${a.complianceScore !== null ? `${a.complianceScore}%` : "Not assessed"}
**Required Policies:** ${requiredPolicies.length}
**Active Policies:** ${activePolicies.length}

${data.policies.length > 0 ? `## Insurance Portfolio\n${data.policies.map((p) => `- **${p.insuranceType}** (${p.isRequired ? "Required" : "Optional"}): ${p.status}${p.insurer ? ` — ${p.insurer}` : ""}${p.coverageAmount ? ` — EUR ${p.coverageAmount.toLocaleString()} coverage` : ""}${p.premium ? ` — EUR ${p.premium.toLocaleString()}/year` : ""}`).join("\n")}` : ""}

## Required Sections

Generate the following sections in order:

1. **Executive Summary** — Overview of insurance coverage status and key compliance findings
2. **Organization Risk Profile** — Operational risk factors, orbit regime, fleet characteristics
3. **Third-Party Liability Analysis** — TPL calculation methodology, required minimum per Art. 48, comparison with current coverage
4. **Coverage Overview** — Summary table of all insurance types, coverage amounts, carriers, and expiry dates
5. **Jurisdiction Requirements** — Specific requirements of the primary jurisdiction (${a.primaryJurisdiction}), including mandatory minimums and supplementary requirements
6. **Gap Analysis** — Identification of coverage gaps between required and actual insurance
7. **Premium Estimates** — Market context for space insurance premiums based on risk profile
8. **Recommendations** — Prioritized actions to achieve full insurance compliance`;
}
