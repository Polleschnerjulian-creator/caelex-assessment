import "server-only";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import type {
  TradeComplianceProgram,
  TradeProgramRequirementStatus,
  TradeRequirementStatus,
} from "@prisma/client";

/**
 * Caelex Trade — Posture-Layer Service (Sprint T4).
 *
 * All reads/writes to TradeComplianceProgram pass through this module
 * so the encryption boundary stays single-sourced. Callers receive
 * plaintext for sensitive fields (`ddtcRegistrationNo`,
 * `empoweredOfficialEmail`); ciphertext never leaves the service.
 *
 * The Prisma row carries `*_Enc` columns; the `ProgramView` type
 * presents the decrypted equivalents — `ddtcRegistrationNo` and
 * `empoweredOfficialEmail` — so consumers can't accidentally render
 * ciphertext or forget to decrypt.
 */

/**
 * Read-shape with sensitive fields decrypted. Consumers should always
 * work against this type; the raw Prisma row never leaves the service.
 */
export interface ProgramView extends Omit<
  TradeComplianceProgram,
  "ddtcRegistrationNoEnc" | "empoweredOfficialEmailEnc"
> {
  ddtcRegistrationNo: string | null;
  empoweredOfficialEmail: string | null;
}

/**
 * Editable subset of ProgramView. Mirrors the read shape but every
 * field is optional — the upsert merges the patch into the existing
 * row. Sensitive fields are accepted as plaintext and encrypted at the
 * write boundary.
 */
export type ProgramProfilePatch = Partial<
  Omit<ProgramView, "id" | "organizationId" | "createdAt" | "updatedAt">
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

function toProgramView(
  row: TradeComplianceProgram,
  decrypted: {
    ddtcRegistrationNo: string | null;
    empoweredOfficialEmail: string | null;
  },
): ProgramView {
  const { ddtcRegistrationNoEnc, empoweredOfficialEmailEnc, ...rest } = row;
  void ddtcRegistrationNoEnc;
  void empoweredOfficialEmailEnc;
  return {
    ...rest,
    ddtcRegistrationNo: decrypted.ddtcRegistrationNo,
    empoweredOfficialEmail: decrypted.empoweredOfficialEmail,
  };
}

async function materializeView(
  row: TradeComplianceProgram,
): Promise<ProgramView> {
  const [ddtcRegistrationNo, empoweredOfficialEmail] = await Promise.all([
    decryptOptional(row.ddtcRegistrationNoEnc),
    decryptOptional(row.empoweredOfficialEmailEnc),
  ]);
  return toProgramView(row, { ddtcRegistrationNo, empoweredOfficialEmail });
}

/**
 * Fetch the program for an organisation, with sensitive fields decrypted.
 * Returns null when no row exists — use `ensureProgram` to lazy-create.
 */
export async function getProgram(
  organizationId: string,
): Promise<ProgramView | null> {
  const row = await prisma.tradeComplianceProgram.findUnique({
    where: { organizationId },
  });
  if (!row) return null;
  return materializeView(row);
}

/**
 * Fetch the program together with its requirement-status rows. Statuses
 * come back unchanged (no encryption applies to them); the program
 * itself is decrypted.
 */
export async function getProgramWithRequirements(
  organizationId: string,
): Promise<{
  program: ProgramView;
  requirementStatuses: TradeProgramRequirementStatus[];
} | null> {
  const row = await prisma.tradeComplianceProgram.findUnique({
    where: { organizationId },
    include: {
      requirementStatuses: {
        orderBy: [{ status: "asc" }, { requirementId: "asc" }],
      },
    },
  });
  if (!row) return null;
  const { requirementStatuses, ...program } = row;
  return {
    program: await materializeView(program),
    requirementStatuses,
  };
}

/**
 * Return the program for an organisation, creating a default DRAFT row
 * if one doesn't exist yet. Safe to call on every page load — the
 * upsert short-circuits with `update: {}` when the row is already there.
 */
export async function ensureProgram(
  organizationId: string,
): Promise<ProgramView> {
  const row = await prisma.tradeComplianceProgram.upsert({
    where: { organizationId },
    create: { organizationId },
    update: {},
  });
  return materializeView(row);
}

/**
 * Merge a patch into the program profile. Sensitive plaintext fields
 * (`ddtcRegistrationNo`, `empoweredOfficialEmail`) get encrypted before
 * the DB write; null/empty resets the column to NULL.
 */
export async function upsertProgramProfile(
  organizationId: string,
  patch: ProgramProfilePatch,
): Promise<ProgramView> {
  const { ddtcRegistrationNo, empoweredOfficialEmail, ...plain } = patch;

  // Only build encrypted patches when the caller explicitly provided the
  // field — sending `undefined` leaves the column unchanged; sending
  // `null` / "" clears it.
  const sensitive: {
    ddtcRegistrationNoEnc?: string | null;
    empoweredOfficialEmailEnc?: string | null;
  } = {};
  if (Object.prototype.hasOwnProperty.call(patch, "ddtcRegistrationNo")) {
    sensitive.ddtcRegistrationNoEnc = await encryptOptional(
      ddtcRegistrationNo ?? null,
    );
  }
  if (Object.prototype.hasOwnProperty.call(patch, "empoweredOfficialEmail")) {
    sensitive.empoweredOfficialEmailEnc = await encryptOptional(
      empoweredOfficialEmail ?? null,
    );
  }

  const row = await prisma.tradeComplianceProgram.upsert({
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
  return materializeView(row);
}

/**
 * Upsert a single requirement status. The (programId, requirementId)
 * pair is unique so re-running with the same arguments updates the
 * existing row instead of creating a duplicate.
 */
export async function setRequirementStatus(
  programId: string,
  requirementId: string,
  status: TradeRequirementStatus,
  meta?: {
    notes?: string | null;
    evidenceNotes?: string | null;
    targetDate?: Date | null;
    responsibleParty?: string | null;
  },
): Promise<void> {
  await prisma.tradeProgramRequirementStatus.upsert({
    where: {
      programId_requirementId: { programId, requirementId },
    },
    create: {
      programId,
      requirementId,
      status,
      notes: meta?.notes ?? null,
      evidenceNotes: meta?.evidenceNotes ?? null,
      targetDate: meta?.targetDate ?? null,
      responsibleParty: meta?.responsibleParty ?? null,
    },
    update: {
      status,
      ...(meta?.notes !== undefined ? { notes: meta.notes } : {}),
      ...(meta?.evidenceNotes !== undefined
        ? { evidenceNotes: meta.evidenceNotes }
        : {}),
      ...(meta?.targetDate !== undefined
        ? { targetDate: meta.targetDate }
        : {}),
      ...(meta?.responsibleParty !== undefined
        ? { responsibleParty: meta.responsibleParty }
        : {}),
    },
  });
}
