/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Server-side consent-log helper. Hashes IP and User-Agent before
 * persisting to satisfy DSGVO Art. 5 (Datenminimierung) while still
 * giving the operator usable evidence for Art. 7 Abs. 1 Nachweispflicht.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { createHash } from "node:crypto";

/* Per-process pepper. Lets us rotate hashes without exposing the
   underlying values. Falls back to a constant string in dev so local
   tests are deterministic. */
const PEPPER = process.env.CONSENT_LOG_PEPPER ?? "caelex-consent-log-2026";

export function hashSession(rawSessionKey: string): string {
  return createHash("sha256")
    .update(`${PEPPER}:session:${rawSessionKey}`)
    .digest("hex");
}

/**
 * Hash an IP, but coarse-grain it first (IPv4 → /24, IPv6 → /48) so
 * the resulting hash is per-network-segment, not per-individual.
 * Provides operator-side aggregation without persisting precise IPs.
 */
export function hashIp(rawIp: string): string {
  if (!rawIp) return "";
  let coarse = rawIp;
  if (rawIp.includes(".") && !rawIp.includes(":")) {
    /* IPv4 — drop last octet. */
    const parts = rawIp.split(".");
    if (parts.length === 4) coarse = `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  } else if (rawIp.includes(":")) {
    /* IPv6 — keep first 3 hextets, zero the rest. */
    const parts = rawIp.split(":");
    coarse = `${parts.slice(0, 3).join(":")}::`;
  }
  return createHash("sha256").update(`${PEPPER}:ip:${coarse}`).digest("hex");
}

export function hashUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  /* Truncate before hashing — UA strings can identify rare browsers
     when seen in clear; we just want a stable per-UA-class bucket. */
  const truncated = ua.slice(0, 80);
  return createHash("sha256").update(`${PEPPER}:ua:${truncated}`).digest("hex");
}
