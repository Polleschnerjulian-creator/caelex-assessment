"use server";

/**
 * Trade compliance-program server actions (Sprint E3a).
 *
 * One action per section on /trade/program. Each:
 *  1. auth-check (must be logged in + have a member row in some org)
 *  2. role-check (OWNER/ADMIN/MANAGER may edit; lower roles forbidden)
 *  3. zod-validate the inputs (mostly coercion from form strings)
 *  4. delegate to `upsertProgramProfile` — the only place that talks to
 *     the encryption boundary
 *  5. revalidatePath('/trade/program') so the page picks up new state
 *
 * Server actions in Next.js 15 receive plain objects by default; we
 * accept them directly rather than parsing FormData so the React form
 * can pass typed inputs (date pickers send `Date`, number fields send
 * `number`, etc).
 *
 * Each action returns a discriminated `ActionResult` so the client form
 * can render error messages without juggling try/catch around the
 * server boundary.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import {
  upsertProgramProfile,
  type ProgramProfilePatch,
} from "@/lib/trade/program-service";
import { logger } from "@/lib/logger";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const EDITOR_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

/**
 * Resolve (orgId, memberRole) for the current session. Super-admins
 * resolve to the first active org with synthetic OWNER role (mirrors
 * the program page's behaviour). Throws on unauthenticated access.
 */
async function resolveSessionContext(): Promise<{
  userId: string;
  orgId: string;
  role: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ActionError("Not signed in");
  }
  const userId = session.user.id;

  if (isSuperAdmin(session.user.email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!anyOrg) {
      throw new ActionError("No active organisation found");
    }
    return { userId, orgId: anyOrg.id, role: "OWNER" };
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organizationId: true, role: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) {
    throw new ActionError("No active organisation membership");
  }
  return { userId, orgId: membership.organizationId, role: membership.role };
}

function assertEditor(role: string) {
  if (!(EDITOR_ROLES as readonly string[]).includes(role)) {
    throw new ActionError(
      "Insufficient role — MANAGER or higher required to edit the compliance program",
    );
  }
}

class ActionError extends Error {
  constructor(public readonly publicMessage: string) {
    super(publicMessage);
    this.name = "ActionError";
  }
}

/**
 * Generic wrapper. Each section action delegates here so the auth +
 * role-check + persist + revalidate flow stays single-sourced.
 */
async function runSectionUpdate<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  rawInput: unknown,
  /** Convert validated zod output into a ProgramProfilePatch. */
  toPatch: (parsed: z.output<TSchema>) => ProgramProfilePatch,
  sectionLabel: string,
): Promise<ActionResult> {
  try {
    const ctx = await resolveSessionContext();
    assertEditor(ctx.role);

    const parsed = schema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Some fields are invalid",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }

    await upsertProgramProfile(ctx.orgId, toPatch(parsed.data));
    revalidatePath("/trade/program");
    return { ok: true };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.publicMessage };
    }
    logger.error("program-actions: section update failed", err, {
      section: sectionLabel,
    });
    return {
      ok: false,
      error: "Unexpected error while saving — please try again",
    };
  }
}

// ─── Schemas ────────────────────────────────────────────────────────

/** Reusable: accept ISO date string or empty → null. */
const optionalIsoDate = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), {
    message: "Invalid date",
  });

/** Reusable: accept number string or empty → null. */
const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

/** Reusable: trim + null if empty. */
const optionalString = z
  .string()
  .optional()
  .transform((v) => {
    const t = v?.trim();
    return t && t.length > 0 ? t : null;
  });

const optionalEmail = z
  .union([z.string().email(), z.literal("")])
  .optional()
  .transform((v) => (v && v.length > 0 ? v.trim() : null));

const optionalBoolean = z
  .union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false")])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

const companyProfileSchema = z.object({
  hasITARItems: optionalBoolean,
  hasEARItems: optionalBoolean,
  hasForeignNationals: optionalBoolean,
  hasTechnologyTransfer: optionalBoolean,
  hasDefenseContracts: optionalBoolean,
  hasManufacturingAbroad: optionalBoolean,
  hasJointVentures: optionalBoolean,
  annualExportValueEur: optionalNumber,
});

