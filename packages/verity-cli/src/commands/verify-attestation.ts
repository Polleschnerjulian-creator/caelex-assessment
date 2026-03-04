/**
 * Verity CLI — verify-attestation Command
 *
 * Verifies a Verity attestation offline using trusted public keys.
 *
 * Usage: verity verify-attestation <file> --operator-key <file> [--attester-key <file>] [--strict] [--json]
 */

import { verifyAttestation } from "@caelex/verity-verifier-sdk";
import type { TrustedKeySet } from "@caelex/verity-verifier-sdk";
import type { Attestation } from "@caelex/verity-core";
import { loadJsonFile } from "../utils/file-loader.js";
import { loadPublicKey } from "../utils/key-loader.js";
import { formatAttestationResult } from "../utils/output.js";
import { EXIT_CODES } from "../utils/exit-codes.js";

/**
 * Parse args and run attestation verification.
 *
 * @param args - Command arguments (after "verify-attestation")
 * @returns Exit code
 */
export function verifyAttestationCommand(args: string[]): number {
  // Parse arguments
  let filePath: string | undefined;
  let operatorKeyPath: string | undefined;
  let attesterKeyPath: string | undefined;
  let strict = false;
  let json = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--operator-key") {
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
      "Error: attestation file path is required\n" +
        "Usage: verity verify-attestation <file> --operator-key <file> [--attester-key <file>] [--strict] [--json]\n",
    );
    return EXIT_CODES.MALFORMED_INPUT;
  }

  if (!operatorKeyPath) {
    process.stderr.write(
      "Error: --operator-key is required\n" +
        "Usage: verity verify-attestation <file> --operator-key <file> [--attester-key <file>] [--strict] [--json]\n",
    );
    return EXIT_CODES.MISSING_KEY;
  }

  // Load attestation
  let attestation: unknown;
  try {
    attestation = loadJsonFile(filePath);
  } catch (err) {
    process.stderr.write(
      `Error: ${err instanceof Error ? err.message : "failed to load attestation"}\n`,
    );
    return EXIT_CODES.MALFORMED_INPUT;
  }

  // Load operator key
  let operatorPublicKey: string;
  try {
    operatorPublicKey = loadPublicKey(operatorKeyPath);
  } catch (err) {
    process.stderr.write(
      `Error: ${err instanceof Error ? err.message : "failed to load operator key"}\n`,
    );
    return EXIT_CODES.MISSING_KEY;
  }

  // Optionally load attester key
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
  const att = attestation as Attestation;
  const trustedKeys: TrustedKeySet = {
    operatorKeys: [
      {
        keyId: att?.signatures?.operator_key_id ?? "cli-operator",
        publicKey: operatorPublicKey,
      },
    ],
    attesterKeys: attesterPublicKey
      ? [
          {
            keyId: att?.evidence?.attester_id ?? "cli-attester",
            publicKey: attesterPublicKey,
          },
        ]
      : [],
  };

  // Run verification
  const result = verifyAttestation(attestation, trustedKeys);

  // Output
  process.stdout.write(formatAttestationResult(result, json) + "\n");

  // Determine exit code
  if (result.valid) {
    return EXIT_CODES.VALID;
  }

  // Check for expiry
  const expiredCheck = result.checks.find(
    (c) => c.check === "temporal_validity" && !c.passed,
  );
  if (expiredCheck) {
    // In strict mode, expired is invalid; otherwise return EXPIRED exit code
    return strict ? EXIT_CODES.INVALID : EXIT_CODES.EXPIRED;
  }

  return EXIT_CODES.INVALID;
}
