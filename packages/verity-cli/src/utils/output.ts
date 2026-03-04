/**
 * Verity CLI — Output Formatting
 *
 * Human-readable and JSON output formatters for verification results.
 */

import type {
  VerificationResult,
  CertificateVerificationResult,
  InclusionVerificationResult,
} from "@caelex/verity-verifier-sdk";

/**
 * Format a single check line for human-readable output.
 *
 * @param name - Name of the check
 * @param passed - true=passed, false=failed, null=skipped
 * @param detail - Optional detail text
 * @returns Formatted check line
 */
export function formatCheck(
  name: string,
  passed: boolean | null,
  detail?: string,
): string {
  const icon = passed === true ? "\u2713" : passed === false ? "\u2717" : "-";
  const status =
    passed === true ? "VALID" : passed === false ? "INVALID" : "SKIPPED";
  const detailStr = detail ? `  (${detail})` : "";
  return `${icon} ${name.padEnd(28)} ${status}${detailStr}`;
}

/**
 * Format an attestation verification result.
 *
 * @param result - The verification result from the SDK
 * @param json - If true, output JSON; otherwise human-readable
 * @returns Formatted output string
 */
export function formatAttestationResult(
  result: VerificationResult,
  json: boolean,
): string {
  if (json) {
    return JSON.stringify(result, null, 2);
  }

  const lines: string[] = [];
  lines.push("=== Attestation Verification ===");
  lines.push("");
  lines.push(
    `Subject:    ${result.subject.assetType} / ${result.subject.assetId}`,
  );
  lines.push(
    `Statement:  ${result.statement.predicateType} ${result.statement.operator} (${result.statement.measurementType})`,
  );
  lines.push(`Protocol:   v${result.protocolVersion}`);
  lines.push("");
  lines.push("Checks:");

  for (const check of result.checks) {
    lines.push("  " + formatCheck(check.check, check.passed, check.detail));
  }

  lines.push("");
  lines.push(`Result: ${result.valid ? "VALID" : "INVALID"}`);

  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const w of result.warnings) {
      lines.push(`  ! ${w}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a certificate verification result.
 *
 * @param result - The verification result from the SDK
 * @param json - If true, output JSON; otherwise human-readable
 * @returns Formatted output string
 */
export function formatCertificateResult(
  result: CertificateVerificationResult,
  json: boolean,
): string {
  if (json) {
    return JSON.stringify(result, null, 2);
  }

  const lines: string[] = [];
  lines.push("=== Certificate Verification ===");
  lines.push("");
  lines.push(`Status: ${result.status}`);
  lines.push("");
  lines.push("Checks:");
  lines.push(
    "  " +
      formatCheck("Certificate Signature", result.checks.certificateSignature),
  );
  lines.push("  " + formatCheck("Merkle Root", result.checks.merkleRoot));
  lines.push("  " + formatCheck("Expiry", result.checks.expiry));

  lines.push("");
  lines.push(
    `Attestations: ${result.validAttestationIndices.length} of ${result.checks.attestations.length} valid`,
  );

  for (const att of result.checks.attestations) {
    lines.push(
      "  " +
        formatCheck(
          `[${att.index}] ${att.attestationId}`,
          att.valid,
          att.reason,
        ),
    );
  }

  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const w of result.warnings) {
      lines.push(`  ! ${w}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format an inclusion proof verification result.
 *
 * @param result - The verification result from the SDK
 * @param json - If true, output JSON; otherwise human-readable
 * @returns Formatted output string
 */
export function formatInclusionResult(
  result: InclusionVerificationResult,
  json: boolean,
): string {
  if (json) {
    return JSON.stringify(result, null, 2);
  }

  const lines: string[] = [];
  lines.push("=== Inclusion Proof Verification ===");
  lines.push("");
  lines.push(`Entry ID:     ${result.entryId}`);
  lines.push(`Sequence:     ${result.sequenceNumber}`);
  lines.push(`Checkpoint:   ${result.checkpointId}`);
  lines.push("");
  lines.push("Checks:");
  lines.push("  " + formatCheck("Merkle Path", result.checks.merklePath));
  lines.push(
    "  " +
      formatCheck("Checkpoint Signature", result.checks.checkpointSignature),
  );
  lines.push("");
  lines.push(`Result: ${result.included ? "INCLUDED" : "NOT INCLUDED"}`);

  return lines.join("\n");
}
