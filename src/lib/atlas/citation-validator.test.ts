/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Regression tests for the AI-Mode citation hallucination-guard.
 *
 * BUG C1 (2026-05-28): the validator only matched `[ATLAS-…]` /
 * `[CASE-…]` brackets, but real source IDs are jurisdiction-prefixed
 * (DE-…, EU-…, INT-…, CO-…) and NONE start with "ATLAS-". So source
 * citations were never counted and a hallucinated source citation
 * slipped through unflagged. These tests lock in that source citations
 * are validated against the live catalogue.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { validateCitations } from "./citation-validator";
import { ALL_SOURCES } from "@/data/legal-sources";
import { ATLAS_CASES } from "@/data/legal-cases";

const realSourceId = ALL_SOURCES.find((s) => /^[A-Z]{2,}-/.test(s.id))!.id;
const realCaseId = ATLAS_CASES.find((c) => /^CASE-/.test(c.id))!.id;

describe("validateCitations — source citations (C1 regression)", () => {
  it("counts and verifies a real jurisdiction-prefixed source citation", () => {
    const result = validateCitations(`Maßgeblich ist [${realSourceId}].`);
    expect(result.total).toBe(1);
    expect(result.verified).toContain(`[${realSourceId}]`);
    expect(result.unverified).toHaveLength(0);
  });

  it("flags a hallucinated source citation as unverified", () => {
    const result = validateCitations(`Das folgt aus [ZZ-FAKE-LAW-9999].`);
    expect(result.total).toBe(1);
    expect(result.unverified).toContain("[ZZ-FAKE-LAW-9999]");
    expect(result.verified).toHaveLength(0);
  });

  it("still validates case-law citations", () => {
    const result = validateCitations(`Siehe [${realCaseId}].`);
    expect(result.total).toBe(1);
    expect(result.verified).toContain(`[${realCaseId}]`);
    expect(result.unverified).toHaveLength(0);
  });

  it("does not match footnote brackets or non-citation prose", () => {
    const result = validateCitations(`Erstens [1], zweitens [2] — kein Zitat.`);
    expect(result.total).toBe(0);
  });
});
