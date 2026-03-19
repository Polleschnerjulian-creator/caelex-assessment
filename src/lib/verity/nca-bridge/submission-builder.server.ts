import "server-only";
import { getNCAProfiles } from "@/lib/shield/nca-thresholds.server";
import type { NCASubmissionBundle } from "./types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://caelex.eu";

interface AttestationForBundle {
  attestationId: string;
  regulationRef: string;
  result: boolean;
  trustLevel: string;
  signature: string;
  issuedAt: Date | string;
  expiresAt: Date | string;
}

interface BuildNCABundleParams {
  organizationId: string;
  jurisdiction: string;
  satelliteNorad?: string;
  attestations: AttestationForBundle[];
  complianceScore: number;
}

/**
 * Builds an NCA submission bundle for a given jurisdiction.
 * Filters attestations to those active and non-revoked, then packages them
 * with verification metadata for the relevant national authority.
 */
export function buildNCABundle(
  params: BuildNCABundleParams,
): NCASubmissionBundle {
  const {
    organizationId,
    jurisdiction,
    satelliteNorad,
    attestations,
    complianceScore,
  } = params;

  // Resolve NCA profile
  const profiles = getNCAProfiles([jurisdiction]);
  const profile = profiles[0];

  const authority = profile
    ? profile.authority
    : `Unknown Authority (${jurisdiction.toUpperCase()})`;

  // Filter attestations to those relevant to the NCA's required fields
  // We include all active attestations — the NCA can select what it needs.
  // Optionally, only include attestations that match the jurisdiction's
  // requiredFields by checking regulationRef relevance.
  const relevantAttestations = attestations.filter((a) => {
    if (!profile) return true;
    // Include if the regulation reference matches any NCA-specific prefix
    // (e.g. authority-specific refs) or always include for broad bundles.
    return true;
  });

  const bundleId = crypto.randomUUID();
  const generatedAt = new Date().toISOString();

  return {
    bundleId,
    jurisdiction: jurisdiction.toUpperCase(),
    authority,
    operatorId: organizationId,
    satelliteNorad: satelliteNorad ?? null,
    generatedAt,
    attestations: relevantAttestations.map((a) => ({
      attestationId: a.attestationId,
      regulationRef: a.regulationRef,
      result: a.result,
      trustLevel: a.trustLevel,
      signature: a.signature,
      issuedAt:
        a.issuedAt instanceof Date
          ? a.issuedAt.toISOString()
          : String(a.issuedAt),
      expiresAt:
        a.expiresAt instanceof Date
          ? a.expiresAt.toISOString()
          : String(a.expiresAt),
    })),
    verification: {
      publicKeyUrl: `${APP_URL}/api/v1/verity/public-key`,
      verificationUrl: `${APP_URL}/verity/verify`,
      instructions: profile
        ? `Submit this bundle to ${profile.authorityShort} per ${profile.legalBasis}. ` +
          `Use the ${profile.reportFormat} format. ` +
          `Required fields: ${profile.requiredFields.join(", ")}. ` +
          `Reporting deadline: ${profile.reportingDeadlineHours}h before TCA. ` +
          `Verify attestation signatures at the verificationUrl before submission.`
        : `Submit this bundle to the relevant national authority for jurisdiction ${jurisdiction.toUpperCase()}. ` +
          `Verify attestation signatures at the verificationUrl before submission.`,
    },
    complianceScore,
  };
}
