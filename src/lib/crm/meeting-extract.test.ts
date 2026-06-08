/**
 * Tests for `extractMeetingContacts` (ai.server) — the JSON handling + the
 * graceful fallbacks that keep untrusted LLM output from ever reaching the CRM
 * as anything but bounded, schema-valid data. The Anthropic SDK is mocked.
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// vi.hoisted so the mock factory (hoisted above the imports) can reference it,
// and a mock CLASS so `new Anthropic(...)` in getClient() is constructable.
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: createMock };
  },
}));

import { extractMeetingContacts } from "./ai.server";

const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY;
const EMPTY = { summary: "", attendees: [], actionItems: [] };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test-key";
});
afterAll(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY;
});

function msg(text: string) {
  return { content: [{ type: "text", text }] };
}

describe("extractMeetingContacts", () => {
  it("returns the empty extraction (no LLM call) when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = await extractMeetingContacts("transcript");
    expect(r).toEqual(EMPTY);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("parses clean strict JSON", async () => {
    createMock.mockResolvedValue(
      msg(
        JSON.stringify({
          summary: "Talked compliance.",
          attendees: [{ name: "Ada", email: "ada@acme.io" }],
          actionItems: ["Follow up"],
        }),
      ),
    );
    const r = await extractMeetingContacts("transcript");
    expect(r.summary).toBe("Talked compliance.");
    expect(r.attendees[0]).toMatchObject({ name: "Ada", email: "ada@acme.io" });
    expect(r.actionItems).toEqual(["Follow up"]);
  });

  it("strips ```json fences``` before parsing", async () => {
    createMock.mockResolvedValue(
      msg(
        "```json\n" +
          JSON.stringify({ summary: "S", attendees: [], actionItems: [] }) +
          "\n```",
      ),
    );
    const r = await extractMeetingContacts("transcript");
    expect(r.summary).toBe("S");
  });

  it("falls back to the empty extraction on malformed JSON (never throws)", async () => {
    createMock.mockResolvedValue(msg("not json at all"));
    await expect(extractMeetingContacts("transcript")).resolves.toEqual(EMPTY);
  });

  it("falls back to empty when the JSON violates the bounds (over-long summary)", async () => {
    createMock.mockResolvedValue(
      msg(
        JSON.stringify({
          summary: "x".repeat(9000), // > the 8000 bound → schema rejects
          attendees: [],
          actionItems: [],
        }),
      ),
    );
    await expect(extractMeetingContacts("transcript")).resolves.toEqual(EMPTY);
  });
});
