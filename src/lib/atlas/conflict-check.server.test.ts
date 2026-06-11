/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for the Atlas mandate conflict-of-interest core (pure functions).
 * Spec: docs/superpowers/specs/2026-05-30-atlas-mandate-conflict-check-design.md
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  normalizePartyName,
  namesMatch,
  classifyConflict,
} from "./conflict-check.server";

describe("normalizePartyName", () => {
  it("lowercases, trims, and collapses whitespace", () => {
    expect(normalizePartyName("  Spire   Global  ")).toBe("spire global");
  });

  it("strips punctuation", () => {
    expect(normalizePartyName("Müller & Partner")).toBe("müller partner");
  });

  it("strips common legal-form suffixes", () => {
    expect(normalizePartyName("Spire Global Inc.")).toBe("spire global");
    expect(normalizePartyName("ACME GmbH")).toBe("acme");
    expect(normalizePartyName("Foo Ltd")).toBe("foo");
    expect(normalizePartyName("Bar S.A.")).toBe("bar");
    expect(normalizePartyName("Baz GmbH & Co. KG")).toBe("baz");
    expect(normalizePartyName("Andøya Space AS")).toBe("andøya space");
    expect(normalizePartyName("Airbus SE")).toBe("airbus");
  });

  it("returns empty string when the name is only a legal form", () => {
    expect(normalizePartyName("GmbH")).toBe("");
  });
});

describe("namesMatch", () => {
  it("matches on exact normalised equality across different legal forms", () => {
    expect(namesMatch("Spire Global Inc", "SPIRE GLOBAL, LLC")).toBe(true);
  });

  it("matches when token sets are equal regardless of word order", () => {
    expect(namesMatch("Spire Global Systems", "Global Spire Systems")).toBe(
      true,
    );
  });

  it("does not match clearly different names", () => {
    expect(namesMatch("Spire Global", "Planet Labs")).toBe(false);
  });

  it("does not match when Jaccard similarity is below threshold", () => {
    // {spire,global} vs {spire,global,systems,holding} = 2/4 = 0.5 < 0.85
    expect(namesMatch("Spire Global", "Spire Global Systems Holding")).toBe(
      false,
    );
  });

  it("never matches when either normalises to empty", () => {
    expect(namesMatch("GmbH", "Ltd")).toBe(false);
    expect(namesMatch("", "Spire")).toBe(false);
  });
});

describe("classifyConflict", () => {
  it("flags a new opponent against an active client as high", () => {
    expect(
      classifyConflict({
        newType: "opponent",
        existingType: "client",
        existingClosed: false,
      }),
    ).toBe("high");
  });

  it("flags a new opponent against a former (closed) client as medium", () => {
    expect(
      classifyConflict({
        newType: "opponent",
        existingType: "client",
        existingClosed: true,
      }),
    ).toBe("medium");
  });

  it("flags a new client against an active opponent as medium", () => {
    expect(
      classifyConflict({
        newType: "client",
        existingType: "opponent",
        existingClosed: false,
      }),
    ).toBe("medium");
  });

  it("flags the same client appearing in another mandate as info", () => {
    expect(
      classifyConflict({
        newType: "client",
        existingType: "client",
        existingClosed: false,
      }),
    ).toBe("info");
  });

  it("does not flag non-adverse pairings (authority, co_counsel, other)", () => {
    expect(
      classifyConflict({
        newType: "authority",
        existingType: "authority",
        existingClosed: false,
      }),
    ).toBeNull();
    expect(
      classifyConflict({
        newType: "co_counsel",
        existingType: "client",
        existingClosed: false,
      }),
    ).toBeNull();
  });

  it("does not flag a new client against a closed opponent", () => {
    expect(
      classifyConflict({
        newType: "client",
        existingType: "opponent",
        existingClosed: true,
      }),
    ).toBeNull();
  });
});
