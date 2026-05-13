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

  let migrated = 0;
  for (const m of legacy) {
    try {
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

      const body = {
        name: m.name?.trim() || m.intake?.client?.trim() || "Untitled mandate",
        clientName: m.intake?.client?.trim() || undefined,
        jurisdiction: m.intake?.primaryJurisdiction?.trim() || undefined,
        operatorType: m.intake?.operatorType?.trim() || undefined,
        customInstructions,
      };
      const res = await fetch("/api/atlas/mandate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) migrated++;
    } catch {
      /* continue migrating others */
    }
  }

  window.localStorage.setItem(
    DONE_KEY,
    `migrated-${migrated}-of-${legacy.length}-${new Date().toISOString()}`,
  );

  /* Trigger sidebar refresh so the migrated mandates appear immediately. */
  window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
}
