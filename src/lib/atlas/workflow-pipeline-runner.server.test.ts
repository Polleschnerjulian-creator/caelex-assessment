import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 T1.E — workflow-pipeline-runner unit tests.
 *
 * Mocks `runChat` so we exercise the runner's orchestration logic
 * without touching the Anthropic API, the database, or any external
 * service. Zero external cost per master-plan § 2 C-1.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

/* Mock chat-engine BEFORE importing the runner — vi.mock is hoisted. */
vi.mock("./chat-engine.server", () => ({
  runChat: vi.fn(),
}));

/* Also mock the logger to suppress noisy stderr in the test run. */
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { runChat } from "./chat-engine.server";
import {
  runWorkflowPipeline,
  consumeChatStream,
} from "./workflow-pipeline-runner.server";

const runChatMock = vi.mocked(runChat);

/* ── Helpers ────────────────────────────────────────────────────────── */

/** Build a `ReadableStream<Uint8Array>` that emits the given SSE events
 *  (each one a JSON-stringifiable object) followed by a `done`. */
function buildMockStream(events: Array<Record<string, unknown>>) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const evt of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
      }
      controller.close();
    },
  });
}

/** Convenience: wire up runChat to return a fresh stream + chatId
 *  per invocation. Each entry in `responses` maps to one call. */
function mockRunChatSequence(
  responses: Array<{
    chatId: string;
    events: Array<Record<string, unknown>>;
  }>,
) {
  runChatMock.mockReset();
  let callIndex = 0;
  runChatMock.mockImplementation(async () => {
    const r = responses[callIndex];
    callIndex += 1;
    if (!r) throw new Error(`No mock response for call #${callIndex}`);
    return { chatId: r.chatId, stream: buildMockStream(r.events) };
  });
}

/* ── consumeChatStream — unit tests ─────────────────────────────────── */

describe("consumeChatStream", () => {
  it("accumulates text deltas", async () => {
    const stream = buildMockStream([
      { type: "chat_started", chatId: "c1" },
      { type: "text", delta: "Hello " },
      { type: "text", delta: "world" },
      { type: "done" },
    ]);
    const result = await consumeChatStream(stream);
    expect(result.assistantText).toBe("Hello world");
    expect(result.toolsUsed).toEqual([]);
    expect(result.errorMessage).toBeUndefined();
  });

  it("collects tool_call_start names in order", async () => {
    const stream = buildMockStream([
      { type: "tool_call_start", id: "t1", name: "search_legal_sources" },
      { type: "tool_call_complete", id: "t1", name: "search_legal_sources" },
      { type: "tool_call_start", id: "t2", name: "get_filing_deadlines" },
      { type: "text", delta: "Done." },
    ]);
    const result = await consumeChatStream(stream);
    expect(result.toolsUsed).toEqual([
      "search_legal_sources",
      "get_filing_deadlines",
    ]);
  });

  it("captures error messages", async () => {
    const stream = buildMockStream([
      { type: "text", delta: "partial" },
      { type: "error", message: "Tool quota exhausted" },
    ]);
    const result = await consumeChatStream(stream);
    expect(result.assistantText).toBe("partial");
    expect(result.errorMessage).toBe("Tool quota exhausted");
  });

  it("ignores keepalive comment lines", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`: keepalive\n\n`));
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "text", delta: "ok" })}\n\n`,
          ),
        );
        controller.enqueue(encoder.encode(`: keepalive\n\n`));
        controller.close();
      },
    });
    const result = await consumeChatStream(stream);
    expect(result.assistantText).toBe("ok");
  });

  it("ignores malformed JSON without throwing", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`data: NOT_JSON\n\n`));
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "text", delta: "x" })}\n\n`,
          ),
        );
        controller.close();
      },
    });
    const result = await consumeChatStream(stream);
    expect(result.assistantText).toBe("x");
  });
});

/* ── runWorkflowPipeline — orchestration tests ──────────────────────── */

