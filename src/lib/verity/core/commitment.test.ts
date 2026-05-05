/**
 * Tests for the v1 SHA-256 commitment scheme. Pure crypto — no DB.
 * Covers: createCommitment input validation, open roundtrip, tamper
 * rejection, timing-safe comparison, blinding hides the value.
 */

import { describe, it, expect } from "vitest";
import { createCommitment, openCommitment } from "./commitment";
import type { CommitmentContext } from "./types";

const baseContext: CommitmentContext = {
  regulation_ref: "eu_space_act_art_70",
  data_point: "remaining_fuel_pct",
  threshold_type: "ABOVE",
  threshold_value: 10,
  satellite_norad_id: "12345",
  operator_id: "op_test",
  collected_at: "2026-05-01T12:00:00.000Z",
};

describe("createCommitment / openCommitment", () => {
  it("opens with the matching value + blinding", () => {
    const { commitment, secret } = createCommitment(95, baseContext);
    expect(openCommitment(commitment, secret)).toBe(true);
  });

  it("rejects opening with the wrong value", () => {
    const { commitment, secret } = createCommitment(95, baseContext);
    expect(openCommitment(commitment, { ...secret, value: 96 })).toBe(false);
  });

  it("rejects opening with the wrong blinding factor", () => {
    const { commitment, secret } = createCommitment(95, baseContext);
    expect(
      openCommitment(commitment, {
        ...secret,
        blinding_factor: "0".repeat(64),
      }),
    ).toBe(false);
  });

  it("rejects opening with non-finite value", () => {
    const { commitment, secret } = createCommitment(95, baseContext);
    expect(openCommitment(commitment, { ...secret, value: Number.NaN })).toBe(
      false,
    );
    expect(
      openCommitment(commitment, {
        ...secret,
        value: Number.POSITIVE_INFINITY,
      }),
    ).toBe(false);
  });

  it("rejects opening with mismatched commitment hash length", () => {
    const { secret } = createCommitment(95, baseContext);
    const wrongCommitment = {
      commitment_hash: "sha256:short",
      context: baseContext,
      created_at: new Date().toISOString(),
    };
    expect(openCommitment(wrongCommitment, secret)).toBe(false);
  });

  it("emits sha256-prefixed hex of correct length", () => {
    const { commitment } = createCommitment(0, baseContext);
    expect(commitment.commitment_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("two commitments to the same value have different hashes (blinding hides)", () => {
    const a = createCommitment(42, baseContext);
    const b = createCommitment(42, baseContext);
    expect(a.commitment.commitment_hash).not.toBe(b.commitment.commitment_hash);
  });

  it("throws on non-finite value at create time", () => {
    expect(() => createCommitment(Number.NaN, baseContext)).toThrow(/finite/);
    expect(() =>
      createCommitment(Number.POSITIVE_INFINITY, baseContext),
    ).toThrow(/finite/);
  });

  it("throws when data_point is missing", () => {
    expect(() =>
      createCommitment(95, { ...baseContext, data_point: "" }),
    ).toThrow(/data_point/);
  });

  it("throws when data_point equals regulation_ref (common mistake)", () => {
    expect(() =>
      createCommitment(95, {
        ...baseContext,
        data_point: baseContext.regulation_ref,
      }),
    ).toThrow(/data_point.*regulation_ref/);
  });

  it("throws when collected_at is missing", () => {
    expect(() =>
      createCommitment(95, { ...baseContext, collected_at: "" }),
    ).toThrow(/collected_at/);
  });
});
