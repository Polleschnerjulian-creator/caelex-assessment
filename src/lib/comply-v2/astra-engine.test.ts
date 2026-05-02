/**
 * Tests for src/lib/comply-v2/astra-engine.server.ts (Sprint 7C path).
 *
 * Coverage:
 *
 *   1. Non-streaming legacy call shape still returns a complete history
 *   2. onDelta receives each text chunk in stream order
 *   3. Empty deltas are filtered (Anthropic emits at block boundaries)
 *   4. citationCheck is computed on the final assembled text — same
 *      behaviour with or without onDelta
 *   5. Tool calls run after the model emits tool_use blocks
 *   6. Abort signal triggers stream.abort()
 *
 * The Anthropic SDK's `messages.stream()` is fully mocked so these
 * tests don't touch the network. The fake stream supports:
 *   - .on("text", handler) — register a delta handler
 *   - .finalMessage() → resolves with a synthetic Message
 *   - .abort() — sets a flag the test can observe
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted Anthropic + tool-bridge mocks ───────────────────────────────

const { mockStream, mockGetTools, mockExecuteAction } = vi.hoisted(() => ({
  mockStream: vi.fn(),
  mockGetTools: vi.fn(),
  mockExecuteAction: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class Anthropic {
      messages = { stream: mockStream };
    },
    APIError: class APIError extends Error {},
  };
});

vi.mock("./actions/astra-bridge.server", () => ({
  getAstraToolDefinitions: () => mockGetTools(),
  executeAstraAction: (name: string, input: unknown, opts: unknown) =>
    mockExecuteAction(name, input, opts),
}));

const ORIGINAL_ENV = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test-key";
  mockGetTools.mockReturnValue([]);
});

// ─── Fake stream factory ─────────────────────────────────────────────────

interface FakeStream {
  on: (event: string, handler: (delta: string) => void) => FakeStream;
  finalMessage: () => Promise<{
    content: Array<
      | { type: "text"; text: string }
      | {
          type: "tool_use";
          id: string;
          name: string;
          input: Record<string, unknown>;
        }
    >;
    stop_reason: "end_turn" | "tool_use";
  }>;
  abort: () => void;
  __aborted: boolean;
}

interface FakeStreamConfig {
  /** Text deltas to emit synchronously when on("text", ...) is registered. */
  textDeltas?: string[];
  /** Tool-use blocks to include in the final message. */
  toolUses?: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>;
  /** Override stop_reason — defaults to "end_turn" unless toolUses is non-empty. */
  stopReason?: "end_turn" | "tool_use";
  /** Synthetic delay before resolving finalMessage(). 0 = sync. */
  delayMs?: number;
}

function makeFakeStream(config: FakeStreamConfig = {}): FakeStream {
  const textDeltas = config.textDeltas ?? [];
  const toolUses = config.toolUses ?? [];
  const stopReason: "end_turn" | "tool_use" =
    config.stopReason ?? (toolUses.length > 0 ? "tool_use" : "end_turn");
  const stream: FakeStream = {
    __aborted: false,
    on(event, handler) {
      if (event === "text") {
        // Microtask emission so the consumer's await for finalMessage()
        // sees deltas land in order.
        for (const d of textDeltas) {
          queueMicrotask(() => handler(d));
        }
      }
      return stream;
    },
    async finalMessage() {
      if (config.delayMs && config.delayMs > 0) {
        await new Promise((r) => setTimeout(r, config.delayMs));
      }
      // Wait one tick so any queued micro-task delta emissions land
      // before the stream resolves.
      await Promise.resolve();
      return {
        content: [
          ...textDeltas.map((t) => ({ type: "text" as const, text: t })),
          ...toolUses.map((tu) => ({
            type: "tool_use" as const,
            id: tu.id,
            name: tu.name,
            input: tu.input,
          })),
        ],
        stop_reason: stopReason,
      };
    },
    abort() {
      stream.__aborted = true;
    },
  };
  return stream;
}

// ─── Late import (after mocks installed) ─────────────────────────────────

import { runV2AstraTurn } from "./astra-engine.server";

// ─── Tests ───────────────────────────────────────────────────────────────

describe("runV2AstraTurn — non-streaming compatibility (no onDelta)", () => {
  it("returns the updated history with the assistant reply", async () => {
    mockStream.mockReturnValueOnce(
      makeFakeStream({ textDeltas: ["Hello, ", "world!"] }),
    );
    const result = await runV2AstraTurn([], "hi");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ role: "user", content: "hi" });
    expect(result[1].role).toBe("assistant");
    expect(result[1].content).toContain("Hello");
    expect(result[1].content).toContain("world!");
  });
});

