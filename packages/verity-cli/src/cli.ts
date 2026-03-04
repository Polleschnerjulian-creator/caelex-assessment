/**
 * Verity CLI — Argument Parsing & Command Dispatch
 *
 * Routes CLI arguments to the appropriate command handler.
 */

import { verifyAttestationCommand } from "./commands/verify-attestation.js";
import { verifyCertCommand } from "./commands/verify-cert.js";
import { verifyProofCommand } from "./commands/verify-proof.js";
import { showCommand } from "./commands/show.js";

const VERSION = "2.0.0-alpha.1";

const HELP = `
verity — Verity 2036 CLI for offline verification

Usage:
  verity <command> [options]

Commands:
  verify-attestation <file>   Verify an attestation
    --operator-key <file>       Operator public key (required)
    --attester-key <file>       Attester public key (optional)
    --strict                    Treat expired as invalid
    --json                      Output JSON

  verify-cert <file>          Verify a certificate
    --issuer-key <file>         Issuer public key (required)
    --operator-key <file>       Operator public key (required)
    --attester-key <file>       Attester public key (optional)
    --strict                    Treat expired/partial as invalid
    --json                      Output JSON

  verify-proof <file>         Verify a transparency inclusion proof
    --platform-key <file>       Platform public key (required)
    --json                      Output JSON

  show <file>                 Display a summary of an attestation, certificate, or proof
    --json                      Output JSON

Flags:
  --help                      Show this help
  --version                   Show version

Exit Codes:
  0  VALID              All checks passed
  1  INVALID            Verification failed
  2  EXPIRED            Valid but expired
  3  PARTIALLY_VALID    Some attestations valid
  4  UNKNOWN_PROTOCOL   Unsupported protocol version
  5  MALFORMED_INPUT    Invalid file or arguments
  6  MISSING_KEY        Required key file missing
  7  ONLINE_CHECK_FAILED  Online revocation check failed
`.trim();

/**
 * Parse process.argv and dispatch to the appropriate command.
 *
 * @param argv - Arguments (process.argv.slice(2))
 * @returns Exit code
 */
export function run(argv: string[]): number {
  // Check for --help or --version as first argument
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    process.stdout.write(HELP + "\n");
    return 0;
  }

  if (argv[0] === "--version" || argv[0] === "-V") {
    process.stdout.write(VERSION + "\n");
    return 0;
  }

  const command = argv[0]!;
  const commandArgs = argv.slice(1);

  switch (command) {
    case "verify-attestation":
      return verifyAttestationCommand(commandArgs);
    case "verify-cert":
      return verifyCertCommand(commandArgs);
    case "verify-proof":
      return verifyProofCommand(commandArgs);
    case "show":
      return showCommand(commandArgs);
    default:
      process.stderr.write(`Unknown command: ${command}\n`);
      process.stderr.write("Run 'verity --help' for usage information.\n");
      return 5;
  }
}
