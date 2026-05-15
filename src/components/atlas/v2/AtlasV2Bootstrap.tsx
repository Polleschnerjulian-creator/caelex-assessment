"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Bootstrap (one-shot localStorage → DB migration).
 *
 * Runs once per device after first sign-in into V2: reads the legacy
 * `atlas-drafting-mandates` localStorage key (Bundle 36 multi-mandate
 * store) and POSTs each row to /api/atlas/mandate so the mandate
 * roster persists in Postgres going forward. Idempotent — sets
 * `atlas-v2-mandate-migration-done` after a successful run.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect } from "react";
import { OnboardingTour } from "./OnboardingTour";

const LEGACY_KEY = "atlas-drafting-mandates";
const DONE_KEY = "atlas-v2-mandate-migration-done";

interface LegacyMandate {
  id: string;
  name?: string;
  intake?: {
    client?: string;
    primaryJurisdiction?: string;
    operatorType?: string;
    satelliteSpecs?: string;
    missionProfile?: string;
    frequencies?: string;
    launchDate?: string;
  };
}

export function AtlasV2Bootstrap() {
  useEffect(() => {
    void runMigration();
  }, []);
  /* Onboarding-Tour ist self-gating (eigener localStorage-Check + Esc-
     Handling). Wird hier mit-mounted damit sie auf jedem Atlas-Pfad
     verfügbar ist (nicht nur Homepage), und damit der Sidebar-Help-
     Button via Window-Event ihn re-triggern kann. */
  return <OnboardingTour />;
}

async function runMigration() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(DONE_KEY)) return;

  let legacy: LegacyMandate[] = [];
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) {
      window.localStorage.setItem(DONE_KEY, "no-data");
      return;
    }
    const parsed = JSON.parse(raw);
    legacy = Array.isArray(parsed) ? (parsed as LegacyMandate[]) : [];
  } catch {
    window.localStorage.setItem(DONE_KEY, "parse-error");
    return;
  }

  if (legacy.length === 0) {
    window.localStorage.setItem(DONE_KEY, "empty");
    return;
  }

  /* AUDIT-FIX L10: One-shot migration is parallelised in chunks of 5
     instead of a sequential for-loop. The previous loop blocked the
     migration on N round-trip latencies (~150ms each on prod = ~3s
     for a 20-mandate user); chunked Promise.allSettled brings that
     down to ~0.6s with the same fault-isolation (one failed mandate
     POST never affects the others — `allSettled` always resolves).
     Cap at 5 to stay polite to the API server (avoid hammering with
     50 concurrent POSTs from a single client) and match Vercel
     Function concurrency expectations. */
  const CONCURRENCY = 5;
  const buildBody = (m: LegacyMandate) => {
    const customParts: string[] = [];
    if (m.intake?.satelliteSpecs)
      customParts.push(`Satellite specs: ${m.intake.satelliteSpecs}`);
    if (m.intake?.missionProfile)
      customParts.push(`Mission profile: ${m.intake.missionProfile}`);
    if (m.intake?.frequencies)
      customParts.push(`Frequencies: ${m.intake.frequencies}`);
    if (m.intake?.launchDate)
      customParts.push(`Launch date: ${m.intake.launchDate}`);
    const customInstructions = customParts.length
      ? customParts.join("\n")
      : undefined;

    return {
      name: m.name?.trim() || m.intake?.client?.trim() || "Untitled mandate",
      clientName: m.intake?.client?.trim() || undefined,
      jurisdiction: m.intake?.primaryJurisdiction?.trim() || undefined,
      operatorType: m.intake?.operatorType?.trim() || undefined,
      customInstructions,
    };
  };

  const postOne = async (m: LegacyMandate): Promise<boolean> => {
    try {
      const res = await fetch("/api/atlas/mandate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildBody(m)),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  let migrated = 0;
  for (let i = 0; i < legacy.length; i += CONCURRENCY) {
    const chunk = legacy.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(chunk.map(postOne));
    for (const r of results) {
      if (r.status === "fulfilled" && r.value === true) migrated++;
    }
  }

  window.localStorage.setItem(
    DONE_KEY,
    `migrated-${migrated}-of-${legacy.length}-${new Date().toISOString()}`,
  );

  /* Trigger sidebar refresh so the migrated mandates appear immediately. */
  window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
}
