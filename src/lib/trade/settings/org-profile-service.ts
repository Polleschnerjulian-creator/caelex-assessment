import "server-only";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import type { TradeOrgProfile } from "@prisma/client";

/**
 * Caelex Trade — Settings: Org Profile service (Sprint T-Settings).
 *
 * All reads/writes to TradeOrgProfile pass through this module so the
 * encryption boundary stays single-sourced. Sensitive identifiers
 * (BAFA contact e-mail, EORI, DUNS+4) are stored as AES-256-GCM
 * ciphertext (`*_Enc` columns); callers always work with the
 * plaintext-view shape and the ciphertext never leaves the service.
 *
 * `preferredRegimesJson` is stored as a JSON-encoded string array.
 * Service parses/serialises so callers see a typed string[].
 */

export type TradeRegime = "BIS" | "BAFA" | "DDTC" | "ECJU";
const REGIMES: ReadonlyArray<TradeRegime> = ["BIS", "BAFA", "DDTC", "ECJU"];

/**
 * Read-shape with sensitive fields decrypted and JSON arrays parsed.
 * Consumers always work against this type; the raw Prisma row with
 * `*_Enc` ciphertext columns never leaves the service.
 */
export interface TradeOrgProfileView extends Omit<
  TradeOrgProfile,
  | "bafaContactEmailEnc"
  | "eoriNumberEnc"
  | "dunsPlus4Enc"
  | "preferredRegimesJson"
> {
  bafaContactEmail: string | null;
  eoriNumber: string | null;
  dunsPlus4: string | null;
  preferredRegimes: TradeRegime[];
}

/**
 * Editable subset of the profile view. Each field optional — the
 * upsert merges into the existing row. Sensitive fields arrive as
 * plaintext and are encrypted at the write boundary.
 */
export type TradeOrgProfilePatch = Partial<
  Omit<TradeOrgProfileView, "id" | "organizationId" | "createdAt" | "updatedAt">
>;

async function decryptOptional(
  ciphertext: string | null,
): Promise<string | null> {
  if (!ciphertext) return null;
  return decrypt(ciphertext);
}

async function encryptOptional(
  plaintext: string | null | undefined,
): Promise<string | null> {
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return null;
  }
  return encrypt(plaintext);
}

function parseRegimes(raw: string | null): TradeRegime[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Whitelist filter — drop any unknown tags so a corrupted JSON
    // payload can't propagate stray values into the UI.
    return parsed.filter(
      (v): v is TradeRegime =>
        typeof v === "string" && REGIMES.includes(v as TradeRegime),
    );
  } catch {
    return [];
  }
}

function serialiseRegimes(regimes: TradeRegime[] | undefined): string | null {
  if (!regimes || regimes.length === 0) return null;
  // De-dupe + whitelist filter so callers can't accidentally persist
  // unknown regime strings.
  const filtered = Array.from(
    new Set(regimes.filter((r) => REGIMES.includes(r))),
  );
  return filtered.length === 0 ? null : JSON.stringify(filtered);
}

function toView(
  row: TradeOrgProfile,
  decrypted: {
    bafaContactEmail: string | null;
    eoriNumber: string | null;
    dunsPlus4: string | null;
  },
): TradeOrgProfileView {
  const {
    bafaContactEmailEnc,
    eoriNumberEnc,
    dunsPlus4Enc,
    preferredRegimesJson,
    ...rest
  } = row;
  void bafaContactEmailEnc;
  void eoriNumberEnc;
  void dunsPlus4Enc;
  return {
    ...rest,
    bafaContactEmail: decrypted.bafaContactEmail,
    eoriNumber: decrypted.eoriNumber,
    dunsPlus4: decrypted.dunsPlus4,
    preferredRegimes: parseRegimes(preferredRegimesJson),
  };
}

async function materialise(row: TradeOrgProfile): Promise<TradeOrgProfileView> {
  const [bafaContactEmail, eoriNumber, dunsPlus4] = await Promise.all([
    decryptOptional(row.bafaContactEmailEnc),
    decryptOptional(row.eoriNumberEnc),
    decryptOptional(row.dunsPlus4Enc),
  ]);
  return toView(row, { bafaContactEmail, eoriNumber, dunsPlus4 });
}

/**
 * Fetch the Trade org profile, with sensitive fields decrypted and
 * regimes parsed. Returns null when no row exists — call
 * `ensureProfile` to lazy-create.
 */
export async function getProfile(
  organizationId: string,
): Promise<TradeOrgProfileView | null> {
  const row = await prisma.tradeOrgProfile.findUnique({
    where: { organizationId },
  });
  if (!row) return null;
  return materialise(row);
}

/**
 * Return the Trade org profile, creating an empty row if missing.
 * Safe to call on every page load — the upsert short-circuits with
 * `update: {}` when the row is already there.
 */
export async function ensureProfile(
  organizationId: string,
): Promise<TradeOrgProfileView> {
  const row = await prisma.tradeOrgProfile.upsert({
    where: { organizationId },
    create: { organizationId },
    update: {},
  });
  return materialise(row);
}

/**
 * Merge a patch into the Trade org profile. Sensitive plaintext fields
 * are encrypted before the DB write; null/empty resets the column to
 * NULL. Regime arrays are de-duped, whitelist-filtered, and
 * JSON-encoded. Fields omitted from the patch leave the column
 * untouched (true partial-patch semantics).
 */
export async function upsertProfile(
  organizationId: string,
  patch: TradeOrgProfilePatch,
): Promise<TradeOrgProfileView> {
  const {
    bafaContactEmail,
    eoriNumber,
    dunsPlus4,
    preferredRegimes,
    ...plain
  } = patch;

  // Build encrypted patches lazily — only when the caller provided the
  // field. Undefined leaves the column alone; null / "" clears it.
  const sensitive: {
    bafaContactEmailEnc?: string | null;
    eoriNumberEnc?: string | null;
    dunsPlus4Enc?: string | null;
    preferredRegimesJson?: string | null;
  } = {};

  if (Object.prototype.hasOwnProperty.call(patch, "bafaContactEmail")) {
    sensitive.bafaContactEmailEnc = await encryptOptional(
      bafaContactEmail ?? null,
    );
  }
  if (Object.prototype.hasOwnProperty.call(patch, "eoriNumber")) {
    sensitive.eoriNumberEnc = await encryptOptional(eoriNumber ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "dunsPlus4")) {
    sensitive.dunsPlus4Enc = await encryptOptional(dunsPlus4 ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "preferredRegimes")) {
    sensitive.preferredRegimesJson = serialiseRegimes(preferredRegimes);
  }

  const row = await prisma.tradeOrgProfile.upsert({
    where: { organizationId },
    create: {
      organizationId,
      ...plain,
      ...sensitive,
    },
    update: {
      ...plain,
      ...sensitive,
    },
  });
  return materialise(row);
}

/**
 * Validation helper — returns true if `code` is a recognised regime tag.
 * Useful at server-action boundaries where untrusted form input
 * arrives as a `string[]`.
 */
export function isTradeRegime(code: string): code is TradeRegime {
  return (REGIMES as ReadonlyArray<string>).includes(code);
}
