/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Proves the unified analytics-consent resolver reads the hashed ConsentRecord
 * as the single source of truth, honours "revoke", and preserves the legacy
 * consent-string gate semantics used by the ingestion route.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi } from "vitest";
import {
  hasAnalyticsConsent,
  isAnalyticsConsentString,
} from "./analytics-consent.server";

type FindFirstArgs = { where: Record<string, string>; orderBy?: unknown };

function readerReturning(
  record: { decision: string; preferences: unknown } | null,
) {
  const findFirst = vi.fn(async (_args: unknown) => record);
  // Typed accessor for the recorded call args (keeps assertions ergonomic
  // without weakening the reader's `(args: unknown)` contract).
  const lastArgs = () => findFirst.mock.calls[0]?.[0] as FindFirstArgs;
  return { reader: { consentRecord: { findFirst } }, findFirst, lastArgs };
}

describe("hasAnalyticsConsent (ConsentRecord authority)", () => {
  it("returns false when no subject identifier is supplied", async () => {
    const { reader, findFirst } = readerReturning(null);
    expect(await hasAnalyticsConsent({}, reader)).toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });

  // (helper `lastArgs()` returns the recorded findFirst args, typed.)

  it("returns false when no consent record exists (conservative default)", async () => {
    const { reader } = readerReturning(null);
    expect(await hasAnalyticsConsent({ userId: "u1" }, reader)).toBe(false);
  });

  it("returns true when the latest record grants analytics", async () => {
    const { reader, lastArgs } = readerReturning({
      decision: "accept_all",
      preferences: { necessary: true, analytics: true },
    });
    expect(await hasAnalyticsConsent({ userId: "u1" }, reader)).toBe(true);
    // Queries by userId, most-recent-first.
    const arg = lastArgs();
    expect(arg.where).toEqual({ userId: "u1" });
    expect(arg.orderBy).toEqual({ createdAt: "desc" });
  });

  it("returns false when the latest decision is an explicit revoke", async () => {
    const { reader } = readerReturning({
      decision: "revoke",
      // Even if a stale preferences blob still says analytics:true, revoke wins.
      preferences: { necessary: true, analytics: true },
    });
    expect(await hasAnalyticsConsent({ userId: "u1" }, reader)).toBe(false);
  });

  it("returns false when latest record customised analytics off", async () => {
    const { reader } = readerReturning({
      decision: "customize",
      preferences: { necessary: true, analytics: false, performance: true },
    });
    expect(await hasAnalyticsConsent({ userId: "u1" }, reader)).toBe(false);
  });

  it("resolves anonymous visitors by hashed session key (never raw)", async () => {
    const { reader, lastArgs } = readerReturning({
      decision: "accept_all",
      preferences: { analytics: true },
    });
    await hasAnalyticsConsent({ sessionKey: "raw-session-uuid" }, reader);
    const arg = lastArgs();
    expect(Object.keys(arg.where)).toEqual(["sessionHashed"]);
    // The raw key must NOT appear in the query — it is hashed first.
    expect(arg.where.sessionHashed).not.toBe("raw-session-uuid");
    expect(arg.where.sessionHashed).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("isAnalyticsConsentString (legacy gate parity)", () => {
  it.each([
    [undefined, false],
    [null, false],
    ["none", false],
    ["necessary", false],
    ["analytics", true],
    ["all", true],
  ] as const)("%s -> %s", (input, expected) => {
    expect(isAnalyticsConsentString(input)).toBe(expected);
  });
});