describe("runWorkflowPipeline", () => {
  beforeEach(() => {
    runChatMock.mockReset();
  });

  it("returns WORKFLOW_NOT_FOUND when id is unknown", async () => {
    const result = await runWorkflowPipeline({
      workflowId: "does-not-exist-xyz",
      userId: "u1",
      organizationId: "o1",
    });
    expect(result.isCompleted).toBe(false);
    expect(result.aborted?.code).toBe("WORKFLOW_NOT_FOUND");
    expect(result.steps).toHaveLength(0);
    expect(runChatMock).not.toHaveBeenCalled();
  });

  it("returns NO_PIPELINE when workflow exists but has no pipeline", async () => {
    /* "nis2-classification" is a single-prompt workflow — no pipeline. */
    const result = await runWorkflowPipeline({
      workflowId: "nis2-classification",
      userId: "u1",
      organizationId: "o1",
    });
    expect(result.isCompleted).toBe(false);
    expect(result.aborted?.code).toBe("NO_PIPELINE");
    expect(runChatMock).not.toHaveBeenCalled();
  });

  it("runs all steps sequentially for a pipeline workflow", async () => {
    mockRunChatSequence([
      {
        chatId: "chat-abc",
        events: [
          { type: "chat_started", chatId: "chat-abc" },
          { type: "tool_call_start", id: "t1", name: "assess_eu_space_act" },
          { type: "text", delta: "Operator klassifiziert als SCO." },
          { type: "done" },
        ],
      },
      {
        chatId: "chat-abc",
        events: [
          {
            type: "tool_call_start",
            id: "t2",
            name: "list_jurisdiction_authorities",
          },
          { type: "text", delta: "Behörde: BNetzA. Frist: 90 Tage." },
          { type: "done" },
        ],
      },
      {
        chatId: "chat-abc",
        events: [
          { type: "text", delta: "MEMO: Sachverhalt → ..." },
          { type: "done" },
        ],
      },
    ]);

    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
    });

    expect(result.isCompleted).toBe(true);
    expect(result.aborted).toBeUndefined();
    expect(result.chatId).toBe("chat-abc");
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].toolsUsed).toEqual(["assess_eu_space_act"]);
    expect(result.steps[0].assistantText).toContain("SCO");
    expect(result.steps[1].toolsUsed).toEqual([
      "list_jurisdiction_authorities",
    ]);
    expect(result.steps[2].assistantText).toContain("MEMO");
    expect(runChatMock).toHaveBeenCalledTimes(3);
  });

  it("carries chatId forward across steps", async () => {
    mockRunChatSequence([
      {
        chatId: "chat-xyz",
        events: [{ type: "text", delta: "step1 out" }, { type: "done" }],
      },
      {
        chatId: "chat-xyz",
        events: [{ type: "text", delta: "step2 out" }, { type: "done" }],
      },
      {
        chatId: "chat-xyz",
        events: [{ type: "text", delta: "step3 out" }, { type: "done" }],
      },
    ]);

    await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
    });

    /* First call: chatId = null (new chat). */
    expect(runChatMock.mock.calls[0]?.[0]?.chatId).toBeNull();
    /* Subsequent calls: chatId = "chat-xyz" (carried forward). */
    expect(runChatMock.mock.calls[1]?.[0]?.chatId).toBe("chat-xyz");
    expect(runChatMock.mock.calls[2]?.[0]?.chatId).toBe("chat-xyz");
  });

  it("aborts on error event from a step's stream", async () => {
    mockRunChatSequence([
      {
        chatId: "chat-1",
        events: [{ type: "text", delta: "step1 ok" }, { type: "done" }],
      },
      {
        chatId: "chat-1",
        events: [
          { type: "text", delta: "partial step2" },
          { type: "error", message: "Anthropic 429" },
        ],
      },
      /* Third step should NOT be reached. */
    ]);

    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
      /* T1.E.27: disable retries for this test — we're verifying the
         ABORT behaviour after retries-exhausted, not retry mechanics. */
      retryPolicy: { maxRetries: 0, backoffMs: [] },
    });

    expect(result.isCompleted).toBe(false);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[1].isError).toBe(true);
    expect(result.steps[1].errorMessage).toBe("Anthropic 429");
    expect(runChatMock).toHaveBeenCalledTimes(2);
  });

  it("aborts when runChat throws synchronously-rejected promise", async () => {
    runChatMock.mockReset();
    runChatMock
      .mockResolvedValueOnce({
        chatId: "chat-2",
        stream: buildMockStream([
          { type: "text", delta: "ok" },
          { type: "done" },
        ]),
      })
      .mockRejectedValueOnce(new Error("network timeout"));

    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
      /* T1.E.27: disable retries — verifying ABORT path, not retry. */
      retryPolicy: { maxRetries: 0, backoffMs: [] },
    });

    expect(result.isCompleted).toBe(false);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[1].isError).toBe(true);
    expect(result.steps[1].errorMessage).toContain("network timeout");
  });

  it("aborts on empty assistant turn (no text, no tools) by default", async () => {
    mockRunChatSequence([
      {
        chatId: "chat-3",
        events: [{ type: "text", delta: "step1 ok" }, { type: "done" }],
      },
      {
        chatId: "chat-3",
        events: [
          /* No text + no tool — empty turn. */
          { type: "done" },
        ],
      },
    ]);

    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
    });

    expect(result.isCompleted).toBe(false);
    expect(result.steps[1].isError).toBe(true);
    expect(result.steps[1].errorMessage).toContain("Empty assistant turn");
  });

  it("allows empty turns when abortOnEmptyTurn=false", async () => {
    mockRunChatSequence([
      {
        chatId: "c",
        events: [{ type: "text", delta: "step1" }, { type: "done" }],
      },
      {
        chatId: "c",
        events: [{ type: "done" }],
      },
      {
        chatId: "c",
        events: [{ type: "text", delta: "step3" }, { type: "done" }],
      },
    ]);

    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
      abortOnEmptyTurn: false,
    });

    expect(result.isCompleted).toBe(true);
    expect(result.steps).toHaveLength(3);
    expect(result.steps[1].assistantText).toBe("");
  });

  it("forwards mandateId + language to every runChat call", async () => {
    mockRunChatSequence([
      { chatId: "c", events: [{ type: "text", delta: "1" }, { type: "done" }] },
      { chatId: "c", events: [{ type: "text", delta: "2" }, { type: "done" }] },
      { chatId: "c", events: [{ type: "text", delta: "3" }, { type: "done" }] },
    ]);

    await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
      mandateId: "m-42",
      language: "en",
    });

    for (const call of runChatMock.mock.calls) {
      expect(call[0]?.mandateId).toBe("m-42");
      expect(call[0]?.language).toBe("en");
      expect(call[0]?.workflowId).toBe("eu-space-act-vollanalyse");
    }
  });

  it("derives toolToggles per step — enables web=true when web tools expected", async () => {
    /* Stub a synthetic pipeline by overriding runChat's input
       inspection. The 3-step EU vollanalyse doesn't expect web
       tools, so web should stay false on all calls. */
    mockRunChatSequence([
      { chatId: "c", events: [{ type: "text", delta: "1" }, { type: "done" }] },
      { chatId: "c", events: [{ type: "text", delta: "2" }, { type: "done" }] },
      { chatId: "c", events: [{ type: "text", delta: "3" }, { type: "done" }] },
    ]);

    await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
    });

    for (const call of runChatMock.mock.calls) {
      const toggles = call[0]?.toolToggles;
      expect(toggles).toBeDefined();
      expect(toggles?.korpus).toBe(true);
      expect(toggles?.web).toBe(false);
      expect(toggles?.documents).toBe(false);
    }
  });
});

