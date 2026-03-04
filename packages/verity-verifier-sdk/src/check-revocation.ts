/**
 * Verity 2036 — Key Revocation Check
 *
 * Performs online revocation status checks against the Verity server.
 * Uses the global fetch() API (available in Node.js 18+).
 *
 * NEVER throws — on any error, returns status: "UNKNOWN".
 */

import type { RevocationStatus } from "./types.js";

/**
 * Check the revocation status of a key by querying the Verity server.
 *
 * This is the only function in the SDK that requires network access.
 * All other verification functions work fully offline.
 *
 * @param keyId - The key identifier to check
 * @param serverUrl - Base URL of the Verity server (e.g., "https://verity.caelex.com")
 * @param apiKey - Optional API key for authentication
 * @returns Revocation status. Returns status "UNKNOWN" on any error.
 */
export async function checkRevocationOnline(
  keyId: string,
  serverUrl: string,
  apiKey?: string,
): Promise<RevocationStatus> {
  const checkedAt = new Date().toISOString();

  try {
    const url = new URL(
      `/api/v1/keys/${encodeURIComponent(keyId)}/status`,
      serverUrl,
    );

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return {
        keyId,
        status: "UNKNOWN",
        reason: `Server returned HTTP ${response.status}`,
        checkedAt,
      };
    }

    const body = (await response.json()) as Record<string, unknown>;

    // Validate response shape
    const status = body["status"];
    if (
      status !== "ACTIVE" &&
      status !== "ROTATED" &&
      status !== "REVOKED" &&
      status !== "UNKNOWN"
    ) {
      return {
        keyId,
        status: "UNKNOWN",
        reason: `Unexpected status value: ${String(status)}`,
        checkedAt,
      };
    }

    return {
      keyId,
      status: status as RevocationStatus["status"],
      revokedAt:
        typeof body["revoked_at"] === "string" ? body["revoked_at"] : undefined,
      reason: typeof body["reason"] === "string" ? body["reason"] : undefined,
      checkedAt,
    };
  } catch (err) {
    return {
      keyId,
      status: "UNKNOWN",
      reason: `Network error: ${err instanceof Error ? err.message : "unknown"}`,
      checkedAt,
    };
  }
}
