/**
 * Enrichment Orchestrator (Sprint A1, Pre-Knowledge Engine)
 *
 * Coordinates the EU-wide identity-resolution pipeline:
 *   VIES (EU VAT) + GLEIF (LEI) + BRIS country-router (Tier 2)
 *
 * Responsibilities:
 *   1. Dispatch adapters in parallel based on available input identifiers.
 *   2. Merge per-source AdapterOutput[] into a single EnrichedProfile with
 *      confidence-weighted conflict resolution (mergeFields helper in types.ts).
 *   3. Return EnrichmentResult with per-source attempt telemetry.
 *
 * Non-responsibilities (deferred to Sprint A1.6 cron + later sprints):
 *   - Persisting to AssureCompanyProfile (see persistEnrichmentToAssureProfile
 *     helper below — opt-in, separate concern).
 *   - Writing DerivationTrace rows. The current derivation-trace-service's
 *     `source-backed` validator only accepts kind="legal-source"|"regulatory-feed".
 *     Adding kind="external-enrichment" is a tiny follow-up; for Sprint A1
 *     the orchestrator returns provenance in-memory only.
 *   - Updating OperatorProfile via setVerifiedField. The existing
 *     WritableVerifiedField union doesn't cover legalName/vatId/lei. Extending
 *     it is a follow-up sprint.
 *
 * Design contract: never throws. Every adapter is soft-fail; orchestrator
 * aggregates errors into SourceAttempt[]. Callers inspect status to decide
 * what to do next.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";
import { lookupViesByVat, lookupViesByCountryCode } from "./vies-adapter";
import { lookupGleifByLei, searchGleifByName } from "./gleif-adapter";
import { lookupBrisByCountry, shouldDispatchBris } from "./bris-country-router";
import {
  type AdapterOutput,
  type EnrichedProfile,
  type EnrichmentInput,
  type EnrichmentResult,
  type EnrichmentRunStatus,
  type SourceAttempt,
  mergeFields,
} from "./types";

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Enrich an operator's profile from external sources.
 *
 * The set of adapters dispatched is decided dynamically from the input:
 *   - vatId         → VIES
 *   - lei           → GLEIF (direct)
 *   - legalName     → GLEIF (fuzzy search) AND BRIS-country (if countryCode given)
 *   - countryCode   → enables BRIS-country dispatch
 *
 * All dispatched adapters run in parallel with Promise.allSettled — orchestrator
 * never blocks on any single source.
 */
export async function enrichOperatorProfile(
  input: EnrichmentInput,
): Promise<EnrichmentResult> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const skip = new Set(input.skipSources ?? []);

  // ─── Plan dispatches ─────────────────────────────────────────────────
  const tasks: Array<{ source: string; promise: Promise<AdapterOutput> }> = [];

  // VIES — requires VAT or (legalName + EU countryCode + we'd need to lookup VAT,
  // which we can't without an extra registry. So only dispatch if vatId is given).
  if (input.vatId && !skip.has("vies")) {
    tasks.push({ source: "vies", promise: lookupViesByVat(input.vatId) });
  }

  // GLEIF direct lookup if we have an LEI.
  if (input.lei && !skip.has("gleif")) {
    tasks.push({ source: "gleif", promise: lookupGleifByLei(input.lei) });
  } else if (input.legalName && !skip.has("gleif")) {
    // Fuzzy name search fallback. Cheaper than LEI search and broad.
    tasks.push({
      source: "gleif",
      promise: searchGleifByName(input.legalName, input.countryCode),
    });
  }

  // BRIS country-router (Sprint A1 stub; Sprint A2 fills in country adapters).
  if (shouldDispatchBris(input) && !skip.has("bris")) {
    tasks.push({
      source: "bris",
      promise: lookupBrisByCountry({
        countryCode: input.countryCode!,
        legalName: input.legalName,
        registrationNumber: undefined,
        vatId: input.vatId,
        lei: input.lei,
      }),
    });
  }

  // ─── Edge case: no usable input ──────────────────────────────────────
  if (tasks.length === 0) {
    return {
      status: "SKIPPED",
      profile: {},
      sourceAttempts: [],
      durationMs: Date.now() - t0,
      startedAt,
    };
  }

  // ─── Execute in parallel ─────────────────────────────────────────────
  const settled = await Promise.allSettled(tasks.map((t) => t.promise));

  const outputs: AdapterOutput[] = [];
  const attempts: SourceAttempt[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]!;
    const result = settled[i]!;
    if (result.status === "fulfilled") {
      const output = result.value;
      outputs.push(output);
      attempts.push({
        source: output.source,
        success: !output.error && Object.keys(output.fields).length > 0,
        durationMs: output.durationMs,
        fieldsContributed: Object.keys(output.fields).length,
        error: output.error,
      });
    } else {
      // Should not reach — adapters catch their own errors. But defensive.
      safeLog("enrichment.unhandledAdapterReject", {
        source: task.source,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      });
      attempts.push({
        source: task.source as SourceAttempt["source"],
        success: false,
        durationMs: 0,
        fieldsContributed: 0,
        error: "Adapter promise rejected (unexpected)",
      });
    }
  }

  // ─── Merge ───────────────────────────────────────────────────────────
  const profile = mergeAdapterOutputs(outputs);

  // ─── Status ──────────────────────────────────────────────────────────
  const status = computeStatus(attempts);

  return {
    status,
    profile,
    sourceAttempts: attempts,
    durationMs: Date.now() - t0,
    startedAt,
  };
}

