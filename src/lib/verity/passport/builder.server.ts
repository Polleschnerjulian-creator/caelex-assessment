import "server-only";

import {
  computeComplianceScore,
  type AttestationInput,
} from "@/lib/verity/score/calculator";
import type {
  PassportData,
  PassportAttestationSummary,
  PassportCertificateSummary,
} from "./types";

// ─── Regulation Name Map ──────────────────────────────────────────────────────

const REGULATION_NAMES: Record<string, string> = {
  eu_art70: "EU Space Act Art. 70 — Debris Mitigation",
  eu_art68: "EU Space Act Art. 68 — Deorbit",
  eu_art72: "EU Space Act Art. 72 — Orbit Control",
  eu_art64: "EU Space Act Art. 64 — Collision Risk",
  eu_art75: "EU Space Act Art. 75 — Environmental Impact",
  eu_art80: "EU Space Act Art. 80 — Insurance",
  iadc: "IADC Debris Mitigation Guidelines",
  nis2: "NIS2 Directive — Cybersecurity",
  itu: "ITU Radio Regulations — Spectrum",
  spectrum: "ITU/CEPT Spectrum Compliance",
  insurance: "Third-Party Liability Insurance",
  environmental: "Environmental Compliance",
};

function resolveRegulationName(ref: string): string {
  const lower = ref.toLowerCase();
  for (const [prefix, name] of Object.entries(REGULATION_NAMES)) {
    if (lower.startsWith(prefix)) return name;
  }
  return ref;
}

// ─── Builder Params ───────────────────────────────────────────────────────────

export interface BuildPassportParams {
  passportId: string;
  label: string;
  operatorId: string;
  satelliteNorad: string | null;
  satelliteName: string | null;
  jurisdictions: string[];
  attestations: Array<{
    attestationId: string;
    regulationRef: string;
    dataPoint: string;
    result: boolean;
    trustLevel: string;
    issuedAt: Date;
    expiresAt: Date;
  }>;
  certificates: Array<{
    certificateId: string;
    claimsCount: number;
    minTrustLevel: string;
    issuedAt: Date;
    expiresAt: Date;
  }>;
}

// ─── Builder ─────────────────────────────────────────────────────────────────

/**
 * Builds a PassportData object from attestations and certificates.
 * Server-only — must never be called from client components.
 */
export function buildPassportData(params: BuildPassportParams): PassportData {
  const {
    passportId,
    label,
    operatorId,
    satelliteNorad,
    satelliteName,
    jurisdictions,
    attestations,
    certificates,
  } = params;

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.caelex.eu";

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Map to attestation input for score calculation
  const scoreInputs: AttestationInput[] = attestations.map((a) => ({
    regulationRef: a.regulationRef,
    result: a.result,
    trustLevel: a.trustLevel,
    expiresAt: a.expiresAt,
    issuedAt: a.issuedAt,
  }));

  const complianceScore = computeComplianceScore(scoreInputs);

  // Build attestation summaries
  const attestationSummaries: PassportAttestationSummary[] = attestations.map(
    (a) => ({
      attestationId: a.attestationId,
      regulationRef: a.regulationRef,
      regulationName: resolveRegulationName(a.regulationRef),
      dataPoint: a.dataPoint,
      result: a.result,
      trustLevel: a.trustLevel,
      issuedAt: a.issuedAt.toISOString(),
      expiresAt: a.expiresAt.toISOString(),
    }),
  );

  // Build certificate summaries
  const certificateSummaries: PassportCertificateSummary[] = certificates.map(
    (c) => ({
      certificateId: c.certificateId,
      claimsCount: c.claimsCount,
      minTrustLevel: c.minTrustLevel,
      issuedAt: c.issuedAt.toISOString(),
      expiresAt: c.expiresAt.toISOString(),
    }),
  );

  return {
    passportId,
    label,
    operatorId,
    satelliteNorad,
    satelliteName,
    complianceScore: complianceScore.overall,
    scoreBreakdown: complianceScore.breakdown as unknown as Record<
      string,
      number
    >,
    jurisdictions,
    attestations: attestationSummaries,
    certificates: certificateSummaries,
    generatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    verificationUrl: `${APP_URL}/verity/passport/${passportId}`,
  };
}
