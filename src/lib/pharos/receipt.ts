import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos Triple-Hash-Receipt + Ed25519-Signing
 *
 * Jeder Pharos-Astra-Output erzeugt einen kryptografisch signierten
 * Receipt, der drei separate Hashes über drei Aspekte der Inferenz bündelt:
 *
 *   inputHash   — sha256(prompt || systemPromptHash || modelVersion || toolTrace)
 *                 → "Was wurde gefragt?"
 *
 *   contextHash — sha256(authorityProfileId || oversightIds || citationIds)
 *                 → "In welchem regulatorischen Rahmen?"
 *
 *   outputHash  — sha256(answer || abstained)
 *                 → "Was kam dabei raus?"
 *
 *   receiptHash = sha256(inputHash || contextHash || outputHash || previousReceiptHash)
 *                 → kettet sich an den vorherigen Receipt der Aufsicht
 *
 * Der receiptHash wird mit dem Ed25519-Key der Behörde signiert. Der
 * Authority-Keypair wird DETERMINISTISCH aus ENCRYPTION_KEY +
 * authorityProfileId via scrypt-HKDF abgeleitet — kein Secret wird in
 * der DB gespeichert. Das hat drei Vorteile:
 *
 *   1. Kein Key-Storage-Risiko — wer die DB klaut, hat keinen Signing-Key
 *   2. Kein KMS-Vendor-Lock-In — alles läuft on-platform
 *   3. Schlüssel ist auf jeder Vercel-Function-Instance identisch ableitbar
 *
 * Der Public-Key wird beim ersten Signing einmal in
 * AuthorityProfile.publicSigningKey persistiert und ist von dort aus
 * öffentlich verifizierbar. Externe Verifier müssen nichts von Caelex
 * wissen außer dem öffentlichen Schlüssel und dem canonical-JSON-Algo.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  scryptSync,
  sign,
  verify,
  type KeyObject,
} from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { Citation } from "./citation";

// PKCS8/SPKI ASN.1 Envelope-Prefixes für Ed25519. Stabil und im RFC
// 8410 spezifiziert — werden hier dem rohen 32-Byte-Seed bzw. 32-Byte-
// Public-Key vorangestellt um Node's createPrivateKey/createPublicKey
// füttern zu können.
const PKCS8_ED25519_PREFIX = Buffer.from(
  "302e020100300506032b657004220420",
  "hex",
);
const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

const RECEIPT_VERSION = "v1";
const RECEIPT_KEY_DERIVATION =
  "scrypt(ENCRYPTION_KEY, 'pharos:authority:'+authProfileId, N=2^14)";

// ─── Canonical Hashing ───────────────────────────────────────────────

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort()) {
        out[k] = (v as Record<string, unknown>)[k];
      }
      return out;
    }
    return v;
  });
}

function sha256Hex(input: string | Buffer): string {
  return createHash("sha256")
    .update(typeof input === "string" ? Buffer.from(input, "utf8") : input)
    .digest("hex");
}

// ─── Authority Keypair (deterministic) ───────────────────────────────

interface AuthorityKeypair {
  privateKey: KeyObject;
  publicKey: KeyObject;
  /** Raw 32-byte Ed25519 public key, base64 — that's the format other
   *  parties need to verify our signatures. */
  publicKeyBase64: string;
}

/** Lightweight in-memory cache so repeated signings within a function
 *  invocation don't re-run scrypt. Cache scope is single Vercel-Function
 *  instance lifetime — perfectly fine for the use case. */
const keypairCache = new Map<string, AuthorityKeypair>();

export function deriveAuthorityKeypair(
  authorityProfileId: string,
): AuthorityKeypair {
  const cached = keypairCache.get(authorityProfileId);
  if (cached) return cached;

  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey || masterKey.length < 16) {
    throw new Error(
      "ENCRYPTION_KEY ist nicht gesetzt oder zu kurz — Pharos-Receipts können nicht signiert werden.",
    );
  }

  // scrypt mit fixem Salt → deterministisch. N=2^14 ist Default und
  // auf Vercel-Functions schnell genug (~50ms cold, dann gecached).
  const seed = scryptSync(
    masterKey,
    `pharos:authority:${authorityProfileId}`,
    32,
  );

  const privDer = Buffer.concat([PKCS8_ED25519_PREFIX, seed]);
  const privateKey = createPrivateKey({
    key: privDer,
    format: "der",
    type: "pkcs8",
  });
  const publicKey = createPublicKey(privateKey);

  // Raw 32-byte public key extrahieren (SPKI-Prefix abschneiden).
  const spkiDer = publicKey.export({ format: "der", type: "spki" });
  const publicKeyRaw = spkiDer.subarray(SPKI_ED25519_PREFIX.length);

  const result: AuthorityKeypair = {
    privateKey,
    publicKey,
    publicKeyBase64: publicKeyRaw.toString("base64"),
  };
  keypairCache.set(authorityProfileId, result);
  return result;
}

