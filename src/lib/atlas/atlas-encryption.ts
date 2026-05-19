import "server-only";

/**
 * Atlas-specific encryption helpers.
 *
 * Built on top of lib/encryption.ts; provides per-organization
 * encryption for highly-confidential mandate content. This module
 * addresses audit finding SEC-T0-1 (Wave 10, see
 * docs/AUDIT-ATLAS-V2.md) — § 43e BRAO mandates that lawyer-client
 * confidential data receive sufficient technical-organisational
 * measures, and plaintext-at-rest does not meet that standard.
 *
 * DESIGN — per audit decision D-2 + D-3:
 *
 * 1. **Per-organization keys** (`encryptForOrg`). Each tenant's
 *    ciphertext is bound to a key derived from the master secret +
 *    the organization's id via scrypt. Compromise of one firm's
 *    derived key does NOT enable decryption of another firm's data.
 *    Key-rotation on a per-org basis (for data-deletion, lost-laptop
 *    incidents, etc.) is mechanically possible.
 *
 * 2. **Dual-read transition**. New writes are always encrypted; reads
 *    use `smartDecrypt()` which auto-detects ciphertext-vs-plaintext.
 *    Legacy plaintext rows continue to work until the one-shot
 *    backfill script runs. After backfill, the `decryptAtlasField()`
 *    wrapper still works — `smartDecrypt` is idempotent on properly-
 *    encrypted data.
 *
 * 3. **Empty/null/undefined fidelity**. Encrypting an empty string
 *    returns an empty string (callers can still rely on `!value`
 *    nullishness checks). Encrypting null returns null. This matches
 *    the underlying lib/encryption.ts behaviour and avoids surprising
 *    schema-level NOT-NULL-constraint violations.
 *
 * 4. **JSONB content blocks** — `AtlasMessage.content` is a JSONB
 *    array of `{ type: "text" | "image" | "tool_use" | "tool_result",
 *    ... }` blocks. Only the `.text` field of `text` blocks contains
 *    direct lawyer-typed PII; images are base64 blobs (separate
 *    encryption concern, see SEC-T0-1 follow-up) and tool blocks are
 *    structured AI metadata. `encryptAtlasMessageContent()` walks the
 *    array and encrypts only the `.text` of text-blocks.
 *
 * 5. **Tool-result content** — when a tool returns vault content
 *    (e.g. `search_mandate_vault`), the result text is fed back into
 *    Claude as `tool_result.content`. We treat that text the same as
 *    user-typed text: encrypt at rest. See SEC-T0-2 for the
 *    orthogonal prompt-injection mitigation.
 */

import {
  encryptForOrg,
  smartDecrypt,
  isEncrypted,
  isOrgEncrypted,
  migrateToOrgEncryption,
} from "@/lib/encryption";

/* ── String-field helpers ──────────────────────────────────────── */

/**
 * Encrypt a single plaintext string with the org's derived key.
 * Empty strings stay empty; null/undefined pass through unchanged.
 *
 * Safe to call with already-encrypted input — but we intentionally
 * do NOT short-circuit (double-encryption is wasted work but not a
 * data-loss bug). Caller should not double-call.
 */
export async function encryptAtlasField<T extends string | null | undefined>(
  plaintext: T,
  organizationId: string,
): Promise<T> {
  if (plaintext === null) return plaintext;
  if (plaintext === undefined) return plaintext;
  if (plaintext === "") return plaintext;
  /* TS doesn't narrow generic conditional returns through a
     control-flow; assertion is sound because the guards above
     handle every non-string variant of T. */
  return (await encryptForOrg(
    plaintext as unknown as string,
    organizationId,
  )) as unknown as T;
}

/**
 * Decrypt a single string. Auto-detects ciphertext (legacy or
 * org-encrypted) vs plaintext via `smartDecrypt`. Plaintext input
 * passes through unchanged — supports the dual-read transition
 * period before the backfill script runs.
 */
export async function decryptAtlasField<T extends string | null | undefined>(
  value: T,
): Promise<T> {
  if (value === null) return value;
  if (value === undefined) return value;
  if (value === "") return value;
  return (await smartDecrypt(value as unknown as string)) as unknown as T;
}

/* ── JSONB content-block helpers (AtlasMessage.content) ────────── */

interface TextBlock {
  type: "text";
  text: string;
  [key: string]: unknown;
}

interface OtherBlock {
  type: "image" | "tool_use" | "tool_result" | string;
  [key: string]: unknown;
}

type ContentBlock = TextBlock | OtherBlock;

function isTextBlock(block: unknown): block is TextBlock {
  return (
    !!block &&
    typeof block === "object" &&
    (block as { type?: unknown }).type === "text" &&
    typeof (block as { text?: unknown }).text === "string"
  );
}

/**
 * Encrypt the `.text` field of every text-block inside an AtlasMessage
 * content array. Other block types (image, tool_use, tool_result) are
 * left structurally intact — only their nested text-content (where
 * applicable) is encrypted.
 *
 * Tool-result blocks specifically: their `content` can be a string OR
 * an array of nested blocks. We recurse one level for the array case
 * (tool results that contain vault-extracted text need encrypting too).
 */
