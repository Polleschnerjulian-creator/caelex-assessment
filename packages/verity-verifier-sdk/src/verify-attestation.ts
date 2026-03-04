/**
 * Verity 2036 — Attestation Verification
 *
 * Verifies Verity attestations offline using trusted public keys.
 * Supports both V1 (legacy) and V2 (current) attestation formats.
 *
 * NEVER throws — all errors are captured in the result.
 */

import {
  validateAttestation,
  isV1Attestation,
  verifyV1Attestation,
  detectProtocolVersion,
  isExpired,
  isNotYetValid,
  COMMITMENT_SCHEME,
  COMMITMENT_VERSION,
} from "@caelex/verity-core";
import type { Attestation } from "@caelex/verity-core";
import type {
  TrustedKeySet,
  VerificationResult,
  VerificationCheck,
} from "./types.js";

/**
 * Default result for when verification fails before any checks can run.
 */
function failedResult(
  detail: string,
  protocolVersion: number = 0,
): VerificationResult {
  return {
    valid: false,
    protocolVersion,
    checks: [{ check: "parse", passed: false, detail }],
    warnings: [],
    subject: { assetType: "unknown", assetId: "unknown" },
    statement: {
      measurementType: "unknown",
      predicateType: "unknown",
      operator: "unknown",
    },
  };
}

/**
 * Verify a Verity attestation offline.
 *
 * Performs the following checks:
 * 1. Parses the attestation (accepts JSON string or object)
 * 2. Detects protocol version (V1 legacy or V2 current)
 * 3. Validates structural integrity
 * 4. Verifies operator signature using trusted keys
 * 5. Verifies attester evidence signature using trusted keys
 * 6. Validates commitment format
 * 7. Checks temporal validity (not expired, not future-dated)
 *
 * @param attestation - The attestation to verify (JSON string or object)
 * @param trustedKeys - Set of trusted public keys for signature verification
 * @returns Verification result with individual check outcomes
 */
