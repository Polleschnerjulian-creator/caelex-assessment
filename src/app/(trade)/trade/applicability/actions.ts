"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { resolveTradeOrgId } from "@/lib/trade/resolve-org-id.server";
import { saveApplicability } from "@/lib/trade/applicability/applicability-service.server";
import type {
  ApplicabilityAnswers,
  ApplicabilityResult,
} from "@/lib/trade/applicability/assess-applicability";

/**
 * Caelex Trade — Applicability wizard submit (server action).
 *
 * The wizard holds answers in client state and only persists on the final,
 * acknowledged submit (R6). `answers` is the only untrusted boundary, so it
 * is validated against the engine's answer model before anything is written.
 * On success the result is returned for an immediate render and `/trade` is
 * revalidated so the home gate banner flips to the personalised shortlist.
 */

// ── Untrusted-input validation (mirrors assess-applicability's answer model) ──
const productKind = z.enum([
  "hardware",
  "software",
  "technology",
  "service_only",
  "unsure",
]);
const domainSignal = z.enum([
  "satellite",
  "launch_propulsion",
  "ground_station",
  "rf_payload",
  "imaging_eo_sar",
  "none",
  "unsure",
]);
const yesNoUnsure = z.enum(["yes", "no", "unsure"]);
const transferScope = z.enum([
  "none",
  "intra_eu_only",
  "outside_eu",
  "global",
  "unsure",
]);

const answersSchema = z.object({
  // ISO-2, the "EU" pseudo-code, or "NON_EU". Length-bounded to keep a stray
  // payload from ballooning the persisted snapshot.
  establishmentCountry: z.string().min(2).max(8),
  productKinds: z.array(productKind).max(8),
  domainSignals: z.array(domainSignal).max(8),
  hasUsOriginContent: yesNoUnsure,
  hasUsPersonOrTechNexus: yesNoUnsure,
  hasMilitaryOrDefenseNexus: yesNoUnsure,
  transfersAbroad: transferScope,
  destinationCountries: z.array(z.string().min(2).max(2)).max(60).optional(),
});

export type SubmitApplicabilityResult =
  | { ok: true; result: ApplicabilityResult }
  | { ok: false; error: string };

export async function submitApplicability(
  rawAnswers: unknown,
): Promise<SubmitApplicabilityResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const parsed = answersSchema.safeParse(rawAnswers);
  if (!parsed.success) {
    return { ok: false, error: "Ungültige Eingaben." };
  }

  const orgId = await resolveTradeOrgId(session.user.id, session.user.email);
  if (orgId === "no-org" || orgId === "super-admin-no-org") {
    return { ok: false, error: "Keine aktive Organisation gefunden." };
  }

  // Cast is safe: the Zod schema enforces the exact union shape above.
  const answers = parsed.data as ApplicabilityAnswers;
  const result = await saveApplicability(orgId, answers, new Date());

  revalidatePath("/trade");
  revalidatePath("/trade/applicability");
  return { ok: true, result };
}
