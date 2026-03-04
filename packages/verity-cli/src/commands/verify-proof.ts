/**
 * Verity CLI — verify-proof Command
 *
 * Verifies a transparency log inclusion proof offline.
 *
 * Usage: verity verify-proof <file> --platform-key <file> [--json]
 */

import { verifyInclusionProof } from "@caelex/verity-verifier-sdk";
import type { InclusionProof } from "@caelex/verity-verifier-sdk";
import { loadJsonFile } from "../utils/file-loader.js";
import { loadPublicKey } from "../utils/key-loader.js";
import { formatInclusionResult } from "../utils/output.js";
import { EXIT_CODES } from "../utils/exit-codes.js";

/**
 * Parse args and run inclusion proof verification.
 *
 * @param args - Command arguments (after "verify-proof")
 * @returns Exit code
 */
export function verifyProofCommand(args: string[]): number {
  // Parse arguments
  let filePath: string | undefined;
  let platformKeyPath: string | undefined;
  let json = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--platform-key") {
      platformKeyPath = args[++i];
    } else if (arg === "--json") {
      json = true;
    } else if (!arg.startsWith("-")) {
      filePath = arg;
    }
  }

  // Validate required args
  if (!filePath) {
    process.stderr.write(
      "Error: proof file path is required\n" +
        "Usage: verity verify-proof <file> --platform-key <file> [--json]\n",
    );
    return EXIT_CODES.MALFORMED_INPUT;
  }

  if (!platformKeyPath) {
    process.stderr.write(
      "Error: --platform-key is required\n" +
        "Usage: verity verify-proof <file> --platform-key <file> [--json]\n",
    );
    return EXIT_CODES.MISSING_KEY;
  }

  // Load proof
  let proof: unknown;
  try {
    proof = loadJsonFile(filePath);
  } catch (err) {
    process.stderr.write(
      `Error: ${err instanceof Error ? err.message : "failed to load proof"}\n`,
    );
    return EXIT_CODES.MALFORMED_INPUT;
  }

  // Load platform key
  let platformPublicKey: string;
  try {
    platformPublicKey = loadPublicKey(platformKeyPath);
  } catch (err) {
    process.stderr.write(
      `Error: ${err instanceof Error ? err.message : "failed to load platform key"}\n`,
    );
    return EXIT_CODES.MISSING_KEY;
  }

  // Run verification
  const result = verifyInclusionProof(
    proof as InclusionProof,
    platformPublicKey,
  );

  // Output
  process.stdout.write(formatInclusionResult(result, json) + "\n");

  return result.included ? EXIT_CODES.VALID : EXIT_CODES.INVALID;
}
