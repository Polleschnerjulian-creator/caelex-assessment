/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Multi-Party-Approval (k-of-n) tests.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

beforeAll(() => {
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY ||
    "test-encryption-key-for-unit-tests-deterministic-32chars";
});

import {
  buildApprovalRequest,
  DEFAULT_PROFILES,
  signApproval,
  verifyApprovalQuorum,
} from "@/lib/pharos/multi-party-approval";

describe("buildApprovalRequest", () => {
  it("produces a payloadHash that's stable for one request instance", () => {
    const r = buildApprovalRequest({
      id: "req-1",
      kind: "OVERSIGHT_REVOCATION",
      payload: { reason: "non-compliance" },
      authorityProfileId: "auth-1",
      oversightId: "ov-1",
      initiatedBy: "user-1",
    });
    expect(r.payloadHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.id).toBe("req-1");
    expect(r.kind).toBe("OVERSIGHT_REVOCATION");
  });

  it("payloadHash differs when payload differs", () => {
    const baseInput = {
      id: "x",
      kind: "OVERSIGHT_REVOCATION" as const,
      authorityProfileId: "a",
      initiatedBy: "u",
    };
    const a = buildApprovalRequest({ ...baseInput, payload: { x: 1 } });
    const b = buildApprovalRequest({ ...baseInput, payload: { x: 2 } });
    expect(a.payloadHash).not.toBe(b.payloadHash);
  });

  it("sets expiry from profile ttl", () => {
    const r = buildApprovalRequest({
      id: "r",
      kind: "MDF_AMENDMENT",
      payload: {},
      authorityProfileId: "a",
      initiatedBy: "u",
    });
    const ttlMs = DEFAULT_PROFILES.MDF_AMENDMENT.ttlHours * 3600_000;
    const initiated = Date.parse(r.initiatedAt);
    const expires = Date.parse(r.expiresAt);
    expect(expires - initiated).toBeCloseTo(ttlMs, -3);
  });
});

describe("signApproval + verifyApprovalQuorum", () => {
  function makeRequest(kind: keyof typeof DEFAULT_PROFILES = "MDF_AMENDMENT") {
    return buildApprovalRequest({
      id: "r1",
      kind,
      payload: { foo: "bar" },
      authorityProfileId: "auth-1",
      initiatedBy: "initiator",
    });
  }

  it("accepts when k-of-n signatures + required roles present", () => {
    const r = makeRequest();
    const profile = DEFAULT_PROFILES.MDF_AMENDMENT;
    const sigs = [
      signApproval(r, "user-1", "SACHBEARBEITER"),
      signApproval(r, "user-2", "DATENSCHUTZBEAUFTRAGTER"),
    ];
    const v = verifyApprovalQuorum(r, sigs, profile);
    expect(v.ok).toBe(true);
    expect(v.validSignatures).toBe(2);
    expect(v.aggregateHash).toBeTruthy();
  });

  it("rejects when k threshold not met", () => {
    const r = makeRequest();
    const sigs = [signApproval(r, "user-1", "SACHBEARBEITER")];
    const v = verifyApprovalQuorum(r, sigs);
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/gültige Signaturen/);
  });

  it("rejects when required role is missing", () => {
    const r = makeRequest("MDF_AMENDMENT");
    // 2 signatures but missing DATENSCHUTZBEAUFTRAGTER role
    const sigs = [
      signApproval(r, "user-1", "SACHBEARBEITER"),
      signApproval(r, "user-2", "REFERATSLEITER"),
    ];
    const v = verifyApprovalQuorum(r, sigs);
    expect(v.ok).toBe(false);
    expect(v.rolesMissing).toContain("DATENSCHUTZBEAUFTRAGTER");
  });

  it("rejects expired requests", () => {
    const r = makeRequest();
    r.expiresAt = new Date(Date.now() - 1000).toISOString();
    const sigs = [
      signApproval(r, "u1", "SACHBEARBEITER"),
      signApproval(r, "u2", "DATENSCHUTZBEAUFTRAGTER"),
    ];
    const v = verifyApprovalQuorum(r, sigs);
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/abgelaufen/);
  });

  it("dedupes signatures from the same approver", () => {
    const r = makeRequest();
    const profile = DEFAULT_PROFILES.MDF_AMENDMENT;
    const sigA = signApproval(r, "u1", "SACHBEARBEITER");
    const sigB = signApproval(r, "u2", "DATENSCHUTZBEAUFTRAGTER");
    const v = verifyApprovalQuorum(r, [sigA, sigA, sigA, sigB], profile);
    expect(v.validSignatures).toBe(2);
    expect(v.ok).toBe(true);
  });

  it("rejects sigs whose payloadHash doesn't match the request", () => {
    const r = makeRequest();
    const sig = signApproval(r, "u1", "SACHBEARBEITER");
    const tampered = { ...sig, payloadHash: "wrong-hash" };
    const v = verifyApprovalQuorum(r, [
      tampered,
      signApproval(r, "u2", "DATENSCHUTZBEAUFTRAGTER"),
    ]);
    expect(v.validSignatures).toBe(1);
    expect(v.ok).toBe(false);
  });

  it("CROSS_BORDER_SHARING profile demands 3-of-5 + 3 distinct roles", () => {
    const r = makeRequest("CROSS_BORDER_SHARING");
    const profile = DEFAULT_PROFILES.CROSS_BORDER_SHARING;
    const sigs = [
      signApproval(r, "u1", "SACHBEARBEITER"),
      signApproval(r, "u2", "REFERATSLEITER"),
      signApproval(r, "u3", "DATENSCHUTZBEAUFTRAGTER"),
    ];
    const v = verifyApprovalQuorum(r, sigs, profile);
    expect(v.ok).toBe(true);
    expect(v.validSignatures).toBe(3);
  });
});
