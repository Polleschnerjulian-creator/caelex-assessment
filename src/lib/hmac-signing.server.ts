/**
 * HMAC Request Signing Service
 *
 * Provides HMAC-SHA256 request signing and verification for API v1.
 * Prevents tampering and replay attacks on sensitive API operations.
 *
 * Signature Format:
 * X-Signature: t=<timestamp>,v1=<hmac_hex>
 *
 * Signing string format:
 * <timestamp>.<method>.<path>.<body_hash>
 *
 * @example
 * // Client-side signing (pseudocode):
 * const timestamp = Math.floor(Date.now() / 1000);
 * const bodyHash = sha256(requestBody || "");
 * const signaturePayload = `${timestamp}.${method}.${path}.${bodyHash}`;
 * const signature = hmac_sha256(signingSecret, signaturePayload);
 * headers["X-Signature"] = `t=${timestamp},v1=${signature}`;
 */

import "server-only";
import { timingSafeEqual, createHmac, createHash } from "crypto";

// ─── Constants ───

/**
 * Maximum age of a valid signature (5 minutes)
 * Prevents replay attacks while allowing for clock drift
 */
const MAX_SIGNATURE_AGE_SECONDS = 300;

/**
 * Minimum timestamp to accept (prevents ancient replays)
 * Set to Jan 1, 2024 as a reasonable baseline
 */
const MIN_TIMESTAMP = 1704067200;

// ─── Types ───

export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
  timestamp?: number;
  age?: number;
}

export interface SignatureComponents {
  timestamp: number;
  signature: string;
}

// ─── Signature Generation ───

/**
 * Generate an HMAC signature for a request
 */
export function generateSignature(
  signingSecret: string,
  method: string,
  path: string,
  body: string | null,
  timestamp?: number,
): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const bodyHash = hashBody(body);
  const payload = buildSignaturePayload(ts, method, path, bodyHash);
  const hmac = createHmac("sha256", signingSecret)
    .update(payload)
    .digest("hex");
  return `t=${ts},v1=${hmac}`;
}

/**
 * Build the signature payload string
 */
function buildSignaturePayload(
  timestamp: number,
  method: string,
  path: string,
  bodyHash: string,
): string {
  return `${timestamp}.${method.toUpperCase()}.${path}.${bodyHash}`;
}

/**
 * Hash the request body (empty string for no body)
 */
function hashBody(body: string | null): string {
  if (!body || body === "") {
    return createHash("sha256").update("").digest("hex");
  }
  return createHash("sha256").update(body).digest("hex");
}

// ─── Signature Verification ───

/**
 * Verify an HMAC signature from request headers
 */
export function verifySignature(
  signatureHeader: string | null,
  signingSecret: string,
  method: string,
  path: string,
  body: string | null,
): SignatureVerificationResult {
  if (!signatureHeader) {
    return { valid: false, error: "Missing X-Signature header" };
  }

  // Parse signature header
  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) {
    return { valid: false, error: "Invalid signature format" };
  }

  const { timestamp, signature } = parsed;

  // Validate timestamp
  const timestampValidation = validateTimestamp(timestamp);
  if (!timestampValidation.valid) {
    return timestampValidation;
  }

  // Compute expected signature
  const bodyHash = hashBody(body);
  const payload = buildSignaturePayload(timestamp, method, path, bodyHash);
  const expectedSignature = createHmac("sha256", signingSecret)
    .update(payload)
    .digest("hex");

  // Timing-safe comparison
  if (!timingSafeCompare(signature, expectedSignature)) {
    return { valid: false, error: "Invalid signature" };
  }

  const age = Math.floor(Date.now() / 1000) - timestamp;
  return { valid: true, timestamp, age };
}

/**
 * Parse the signature header into components
 * Format: t=<timestamp>,v1=<signature>
 */
function parseSignatureHeader(header: string): SignatureComponents | null {
  const parts = header.split(",");
  let timestamp: number | null = null;
  let signature: string | null = null;

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (!key || !value) continue;

    if (key === "t") {
      const ts = parseInt(value, 10);
      if (!isNaN(ts)) {
        timestamp = ts;
      }
    } else if (key === "v1") {
      signature = value;
    }
  }

  if (timestamp === null || signature === null) {
    return null;
  }

  return { timestamp, signature };
}

/**
 * Validate that the timestamp is recent and not from the future
 */
function validateTimestamp(timestamp: number): SignatureVerificationResult {
  const now = Math.floor(Date.now() / 1000);

  // Check if timestamp is too old
  if (timestamp < MIN_TIMESTAMP) {
    return { valid: false, error: "Timestamp too old", timestamp };
  }

  // Check if timestamp is in the future (with 60s tolerance for clock drift)
  if (timestamp > now + 60) {
    return { valid: false, error: "Timestamp in the future", timestamp };
  }

  // Check if signature has expired
  const age = now - timestamp;
  if (age > MAX_SIGNATURE_AGE_SECONDS) {
    return {
      valid: false,
      error: `Signature expired (${age}s old, max ${MAX_SIGNATURE_AGE_SECONDS}s)`,
      timestamp,
      age,
    };
  }

  return { valid: true, timestamp, age };
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeCompare(a: string, b: string): boolean {
  try {
    // Convert to buffers for comparison
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");

    // Must be same length for timingSafeEqual
    if (bufA.length !== bufB.length) {
      return false;
    }

    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// ─── API Key Signing Secret Generation ───

/**
 * Generate a new signing secret for an API key
 * Returns a 256-bit (32 byte) secret as a hex string
 */
export function generateSigningSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Middleware Helper ───

/**
 * Extract request details for signature verification
 */
export async function extractRequestDetails(request: Request): Promise<{
  method: string;
  path: string;
  body: string | null;
  signatureHeader: string | null;
}> {
  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname;
  const signatureHeader = request.headers.get("X-Signature");

  // Get body for POST/PUT/PATCH requests
  let body: string | null = null;
  if (["POST", "PUT", "PATCH"].includes(method)) {
    try {
      body = await request.text();
    } catch {
      body = null;
    }
  }

  return { method, path, body, signatureHeader };
}
