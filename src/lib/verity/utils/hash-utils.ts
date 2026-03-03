import { createHash } from "node:crypto";

/**
 * SHA-256 hash of a UTF-8 string, returned as hex.
 */
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * SHA-256 hash of a Buffer, returned as hex.
 */
export function sha256Buffer(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}