/**
 * Best-effort persistence helper: upsert matching fields from EnrichedProfile
 * into the existing AssureCompanyProfile model.
 *
 * Returns counts of what was written (companyName + legalName + headquarters
 * + foundedDate + legalForm + registrationNumber are mapped). Fields not
 * representable in the legacy model (vatId, lei, parent-LEI, etc.) are
 * preserved only in the EnrichmentResult.profile returned from the
 * orchestrator. A follow-up sprint adds dedicated columns or a new model.
 *
 * Idempotent: safe to call repeatedly with the same input.
 */
export async function persistEnrichmentToAssureProfile(
  organizationId: string,
  profile: EnrichedProfile,
): Promise<{ updated: number; created: boolean }> {
  // We need a non-null companyName for the upsert. Prefer legalName from
  // enrichment, else use the existing organization name as fallback.
  const legalName = profile.legalName?.value;
  const tradingName = profile.tradingName?.value;
  const companyNameForCreate = legalName ?? tradingName ?? null;

  // Build the update payload — only include fields actually present in
  // EnrichedProfile (don't blow away existing data with undefined).
  const updateData: Record<string, unknown> = {};
  let updated = 0;

  if (legalName) {
    updateData.legalName = legalName;
    updated++;
  }
  if (profile.headquartersAddress?.value) {
    updateData.headquarters = profile.headquartersAddress.value;
    updated++;
  }
  if (profile.legalForm?.value) {
    updateData.legalForm = profile.legalForm.value;
    updated++;
  }
  if (profile.registrationNumber?.value) {
    updateData.registrationNumber = profile.registrationNumber.value;
    updated++;
  }
  if (profile.foundedYear?.value !== undefined) {
    // Convert year → Jan 1 of that year for the DateTime column.
    const year = profile.foundedYear.value;
    updateData.foundedDate = new Date(Date.UTC(year, 0, 1));
    updated++;
  }

  if (updated === 0 && !companyNameForCreate) {
    return { updated: 0, created: false };
  }

  // Fetch existing (if any) so we can decide create vs update without
  // racing the upsert (some fields like companyName are required on create).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma as any).assureCompanyProfile.findUnique({
    where: { organizationId },
    select: { id: true, companyName: true },
  });

  if (existing) {
    if (updated === 0) return { updated: 0, created: false };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).assureCompanyProfile.update({
      where: { organizationId },
      data: updateData,
    });
    return { updated, created: false };
  }

  // Create new row — requires companyName.
  if (!companyNameForCreate) {
    // Fall back to Organization.name if enrichment had no name.
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    if (!org?.name) {
      // Cannot create without a company name; skip persistence rather than crash.
      safeLog("enrichment.persistSkipped.noCompanyName", { organizationId });
      return { updated: 0, created: false };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).assureCompanyProfile.create({
      data: {
        organizationId,
        companyName: org.name,
        ...updateData,
      },
    });
    return { updated, created: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).assureCompanyProfile.create({
    data: {
      organizationId,
      companyName: companyNameForCreate,
      ...updateData,
    },
  });
  return { updated, created: true };
}

// ─── Internals ─────────────────────────────────────────────────────────────

function mergeAdapterOutputs(outputs: AdapterOutput[]): EnrichedProfile {
  // Sort by confidence-descending so when mergeFields ties on equality
  // the source order is deterministic (higher-confidence first).
  const profiles = outputs.map((o) => o.fields);

  let merged: EnrichedProfile = {};
  for (const p of profiles) {
    merged = {
      legalName: mergeFields(merged.legalName, p.legalName),
      tradingName: mergeFields(merged.tradingName, p.tradingName),
      countryCode: mergeFields(merged.countryCode, p.countryCode),
      headquartersAddress: mergeFields(
        merged.headquartersAddress,
        p.headquartersAddress,
        // Treat addresses as equal if normalized (lowercase, collapsed whitespace).
        addressEqual,
      ),
      vatId: mergeFields(merged.vatId, p.vatId),
      lei: mergeFields(merged.lei, p.lei),
      registrationNumber: mergeFields(
        merged.registrationNumber,
        p.registrationNumber,
      ),
      foundedYear: mergeFields(merged.foundedYear, p.foundedYear),
      entityStatus: mergeFields(merged.entityStatus, p.entityStatus),
      legalForm: mergeFields(merged.legalForm, p.legalForm),
      parentLei: mergeFields(merged.parentLei, p.parentLei),
      ultimateParentLei: mergeFields(
        merged.ultimateParentLei,
        p.ultimateParentLei,
      ),
      companySize: mergeFields(merged.companySize, p.companySize),
    };
  }
  return stripUndefined<EnrichedProfile>(merged);
}

function addressEqual(a: string, b: string): boolean {
  return normalizeAddr(a) === normalizeAddr(b);
}

function normalizeAddr(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s,.-]+/g, " ")
    .trim();
}

function stripUndefined<T extends object>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

function computeStatus(attempts: SourceAttempt[]): EnrichmentRunStatus {
  if (attempts.length === 0) return "SKIPPED";
  const successes = attempts.filter((a) => a.success).length;
  if (successes === attempts.length) return "SUCCESS";
  if (successes === 0) return "FAILED";
  return "PARTIAL";
}
