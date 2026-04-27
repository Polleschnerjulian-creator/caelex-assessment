/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Tests for the Atlas message tokenizer that turns Astra's streamed
 * answers into typed segments (text vs. atlas-id citation). The
 * AtlasMessageRenderer component maps these tokens to plain text or
 * deep-link anchors; if the tokenizer is wrong, the rendered chat is
 * wrong.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  tokenizeAtlasMessage,
  atlasIdToHref,
} from "@/lib/atlas/render-message";

describe("tokenizeAtlasMessage", () => {
  it("returns a single text token for empty input", () => {
    expect(tokenizeAtlasMessage("")).toEqual([{ kind: "text", value: "" }]);
  });

  it("returns a single text token when there are no citations", () => {
    expect(tokenizeAtlasMessage("Just a normal sentence.")).toEqual([
      { kind: "text", value: "Just a normal sentence." },
    ]);
  });

  it("recognises a simple two-segment citation", () => {
    expect(tokenizeAtlasMessage("see [DE-VVG] for details")).toEqual([
      { kind: "text", value: "see " },
      { kind: "atlas-id", id: "DE-VVG", raw: "[DE-VVG]" },
      { kind: "text", value: " for details" },
    ]);
  });

  it("recognises a three-segment citation with year suffix", () => {
    const tokens = tokenizeAtlasMessage("OST is [INT-OST-1967]");
    expect(tokens).toEqual([
      { kind: "text", value: "OST is " },
      { kind: "atlas-id", id: "INT-OST-1967", raw: "[INT-OST-1967]" },
    ]);
  });

  it("recognises a multi-segment sanctions citation", () => {
    const tokens = tokenizeAtlasMessage(
      "Operators must screen against [INT-EU-SANCTIONS-RU-833].",
    );
    expect(tokens.length).toBe(3);
    expect(tokens[1]).toEqual({
      kind: "atlas-id",
      id: "INT-EU-SANCTIONS-RU-833",
      raw: "[INT-EU-SANCTIONS-RU-833]",
    });
  });

  it("handles multiple citations in one message", () => {
    const tokens = tokenizeAtlasMessage(
      "Compare [DE-SATDSIG-2007] with [FR-LOS-2008] and the umbrella [EU-NIS2-2022].",
    );
    const ids = tokens
      .filter((t) => t.kind === "atlas-id")
      .map((t) => (t as { id: string }).id);
    expect(ids).toEqual(["DE-SATDSIG-2007", "FR-LOS-2008", "EU-NIS2-2022"]);
  });

  it("does not match plain bracketed words", () => {
    const tokens = tokenizeAtlasMessage("This is [important] text.");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({
      kind: "text",
      value: "This is [important] text.",
    });
  });

  it("does not match bare prefix in brackets like [DE]", () => {
    const tokens = tokenizeAtlasMessage("In Germany ([DE]) the regime is...");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("text");
  });

  it("does not match lowercase ids", () => {
    const tokens = tokenizeAtlasMessage("[de-vvg] is invalid");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("text");
  });

  it("does not match malformed brackets (missing closing)", () => {
    const tokens = tokenizeAtlasMessage("see [DE-VVG and other things");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("text");
  });

  it("preserves whitespace and newlines around citations", () => {
    const tokens = tokenizeAtlasMessage(
      "Line one.\n\nSee [DE-VVG] for the rule.\nLine three.",
    );
    expect(tokens.map((t) => t.kind)).toEqual(["text", "atlas-id", "text"]);
    expect(tokens[0]).toEqual({ kind: "text", value: "Line one.\n\nSee " });
    expect((tokens[2] as { value: string }).value).toBe(
      " for the rule.\nLine three.",
    );
  });

  it("handles citation at start of message", () => {
    const tokens = tokenizeAtlasMessage("[DE-VVG] is the contract law.");
    expect(tokens[0].kind).toBe("atlas-id");
  });

  it("handles citation at end of message", () => {
    const tokens = tokenizeAtlasMessage(
      "The applicable law is [UK-INSURANCE-ACT-2015]",
    );
    expect(tokens[tokens.length - 1].kind).toBe("atlas-id");
  });
});

describe("atlasIdToHref", () => {
  it("returns the canonical sources URL for a valid id", () => {
    expect(atlasIdToHref("INT-OST-1967")).toBe("/atlas/sources/INT-OST-1967");
  });

  it("URL-encodes ids with special characters", () => {
    // Defensive — current ids are alphanumeric only, but if a non-
    // ASCII character ever sneaks in we want to fail safe rather
    // than emit a broken URL.
    const out = atlasIdToHref("DE-VVG");
    expect(out).toBe("/atlas/sources/DE-VVG");
  });

  it("returns null for invalid id shapes", () => {
    expect(atlasIdToHref("lower-case")).toBeNull();
    expect(atlasIdToHref("DE")).toBeNull();
    expect(atlasIdToHref("DE-")).toBeNull();
    expect(atlasIdToHref("12345")).toBeNull();
  });

  it("accepts multi-segment ids", () => {
    expect(atlasIdToHref("INT-EU-SANCTIONS-RU-833")).toBe(
      "/atlas/sources/INT-EU-SANCTIONS-RU-833",
    );
  });
});
