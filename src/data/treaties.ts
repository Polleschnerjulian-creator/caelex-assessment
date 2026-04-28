// src/data/treaties.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * International space-treaty slug registry for /atlas/treaties routes.
 *
 * Maps stable URL slugs (ost, liability, registration…) to the
 * LegalSource IDs held in sources/intl.ts. Any route handler that needs
 * to resolve a treaty by slug should go through resolveTreatyBySlug.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { getLegalSourceById, type LegalSource } from "./legal-sources";

// ─── Slug → ID mapping ──────────────────────────────────────────────

export const TREATY_SLUGS = {
  // Core UN space treaties (Big 5)
  ost: "INT-OST-1967",
  rescue: "INT-RESCUE-1968",
  liability: "INT-LIABILITY-1972",
  registration: "INT-REGISTRATION-1975",
  moon: "INT-MOON-1979",

  // COPUOS / UN guidelines (soft law)
  "copuos-debris": "INT-COPUOS-DEBRIS-2007",
  lts: "INT-LTS-2019",
  "remote-sensing": "INT-REMOTE-SENSING-1986",
  "direct-broadcasting": "INT-DIRECT-BROADCASTING-1982",
  nps: "INT-NPS-1992",
  "legal-principles": "INT-LEGAL-PRINCIPLES-1963",

  // Related instruments
  ptbt: "INT-PTBT-1963",
  itu: "INT-ITU-CONST",
} as const satisfies Record<string, string>;

export type TreatySlug = keyof typeof TREATY_SLUGS;

// ─── Curated groupings for the /atlas/treaties hub ──────────────────

export interface TreatyGroup {
  key: string;
  title: string;
  kicker: string;
  lede: string;
  slugs: TreatySlug[];
}

export const TREATY_GROUPS: TreatyGroup[] = [
  {
    key: "core-un",
    title: "Core UN Space Treaties",
    kicker: "01 · Foundational Framework",
    lede: "Five cornerstone treaties negotiated at the UN Committee on the Peaceful Uses of Outer Space (COPUOS). Every national space law traces its authorization logic, liability regime, and registration duties back to this corpus.",
    slugs: ["ost", "rescue", "liability", "registration", "moon"],
  },
  {
    key: "copuos-guidelines",
    title: "COPUOS & UN Guidelines",
    kicker: "02 · Soft Law & Technical Standards",
    lede: "Non-binding instruments adopted by COPUOS or the UN General Assembly. They frame best practice for debris mitigation, long-term sustainability, and the governance of remote sensing, direct broadcasting, and nuclear power sources in orbit.",
    slugs: [
      "copuos-debris",
      "lts",
      "remote-sensing",
      "direct-broadcasting",
      "nps",
      "legal-principles",
    ],
  },
  {
    key: "related",
    title: "Related Instruments",
    kicker: "03 · Adjacent Frameworks",
    lede: "Treaties and conventions that are not space-specific but structurally govern space activities — the Partial Test Ban Treaty (no nuclear tests in outer space) and the ITU Constitution (radio spectrum and orbital slot coordination).",
    slugs: ["ptbt", "itu"],
  },
];

// ─── Lookup helpers ─────────────────────────────────────────────────

export function resolveTreatyBySlug(slug: string): LegalSource | null {
  const id = (TREATY_SLUGS as Record<string, string | undefined>)[slug];
  if (!id) return null;
  return getLegalSourceById(id) ?? null;
}

export function isTreatySlug(slug: string): slug is TreatySlug {
  return slug in TREATY_SLUGS;
}

/** Reverse lookup — given an INT- id, return its URL slug. */
export function slugForTreatyId(id: string): TreatySlug | null {
  const entry = Object.entries(TREATY_SLUGS).find(([, v]) => v === id);
  return entry ? (entry[0] as TreatySlug) : null;
}
