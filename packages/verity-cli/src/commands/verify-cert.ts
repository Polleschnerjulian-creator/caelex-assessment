/**
 * Verity CLI — verify-cert Command
 *
 * Verifies a Verity certificate offline using trusted public keys.
 *
 * Usage: verity verify-cert <file> --issuer-key <file> --operator-key <file> [--attester-key <file>] [--strict] [--json]
 */

import { verifyCertificate } from "@caelex/verity-verifier-sdk";
import type { CertificateTrustedKeySet } from "@caelex/verity-verifier-sdk";
import type { Certificate } from "@caelex/verity-core";
import { loadJsonFile } from "../utils/file-loader.js";
import { loadPublicKey } from "../utils/key-loader.js";
import { formatCertificateResult } from "../utils/output.js";
import { EXIT_CODES } from "../utils/exit-codes.js";

/**
 * Parse args and run certificate verification.
 *
 * @param args - Command arguments (after "verify-cert")
 * @returns Exit code
 */
export function verifyCertCommand(args: string[]): number {
  // Parse arguments
  let filePath: string | undefined;
  let issuerKeyPath: string | undefined;
  let operatorKeyPath: string | undefined;
  let attesterKeyPath: string | undefined;
  let strict = false;
  let json = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--issuer-key") {
      issuerKeyPath = args[++i];
    } else if (arg === "--operator-key") {
      operatorKeyPath = args[++i];
    } else if (arg === "--attester-key") {
      attesterKeyPath = args[++i];
    } else if (arg === "--strict") {
      strict = true;
    } else if (arg === "--json") {
      json = true;
    } else if (!arg.startsWith("-")) {
      filePath = arg;
    }
  }

  // Validate required args
  if (!filePath) {
    process.stderr.write(
      "Error: certificate file path is required\n" +
        "Usage: verity verify-cert <file> --issuer-key <file> --operator-key <file> [--attester-key <file>] [--strict] [--json]\n",
    );
    return EXIT_CODES.MALFORMED_INPUT;
  }

  if (!issuerKeyPath) {
    process.stderr.write(
      "Error: --issuer-key is required\n" +
        "Usage: verity verify-cert <file> --issuer-key <file> --operator-key <file> [--attester-key <file>] [--strict] [--json]\n",
    );
    return EXIT_CODES.MISSING_KEY;
  }

  if (!operatorKeyPath) {
    process.stderr.write(
      "Error: --operator-key is required\n" +
        "Usage: verity verify-cert <file> --issuer-key <file> --operator-key <file> [--attester-key <file>] [--strict] [--json]\n",
    );
    return EXIT_CODES.MISSING_KEY;
  }

  // Load certificate
  let certificate: unknown;
  try {
    certificate = loadJsonFile(filePath);
  } catch (err) {
    process.stderr.write(
      `Error: ${err instanceof Error ? err.message : "failed to load certificate"}\n`,
    );
    return EXIT_CODES.MALFORMED_INPUT;
  }

  // Load keys
  let issuerPublicKey: string;
  try {
    issuerPublicKey = loadPublicKey(issuerKeyPath);
  } catch (err) {
    process.stderr.write(
      `Error: ${err instanceof Error ? err.message : "failed to load issuer key"}\n`,
    );
    return EXIT_CODES.MISSING_KEY;
  }

  let operatorPublicKey: string;
  try {
    operatorPublicKey = loadPublicKey(operatorKeyPath);
  } catch (err) {
    process.stderr.write(
      `Error: ${err instanceof Error ? err.message : "failed to load operator key"}\n`,
    );
    return EXIT_CODES.MISSING_KEY;
  }

  let attesterPublicKey: string | undefined;
  if (attesterKeyPath) {
    try {
      attesterPublicKey = loadPublicKey(attesterKeyPath);
    } catch (err) {
      process.stderr.write(
        `Error: ${err instanceof Error ? err.message : "failed to load attester key"}\n`,
      );
      return EXIT_CODES.MISSING_KEY;
    }
  }

  // Build trusted key set
  const cert = certificate as Certificate;
  const trustedKeys: CertificateTrustedKeySet = {
    issuerKeys: [
      {
        keyId: cert?.issuer_key_id ?? "cli-issuer",
        publicKey: issuerPublicKey,
      },
    ],
    operatorKeys: [],
    attesterKeys: [],
  };

  // Populate operator and attester keys from embedded attestations
  if (Array.isArray(cert?.attestations)) {
    const operatorKeyIds = new Set<string>();
    const attesterIds = new Set<string>();

    for (const att of cert.attestations) {
      if (att?.signatures?.operator_key_id) {
        operatorKeyIds.add(att.signatures.operator_key_id);
      }
      if (att?.evidence?.attester_id) {
        attesterIds.add(att.evidence.attester_id);
      }
    }

    for (const keyId of operatorKeyIds) {
      trustedKeys.operatorKeys.push({
        keyId,
        publicKey: operatorPublicKey,
      });
    }

    for (const attesterId of attesterIds) {
      if (attesterPublicKey) {
        trustedKeys.attesterKeys.push({
          keyId: attesterId,
          publicKey: attesterPublicKey,
        });
      }
    }
  }

  // Run verification
  const result = verifyCertificate(certificate, trustedKeys);

  // Output
  process.stdout.write(formatCertificateResult(result, json) + "\n");

  // Determine exit code based on status
  switch (result.status) {
    case "VALID":
      return EXIT_CODES.VALID;
    case "EXPIRED":
      return strict ? EXIT_CODES.INVALID : EXIT_CODES.EXPIRED;
    case "PARTIALLY_VALID":
      return strict ? EXIT_CODES.INVALID : EXIT_CODES.PARTIALLY_VALID;
    case "INVALID":
      return EXIT_CODES.INVALID;
    default:
      return EXIT_CODES.INVALID;
  }
}
