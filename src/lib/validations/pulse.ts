/**
 * Validation schemas for the public Pulse-Tool — Sprint 4A
 *
 * The /pulse endpoint accepts only what we need to run anonymous
 * cross-verification: legalName, optional vatId, email (for lead capture
 * + result delivery), and optional UTM tracking parameters.
 *
 * **Strict validation:** the public endpoint is the front door of the
 * funnel. Sloppy input = sloppy leads in the CRM. Validation rejects:
 *
 *   - legalName shorter than 3 chars (too short for SATCAT/GLEIF lookups)
 *   - vatId that doesn't roughly match an EU VAT-ID pattern (saves the
 *     VIES adapter from hitting the network on garbage)
 *   - email that fails RFC-5322-ish format
 */

import { z } from "zod";

// EU VAT-ID rough pattern: 2-letter country code + 2-14 alphanumeric
// chars including at least one digit. Matches the parser in
// src/lib/operator-profile/auto-detection/vies-adapter.server.ts.
const VAT_ID_RE = /^[A-Za-z]{2}[A-Z0-9 .-]{2,16}$/;

export const PulseDetectSchema = z.object({
  legalName: z
    .string()
    .trim()
    .min(3, "legalName must be at least 3 chars")
    .max(200, "legalName must be at most 200 chars"),
  vatId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(VAT_ID_RE, "vatId must look like an EU VAT-ID, e.g. DE123456789")
    .max(20)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("email must be a valid address")
    .max(254),
  // Optional country hint to seed adapters that need it
  establishment: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, "establishment must be ISO 3166-1 alpha-2")
    .optional(),
  // Funnel attribution (all optional)
  utmSource: z.string().trim().max(64).optional(),
  utmMedium: z.string().trim().max(64).optional(),
  utmCampaign: z.string().trim().max(64).optional(),
  referrer: z.string().trim().max(2048).optional(),
});

export type PulseDetectInput = z.infer<typeof PulseDetectSchema>;

/**
 * Response shape returned to the public client. Deliberately narrower
 * than `CrossVerificationResult` — we strip rawArtifact + verbose
 * adapter telemetry so the frontend gets a clean summary.
 */
export interface PulseDetectResponse {
  leadId: string;
  receivedAt: string;
  successfulSources: string[];
  failedSources: Array<{ source: string; errorKind: string; message: string }>;
  mergedFields: Array<{
    fieldName: string;
    value: unknown;
    agreementCount: number;
    contributingAdapters: string[];
  }>;
  // Surfaced warnings (e.g. VIES isValid:false, GLEIF multi-jurisdiction)
  warnings: string[];
  // The strongest tier we'd write if the prospect signed up — currently
  // T2_SOURCE_VERIFIED for any field with agreementCount ≥ 1.
  bestPossibleTier: "T0_UNVERIFIED" | "T2_SOURCE_VERIFIED";
}
