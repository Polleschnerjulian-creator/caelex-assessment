import { randomBytes } from "crypto";

/**
 * Build a P2P verification request with a cryptographically random ID.
 *
 * T1-M2 (audit fix 2026-05-05): the previous implementation used
 * `Math.random().toString(36).slice(2, 8)` which provides ~31 bits of
 * entropy from a non-cryptographic RNG (V8 xorshift128+). Combined
 * with the predictable `Date.now()` prefix, the requestId space was
 * enumerable. Since `requestId` is the access-control identifier in
 * `/p2p/respond` and `/p2p/verify`, a guessable ID lets an attacker
 * potentially intercept or fake P2P verification flows.
 *
 * The new implementation uses 16 bytes (128 bits) from `crypto.
 * randomBytes` — a CSPRNG — for the suffix. The Date.now() prefix is
 * kept for human-debuggable IDs but no longer carries security weight.
 */
export function buildVerificationRequest(params: {
  requesterName: string;
  regulationRefs: string[];
  purpose: string;
  message?: string;
  expiresInDays?: number;
}): { requestId: string; expiresAt: string } {
  return {
    requestId: `vr_${Date.now()}_${randomBytes(16).toString("hex")}`,
    expiresAt: new Date(
      Date.now() + (params.expiresInDays ?? 7) * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}
