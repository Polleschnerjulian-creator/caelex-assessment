/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Witness-Quorum tests — split-view-attack resistance.
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
  QUORUM_THRESHOLD,
  signTreeHeadAs,
  verifyQuorum,
  WITNESSES,
} from "@/lib/pharos/witness-quorum";

const baseTreeHead = {
  treeSize: 100,
  rootEntryHash: "deadbeef",
  checkpointAt: "2026-04-29T12:00:00Z",
  treeHeadHash: "abc123",
};

describe("signTreeHeadAs", () => {
  it("produces distinct signatures for different witness IDs", () => {
    const a = signTreeHeadAs(baseTreeHead, "pharos-main");
    const b = signTreeHeadAs(baseTreeHead, "pharos-mirror-1");
    expect(a.signature).not.toBe(b.signature);
    expect(a.publicKeyBase64).not.toBe(b.publicKeyBase64);
  });

  it("is deterministic for same witness + same tree head", () => {
    const a = signTreeHeadAs(baseTreeHead, "pharos-main");
    const b = signTreeHeadAs(baseTreeHead, "pharos-main");
    expect(a.signature).toBe(b.signature);
  });
});

describe("verifyQuorum", () => {
  it("accepts 3-of-5 valid cosignatures", () => {
    const sigs = WITNESSES.slice(0, 3).map((w) =>
      signTreeHeadAs(baseTreeHead, w),
    );
    const r = verifyQuorum(baseTreeHead, sigs);
    expect(r.ok).toBe(true);
    expect(r.validCount).toBe(3);
  });

  it("rejects when only 2-of-5 signatures present", () => {
    const sigs = WITNESSES.slice(0, 2).map((w) =>
      signTreeHeadAs(baseTreeHead, w),
    );
    const r = verifyQuorum(baseTreeHead, sigs);
    expect(r.ok).toBe(false);
    expect(r.validCount).toBe(2);
    expect(r.reason).toMatch(/Quorum/);
  });

  it("counts duplicate witness sigs only once", () => {
    const sigA = signTreeHeadAs(baseTreeHead, "pharos-main");
    const sigB = signTreeHeadAs(baseTreeHead, "pharos-mirror-1");
    const r = verifyQuorum(baseTreeHead, [sigA, sigA, sigA, sigB, sigB]);
    expect(r.validCount).toBe(2);
    expect(r.ok).toBe(false);
  });

  it("rejects sigs whose treeHeadHash doesn't match", () => {
    const goodSigs = WITNESSES.slice(0, 3).map((w) =>
      signTreeHeadAs(baseTreeHead, w),
    );
    // Tamper one sig's treeHeadHash field
    const tampered = { ...goodSigs[0], treeHeadHash: "different-hash" };
    const r = verifyQuorum(baseTreeHead, [tampered, goodSigs[1], goodSigs[2]]);
    expect(r.validCount).toBe(2);
    expect(r.ok).toBe(false);
  });

  it("rejects sigs with mismatched signature bytes", () => {
    const good = signTreeHeadAs(baseTreeHead, "pharos-main");
    const bad = { ...good, signature: "AAAA" + good.signature.slice(4) };
    const r = verifyQuorum(baseTreeHead, [bad]);
    expect(r.validCount).toBe(0);
    expect(r.invalidCount).toBeGreaterThan(0);
  });

  it("allows custom threshold", () => {
    const sigs = WITNESSES.slice(0, 4).map((w) =>
      signTreeHeadAs(baseTreeHead, w),
    );
    expect(verifyQuorum(baseTreeHead, sigs, 4).ok).toBe(true);
    expect(verifyQuorum(baseTreeHead, sigs, 5).ok).toBe(false);
  });

  it("constants are correct: 5 witnesses, threshold 3", () => {
    expect(WITNESSES.length).toBe(5);
    expect(QUORUM_THRESHOLD).toBe(3);
  });
});