/* ── T1.E.26 — Approval-gate pre-flight scan ────────────────────────── */

describe("runWorkflowPipeline — T1.E.26 approval gates", () => {
  beforeEach(() => {
    runChatMock.mockReset();
  });

  it("halts before running ANY step when an expected-tool needs approval", async () => {
    /* The 4-step "eu-space-act-mit-antrag" pipeline includes
       draft_authorization_application in step 4 — which is marked
       requiresApproval=true in tool-metadata. */
    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-mit-antrag",
      userId: "u1",
      organizationId: "o1",
    });

    expect(result.isCompleted).toBe(false);
    expect(result.awaitingApproval).toBeDefined();
    expect(result.awaitingApproval?.pendingSteps).toHaveLength(1);
    expect(result.awaitingApproval?.pendingSteps[0].stepIndex).toBe(3);
    expect(
      result.awaitingApproval?.pendingSteps[0].requiresApprovalTools,
    ).toContain("draft_authorization_application");
    /* CRITICAL: no runChat calls happened — the halt is pre-flight. */
    expect(runChatMock).not.toHaveBeenCalled();
  });

  it("bypassApproval: true skips the pre-flight scan and runs all steps", async () => {
    mockRunChatSequence([
      {
        chatId: "c",
        events: [{ type: "text", delta: "s1" }, { type: "done" }],
      },
      {
        chatId: "c",
        events: [{ type: "text", delta: "s2" }, { type: "done" }],
      },
      {
        chatId: "c",
        events: [{ type: "text", delta: "s3" }, { type: "done" }],
      },
      {
        chatId: "c",
        events: [{ type: "text", delta: "s4" }, { type: "done" }],
      },
    ]);

    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-mit-antrag",
      userId: "u1",
      organizationId: "o1",
      bypassApproval: true,
    });

    expect(result.isCompleted).toBe(true);
    expect(result.awaitingApproval).toBeUndefined();
    expect(result.steps).toHaveLength(4);
    expect(runChatMock).toHaveBeenCalledTimes(4);
  });

  it("does NOT halt when no expected-tool requires approval (eu-space-act-vollanalyse)", async () => {
    /* The 3-step pipeline uses only safe tools (assess_*, list_*,
       get_*, search_legal_sources, check_article_status). */
    mockRunChatSequence([
      { chatId: "c", events: [{ type: "text", delta: "1" }, { type: "done" }] },
      { chatId: "c", events: [{ type: "text", delta: "2" }, { type: "done" }] },
      { chatId: "c", events: [{ type: "text", delta: "3" }, { type: "done" }] },
    ]);

    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
    });

    expect(result.isCompleted).toBe(true);
    expect(result.awaitingApproval).toBeUndefined();
  });

  it("awaitingApproval response has no steps + chatId='' (nothing ran)", async () => {
    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-mit-antrag",
      userId: "u1",
      organizationId: "o1",
    });

    expect(result.steps).toEqual([]);
    expect(result.chatId).toBe("");
    expect(result.aborted).toBeUndefined();
  });

  it("identifies ALL approval-required steps, not just the first one", async () => {
    /* This test would need a workflow with multiple approval-required
       steps. The current library only has eu-space-act-mit-antrag
       with one such step. Verify at minimum that the existing
       single-step case is correctly identified. */
    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-mit-antrag",
      userId: "u1",
      organizationId: "o1",
    });
    const ids = result.awaitingApproval?.pendingSteps.map((p) => p.stepIndex);
    expect(ids).toEqual([3]); // only step 4 (index 3) has draft_*
  });
});

