import { describe, it, expect, vi } from "vitest";
import { delegateSubtasks } from "./sub-agent-orchestrator.server";

vi.mock("@/lib/atlas/anthropic-client");
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("delegateSubtasks — sub-agent token tracking (E3)", () => {
  it("aggregates token-totals across all sub-agents (parallel)", async () => {
    const mockAnthropic = {
      messages: {
        create: vi
          .fn()
          .mockResolvedValueOnce({
            content: [{ type: "text", text: "out 1" }],
            usage: {
              input_tokens: 100,
              output_tokens: 50,
              cache_creation_input_tokens: null,
              cache_read_input_tokens: null,
            },
          })
          .mockResolvedValueOnce({
            content: [{ type: "text", text: "out 2" }],
            usage: {
              input_tokens: 200,
              output_tokens: 75,
              cache_creation_input_tokens: null,
              cache_read_input_tokens: null,
            },
          }),
      },
    };

    const outcome = await delegateSubtasks(
      [
        { title: "Task A", prompt: "Test prompt one." },
        { title: "Task B", prompt: "Test prompt two." },
      ],
      {
        anthropic: mockAnthropic as never,
        model: "claude-sonnet-4-6",
        sharedSystemPrompt: null,
      },
    );

    expect(outcome.results).toHaveLength(2);
    expect(outcome.totalInputTokens).toBe(300);
    expect(outcome.totalOutputTokens).toBe(125);
    expect(outcome.hasErrors).toBe(false);
    expect(outcome.content).toContain("## Task A");
    expect(outcome.content).toContain("## Task B");
  });

  it("returns errorOutcome for invalid subtasks (not an array)", async () => {
    const outcome = await delegateSubtasks(null, {
      anthropic: {} as never,
      model: "test",
      sharedSystemPrompt: null,
    });
    expect(outcome.hasErrors).toBe(true);
    expect(outcome.totalInputTokens).toBe(0);
    expect(outcome.totalOutputTokens).toBe(0);
  });

  it("caps at MAX_PARALLEL_SUBTASKS (4) when more passed", async () => {
    const mockAnthropic = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "ok" }],
          usage: {
            input_tokens: 10,
            output_tokens: 5,
            cache_creation_input_tokens: null,
            cache_read_input_tokens: null,
          },
        }),
      },
    };

    const subtasks = Array.from({ length: 6 }, (_, i) => ({
      title: `Task ${i}`,
      prompt: `Prompt ${i} — long enough to pass min(10).`,
    }));

    const outcome = await delegateSubtasks(subtasks, {
      anthropic: mockAnthropic as never,
      model: "test",
      sharedSystemPrompt: null,
    });

    expect(outcome.results).toHaveLength(4);
    expect(mockAnthropic.messages.create).toHaveBeenCalledTimes(4);
  });
});