export async function encryptAtlasMessageContent(
  content: unknown,
  organizationId: string,
): Promise<unknown> {
  if (!Array.isArray(content)) return content;
  return Promise.all(
    content.map((block) => encryptBlock(block, organizationId)),
  );
}

async function encryptBlock(
  block: unknown,
  organizationId: string,
): Promise<unknown> {
  if (isTextBlock(block)) {
    return {
      ...block,
      text: await encryptAtlasField(block.text, organizationId),
    };
  }
  /* Tool-result blocks may contain nested content that's also
     vault-derived. Recurse one level deep. Anthropic SDK shape:
     { type: "tool_result", tool_use_id: "...", content: string | Array<{type, text}> } */
  if (
    block &&
    typeof block === "object" &&
    (block as { type?: unknown }).type === "tool_result"
  ) {
    const tr = block as {
      type: "tool_result";
      content?: unknown;
      [key: string]: unknown;
    };
    if (typeof tr.content === "string") {
      return {
        ...tr,
        content: await encryptAtlasField(tr.content, organizationId),
      };
    }
    if (Array.isArray(tr.content)) {
      return {
        ...tr,
        content: await Promise.all(
          tr.content.map((inner) => encryptBlock(inner, organizationId)),
        ),
      };
    }
  }
  return block;
}

/**
 * Mirror of `encryptAtlasMessageContent` — decrypts every text-block's
 * `.text` plus tool-result nested content. Uses `decryptAtlasField`
 * internally so plaintext (legacy-row) blocks pass through unchanged.
 */
export async function decryptAtlasMessageContent(
  content: unknown,
): Promise<unknown> {
  if (!Array.isArray(content)) return content;
  return Promise.all(content.map((block) => decryptBlock(block)));
}

async function decryptBlock(block: unknown): Promise<unknown> {
  if (isTextBlock(block)) {
    return {
      ...block,
      text: await decryptAtlasField(block.text),
    };
  }
  if (
    block &&
    typeof block === "object" &&
    (block as { type?: unknown }).type === "tool_result"
  ) {
    const tr = block as {
      type: "tool_result";
      content?: unknown;
      [key: string]: unknown;
    };
    if (typeof tr.content === "string") {
      return {
        ...tr,
        content: await decryptAtlasField(tr.content),
      };
    }
    if (Array.isArray(tr.content)) {
      return {
        ...tr,
        content: await Promise.all(
          tr.content.map((inner) => decryptBlock(inner)),
        ),
      };
    }
  }
  return block;
}

/* ── Backfill helpers (used by scripts/encrypt-atlas-backfill.ts) ─ */

/**
 * Idempotent migration of a single string field. If already org-
 * encrypted, returns as-is. If legacy-encrypted, decrypts and
 * re-encrypts with org-key. If plaintext, encrypts.
 *
 * Used by the one-shot backfill script. Safe to re-run.
 */
export async function migrateAtlasField<T extends string | null | undefined>(
  value: T,
  organizationId: string,
): Promise<T> {
  if (value === null) return value;
  if (value === undefined) return value;
  if (value === "") return value;
  return (await migrateToOrgEncryption(
    value as unknown as string,
    organizationId,
  )) as unknown as T;
}

/**
 * Idempotent migration of a JSONB content array — walks every
 * text-block and migrates its `.text`. Used by backfill.
 */
export async function migrateAtlasMessageContent(
  content: unknown,
  organizationId: string,
): Promise<unknown> {
  if (!Array.isArray(content)) return content;
  return Promise.all(
    content.map((block) => migrateBlock(block, organizationId)),
  );
}

async function migrateBlock(
  block: unknown,
  organizationId: string,
): Promise<unknown> {
  if (isTextBlock(block)) {
    return {
      ...block,
      text: await migrateAtlasField(block.text, organizationId),
    };
  }
  if (
    block &&
    typeof block === "object" &&
    (block as { type?: unknown }).type === "tool_result"
  ) {
    const tr = block as {
      type: "tool_result";
      content?: unknown;
      [key: string]: unknown;
    };
    if (typeof tr.content === "string") {
      return {
        ...tr,
        content: await migrateAtlasField(tr.content, organizationId),
      };
    }
    if (Array.isArray(tr.content)) {
      return {
        ...tr,
        content: await Promise.all(
          tr.content.map((inner) => migrateBlock(inner, organizationId)),
        ),
      };
    }
  }
  return block;
}

/* ── Inspection helpers (used by tests + admin tools) ──────────── */

/**
 * Check whether a string is already encrypted in any supported format
 * (legacy shared-key OR per-org). Used by backfill to skip already-
 * encrypted rows on retry, and by admin tooling to spot-check rollout.
 */
export function isAtlasFieldEncrypted(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return isOrgEncrypted(value) || isEncrypted(value);
}

/* Re-export the underlying types-of-encrypted-ness for callers that
   want to be explicit about which kind they observe. */
export { isOrgEncrypted, isEncrypted };
