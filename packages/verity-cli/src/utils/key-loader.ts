/**
 * Verity CLI — Public Key Loading
 *
 * Loads Ed25519 public keys from hex-encoded files.
 */

import { readFileSync } from "node:fs";

/**
 * Load a hex-encoded Ed25519 public key from a file.
 *
 * Expects 64 lowercase hex characters (32 bytes) after trimming whitespace.
 *
 * @param filePath - Path to the key file
 * @returns The hex-encoded public key string
 * @throws Error if the file cannot be read or the key format is invalid
 */
export function loadPublicKey(filePath: string): string {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error(`Key file not found: ${filePath}`);
    }
    if (code === "EACCES") {
      throw new Error(`Permission denied: ${filePath}`);
    }
    throw new Error(
      `Failed to read key file ${filePath}: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  const key = raw.trim();

  // Validate hex format: 64 hex chars = 32 bytes = Ed25519 public key
  if (!/^[0-9a-f]{64}$/i.test(key)) {
    throw new Error(
      `Invalid public key in ${filePath}: expected 64 hex characters (32 bytes Ed25519 public key), got ${key.length} characters`,
    );
  }

  return key.toLowerCase();
}