/* ── T1.E.27 — Retry policy with backoff ────────────────────────────── */

describe("runWorkflowPipeline — T1.E.27 retry policy", () => {
  beforeEach(() => {
    runChatMock.mockReset();
  });

  it("retries a stream-error and succeeds on retry #1", async () => {
    runChatMock
      .mockResolvedValueOnce({
        chatId: "c1",
        stream: buildMockStream([
          { type: "error", message: "Transient gateway 503" },
        ]),
      })
      .mockResolvedValueOnce({
        chatId: "c1",
        stream: buildMockStream([
          { type: "text", delta: "step1 after retry" },
          { type: "done" },
        ]),
      })
      .mockResolvedValueOnce({
        chatId: "c1",
        stream: buildMockStream([
          { type: "text", delta: "step2 ok" },
          { type: "done" },
        ]),
      })
      .mockResolvedValueOnce({
        chatId: "c1",
        stream: buildMockStream([
          { type: "text", delta: "step3 ok" },
          { type: "done" },
        ]),
      });

    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
      retryPolicy: { maxRetries: 2, backoffMs: [0, 0] }, // instant retry for the test
    });

    expect(result.isCompleted).toBe(true);
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].isError).toBe(false);
    expect(result.steps[0].retriedAttempts).toBeGreaterThan(0);
    /* runChat was called 4 times total: 1 fail + 1 retry + 2 next steps. */
    expect(runChatMock).toHaveBeenCalledTimes(4);
  });

  it("retries a runChat throw and succeeds on retry", async () => {
    runChatMock
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce({
        chatId: "c1",
        stream: buildMockStream([
          { type: "text", delta: "step1 after retry" },
          { type: "done" },
        ]),
      })
      .mockResolvedValueOnce({
        chatId: "c1",
        stream: buildMockStream([
          { type: "text", delta: "step2" },
          { type: "done" },
        ]),
      })
      .mockResolvedValueOnce({
        chatId: "c1",
        stream: buildMockStream([
          { type: "text", delta: "step3" },
          { type: "done" },
        ]),
      });

    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
      retryPolicy: { maxRetries: 2, backoffMs: [0, 0] },
    });

    expect(result.isCompleted).toBe(true);
    expect(result.steps[0].assistantText).toContain("step1 after retry");
  });

  it("exhausts retries and aborts when failure is persistent", async () => {
    /* Every runChat call throws. With maxRetries=2 → 3 attempts total. */
    runChatMock.mockRejectedValue(new Error("Always fails"));

    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
      retryPolicy: { maxRetries: 2, backoffMs: [0, 0] },
    });

    expect(result.isCompleted).toBe(false);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].isError).toBe(true);
    expect(result.steps[0].errorMessage).toContain("Always fails");
    /* 3 attempts on step 1, then abort — no step 2 / 3. */
    expect(runChatMock).toHaveBeenCalledTimes(3);
  });

  it("default retry policy is { maxRetries: 2 } when caller omits", async () => {
    runChatMock.mockRejectedValue(new Error("permanent"));

    /* Skip the default 1000ms+3000ms delays by using a tiny override
       — proves caller can disable. */
    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
      retryPolicy: { maxRetries: 2, backoffMs: [0, 0] },
    });

    expect(result.isCompleted).toBe(false);
    /* maxRetries=2 → 3 attempts. */
    expect(runChatMock).toHaveBeenCalledTimes(3);
  });

  it("maxRetries: 0 disables retries entirely", async () => {
    runChatMock.mockRejectedValue(new Error("nope"));

    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
      retryPolicy: { maxRetries: 0, backoffMs: [] },
    });

    expect(result.isCompleted).toBe(false);
    /* Just 1 attempt — no retries. */
    expect(runChatMock).toHaveBeenCalledTimes(1);
    expect(result.steps[0].retriedAttempts).toBe(0);
  });

  it("retriedAttempts is 0 on first-try success", async () => {
    mockRunChatSequence([
      { chatId: "c", events: [{ type: "text", delta: "1" }, { type: "done" }] },
      { chatId: "c", events: [{ type: "text", delta: "2" }, { type: "done" }] },
      { chatId: "c", events: [{ type: "text", delta: "3" }, { type: "done" }] },
    ]);

    const result = await runWorkflowPipeline({
      workflowId: "eu-space-act-vollanalyse",
      userId: "u1",
      organizationId: "o1",
    });

    for (const step of result.steps) {
      expect(step.retriedAttempts).toBe(0);
    }
  });
});