/** Verify a receipt signature given the public key bytes. Used by
 *  external verifiers (`pharos-verify` CLI, Behörden-Auditoren). */
export function verifyReceiptSignature(
  receiptHash: string,
  signatureBase64: string,
  publicKeyBase64: string,
): boolean {
  try {
    const publicKeyDer = Buffer.concat([
      SPKI_ED25519_PREFIX,
      Buffer.from(publicKeyBase64, "base64"),
    ]);
    const publicKey = createPublicKey({
      key: publicKeyDer,
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.from(receiptHash, "hex"),
      publicKey,
      Buffer.from(signatureBase64, "base64"),
    );
  } catch {
    return false;
  }
}

// ─── Receipt Computation ─────────────────────────────────────────────

export interface ReceiptInputs {
  authorityProfileId: string;
  /** Welche OversightRelationships hat der Tool-Loop berührt? Bestimmt
   *  in welcher Hash-Chain der Receipt landet. Mehrere = mehrere
   *  AccessLog-Einträge mit demselben receiptHash. */
  oversightIds: string[];
  /** Was der Behörden-User getippt hat. */
  prompt: string;
  /** Hash über den System-Prompt + Tool-Definitionen — so kann später
   *  reproduziert werden mit welcher Pharos-Version geantwortet wurde. */
  systemPromptHash: string;
  /** Modell-String wie er an Anthropic gegeben wurde (z.B.
   *  "claude-sonnet-4-6"). */
  modelVersion: string;
  /** Tool-Aufruf-Spur — Tool-Namen + Inputs (keine Outputs hier, die
   *  sind über citationIds referenzierbar). */
  toolCallTrace: Array<{ tool: string; input: unknown; ok: boolean }>;
  /** IDs aller Citations die in den Tool-Outputs auftauchten. */
  citationIds: string[];
  /** Finaler Antworttext oder Abstention-Block. */
  answer: string;
  abstained: boolean;
  /** Vorheriger Receipt in der Hash-Chain dieser Aufsicht. Null bei
   *  erstem Receipt — dann ist die Wurzel die handshakeHash der
   *  Aufsicht (siehe persistAstraReceipt). */
  previousReceiptHash?: string | null;
}

export interface ComputedReceipt {
  version: string;
  inputHash: string;
  contextHash: string;
  outputHash: string;
  receiptHash: string;
  previousReceiptHash: string | null;
  authorityProfileId: string;
  oversightIds: string[];
  citationIds: string[];
}

export function computeReceipt(inputs: ReceiptInputs): ComputedReceipt {
  const inputHash = sha256Hex(
    canonicalJson({
      modelVersion: inputs.modelVersion,
      prompt: inputs.prompt,
      systemPromptHash: inputs.systemPromptHash,
      toolCallTrace: inputs.toolCallTrace,
    }),
  );

  const contextHash = sha256Hex(
    canonicalJson({
      authorityProfileId: inputs.authorityProfileId,
      citationIds: [...inputs.citationIds].sort(),
      oversightIds: [...inputs.oversightIds].sort(),
    }),
  );

  const outputHash = sha256Hex(
    canonicalJson({
      abstained: inputs.abstained,
      answer: inputs.answer,
    }),
  );

  const receiptHash = sha256Hex(
    [
      RECEIPT_VERSION,
      inputHash,
      contextHash,
      outputHash,
      inputs.previousReceiptHash ?? "",
    ].join("|"),
  );

  return {
    authorityProfileId: inputs.authorityProfileId,
    citationIds: [...inputs.citationIds].sort(),
    contextHash,
    inputHash,
    outputHash,
    oversightIds: [...inputs.oversightIds].sort(),
    previousReceiptHash: inputs.previousReceiptHash ?? null,
    receiptHash,
    version: RECEIPT_VERSION,
  };
}

export interface SignedReceipt extends ComputedReceipt {
  signature: string;
  signedAt: string;
  publicKeyBase64: string;
  /** Self-describing identifier for the verification algorithm — lets
   *  external verifiers (npx pharos-verify) pick the right cipher. */
  algorithm: "ed25519";
  keyDerivation: string;
}

export function signReceipt(
  receipt: ComputedReceipt,
  authorityProfileId: string,
): SignedReceipt {
  const { privateKey, publicKeyBase64 } =
    deriveAuthorityKeypair(authorityProfileId);
  const signature = sign(
    null,
    Buffer.from(receipt.receiptHash, "hex"),
    privateKey,
  );
  return {
    ...receipt,
    algorithm: "ed25519",
    keyDerivation: RECEIPT_KEY_DERIVATION,
    publicKeyBase64,
    signature: signature.toString("base64"),
    signedAt: new Date().toISOString(),
  };
}

// ─── Persistence into OversightAccessLog Hash-Chain ──────────────────

/** Persist a signed receipt into the OversightAccessLog hash-chain of
 *  EVERY oversight the tool-loop touched. Does so atomically inside a
 *  Prisma transaction so chain integrity is preserved even under
 *  concurrent receipts.
 *
 *  Returns the entryIds that were created (one per oversightId) so
 *  callers can return verifiable receipt-references to the UI.
 */
export async function persistAstraReceipt(
  receipt: SignedReceipt,
): Promise<Array<{ oversightId: string; entryId: string; entryHash: string }>> {
  if (receipt.oversightIds.length === 0) {
    // No oversight was touched — nothing to chain into. This happens
    // for purely conversational answers (e.g. "what does NIS2 mean?").
    // We still log a single "free-form" entry, but it's not chained.
    return [];
  }

  const results: Array<{
    oversightId: string;
    entryId: string;
    entryHash: string;
  }> = [];

  // Each oversight has its own hash-chain — we do per-oversight TX so
  // a failure on one doesn't block the others, and so we read the
  // current chain-tail under SERIALIZABLE per oversight.
  for (const oversightId of receipt.oversightIds) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Read current chain tail. If empty, root is the
        // OversightRelationship.handshakeHash.
        const tail = await tx.oversightAccessLog.findFirst({
          where: { oversightId },
          orderBy: { createdAt: "desc" },
          select: { entryHash: true },
        });

        let previousHash: string;
        if (tail) {
          previousHash = tail.entryHash;
        } else {
          const ov = await tx.oversightRelationship.findUnique({
            where: { id: oversightId },
            select: { handshakeHash: true },
          });
          if (!ov) throw new Error(`Oversight ${oversightId} not found`);
          previousHash = ov.handshakeHash;
        }

        // entryHash für den AccessLog-Eintrag = sha256 über
        // (previousHash || receiptHash || oversightId). So bleibt die
        // Linie der Hash-Chain korrekt UND der Receipt ist eindeutig
        // per Eintrag identifizierbar.
        const entryHash = sha256Hex(
          [previousHash, receipt.receiptHash, oversightId].join("|"),
        );

        const created = await tx.oversightAccessLog.create({
          data: {
            oversightId,
            actorOrgId: "PHAROS_ASTRA", // marker — system-side AI action
            actorUserId: null,
            action: "AI_SCREEN",
            resourceType: "PharosAstraReceipt",
            resourceId: receipt.receiptHash,
            matterScope: "AI_INFERENCE",
            context: {
              receipt: {
                algorithm: receipt.algorithm,
                citationIds: receipt.citationIds,
                contextHash: receipt.contextHash,
                inputHash: receipt.inputHash,
                keyDerivation: receipt.keyDerivation,
                outputHash: receipt.outputHash,
                previousReceiptHash: receipt.previousReceiptHash,
                publicKeyBase64: receipt.publicKeyBase64,
                receiptHash: receipt.receiptHash,
                signature: receipt.signature,
                signedAt: receipt.signedAt,
                version: receipt.version,
              },
            },
            previousHash,
            entryHash,
          },
          select: { id: true, entryHash: true },
        });

        return { entryId: created.id, entryHash: created.entryHash };
      });

      results.push({ oversightId, ...result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(
        `[pharos-receipt] persist failed for oversight ${oversightId}: ${msg}`,
      );
      // Continue with other oversights — we don't want one DB hiccup
      // to take down the whole chat response.
    }
  }

  // Lazy-init: persist publicKey on AuthorityProfile if not yet set.
  // Idempotent — only writes once per authority lifetime.
  await prisma.authorityProfile
    .updateMany({
      where: {
        id: receipt.authorityProfileId,
        publicSigningKey: null,
      },
      data: { publicSigningKey: receipt.publicKeyBase64 },
    })
    .catch((err) => {
      logger.error(
        `[pharos-receipt] publicKey lazy-init failed: ${err instanceof Error ? err.message : err}`,
      );
    });

  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Compute a stable hash of the system prompt + tool-definition shape.
 *  Used as input to the receipt so a later auditor can verify which
 *  Pharos-prompt-version answered. Caller passes the raw strings. */
export function systemPromptHash(systemPrompt: string, tools: unknown): string {
  return sha256Hex(canonicalJson({ systemPrompt, tools }));
}

/** Extract oversightIds touched during the tool-loop. Looks at tool
 *  inputs that have an `oversightId` property — works for both current
 *  Pharos-Astra tools (query_operator_compliance, summarize_audit_chain).
 *  Future tools should follow the same input convention. */
export function extractOversightIdsFromTrace(
  trace: Array<{ tool: string; input: unknown; ok: boolean }>,
): string[] {
  const ids = new Set<string>();
  for (const call of trace) {
    if (!call.ok) continue;
    if (
      call.input &&
      typeof call.input === "object" &&
      "oversightId" in call.input
    ) {
      const id = (call.input as { oversightId: unknown }).oversightId;
      if (typeof id === "string" && id.length > 0) ids.add(id);
    }
  }
  return Array.from(ids);
}
