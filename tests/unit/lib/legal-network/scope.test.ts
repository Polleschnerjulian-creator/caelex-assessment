/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Tests for the scope-narrowing invariants — these are the security
 * guarantees of the bilateral handshake. A bug here means an operator
 * could "narrow" a scope into something WIDER than what the firm
 * proposed (privilege escalation).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  isNarrowerOrEqual,
  scopeAuthorizes,
  SCOPE_LEVELS,
  SCOPE_LEVEL_ADVISORY,
  SCOPE_LEVEL_ACTIVE_COUNSEL,
  SCOPE_LEVEL_FULL_COUNSEL,
  ScopeItemSchema,
  ScopeSchema,
  type ScopeItem,
} from "@/lib/legal-network/scope";

describe("legal-network/scope — isNarrowerOrEqual", () => {
  // ─── Identity / equality ─────────────────────────────────────────
  it("accepts an identical scope as ⊆", () => {
    const proposed: ScopeItem[] = [
      { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ", "ANNOTATE"] },
    ];
    const amended = [
      ...proposed.map((s) => ({ ...s, permissions: [...s.permissions] })),
    ];
    expect(isNarrowerOrEqual(proposed, amended)).toBe(true);
  });

  it("accepts an empty amended scope (recipient drops everything)", () => {
    const proposed: ScopeItem[] = [
      { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
    ];
    expect(isNarrowerOrEqual(proposed, [])).toBe(true);
  });

  // ─── Permission narrowing ────────────────────────────────────────
  it("accepts dropping a permission", () => {
    const proposed: ScopeItem[] = [
      {
        category: "COMPLIANCE_ASSESSMENTS",
        permissions: ["READ", "ANNOTATE", "EXPORT"],
      },
    ];
    const amended: ScopeItem[] = [
      { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
    ];
    expect(isNarrowerOrEqual(proposed, amended)).toBe(true);
  });

  it("rejects ADDING a permission", () => {
    const proposed: ScopeItem[] = [
      { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
    ];
    const amended: ScopeItem[] = [
      {
        category: "COMPLIANCE_ASSESSMENTS",
        permissions: ["READ", "EXPORT"],
      },
    ];
    expect(isNarrowerOrEqual(proposed, amended)).toBe(false);
  });

  // ─── Category narrowing ──────────────────────────────────────────
  it("rejects ADDING a category that wasn't proposed", () => {
    const proposed: ScopeItem[] = [
      { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
    ];
    const amended: ScopeItem[] = [
      { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
      // operator trying to grant access to something never asked for
      { category: "DOCUMENTS", permissions: ["READ"] },
    ];
    expect(isNarrowerOrEqual(proposed, amended)).toBe(false);
  });

  it("accepts dropping a category entirely", () => {
    const proposed: ScopeItem[] = [
      { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
      { category: "DOCUMENTS", permissions: ["READ"] },
    ];
    const amended: ScopeItem[] = [
      { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
    ];
    expect(isNarrowerOrEqual(proposed, amended)).toBe(true);
  });

  // ─── ResourceFilter narrowing ────────────────────────────────────
  it("rejects removing an existing resourceFilter", () => {
    const proposed: ScopeItem[] = [
      {
        category: "SPACECRAFT_REGISTRY",
        permissions: ["READ"],
        resourceFilter: { jurisdictions: ["DE", "FR"] },
      },
    ];
    const amended: ScopeItem[] = [
      // operator drops the jurisdiction filter — would WIDEN access
      { category: "SPACECRAFT_REGISTRY", permissions: ["READ"] },
    ];
    expect(isNarrowerOrEqual(proposed, amended)).toBe(false);
  });

  it("accepts narrowing a resourceFilter (subset of jurisdictions)", () => {
    const proposed: ScopeItem[] = [
      {
        category: "SPACECRAFT_REGISTRY",
        permissions: ["READ"],
        resourceFilter: { jurisdictions: ["DE", "FR", "UK"] },
      },
    ];
    const amended: ScopeItem[] = [
      {
        category: "SPACECRAFT_REGISTRY",
        permissions: ["READ"],
        resourceFilter: { jurisdictions: ["DE"] },
      },
    ];
    expect(isNarrowerOrEqual(proposed, amended)).toBe(true);
  });

  it("rejects ADDING a jurisdiction not in proposed filter", () => {
    const proposed: ScopeItem[] = [
      {
        category: "SPACECRAFT_REGISTRY",
        permissions: ["READ"],
        resourceFilter: { jurisdictions: ["DE"] },
      },
    ];
    const amended: ScopeItem[] = [
      {
        category: "SPACECRAFT_REGISTRY",
        permissions: ["READ"],
        // 'US' was never proposed — privilege escalation attempt
        resourceFilter: { jurisdictions: ["DE", "US"] },
      },
    ];
    expect(isNarrowerOrEqual(proposed, amended)).toBe(false);
  });

  it("allows ADDING a resourceFilter when proposed had none (further narrowing)", () => {
    const proposed: ScopeItem[] = [
      { category: "SPACECRAFT_REGISTRY", permissions: ["READ"] },
    ];
    const amended: ScopeItem[] = [
      {
        category: "SPACECRAFT_REGISTRY",
        permissions: ["READ"],
        resourceFilter: { jurisdictions: ["DE"] },
      },
    ];
    expect(isNarrowerOrEqual(proposed, amended)).toBe(true);
  });
});

describe("legal-network/scope — scopeAuthorizes", () => {
  const scope: ScopeItem[] = [
    { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ", "ANNOTATE"] },
    { category: "DOCUMENTS", permissions: ["READ"] },
  ];

  it("returns true for granted (category + permission) pair", () => {
    expect(scopeAuthorizes(scope, "COMPLIANCE_ASSESSMENTS", "READ")).toBe(true);
    expect(scopeAuthorizes(scope, "COMPLIANCE_ASSESSMENTS", "ANNOTATE")).toBe(
      true,
    );
    expect(scopeAuthorizes(scope, "DOCUMENTS", "READ")).toBe(true);
  });

  it("returns false for permission not in granted set", () => {
    expect(scopeAuthorizes(scope, "COMPLIANCE_ASSESSMENTS", "EXPORT")).toBe(
      false,
    );
    expect(scopeAuthorizes(scope, "DOCUMENTS", "ANNOTATE")).toBe(false);
  });

  it("returns false for category not in scope", () => {
    expect(scopeAuthorizes(scope, "AUTHORIZATION_WORKFLOWS", "READ")).toBe(
      false,
    );
    expect(scopeAuthorizes(scope, "INCIDENTS", "READ")).toBe(false);
  });

  it("handles empty scope (no access granted)", () => {
    expect(scopeAuthorizes([], "COMPLIANCE_ASSESSMENTS", "READ")).toBe(false);
  });
});

describe("legal-network/scope — quick-pick levels", () => {
  // The three predefined levels are the user-facing "easy mode" of
  // scope selection. They must all be valid + each level must be
  // strictly equal-or-wider than the previous one.

  it("all level definitions pass schema validation", () => {
    for (const level of Object.values(SCOPE_LEVELS)) {
      const result = ScopeSchema.safeParse(level);
      expect(result.success).toBe(true);
    }
  });

  // ─── Level-relationship documentation ─────────────────────────────
  //
  // The three quick-pick levels are NOT a strict hierarchy: L1
  // (advisory) carries READ_SUMMARY which L2/L3 don't have, since
  // advisory engagements are summary-only by design. So L1 ⊄ L2.
  //
  // L2 ⊆ L3 IS a strict subset — full_counsel adds EXPORT + SPACECRAFT
  // on top of active_counsel without removing anything. These tests
  // pin down the design so a future refactor doesn't silently break
  // the level semantics.

  it("L2 (active_counsel) IS ⊆ L3 (full_counsel) — strict hierarchy", () => {
    expect(
      isNarrowerOrEqual(SCOPE_LEVEL_FULL_COUNSEL, SCOPE_LEVEL_ACTIVE_COUNSEL),
    ).toBe(true);
  });

  it("L1 (advisory) is NOT ⊆ L2 — L1 has READ_SUMMARY which L2 lacks", () => {
    expect(
      isNarrowerOrEqual(SCOPE_LEVEL_ACTIVE_COUNSEL, SCOPE_LEVEL_ADVISORY),
    ).toBe(false);
  });

  it("L3 → L1 is NOT a narrowing (it widens, would be a privilege escalation)", () => {
    expect(
      isNarrowerOrEqual(SCOPE_LEVEL_ADVISORY, SCOPE_LEVEL_FULL_COUNSEL),
    ).toBe(false);
  });

  it("L3 → L2 IS a narrowing (drops EXPORT + SPACECRAFT)", () => {
    expect(
      isNarrowerOrEqual(SCOPE_LEVEL_FULL_COUNSEL, SCOPE_LEVEL_ACTIVE_COUNSEL),
    ).toBe(true);
  });
});

describe("legal-network/scope — schema validation", () => {
  it("rejects a scope item with empty permissions array", () => {
    const result = ScopeItemSchema.safeParse({
      category: "COMPLIANCE_ASSESSMENTS",
      permissions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown category", () => {
    const result = ScopeItemSchema.safeParse({
      category: "TOTALLY_FAKE",
      permissions: ["READ"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown permission", () => {
    const result = ScopeItemSchema.safeParse({
      category: "COMPLIANCE_ASSESSMENTS",
      permissions: ["DELETE_ALL_THE_THINGS"],
    });
    expect(result.success).toBe(false);
  });

  it("ScopeSchema enforces 1..16 items", () => {
    expect(ScopeSchema.safeParse([]).success).toBe(false);
    const tooMany = Array.from({ length: 17 }, (_, i) => ({
      category: "COMPLIANCE_ASSESSMENTS" as const,
      permissions: ["READ"] as const,
    }));
    expect(ScopeSchema.safeParse(tooMany).success).toBe(false);
  });
});