export function verifyAttestation(
  attestation: unknown,
  trustedKeys: TrustedKeySet,
): VerificationResult {
  try {
    // 1. Parse if string
    let parsed: unknown = attestation;
    if (typeof attestation === "string") {
      try {
        parsed = JSON.parse(attestation);
      } catch {
        return failedResult("Failed to parse attestation JSON");
      }
    }

    if (!parsed || typeof parsed !== "object") {
      return failedResult("Attestation must be a non-null object");
    }

    // 2. Detect protocol version
    const versionInfo = detectProtocolVersion(parsed);

    // 3. V1 legacy path
    if (versionInfo.isLegacy) {
      return verifyV1(parsed);
    }

    // 4. V2 verification
    return verifyV2(parsed as Attestation, trustedKeys, versionInfo.version);
  } catch (err) {
    return failedResult(
      `Unexpected error: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }
}

/**
 * Verify a V1 (legacy) attestation.
 */
function verifyV1(parsed: unknown): VerificationResult {
  try {
    if (!isV1Attestation(parsed)) {
      return failedResult(
        "Attestation detected as V1 but failed V1 type check",
        1,
      );
    }

    const v1Result = verifyV1Attestation(parsed);
    const checks: VerificationCheck[] = [];

    checks.push({
      check: "v1_structure",
      passed:
        v1Result.errors.length === 0 ||
        !v1Result.errors.some((e) => e.includes("Missing")),
      detail: v1Result.errors.find((e) => e.includes("Missing")),
    });

    checks.push({
      check: "v1_signature",
      passed: v1Result.valid,
      detail: v1Result.errors.find((e) => e.includes("signature")),
    });

    return {
      valid: v1Result.valid,
      protocolVersion: 1,
      checks,
      warnings: [
        ...v1Result.warnings,
        "V1 protocol is deprecated. Re-issue attestations as V2.",
      ],
      subject: {
        assetType: "satellite",
        assetId: parsed.subject?.satellite_norad_id ?? "unknown",
      },
      statement: {
        measurementType: parsed.claim?.claim_statement ?? "unknown",
        predicateType: parsed.claim?.threshold_type ?? "unknown",
        operator: parsed.claim?.threshold_type ?? "unknown",
      },
    };
  } catch (err) {
    return failedResult(
      `V1 verification error: ${err instanceof Error ? err.message : "unknown"}`,
      1,
    );
  }
}

/**
 * Verify a V2 (current) attestation with full cryptographic checks.
 */
function verifyV2(
  attestation: Attestation,
  trustedKeys: TrustedKeySet,
  detectedVersion: number,
): VerificationResult {
  const checks: VerificationCheck[] = [];
  const warnings: string[] = [];

  // Extract subject and statement info (even if validation fails)
  const subject = {
    assetType: attestation.subject?.asset_type ?? "unknown",
    assetId: attestation.subject?.asset_id ?? "unknown",
  };
  const statement = {
    measurementType: attestation.statement?.measurement_type ?? "unknown",
    predicateType: attestation.statement?.predicate_type ?? "unknown",
    operator: attestation.statement?.operator ?? "unknown",
  };

  // Check protocol version
  if (detectedVersion !== 2) {
    warnings.push(
      `Unexpected protocol version: ${detectedVersion}. Expected 2.`,
    );
  }

  // Basic structure check
  const requiredFields = [
    "attestation_id",
    "protocol_version",
    "tenant_id",
    "subject",
    "statement",
    "commitment",
    "evidence",
    "signatures",
    "metadata",
  ];

  const obj = attestation as unknown as Record<string, unknown>;
  const missingFields = requiredFields.filter(
    (f) => obj[f] === undefined || obj[f] === null,
  );

  checks.push({
    check: "structure",
    passed: missingFields.length === 0,
    detail:
      missingFields.length > 0
        ? `Missing fields: ${missingFields.join(", ")}`
        : undefined,
  });

  if (missingFields.length > 0) {
    return {
      valid: false,
      protocolVersion: detectedVersion,
      checks,
      warnings,
      subject,
      statement,
    };
  }

  // Resolve operator key
  const operatorKeyId = attestation.signatures?.operator_key_id;
  const operatorKeyEntry = trustedKeys.operatorKeys.find(
    (k) => k.keyId === operatorKeyId,
  );

  checks.push({
    check: "operator_key_found",
    passed: operatorKeyEntry !== undefined,
    detail: operatorKeyEntry
      ? undefined
      : `Operator key '${operatorKeyId}' not found in trusted key set`,
  });

  // Resolve attester key
  const attesterId = attestation.evidence?.attester_id;
  const attesterKeyEntry = trustedKeys.attesterKeys.find(
    (k) => k.keyId === attesterId,
  );

  checks.push({
    check: "attester_key_found",
    passed: attesterKeyEntry !== undefined,
    detail: attesterKeyEntry
      ? undefined
      : `Attester key '${attesterId}' not found in trusted key set`,
  });

  // Validate attestation with verity-core (structural + cryptographic)
  const operatorPublicKey = operatorKeyEntry?.publicKey;
  const attesterPublicKey = attesterKeyEntry?.publicKey;

  const coreResult = validateAttestation(
    attestation,
    operatorPublicKey,
    attesterPublicKey,
  );

  // Map core validation errors to checks
  const structuralErrors = coreResult.errors.filter(
    (e) =>
      !e.includes("Operator signature") &&
      !e.includes("Attester evidence signature"),
  );

  checks.push({
    check: "structural_validity",
    passed: structuralErrors.length === 0,
    detail:
      structuralErrors.length > 0 ? structuralErrors.join("; ") : undefined,
  });

  // Operator signature check
  const operatorSigError = coreResult.errors.find((e) =>
    e.includes("Operator signature"),
  );
  if (operatorPublicKey) {
    checks.push({
      check: "operator_signature",
      passed: !operatorSigError,
      detail: operatorSigError,
    });
  }

  // Attester signature check
  const attesterSigError = coreResult.errors.find((e) =>
    e.includes("Attester evidence signature"),
  );
  if (attesterPublicKey) {
    checks.push({
      check: "attester_signature",
      passed: !attesterSigError,
      detail: attesterSigError,
    });
  }

  // Commitment format check
  const commitmentValid =
    attestation.commitment?.scheme === COMMITMENT_SCHEME &&
    attestation.commitment?.version === COMMITMENT_VERSION &&
    typeof attestation.commitment?.hash === "string" &&
    /^[0-9a-f]{64}$/.test(attestation.commitment.hash);

  checks.push({
    check: "commitment_format",
    passed: commitmentValid,
    detail: commitmentValid
      ? undefined
      : `Expected scheme=${COMMITMENT_SCHEME}, version=${COMMITMENT_VERSION}, 64-char hex hash`,
  });

  // Temporal validity
  let temporalPassed = true;
  let temporalDetail: string | undefined;

  try {
    const expired = isExpired(attestation.statement.valid_until);
    const notYetValid = isNotYetValid(attestation.statement.valid_from);

    if (expired) {
      temporalPassed = false;
      temporalDetail = "Attestation has expired";
      warnings.push("Attestation validity period has ended");
    } else if (notYetValid) {
      temporalPassed = false;
      temporalDetail = "Attestation is not yet valid";
      warnings.push("Attestation validity period has not started");
    }
  } catch {
    temporalPassed = false;
    temporalDetail = "Invalid validity timestamps";
  }

  checks.push({
    check: "temporal_validity",
    passed: temporalPassed,
    detail: temporalDetail,
  });

  // Add core warnings
  warnings.push(...coreResult.warnings);

  // Overall validity: all checks must pass
  const valid = checks.every((c) => c.passed);

  return {
    valid,
    protocolVersion: detectedVersion,
    checks,
    warnings,
    subject,
    statement,
  };
}