describe("runV2AstraTurn — Sprint 7C streaming (with onDelta)", () => {
  it("forwards each text delta to onDelta in order", async () => {
    mockStream.mockReturnValueOnce(
      makeFakeStream({ textDeltas: ["First ", "second ", "third."] }),
    );
    const deltas: string[] = [];
    await runV2AstraTurn([], "go", {
      onDelta: (d) => deltas.push(d),
    });
    expect(deltas).toEqual(["First ", "second ", "third."]);
  });

  it("filters empty deltas", async () => {
    mockStream.mockReturnValueOnce(
      makeFakeStream({ textDeltas: ["", "real chunk", "", "more"] }),
    );
    const deltas: string[] = [];
    await runV2AstraTurn([], "go", {
      onDelta: (d) => deltas.push(d),
    });
    expect(deltas).toEqual(["real chunk", "more"]);
  });

  it("citationCheck still computes on the final assembled text", async () => {
    mockStream.mockReturnValueOnce(
      makeFakeStream({
        textDeltas: ["Per ", "EU Space Act Art. 14, ", "you must."],
      }),
    );
    const result = await runV2AstraTurn([], "go", { onDelta: () => {} });
    const last = result[result.length - 1];
    if (last.role !== "assistant") throw new Error("expected assistant");
    expect(last.citationCheck).toBeDefined();
    expect(last.citationCheck?.total).toBeGreaterThanOrEqual(1);
  });

  it("citationCheck behaviour identical with or without onDelta", async () => {
    const prompt = "Per EU Space Act Art. 6 you must.";
    // Run #1 — no onDelta
    mockStream.mockReturnValueOnce(makeFakeStream({ textDeltas: [prompt] }));
    const r1 = await runV2AstraTurn([], "x");
    // Run #2 — with onDelta
    mockStream.mockReturnValueOnce(makeFakeStream({ textDeltas: [prompt] }));
    const r2 = await runV2AstraTurn([], "x", { onDelta: () => {} });
    const a1 = r1[r1.length - 1];
    const a2 = r2[r2.length - 1];
    if (a1.role !== "assistant" || a2.role !== "assistant") {
      throw new Error("expected assistant on both");
    }
    expect(a1.citationCheck).toEqual(a2.citationCheck);
  });
});

describe("runV2AstraTurn — tool-use loop interaction", () => {
  it("executes tool_use blocks and returns their results in the assistant message", async () => {
    // First iteration: model emits a tool_use, no end_turn
    mockStream.mockReturnValueOnce(
      makeFakeStream({
        textDeltas: ["Considering "],
        toolUses: [
          {
            id: "tu_1",
            name: "snooze_item",
            input: { itemId: "i_42", days: 7 },
          },
        ],
        stopReason: "tool_use",
      }),
    );
    // Second iteration: end_turn with no more tool calls
    mockStream.mockReturnValueOnce(makeFakeStream({ textDeltas: ["Done."] }));
    mockExecuteAction.mockResolvedValueOnce({
      ok: true,
      result: { snoozedUntil: "2026-06-01" },
    });

    const result = await runV2AstraTurn([], "snooze that", {
      onDelta: () => {},
    });
    const assistant = result[result.length - 1];
    if (assistant.role !== "assistant") throw new Error("expected assistant");
    expect(assistant.toolCalls).toHaveLength(1);
    expect(assistant.toolCalls[0]).toMatchObject({
      id: "tu_1",
      name: "snooze_item",
      result: { ok: true, data: { snoozedUntil: "2026-06-01" } },
    });
    expect(mockExecuteAction).toHaveBeenCalledOnce();
    expect(mockExecuteAction.mock.calls[0][0]).toBe("snooze_item");
  });
});

describe("runV2AstraTurn — abort signal", () => {
  it("signal.abort() calls stream.abort()", async () => {
    const stream = makeFakeStream({
      textDeltas: ["streaming…"],
      delayMs: 50, // hold finalMessage long enough to abort
    });
    mockStream.mockReturnValueOnce(stream);
    const ac = new AbortController();
    const p = runV2AstraTurn([], "go", { signal: ac.signal });
    // Microtask boundary so the listener is wired before abort.
    await Promise.resolve();
    ac.abort();
    await p.catch(() => {}); // resolve either way
    expect(stream.__aborted).toBe(true);
  });

  it("pre-aborted signal aborts the stream immediately", async () => {
    const stream = makeFakeStream({ textDeltas: ["x"] });
    mockStream.mockReturnValueOnce(stream);
    const ac = new AbortController();
    ac.abort();
    await runV2AstraTurn([], "go", { signal: ac.signal }).catch(() => {});
    expect(stream.__aborted).toBe(true);
  });
});

afterAll(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIGINAL_ENV;
});

// vitest's globals include afterAll without explicit import via setup.tsx,
// but in case of strict-globals we re-import for safety.
import { afterAll } from "vitest";
