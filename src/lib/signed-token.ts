/**
 * HMAC-Signed Token Utility
 *
 * Creates and verifies HMAC-SHA256 signed tokens for:
 * - SSO state parameters (OIDC/SAML)
 * - SSO authentication tokens
 * - WebAuthn challenge tokens
 * - Newsletter unsubscribe links
 * - Any short-lived, tamper-proof tokens
 *
 * Format: base64url(payload).base64url(hmac-sha256)
 */

import crypto from "crypto";

const ALGORITHM = "sha256";

/**
 * Create an HMAC-signed token containing the given payload.
 * The token includes an expiration timestamp and is tamper-proof.
 *
 * @param payload - Data to include in the token
 * @param expiresInMs - Token TTL in milliseconds (default: 5 minutes)
 * @returns Signed token string (base64url.base64url)
 */
export function createSignedToken(
  payload: Record<string, unknown>,
  expiresInMs = 5 * 60 * 1000,
): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required for token signing");
  }

  const tokenData = {
    ...payload,
    exp: Date.now() + expiresInMs,
  };

  const data = Buffer.from(JSON.stringify(tokenData)).toString("base64url");
  const signature = crypto
    .createHmac(ALGORITHM, secret)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

/**
 * Verify an HMAC-signed token and return its payload.
 * Returns null if the token is invalid, tampered, or expired.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param token - The signed token to verify
 * @returns The token payload, or null if invalid
 */
export function verifySignedToken<T = Record<string, unknown>>(
  token: string,
): T | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !token) return null;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const data = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  if (!data || !signature) return null;

  const expected = crypto
    .createHmac(ALGORITHM, secret)
    .update(data)
    .digest("base64url");

  // Timing-safe comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature, "utf-8");
  const expBuf = Buffer.from(expected, "utf-8");

  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf-8"),
    );

    // Check expiration
    if (typeof payload.exp === "number" && payload.exp < Date.now()) {
      return null;
    }

    return payload as T;
  } catch {
    return null;
  }
}

// ─── Unsubscribe Tokens ───

/**
 * Create an HMAC-signed unsubscribe token for an email address.
 * Format: base64url(email).base64url(hmac-sha256(email))
 * No expiration — unsubscribe links should remain valid indefinitely.
 */
export function createUnsubscribeToken(email: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET required for unsubscribe tokens");

  const data = Buffer.from(email.toLowerCase()).toString("base64url");
  const signature = crypto
    .createHmac(ALGORITHM, secret)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

/**
 * Verify an HMAC-signed unsubscribe token and extract the email.
 * Returns null if the token is invalid or tampered.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !token) return null;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const data = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  if (!data || !signature) return null;

  const expected = crypto
    .createHmac(ALGORITHM, secret)
    .update(data)
    .digest("base64url");

  const sigBuf = Buffer.from(signature, "utf-8");
  const expBuf = Buffer.from(expected, "utf-8");

  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    return Buffer.from(data, "base64url").toString("utf-8");
  } catch {
    return null;
  }
}
