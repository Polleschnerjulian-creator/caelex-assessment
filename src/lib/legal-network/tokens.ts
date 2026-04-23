import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Legal-Network invitation tokens.
 *
 * Design properties:
 *   - 32 bytes of cryptographic randomness, URL-safe base64 encoded.
 *   - The RAW token is delivered exactly once, inside the invitation
 *     email link. Only the SHA-256 hash is stored in the DB.
 *   - 72-hour expiry from creation.
 *   - Single-use: `consumedAt` stamp on the Invitation record is set
 *     atomically with the matter transition.
 *
 * This module intentionally contains no DB access — callers own the
 * persistence layer. The module's surface is: mint a token, hash a
 * token, check a hash. That separation keeps the crypto code
 * trivially reviewable.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32;
const TOKEN_TTL_HOURS = 72;

export interface MintedToken {
  /** Raw token to embed in the email URL. Never store server-side. */
  raw: string;
  /** SHA-256 hash of the raw token. Stored as Invitation.tokenHash. */
  hash: string;
  /** Absolute expiry timestamp. */
  expiresAt: Date;
}

export function mintInviteToken(): MintedToken {
  const raw = randomBytes(TOKEN_BYTES).toString("base64url");
  const hash = createHash("sha256").update(raw, "utf8").digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000);
  return { raw, hash, expiresAt };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * Timing-safe comparison. Direct string compare leaks info about how
 * many prefix characters matched; for auth tokens this is the gap
 * attackers need.
 */
export function tokenMatches(
  rawCandidate: string,
  storedHash: string,
): boolean {
  const candidateHash = hashToken(rawCandidate);
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
