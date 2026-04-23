/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Legal-Network — scope types and validators.
 *
 * The `scope` Json column on LegalMatter stores an array of ScopeItem.
 * These types are the contract that every runtime check — in the
 * middleware, in the API endpoints, and in the UI — relies on. Keep
 * them in one file so a schema-drift in one place breaks typecheck
 * everywhere it's consumed.
 *
 * See docs/superpowers/specs/2026-04-23-legal-network-phase-1-design.md
 * sections 5–6 for the design rationale.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { z } from "zod";

// ─── Categories ───────────────────────────────────────────────────────

export const SCOPE_CATEGORIES = [
  "COMPLIANCE_ASSESSMENTS",
  "AUTHORIZATION_WORKFLOWS",
  "DOCUMENTS",
  "TIMELINE_DEADLINES",
  "INCIDENTS",
  "SPACECRAFT_REGISTRY",
  "AUDIT_LOGS",
] as const;

export type ScopeCategory = (typeof SCOPE_CATEGORIES)[number];

export const SCOPE_PERMISSIONS = [
  "READ",
  "READ_SUMMARY",
  "EXPORT",
  "ANNOTATE",
] as const;

export type ScopePermission = (typeof SCOPE_PERMISSIONS)[number];

// ─── ScopeItem schema ─────────────────────────────────────────────────

export const ScopeItemSchema = z.object({
  category: z.enum(SCOPE_CATEGORIES),
  permissions: z
    .array(z.enum(SCOPE_PERMISSIONS))
    .min(1)
    .max(SCOPE_PERMISSIONS.length),
  resourceFilter: z
    .object({
      assessmentIds: z.array(z.string()).optional(),
      jurisdictions: z.array(z.string().min(2).max(3)).optional(),
      spacecraftIds: z.array(z.string()).optional(),
    })
    .optional(),
});

export type ScopeItem = z.infer<typeof ScopeItemSchema>;

export const ScopeSchema = z.array(ScopeItemSchema).min(1).max(16);

// ─── Quick-pick levels ────────────────────────────────────────────────
//
// What the invite UI offers as one-click options. Operators can always
// narrow any of these at accept time.

export const SCOPE_LEVEL_ADVISORY: ScopeItem[] = [
  { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ", "READ_SUMMARY"] },
  { category: "TIMELINE_DEADLINES", permissions: ["READ"] },
];

export const SCOPE_LEVEL_ACTIVE_COUNSEL: ScopeItem[] = [
  { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ", "ANNOTATE"] },
  { category: "AUTHORIZATION_WORKFLOWS", permissions: ["READ", "ANNOTATE"] },
  { category: "DOCUMENTS", permissions: ["READ", "ANNOTATE"] },
  { category: "TIMELINE_DEADLINES", permissions: ["READ", "ANNOTATE"] },
  { category: "INCIDENTS", permissions: ["READ", "ANNOTATE"] },
];

export const SCOPE_LEVEL_FULL_COUNSEL: ScopeItem[] = [
  {
    category: "COMPLIANCE_ASSESSMENTS",
    permissions: ["READ", "ANNOTATE", "EXPORT"],
  },
  {
    category: "AUTHORIZATION_WORKFLOWS",
    permissions: ["READ", "ANNOTATE", "EXPORT"],
  },
  { category: "DOCUMENTS", permissions: ["READ", "ANNOTATE", "EXPORT"] },
  { category: "TIMELINE_DEADLINES", permissions: ["READ", "ANNOTATE"] },
  { category: "INCIDENTS", permissions: ["READ", "ANNOTATE", "EXPORT"] },
  { category: "SPACECRAFT_REGISTRY", permissions: ["READ"] },
];

export const SCOPE_LEVELS = {
  advisory: SCOPE_LEVEL_ADVISORY,
  active_counsel: SCOPE_LEVEL_ACTIVE_COUNSEL,
  full_counsel: SCOPE_LEVEL_FULL_COUNSEL,
} as const;

export type ScopeLevel = keyof typeof SCOPE_LEVELS;

// ─── Narrowing check ──────────────────────────────────────────────────
//
// When the operator amends a proposed scope at accept time, they must
// NARROW the permissions — never widen. This enforces that invariant.
// "narrower" means: every category in `amended` exists in `proposed`;
// permissions are a subset; resourceFilters only add, never remove.

export function isNarrowerOrEqual(
  proposed: ScopeItem[],
  amended: ScopeItem[],
): boolean {
  for (const a of amended) {
    const p = proposed.find((x) => x.category === a.category);
    if (!p) return false; // new category added — not allowed
    for (const perm of a.permissions) {
      if (!p.permissions.includes(perm)) return false; // widened permission
    }
    // resourceFilters: amended may ADD filters (narrower) but must
    // respect any proposed filters already present.
    if (p.resourceFilter) {
      const pf = p.resourceFilter;
      const af = a.resourceFilter ?? {};
      for (const key of [
        "assessmentIds",
        "jurisdictions",
        "spacecraftIds",
      ] as const) {
        const pList = pf[key];
        const aList = af[key];
        if (pList && pList.length > 0) {
          if (!aList) return false; // lost an existing filter
          if (aList.some((x) => !pList.includes(x))) return false; // added out-of-set value
        }
      }
    }
  }
  return true;
}

// ─── Quick check for middleware ───────────────────────────────────────
//
// "Does this scope authorize category X with permission Y?" The main
// invariant used by requireActiveMatter and by Phase-3 data-access code.

export function scopeAuthorizes(
  scope: ScopeItem[],
  category: ScopeCategory,
  permission: ScopePermission,
): boolean {
  const item = scope.find((s) => s.category === category);
  if (!item) return false;
  return item.permissions.includes(permission);
}
