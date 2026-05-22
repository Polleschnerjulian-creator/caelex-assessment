/**
 * Tests for src/lib/trade/subject-to-ear/knowledge-facts.ts — Sprint Z20b.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  anyPartyHasFootnote,
  anyPartyIsEntityListed,
  partyRolesWithFootnote,
  type KnowledgeFacts,
} from "./knowledge-facts";

// ─── anyPartyHasFootnote ────────────────────────────────────────────

describe("anyPartyHasFootnote", () => {
  it("End-user with footnote 1 → true for footnote 1, false for others", () => {
    const facts: KnowledgeFacts = {
      endUser: { entityListed: true, footnote: 1 },
    };
    expect(anyPartyHasFootnote(facts, 1)).toBe(true);
    expect(anyPartyHasFootnote(facts, 3)).toBe(false);
    expect(anyPartyHasFootnote(facts, 4)).toBe(false);
    expect(anyPartyHasFootnote(facts, 5)).toBe(false);
  });

  it("Purchaser with footnote 4 → true for footnote 4", () => {
    const facts: KnowledgeFacts = {
      purchaser: { entityListed: true, footnote: 4 },
    };
    expect(anyPartyHasFootnote(facts, 4)).toBe(true);
  });

  it("Intermediate consignee with footnote 5 → true for footnote 5", () => {
    const facts: KnowledgeFacts = {
      intermediateConsignee: { entityListed: true, footnote: 5 },
    };
    expect(anyPartyHasFootnote(facts, 5)).toBe(true);
  });

  it("Ultimate consignee with footnote 3 → true for footnote 3", () => {
    const facts: KnowledgeFacts = {
      ultimateConsignee: { entityListed: true, footnote: 3 },
    };
    expect(anyPartyHasFootnote(facts, 3)).toBe(true);
  });

  it("Incorporator with footnote 1 → true for footnote 1", () => {
    const facts: KnowledgeFacts = {
      incorporator: { entityListed: true, footnote: 1 },
    };
    expect(anyPartyHasFootnote(facts, 1)).toBe(true);
  });

  it("Entity-listed party WITHOUT footnote → false for any specific footnote", () => {
    const facts: KnowledgeFacts = {
      endUser: { entityListed: true }, // listed but no footnote
    };
    expect(anyPartyHasFootnote(facts, 1)).toBe(false);
    expect(anyPartyHasFootnote(facts, 3)).toBe(false);
    expect(anyPartyHasFootnote(facts, 4)).toBe(false);
    expect(anyPartyHasFootnote(facts, 5)).toBe(false);
  });

  it("Empty facts → false for any footnote", () => {
    expect(anyPartyHasFootnote({}, 1)).toBe(false);
  });

  it("Undefined facts → false", () => {
    expect(anyPartyHasFootnote(undefined, 1)).toBe(false);
  });

  it("Non-listed party with footnote (defensive) → false", () => {
    const facts: KnowledgeFacts = {
      endUser: { entityListed: false, footnote: 1 },
    };
    expect(anyPartyHasFootnote(facts, 1)).toBe(false);
  });
});

// ─── anyPartyIsEntityListed ────────────────────────────────────────

describe("anyPartyIsEntityListed", () => {
  it("ANY entity-listed party → true", () => {
    const facts: KnowledgeFacts = {
      purchaser: { entityListed: true },
    };
    expect(anyPartyIsEntityListed(facts)).toBe(true);
  });

  it("No entity-listed parties → false", () => {
    const facts: KnowledgeFacts = {
      endUser: { entityListed: false },
      purchaser: { entityListed: false },
    };
    expect(anyPartyIsEntityListed(facts)).toBe(false);
  });

  it("Empty facts → false", () => {
    expect(anyPartyIsEntityListed({})).toBe(false);
  });
});

// ─── partyRolesWithFootnote ─────────────────────────────────────────

describe("partyRolesWithFootnote", () => {
  it("Returns list of role names with the specified footnote", () => {
    const facts: KnowledgeFacts = {
      endUser: { entityListed: true, footnote: 1 },
      purchaser: { entityListed: true, footnote: 1 },
      ultimateConsignee: { entityListed: true, footnote: 4 },
    };
    const fn1Roles = partyRolesWithFootnote(facts, 1);
    expect(fn1Roles).toEqual(["end-user", "purchaser"]);
    const fn4Roles = partyRolesWithFootnote(facts, 4);
    expect(fn4Roles).toEqual(["ultimate consignee"]);
  });

  it("No matching parties → empty array", () => {
    expect(partyRolesWithFootnote({}, 1)).toEqual([]);
  });

  it("All 5 party roles can be returned", () => {
    const facts: KnowledgeFacts = {
      endUser: { entityListed: true, footnote: 5 },
      purchaser: { entityListed: true, footnote: 5 },
      intermediateConsignee: { entityListed: true, footnote: 5 },
      ultimateConsignee: { entityListed: true, footnote: 5 },
      incorporator: { entityListed: true, footnote: 5 },
    };
    const roles = partyRolesWithFootnote(facts, 5);
    expect(roles).toHaveLength(5);
    expect(roles).toContain("end-user");
    expect(roles).toContain("purchaser");
    expect(roles).toContain("intermediate consignee");
    expect(roles).toContain("ultimate consignee");
    expect(roles).toContain("incorporator");
  });
});
