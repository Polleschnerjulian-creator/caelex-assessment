import { describe, it, expect } from "vitest";
import { createCommitment, openCommitment } from "@/lib/verity/core/commitment";
import type { CommitmentContext } from "@/lib/verity/core/types";

const validContext: CommitmentContext = {
  regulation_ref: "eu_space_act_art_70",
  data_point: "remaining_fuel_pct",
  threshold_type: "ABOVE",
  threshold_value: 15,
  satellite_norad_id: "58421",
  operator_id: "op_123",
  collected_at: "2026-03-15T14:32:07.000Z",
};

describe("createCommitment", () => {
  it("creates a valid commitment", () => {
    const result = createCommitment(57.66, validContext);
    expect(result.commitment.commitment_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.commitment.context).toEqual(validContext);
    expect(result.secret.value).toBe(57.66);
    expect(result.secret.blinding_factor).toMatch(/^[a-f0-9]{64}$/);
  });

  it("throws on non-finite value", () => {
    expect(() => createCommitment(NaN, validContext)).toThrow(
      "value must be finite",
    );
    expect(() => createCommitment(Infinity, validContext)).toThrow(
      "value must be finite",
    );
  });

  it("throws when data_point equals regulation_ref", () => {
    const badContext = { ...validContext, data_point: "eu_space_act_art_70" };
    expect(() => createCommitment(57.66, badContext)).toThrow(
      "data_point must be the measured field",
    );
  });

  it("throws when collected_at is missing", () => {
    const badContext = { ...validContext, collected_at: "" };
    expect(() => createCommitment(57.66, badContext)).toThrow(
      "collected_at must be the measurement timestamp",
    );
  });

  it("produces different hashes for different values", () => {
    const r1 = createCommitment(57.66, validContext);
    const r2 = createCommitment(57.67, validContext);
    expect(r1.commitment.commitment_hash).not.toBe(
      r2.commitment.commitment_hash,
    );
  });

  it("produces different hashes due to random blinding factor", () => {
    const r1 = createCommitment(57.66, validContext);
    const r2 = createCommitment(57.66, validContext);
    expect(r1.commitment.commitment_hash).not.toBe(
      r2.commitment.commitment_hash,
    );
  });
});

describe("openCommitment", () => {
  it("returns true for correct value and blinding factor", () => {
    const result = createCommitment(57.66, validContext);
    expect(openCommitment(result.commitment, result.secret)).toBe(true);
  });

  it("returns false for wrong value", () => {
    const result = createCommitment(57.66, validContext);
    const wrongSecret = { ...result.secret, value: 99.99 };
    expect(openCommitment(result.commitment, wrongSecret)).toBe(false);
  });

  it("returns false for wrong blinding factor", () => {
    const result = createCommitment(57.66, validContext);
    const wrongSecret = {
      ...result.secret,
      blinding_factor: "a".repeat(64),
    };
    expect(openCommitment(result.commitment, wrongSecret)).toBe(false);
  });

  it("returns false for non-finite value", () => {
    const result = createCommitment(57.66, validContext);
    const badSecret = { ...result.secret, value: NaN };
    expect(openCommitment(result.commitment, badSecret)).toBe(false);
  });
});
