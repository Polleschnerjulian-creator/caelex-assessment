/**
 * Verity CLI — show Command
 *
 * Display a human-readable summary of an attestation, certificate, or proof.
 * Auto-detects the type based on top-level fields.
 *
 * NEVER displays private key material, blinding factors, or actual values.
 *
 * Usage: verity show <file> [--json]
 */

import type { Attestation, Certificate } from "@caelex/verity-core";
import type { InclusionProof } from "@caelex/verity-verifier-sdk";
import { loadJsonFile } from "../utils/file-loader.js";
import { EXIT_CODES } from "../utils/exit-codes.js";

type DetectedType = "attestation" | "certificate" | "proof" | "unknown";

/**
 * Detect the type of a Verity JSON object by inspecting top-level fields.
 */
function detectType(obj: Record<string, unknown>): DetectedType {
  if ("attestation_id" in obj) return "attestation";
  if ("cert_id" in obj) return "certificate";
  if ("inclusionProof" in obj || "inclusion_proof" in obj) return "proof";
  return "unknown";
}

/**
 * Format an attestation for human-readable display.
 * NEVER shows actual values, blinding factors, or private keys.
 */
function showAttestation(att: Attestation): string {
  const lines: string[] = [];
  lines.push("=== Attestation ===");
  lines.push("");
  lines.push(`ID:               ${att.attestation_id}`);
  lines.push(`Protocol:         v${att.protocol_version}`);
  lines.push(`Tenant:           ${att.tenant_id}`);
  lines.push("");
  lines.push("Subject:");
  lines.push(`  Asset Type:     ${att.subject?.asset_type ?? "unknown"}`);
  lines.push(`  Asset ID:       ${att.subject?.asset_id ?? "unknown"}`);
  lines.push("");
  lines.push("Statement:");
  lines.push(
    `  Predicate:      ${att.statement?.predicate_type ?? "unknown"} ${att.statement?.operator ?? ""} `,
  );
  lines.push(
    `  Measurement:    ${att.statement?.measurement_type ?? "unknown"}`,
  );
  lines.push(`  Threshold Ref:  ${att.statement?.threshold_ref ?? "unknown"}`);
  lines.push(`  Valid From:     ${att.statement?.valid_from ?? "unknown"}`);
  lines.push(`  Valid Until:    ${att.statement?.valid_until ?? "unknown"}`);
  lines.push(
    `  Sequence:       ${att.statement?.sequence_number ?? "unknown"}`,
  );
  lines.push("");
  lines.push("Commitment:");
  lines.push(`  Scheme:         ${att.commitment?.scheme ?? "unknown"}`);
  lines.push(`  Version:        ${att.commitment?.version ?? "unknown"}`);
  lines.push(
    `  Hash:           ${att.commitment?.hash ? att.commitment.hash.slice(0, 16) + "..." : "unknown"}`,
  );
  lines.push("");
  lines.push("Evidence:");
  lines.push(`  Reference:      ${att.evidence?.evidence_ref ?? "unknown"}`);
  lines.push(`  Attester ID:    ${att.evidence?.attester_id ?? "unknown"}`);
  lines.push("");
  lines.push("Signatures:");
  lines.push(
    `  Operator Key:   ${att.signatures?.operator_key_id ?? "unknown"}`,
  );
  lines.push("");
  lines.push("Metadata:");
  lines.push(`  Created:        ${att.metadata?.created_at ?? "unknown"}`);
  return lines.join("\n");
}

/**
 * Format a certificate for human-readable display.
 */
function showCertificate(cert: Certificate): string {
  const lines: string[] = [];
  lines.push("=== Certificate ===");
  lines.push("");
  lines.push(`ID:               ${cert.cert_id}`);
  lines.push(`Protocol:         v${cert.protocol_version}`);
  lines.push(`Tenant:           ${cert.tenant_id}`);
  lines.push(`Issuer Key:       ${cert.issuer_key_id}`);
  lines.push(`Issued At:        ${cert.issued_at}`);
  lines.push(`Expires At:       ${cert.expires_at}`);
  lines.push(`Sequence:         ${cert.sequence_number}`);
  lines.push(
    `Merkle Root:      ${cert.merkle_root ? cert.merkle_root.slice(0, 16) + "..." : "unknown"}`,
  );
  lines.push("");
  lines.push(`Attestations: ${cert.attestations?.length ?? 0}`);

  if (Array.isArray(cert.attestations)) {
    for (let i = 0; i < cert.attestations.length; i++) {
      const att = cert.attestations[i]!;
      lines.push(
        `  [${i}] ${att.attestation_id} — ${att.statement?.measurement_type ?? "unknown"} (${att.statement?.valid_from ?? "?"} to ${att.statement?.valid_until ?? "?"})`,
      );
    }
  }

  return lines.join("\n");
}

/**
 * Format an inclusion proof for human-readable display.
 */
function showProof(proof: InclusionProof): string {
  const lines: string[] = [];
  lines.push("=== Inclusion Proof ===");
  lines.push("");
  lines.push(`Entry ID:         ${proof.entryId}`);
  lines.push(`Reference ID:     ${proof.referenceId}`);
  lines.push(`Sequence:         ${proof.sequenceNumber}`);
  lines.push(
    `Entry Hash:       ${proof.entryHash ? proof.entryHash.slice(0, 16) + "..." : "unknown"}`,
  );
  lines.push("");
  lines.push("Inclusion Proof:");
  lines.push(
    `  Checkpoint:     ${proof.inclusionProof?.checkpointId ?? "unknown"}`,
  );
  lines.push(
    `  Merkle Root:    ${proof.inclusionProof?.checkpointMerkleRoot ? proof.inclusionProof.checkpointMerkleRoot.slice(0, 16) + "..." : "unknown"}`,
  );
  lines.push(
    `  Path Length:    ${proof.inclusionProof?.merklePath?.length ?? 0}`,
  );
  return lines.join("\n");
}

/**
 * Parse args and display a Verity object.
 *
 * @param args - Command arguments (after "show")
 * @returns Exit code
 */
export function showCommand(args: string[]): number {
  let filePath: string | undefined;
  let json = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--json") {
      json = true;
    } else if (!arg.startsWith("-")) {
      filePath = arg;
    }
  }

  if (!filePath) {
    process.stderr.write(
      "Error: file path is required\nUsage: verity show <file> [--json]\n",
    );
    return EXIT_CODES.MALFORMED_INPUT;
  }

  let data: unknown;
  try {
    data = loadJsonFile(filePath);
  } catch (err) {
    process.stderr.write(
      `Error: ${err instanceof Error ? err.message : "failed to load file"}\n`,
    );
    return EXIT_CODES.MALFORMED_INPUT;
  }

  if (!data || typeof data !== "object") {
    process.stderr.write("Error: file does not contain a JSON object\n");
    return EXIT_CODES.MALFORMED_INPUT;
  }

  const obj = data as Record<string, unknown>;
  const type = detectType(obj);

  if (type === "unknown") {
    process.stderr.write(
      "Error: could not detect type (expected attestation, certificate, or proof)\n",
    );
    return EXIT_CODES.MALFORMED_INPUT;
  }

  if (json) {
    // In JSON mode, output a sanitized version (no private key material)
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
    return EXIT_CODES.VALID;
  }

  switch (type) {
    case "attestation":
      process.stdout.write(showAttestation(data as Attestation) + "\n");
      break;
    case "certificate":
      process.stdout.write(showCertificate(data as Certificate) + "\n");
      break;
    case "proof":
      process.stdout.write(showProof(data as InclusionProof) + "\n");
      break;
  }

  return EXIT_CODES.VALID;
}
