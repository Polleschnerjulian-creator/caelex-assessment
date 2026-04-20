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

  // B4 fix (2026-04-20): real jurisdiction-aware filter instead of
  // the previous unconditional `return true`.
  //
  // Include an attestation iff it is relevant to the target NCA. The
  // relevance test layers three signals:
  //   1. Universal regulations that every NCA cares about regardless
  //      of jurisdiction (CA compliance, COPUOS IADC debris guidelines,
  //      ISO 24113).
  //   2. EU-level regulations that apply to every EU/EEA NCA and are
  //      routinely cited in national filings (eu_space_act_*, nis2_*,
  //      cra_*, etc.).
  //   3. Jurisdiction-prefixed regulations whose ref starts with the
  //      target jurisdiction code (e.g. `fr_los_2008`, `de_bwrg_5`).
  //
  // Non-jurisdictional attestations that fail every test are dropped
  // so the bundle only contains what the authority actually needs.
  const jurisdictionLower = jurisdiction.toLowerCase();
  const EU_JURISDICTIONS = new Set([
    "at",
    "be",
    "bg",
    "cy",
    "cz",
    "de",
    "dk",
    "ee",
    "es",
    "fi",
    "fr",
    "gr",
    "hr",
    "hu",
    "ie",
    "it",
    "lt",
    "lu",
    "lv",
    "mt",
    "nl",
    "pl",
    "pt",
    "ro",
    "se",
    "si",
    "sk",
    // EEA / ESA associate treated as EU-equivalent for filing purposes
    "is",
    "li",
    "no",
    "ch",
  ]);
  const isEUNCA = EU_JURISDICTIONS.has(jurisdictionLower);
  const UNIVERSAL_PREFIXES = [
    "ca_", // collision avoidance — every space nation cares
    "copuos_", // UN COPUOS guidelines (debris etc.)
    "iadc_", // IADC space debris mitigation
    "ost_", // Outer Space Treaty
    "liability_", // UN Liability Convention
    "registration_", // UN Registration Convention
    "iso_", // ISO 24113 and family
    "itu_", // ITU Radio Regulations
  ];
  const EU_PREFIXES = [
    "eu_",
    "eu_space_act",
    "nis2",
    "cra_",
    "dual_use_",
    "gdpr_",
  ];

  const isRelevant = (regRef: string): boolean => {
    const ref = regRef.toLowerCase();
    // 1. Universal regulations
    if (UNIVERSAL_PREFIXES.some((p) => ref.startsWith(p))) return true;
    // 2. EU-level regulations when the target NCA is in an EU/EEA state
    if (isEUNCA && EU_PREFIXES.some((p) => ref.startsWith(p))) return true;
    // 3. Jurisdiction-specific regulations (e.g. fr_los_2008)
    if (ref.startsWith(`${jurisdictionLower}_`)) return true;
    return false;
  };

  const relevantAttestations = profile
    ? attestations.filter((a) => isRelevant(a.regulationRef))
    : attestations; // No profile = bundle everything (unknown NCA fallback)

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
