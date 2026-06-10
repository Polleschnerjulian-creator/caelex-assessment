"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * RulebookStamp — Ultimate Assessment rebuild (Task 4.4).
 *
 * The canonical rulebook-version surface for every result page:
 *  - "Assessed against Caelex Rulebook v{X}" pinned to the SEMVER (§7.3 —
 *    never to named moving texts) with the source list + as-of dates in an
 *    expandable block;
 *  - when the snapshot's rulebook version differs from the CURRENT rulebook,
 *    a NON-DISMISSABLE stale banner renders. Its CTA is entitlement-gated
 *    (founder §11.2 — the living tier is paid): entitled → the re-run button
 *    wired to /api/assessment/v2/reassess; NOT entitled → an upgrade prompt
 *    linking /pricing, with NO reassess call reachable from the DOM (the
 *    server-side 403 remains the enforcement backstop).
 *
 * The mode decision lives in the pure `staleCtaMode` (node-tested).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import Link from "next/link";
import { BookOpen, RefreshCw, Lock } from "lucide-react";
import { RULEBOOK } from "@/data/assessment/rulebook";
import { staleCtaMode } from "./rulebook-stamp-mode";

export interface RulebookStampProps {
  /** The version the STORED snapshot was computed against. */
  rulebookVersion: string;
  /** Human-formatted computation date (already formatted by the page). */
  computedAtLabel?: string;
  /** Founder §11.2 — computed server-side and passed down. */
  livingEntitled: boolean;
  /** Required for the rerun POST; omit when no profile context exists. */
  profileId?: string;
}

export default function RulebookStamp({
  rulebookVersion,
  computedAtLabel,
  livingEntitled,
  profileId,
}: RulebookStampProps) {
  const mode = staleCtaMode(rulebookVersion, RULEBOOK.version, livingEntitled);
  const [rerunState, setRerunState] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [rerunError, setRerunError] = useState<string | null>(null);

  async function rerun() {
    if (!profileId || rerunState === "running") return;
    setRerunState("running");
    setRerunError(null);
    try {
      const res = await fetch("/api/assessment/v2/reassess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      if (res.ok) {
        setRerunState("done");
        // The new snapshot is the verdict — reload to render it.
        window.location.reload();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setRerunError(body.error ?? `Re-assessment failed (${res.status}).`);
      setRerunState("error");
    } catch {
      setRerunError("Connection failed — please retry.");
      setRerunState("error");
    }
  }

  return (
    <div>
      <details className="rounded-xl bg-white border border-black/[0.08] p-4">
        <summary className="flex items-center gap-2 text-small text-black/60 cursor-pointer list-none">
          <BookOpen size={13} aria-hidden="true" />
          Assessed against Caelex Rulebook v{rulebookVersion}
          {computedAtLabel ? <> · computed {computedAtLabel}</> : null} —
          sources
        </summary>
        <ul className="mt-3 space-y-1.5">
          {RULEBOOK.sources.map((s) => (
            <li key={s.id} className="text-small text-black/45 leading-relaxed">
              {s.label} — {s.citation} (as of {s.asOf})
            </li>
          ))}
        </ul>
      </details>

      {mode !== null && (
        // Non-dismissable by design: no close affordance.
        <div
          role="status"
          className="mt-3 rounded-xl border border-black/[0.20] bg-black/[0.03] p-4"
        >
          <p className="text-small text-black/70 leading-relaxed">
            The rulebook your verdict was computed against has changed (v
            {rulebookVersion} → v{RULEBOOK.version}). Re-assess to compute
            against the current sources.
          </p>

          {mode === "rerun" ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={rerun}
                disabled={rerunState === "running" || !profileId}
                className="inline-flex items-center gap-2 rounded-lg bg-black/[0.06] border border-black/[0.20] px-3 py-1.5 text-small text-[#1d1d1f] hover:bg-black/[0.08] transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  size={13}
                  className={rerunState === "running" ? "animate-spin" : ""}
                  aria-hidden="true"
                />
                {rerunState === "running"
                  ? "Re-assessing…"
                  : "Re-run against the current rulebook"}
              </button>
              {rerunError ? (
                <p role="alert" className="mt-2 text-small text-red-600">
                  {rerunError}
                </p>
              ) : null}
            </div>
          ) : (
            // NOT entitled: the upgrade prompt renders INSTEAD — no reassess
            // call is reachable from the DOM in this mode (§11.2).
            <p className="mt-3 flex items-center gap-2 text-small text-black/60">
              <Lock size={13} aria-hidden="true" />
              Living assessment is a paid tier —{" "}
              <Link
                href="/pricing"
                className="text-black/70 underline underline-offset-2 hover:text-[#1d1d1f]"
              >
                upgrade to re-run against the new rulebook
              </Link>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}
