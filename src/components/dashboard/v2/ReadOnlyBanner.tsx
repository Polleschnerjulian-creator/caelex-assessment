"use client";

/**
 * Sprint UF9 — Read-Only Mode banner for auditor persona.
 *
 * Renders a sticky disclosure strip at the top of pages where the
 * current user has the "auditor" use-case persona — enforcing the
 * principle that an external auditor must NOT be able to mutate the
 * compliance state they're auditing.
 *
 * # Why client-side enforcement (with documented gap)
 *
 * Today the persona lives in localStorage (Sprint UF6 deferred the
 * Prisma column to keep the multi-week schema migration out of this
 * batch). That means the read-only enforcement here is **honor-system
 * + accidental-foot-shooting prevention**, not security:
 *
 *   - Honest auditors see the banner + grayed pills + early-returning
 *     mutations and won't accidentally flip a status.
 *   - A motivated bad actor could clear localStorage in DevTools to
 *     bypass the gate.
 *
 * The full hardening path is:
 *   1. Migrate User.useCase to Prisma + session payload (next batch)
 *   2. Add server-side middleware that 403s mutating /api/* calls
 *      from auditor sessions
 *   3. Drop the client-side guards (or keep as defense-in-depth)
 *
 * For now: client-side gate is the right scope-fit for an audit-grade
 * UX without paying the migration cost. The `data-read-only` attribute
 * on mutations + the banner make the intent visible and testable.
 *
 * # Why not just hide the mutating UI
 *
 * Auditors NEED to see the status pills (that's their job — looking
 * at compliance state). Hiding the mutation surface entirely would
 * make the page useless. The grayed pills + cursor:not-allowed +
 * tooltip pattern is standard "read-only" affordance.
 */

import * as React from "react";
import Link from "next/link";
import { Eye, ShieldCheck } from "lucide-react";
import { useUseCase } from "@/lib/use-case";

/**
 * Convenience hook: returns `true` when the active persona is one
 * that should see read-only enforcement. Today: auditor. Investors
 * could also be added here in future if they get access to
 * compliance-mutation surfaces.
 */
export function useIsReadOnlyPersona(): boolean {
  const useCase = useUseCase();
  return useCase === "auditor";
}

export function ReadOnlyBanner({
  message,
  className = "",
}: {
  /** Optional override for the banner copy. */
  message?: string;
  className?: string;
}) {
  const isReadOnly = useIsReadOnlyPersona();
  if (!isReadOnly) return null;

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/[0.04] px-4 py-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-500/10 ring-1 ring-inset ring-sky-500/20"
        aria-hidden
      >
        <ShieldCheck className="h-3.5 w-3.5 text-sky-300" />
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-sky-200">
          <Eye className="h-3 w-3" />
          Read-only · Auditor mode
        </h4>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-400">
          {message ??
            "Compliance state is locked. You can browse, filter, and export, but mutating actions (status flips, attestations, snoozes) are disabled."}{" "}
          <Link
            href="/dashboard/settings"
            className="text-sky-300 underline-offset-2 hover:underline"
          >
            Switch persona
          </Link>{" "}
          if this is wrong.
        </p>
      </div>
    </div>
  );
}
