/**
 * Sprint B1 — Trade types module smoke tests.
 *
 * These tests do not exercise business logic (there isn't any in this
 * sprint). They lock in:
 *   1. The label maps cover every enum member (so adding a new
 *      TradeItemStatus or TradeClassificationSource without updating
 *      the labels fails CI).
 *   2. The labels are non-empty strings (no accidental empty entries).
 *
 * When Sprint B7 lands, this file gets joined by component tests for
 * the actual UI surfaces.
 */

import { describe, it, expect } from "vitest";

import {
  TRADE_ITEM_STATUS_LABELS,
  TRADE_CLASSIFICATION_SOURCE_LABELS,
} from "./types";

describe("TRADE_ITEM_STATUS_LABELS", () => {
  it("has a non-empty label for every TradeItemStatus enum value", () => {
    // Each label must be a non-empty string.
    for (const [status, label] of Object.entries(TRADE_ITEM_STATUS_LABELS)) {
      expect(label, `label for ${status}`).toBeTruthy();
      expect(typeof label).toBe("string");
    }
    // The 4 known enum members must all be covered. If Prisma adds a
    // 5th status without an entry here, this fails.
    expect(Object.keys(TRADE_ITEM_STATUS_LABELS).sort()).toEqual([
      "ARCHIVED",
      "CLASSIFIED",
      "DRAFT",
      "REQUIRES_REVIEW",
    ]);
  });
});

describe("TRADE_CLASSIFICATION_SOURCE_LABELS", () => {
  it("has a non-empty label for every TradeClassificationSource enum value", () => {
    for (const [source, label] of Object.entries(
      TRADE_CLASSIFICATION_SOURCE_LABELS,
    )) {
      expect(label, `label for ${source}`).toBeTruthy();
      expect(typeof label).toBe("string");
    }
    expect(Object.keys(TRADE_CLASSIFICATION_SOURCE_LABELS).sort()).toEqual([
      "ASTRA_SUGGESTED",
      "ATTORNEY_OPINION",
      "BAFA_AUSKUNFT_GUETERLISTE",
      "CJ_DETERMINATION",
      "USER_DECLARED",
    ]);
  });

  it("BAFA + CJ are listed first (highest trust), USER_DECLARED last", () => {
    // The label order in the object literal communicates the trust
    // hierarchy that Sprint B4's classification engine will use. We
    // assert the order so an alphabetical sort doesn't accidentally
    // bury it.
    const keys = Object.keys(TRADE_CLASSIFICATION_SOURCE_LABELS);
    expect(keys[0]).toBe("BAFA_AUSKUNFT_GUETERLISTE");
    expect(keys[1]).toBe("CJ_DETERMINATION");
    expect(keys[keys.length - 1]).toBe("USER_DECLARED");
  });
});
