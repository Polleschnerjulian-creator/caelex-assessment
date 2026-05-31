import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { TradeApiKey } from "@prisma/client";

/**
 * Caelex Trade — Settings: API Keys service (Sprint T-Settings).
 *
 * Trade-scoped API keys. Distinct from the main `ApiKey` model so:
 *   - prefix is `caelex_trade_` (vs `caelex_` for the platform API),
 *   - scope vocabulary is narrower (`read-only` | `full-access`),
 *   - rate-limit + usage analytics aren't shared with platform keys.
 *
 * Security contract:
 *   1. Keys are generated with `crypto.randomBytes` (CSPRNG).
 *   2. Only the HMAC-SHA256 hash is stored; the plaintext is returned
 *      exactly once at creation and never read back. Listing returns
 *      `maskedKey` (prefix + bullets) only.
 *   3. The HMAC secret is the platform-wide `ENCRYPTION_KEY` env var —
 *      same trust boundary the main `ApiKey` model uses.
 *   4. Validation is constant-time-comparable because the lookup is by
 *      hash equality on a unique indexed column.
 */

const KEY_PREFIX = "caelex_trade_";
const KEY_BODY_LENGTH = 32; // chars in the random suffix (base64url)
const PREFIX_IDENTIFIER_LENGTH = KEY_PREFIX.length + 5; // "caelex_trade_xxxxx"

/** Trade API key scope. Coarse on purpose — finer scopes can be added
 *  later as a non-breaking extension because the column is `String[]`. */
export type TradeApiKeyScope = "read-only" | "full-access";
const SCOPES: ReadonlyArray<TradeApiKeyScope> = ["read-only", "full-access"];

/**
 * List/read shape — the `keyHash` is never exposed; consumers get a
 * `maskedKey` (prefix + 20 bullets) suitable for display in the UI.
 */
export interface TradeApiKeyView {
  id: string;
  organizationId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  maskedKey: string;
}

export interface CreateTradeApiKeyInput {
  organizationId: string;
  name: string;
  scopes: TradeApiKeyScope[];
  createdById: string;
  expiresAt?: Date | null;
}

/**
 * Return value of `createApiKey` — the plaintext key is returned
 * exactly once. Callers MUST surface it to the user immediately;
 * after this call there is no way to recover the plaintext.
 */
export interface CreatedTradeApiKey {
  apiKey: TradeApiKeyView;
  plaintextKey: string;
}

/**
 * Thrown when the caller passes an unknown scope tag. Server actions
 * catch this and surface a field-level form error.
 */
export class InvalidScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidScopeError";
  }
}

/**
 * HMAC-SHA256 of `plaintextKey` keyed by `ENCRYPTION_KEY`. Mirrors the
 * main ApiKey hashing approach so an offline DB dump can't be brute-
 * forced without the env secret.
 */
function hashKey(plaintextKey: string): string {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required for Trade API-key hashing",
    );
  }
  return crypto.createHmac("sha256", secret).update(plaintextKey).digest("hex");
}

function generatePlaintextKey(): { plaintextKey: string; keyPrefix: string } {
  const bytes = crypto.randomBytes(KEY_BODY_LENGTH);
  const body = bytes.toString("base64url").slice(0, KEY_BODY_LENGTH);
  const plaintextKey = `${KEY_PREFIX}${body}`;
  // keyPrefix = the constant prefix + first 5 chars of the random body
  // → e.g. "caelex_trade_aB3xK" — uniquely identifies the key in
  // lists/logs without revealing it.
  const keyPrefix = plaintextKey.slice(0, PREFIX_IDENTIFIER_LENGTH);
  return { plaintextKey, keyPrefix };
}

function toView(row: TradeApiKey): TradeApiKeyView {
  // Strip keyHash from the view so it can never accidentally render.
  const { keyHash, ...rest } = row;
  void keyHash;
  return {
    ...rest,
    maskedKey: `${row.keyPrefix}${"•".repeat(20)}`,
  };
}

/**
 * Whitelist-validate an array of scope strings. Returns the typed
 * scope array on success; throws `InvalidScopeError` on the first
 * unknown tag. De-duplicates.
 */
