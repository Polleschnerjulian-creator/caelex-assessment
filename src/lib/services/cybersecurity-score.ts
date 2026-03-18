/**
 * Cybersecurity Score — Single Source of Truth
 *
 * Consolidates the previously separate cybersecurity score computations from
 * compliance-scoring-service.ts and rrs-engine.server.ts into one function.
 *
 * 5 factors totaling 100 points:
 *   - Risk Assessment      30 pts  (NIS2 Art. 21(2)(a))
 *   - Security Maturity    25 pts  (NIS2 Art. 21(1) / ISO 27001)
 *   - Incident Response    20 pts  (NIS2 Art. 23)
 *   - Security Team & BCP  15 pts  (NIS2 Art. 21(2)(c))
 *   - Incident Track Record 10 pts (NIS2 Art. 23)
 */
import "server-only";

export interface CybersecurityScoreInput {
  frameworkGeneratedAt: Date | null;
  maturityScore: number | null;
  hasIncidentResponsePlan: boolean;
  hasSecurityTeam: boolean;
  hasBCP: boolean;
  unresolvedCyberIncidents: number;
  hasNIS2Assessment: boolean;
}

export interface CybersecurityScoreFactor {
  name: string;
  earnedPoints: number;
  maxPoints: number;
  enactedRef: string;
}

export interface CybersecurityScoreResult {
  totalScore: number; // 0-100
  factors: CybersecurityScoreFactor[];
}

export function computeCybersecurityScore(
  input: CybersecurityScoreInput,
): CybersecurityScoreResult {
  const factors: CybersecurityScoreFactor[] = [];

  // Factor 1: Risk Assessment (30 pts) — NIS2 Art. 21(2)(a)
  const riskAssessment = input.frameworkGeneratedAt
    ? 30
    : input.hasNIS2Assessment
      ? 10
      : 0;
  factors.push({
    name: "Risk Assessment",
    earnedPoints: riskAssessment,
    maxPoints: 30,
    enactedRef: "NIS2 Art. 21(2)(a)",
  });

  // Factor 2: Security Maturity (25 pts) — NIS2 Art. 21(1), ISO 27001
  const maturity =
    input.maturityScore != null
      ? Math.round((input.maturityScore / 100) * 25)
      : 0;
  factors.push({
    name: "Security Maturity",
    earnedPoints: maturity,
    maxPoints: 25,
    enactedRef: "NIS2 Art. 21(1) / ISO 27001",
  });

  // Factor 3: Incident Response (20 pts) — NIS2 Art. 23
  const incidentResponse = input.hasIncidentResponsePlan ? 20 : 0;
  factors.push({
    name: "Incident Response Plan",
    earnedPoints: incidentResponse,
    maxPoints: 20,
    enactedRef: "NIS2 Art. 23",
  });

  // Factor 4: Security Team & BCP (15 pts) — NIS2 Art. 21(2)(c)
  let teamBcp = 0;
  if (input.hasSecurityTeam) teamBcp += 8;
  if (input.hasBCP) teamBcp += 7;
  factors.push({
    name: "Security Team & BCP",
    earnedPoints: teamBcp,
    maxPoints: 15,
    enactedRef: "NIS2 Art. 21(2)(c)",
  });

  // Factor 5: Track Record (10 pts) — deduct per unresolved incident
  const trackRecord = Math.max(0, 10 - input.unresolvedCyberIncidents * 5);
  factors.push({
    name: "Incident Track Record",
    earnedPoints: trackRecord,
    maxPoints: 10,
    enactedRef: "NIS2 Art. 23",
  });

  const totalScore = factors.reduce((sum, f) => sum + f.earnedPoints, 0);

  return { totalScore, factors };
}