const registrationSchema = z.object({
  registeredWithDDTC: optionalBoolean,
  ddtcRegistrationNo: optionalString,
  ddtcRegistrationExpiry: optionalIsoDate,
  hasTCP: optionalBoolean,
  tcpLastReviewDate: optionalIsoDate,
  hasECL: optionalBoolean,
  hasAutomatedScreening: optionalBoolean,
  screeningVendor: optionalString,
});

const empoweredOfficialSchema = z.object({
  empoweredOfficialName: optionalString,
  empoweredOfficialEmail: optionalEmail,
  empoweredOfficialTitle: optionalString,
});

const jurisdictionSchema = z.object({
  jurisdictionDetermination: optionalString,
  jurisdictionDeterminationDate: optionalIsoDate,
  hasCJRequest: optionalBoolean,
  cjRequestDate: optionalIsoDate,
  cjDetermination: optionalString,
  cjDeterminationDate: optionalIsoDate,
});

const licenseCountersSchema = z.object({
  activeITARLicenses: optionalNumber,
  pendingITARLicenses: optionalNumber,
  activeTAAs: optionalNumber,
  activeMLAs: optionalNumber,
  activeEARLicenses: optionalNumber,
  pendingEARLicenses: optionalNumber,
  usesLicenseExceptions: optionalBoolean,
});

const trainingAuditSchema = z.object({
  lastTrainingDate: optionalIsoDate,
  nextTrainingDue: optionalIsoDate,
  trainingCompletionRate: optionalNumber,
  lastAuditDate: optionalIsoDate,
  nextAuditDue: optionalIsoDate,
  lastAuditFindings: optionalString,
});

const voluntaryDisclosuresSchema = z.object({
  hasVoluntaryDisclosures: optionalBoolean,
  voluntaryDisclosureCount: optionalNumber,
  lastVoluntaryDisclosureDate: optionalIsoDate,
});

// ─── Exported types — consumed by the form components ───────────────

export type CompanyProfileInput = z.input<typeof companyProfileSchema>;
export type RegistrationInput = z.input<typeof registrationSchema>;
export type EmpoweredOfficialInput = z.input<typeof empoweredOfficialSchema>;
export type JurisdictionInput = z.input<typeof jurisdictionSchema>;
export type LicenseCountersInput = z.input<typeof licenseCountersSchema>;
export type TrainingAuditInput = z.input<typeof trainingAuditSchema>;
export type VoluntaryDisclosuresInput = z.input<
  typeof voluntaryDisclosuresSchema
>;

// ─── Actions ────────────────────────────────────────────────────────

export async function updateCompanyProfile(
  input: CompanyProfileInput,
): Promise<ActionResult> {
  return runSectionUpdate(
    companyProfileSchema,
    input,
    (p) => p as ProgramProfilePatch,
    "companyProfile",
  );
}

export async function updateRegistration(
  input: RegistrationInput,
): Promise<ActionResult> {
  return runSectionUpdate(
    registrationSchema,
    input,
    (p) => p as ProgramProfilePatch,
    "registration",
  );
}

export async function updateEmpoweredOfficial(
  input: EmpoweredOfficialInput,
): Promise<ActionResult> {
  return runSectionUpdate(
    empoweredOfficialSchema,
    input,
    (p) => p as ProgramProfilePatch,
    "empoweredOfficial",
  );
}

export async function updateJurisdiction(
  input: JurisdictionInput,
): Promise<ActionResult> {
  return runSectionUpdate(
    jurisdictionSchema,
    input,
    (p) => p as ProgramProfilePatch,
    "jurisdiction",
  );
}

export async function updateLicenseCounters(
  input: LicenseCountersInput,
): Promise<ActionResult> {
  return runSectionUpdate(
    licenseCountersSchema,
    input,
    (p) => p as ProgramProfilePatch,
    "licenseCounters",
  );
}

export async function updateTrainingAudit(
  input: TrainingAuditInput,
): Promise<ActionResult> {
  return runSectionUpdate(
    trainingAuditSchema,
    input,
    (p) => p as ProgramProfilePatch,
    "trainingAudit",
  );
}

export async function updateVoluntaryDisclosures(
  input: VoluntaryDisclosuresInput,
): Promise<ActionResult> {
  return runSectionUpdate(
    voluntaryDisclosuresSchema,
    input,
    (p) => p as ProgramProfilePatch,
    "voluntaryDisclosures",
  );
}