export function validateScopes(scopes: string[]): TradeApiKeyScope[] {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    throw new InvalidScopeError("At least one scope is required");
  }
  const validated: TradeApiKeyScope[] = [];
  for (const scope of scopes) {
    if (!SCOPES.includes(scope as TradeApiKeyScope)) {
      throw new InvalidScopeError(`Unknown scope "${scope}"`);
    }
    if (!validated.includes(scope as TradeApiKeyScope)) {
      validated.push(scope as TradeApiKeyScope);
    }
  }
  return validated;
}

/**
 * Create a new Trade API key. Returns the persisted row + the plaintext
 * exactly once. The caller MUST render the plaintext to the user
 * immediately and warn them it cannot be retrieved again.
 */
export async function createApiKey(
  input: CreateTradeApiKeyInput,
): Promise<CreatedTradeApiKey> {
  const validatedScopes = validateScopes(input.scopes);

  if (!input.name || input.name.trim().length === 0) {
    throw new InvalidScopeError("API-key name is required");
  }

  const { plaintextKey, keyPrefix } = generatePlaintextKey();
  const keyHash = hashKey(plaintextKey);

  const row = await prisma.tradeApiKey.create({
    data: {
      organizationId: input.organizationId,
      name: input.name.trim(),
      keyHash,
      keyPrefix,
      scopes: validatedScopes,
      createdById: input.createdById,
      expiresAt: input.expiresAt ?? null,
    },
  });

  return {
    apiKey: toView(row),
    plaintextKey,
  };
}

/**
 * List all Trade API keys for an org. Returns the view shape — the
 * `keyHash` column never surfaces; `maskedKey` is what the UI renders.
 * Ordered by createdAt desc so the newest keys appear first.
 */
export async function listApiKeys(
  organizationId: string,
): Promise<TradeApiKeyView[]> {
  const rows = await prisma.tradeApiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toView);
}

/**
 * Look up a single key by id, scoped to the org so a member of org A
 * can never inspect a key belonging to org B even if they guess the id.
 */
export async function getApiKey(
  keyId: string,
  organizationId: string,
): Promise<TradeApiKeyView | null> {
  const row = await prisma.tradeApiKey.findFirst({
    where: { id: keyId, organizationId },
  });
  return row ? toView(row) : null;
}

/**
 * Revoke (soft-delete) a Trade API key. The row stays for audit; only
 * `isActive` flips to false and revokedAt / revokedReason are
 * stamped. Scoped to org so cross-org revocation is impossible.
 *
 * Returns the updated view, or null if no matching row existed.
 */
export async function revokeApiKey(
  keyId: string,
  organizationId: string,
  reason: string | null = null,
): Promise<TradeApiKeyView | null> {
  const row = await prisma.tradeApiKey.findFirst({
    where: { id: keyId, organizationId },
  });
  if (!row) return null;

  // Idempotent — revoking an already-revoked key is a no-op that still
  // returns the current view shape so callers don't need to special-case.
  if (!row.isActive) {
    return toView(row);
  }

  const updated = await prisma.tradeApiKey.update({
    where: { id: keyId },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason ?? "Manually revoked",
    },
  });
  return toView(updated);
}

/**
 * Validate a plaintext key — used by future Trade API request handlers.
 * Returns the matching key view on success, or null on miss/inactive/
 * expired. Bumps `lastUsedAt` so the Settings page can show recency.
 *
 * Constant-time comparison isn't strictly necessary here because the
 * DB lookup is on a unique-indexed `keyHash` column — any timing
 * difference would be dominated by network latency to the DB.
 */
export async function validateKey(
  plaintextKey: string,
): Promise<TradeApiKeyView | null> {
  if (!plaintextKey.startsWith(KEY_PREFIX)) return null;
  const keyHash = hashKey(plaintextKey);

  const row = await prisma.tradeApiKey.findUnique({
    where: { keyHash },
  });
  if (!row) return null;
  if (!row.isActive) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;

  // Best-effort lastUsedAt bump — don't block the caller if the write
  // fails (e.g. read-replica routing). Fire-and-forget.
  prisma.tradeApiKey
    .update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Swallow — validation success doesn't depend on the bookkeeping write.
    });

  return toView(row);
}

/**
 * For tests/inspection: expose the hash function so callers can verify
 * a known plaintext maps to the expected DB row. Not exported as part
 * of the runtime API; service tests reach in via dynamic import.
 */
export const __testing = {
  hashKey,
  KEY_PREFIX,
  generatePlaintextKey,
};
