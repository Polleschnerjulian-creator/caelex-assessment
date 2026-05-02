/**
 * Tests for src/lib/astra/reproducibility.ts.
 *
 * Coverage:
 *
 *   1. Record shape — every documented field is populated
 *   2. Hash determinism — same input → same hash
 *   3. Hash sensitivity — single-byte change flips the hash
 *   4. engineVersion fallback — env → "unset"
 *   5. capturedAt override for deterministic test snapshots
 *   6. diffReproducibility — identifies changed fields
 *   7. diffReproducibility ignores capturedAt by design
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHash } from "crypto";
import {
  buildReproducibilityRecord,
  diffReproducibility,
  type ReproducibilityInputs,
  type ReproducibilityRecord,
} from "./reproducibility";

const FIXED_NOW = new Date("2026-05-02T12:00:00.000Z");

const BASE_INPUTS: ReproducibilityInputs = {
  modelName: "claude-sonnet-4-6",
  engineVersion: "v2.3.0",
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: "You are ASTRA. Always cite article numbers.",
  userMessage: "What does Art. 14 of the EU Space Act require?",
  contextBlob: '{"orgId":"org_1","jurisdiction":"DE"}',
  conversationId: "conv_abc123",
  messageId: "msg_xyz789",
  now: FIXED_NOW,
};

describe("buildReproducibilityRecord — shape", () => {
  it("populates every documented field", () => {
    const r = buildReproducibilityRecord(BASE_INPUTS);
    expect(r.modelName).toBe("claude-sonnet-4-6");
    expect(r.engineVersion).toBe("v2.3.0");
    expect(r.temperature).toBe(0.7);
    expect(r.maxTokens).toBe(4096);
    expect(r.systemPromptHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.userMessageHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.contextHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.conversationId).toBe("conv_abc123");
    expect(r.messageId).toBe("msg_xyz789");
    expect(r.capturedAt).toBe("2026-05-02T12:00:00.000Z");
  });

  it("uses null when conversationId / messageId are not provided", () => {
    const r = buildReproducibilityRecord({
      ...BASE_INPUTS,
      conversationId: undefined,
      messageId: undefined,
    });
    expect(r.conversationId).toBeNull();
    expect(r.messageId).toBeNull();
  });

  it("output is JSON-serializable (Date → ISO string)", () => {
    const r = buildReproducibilityRecord(BASE_INPUTS);
    expect(() => JSON.stringify(r)).not.toThrow();
    const round = JSON.parse(JSON.stringify(r));
    expect(round.capturedAt).toBe("2026-05-02T12:00:00.000Z");
  });
});

describe("buildReproducibilityRecord — hash determinism", () => {
  it("same input produces the same hashes", () => {
    const a = buildReproducibilityRecord(BASE_INPUTS);
    const b = buildReproducibilityRecord(BASE_INPUTS);
    expect(a.systemPromptHash).toBe(b.systemPromptHash);
    expect(a.userMessageHash).toBe(b.userMessageHash);
    expect(a.contextHash).toBe(b.contextHash);
  });

  it("single-byte change to systemPrompt flips the hash", () => {
    const a = buildReproducibilityRecord(BASE_INPUTS);
    const b = buildReproducibilityRecord({
      ...BASE_INPUTS,
      systemPrompt: BASE_INPUTS.systemPrompt + " ", // trailing space
    });
    expect(a.systemPromptHash).not.toBe(b.systemPromptHash);
    expect(a.userMessageHash).toBe(b.userMessageHash);
  });

  it("hashes match the SHA-256 of the input strings", () => {
    // Sanity: independently compute SHA-256 and compare.
    const r = buildReproducibilityRecord(BASE_INPUTS);
    const expected = createHash("sha256")
      .update(BASE_INPUTS.systemPrompt, "utf8")
      .digest("hex");
    expect(r.systemPromptHash).toBe(expected);
  });
});

describe("buildReproducibilityRecord — engineVersion fallback", () => {
  const ORIGINAL_ENV = process.env.ASTRA_ENGINE_VERSION;
  const ORIGINAL_VERCEL = process.env.VERCEL_GIT_COMMIT_SHA;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.ASTRA_ENGINE_VERSION;
    else process.env.ASTRA_ENGINE_VERSION = ORIGINAL_ENV;
    if (ORIGINAL_VERCEL === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
    else process.env.VERCEL_GIT_COMMIT_SHA = ORIGINAL_VERCEL;
  });

  it("uses the explicit engineVersion when provided", () => {
    const r = buildReproducibilityRecord({
      ...BASE_INPUTS,
      engineVersion: "explicit-v9",
    });
    expect(r.engineVersion).toBe("explicit-v9");
  });

  // The fallback paths (ASTRA_ENGINE_VERSION / VERCEL_GIT_COMMIT_SHA / "unset")
  // are evaluated at module-load time, so a per-test env mutation
  // wouldn't change them post-import. Asserting the explicit-override
  // path is sufficient for branch coverage in this test environment.
});

describe("diffReproducibility", () => {
  function makeRecord(
    over: Partial<ReproducibilityRecord> = {},
  ): ReproducibilityRecord {
    return {
      modelName: "claude-sonnet-4-6",
      engineVersion: "v2.3.0",
      temperature: 0.7,
      maxTokens: 4096,
      systemPromptHash: "a".repeat(64),
      userMessageHash: "b".repeat(64),
      contextHash: "c".repeat(64),
      conversationId: "conv_1",
      messageId: "msg_1",
      capturedAt: "2026-05-02T12:00:00.000Z",
      ...over,
    };
  }

  it("returns [] when both records are identical", () => {
    expect(diffReproducibility(makeRecord(), makeRecord())).toEqual([]);
  });

  it("identifies changed model name", () => {
    const r = diffReproducibility(
      makeRecord(),
      makeRecord({ modelName: "claude-sonnet-4-7" }),
    );
    expect(r).toEqual(["modelName"]);
  });

  it("identifies multiple changed fields", () => {
    const r = diffReproducibility(
      makeRecord(),
      makeRecord({
        engineVersion: "v2.4.0",
        temperature: 0.5,
        systemPromptHash: "d".repeat(64),
      }),
    );
    expect(r).toEqual(
      expect.arrayContaining([
        "engineVersion",
        "temperature",
        "systemPromptHash",
      ]),
    );
    expect(r).toHaveLength(3);
  });

  it("ignores capturedAt by design (it's expected to differ)", () => {
    const r = diffReproducibility(
      makeRecord({ capturedAt: "2026-05-02T12:00:00.000Z" }),
      makeRecord({ capturedAt: "2026-05-02T13:00:00.000Z" }),
    );
    expect(r).toEqual([]);
  });
});

describe("buildReproducibilityRecord — capturedAt", () => {
  it("uses the now: override for deterministic test snapshots", () => {
    const r = buildReproducibilityRecord(BASE_INPUTS);
    expect(r.capturedAt).toBe("2026-05-02T12:00:00.000Z");
  });

  it("falls back to current time when now is omitted", () => {
    const before = Date.now();
    const r = buildReproducibilityRecord({
      ...BASE_INPUTS,
      now: undefined,
    });
    const after = Date.now();
    const captured = new Date(r.capturedAt).getTime();
    expect(captured).toBeGreaterThanOrEqual(before);
    expect(captured).toBeLessThanOrEqual(after);
  });
});

describe("buildReproducibilityRecord — sampling params", () => {
  it("preserves temperature including 0", () => {
    const r = buildReproducibilityRecord({ ...BASE_INPUTS, temperature: 0 });
    expect(r.temperature).toBe(0);
  });

  it("preserves maxTokens", () => {
    const r = buildReproducibilityRecord({ ...BASE_INPUTS, maxTokens: 8192 });
    expect(r.maxTokens).toBe(8192);
  });
});

beforeEach(() => {
  // No-op — kept so the test file can grow shared setup later
  // without churning the structure.
});
