/**
 * /api/public/pulse/stream — SSE streaming endpoint tests.
 *
 * Coverage:
 *
 *   1. 429 on rate-limit
 *   2. 400 on garbage body
 *   3. 400 on validation failure
 *   4. 500 on PulseLead.create failure
 *   5. Happy path emits expected event sequence: lead → source-checking ×N
 *      → source-result ×N → complete
 *   6. Each adapter throw → emits source-result with ok:false
 *   7. Response headers: text/event-stream, no-cache, x-accel-buffering:no
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockPulseLead,
  mockCheckRateLimit,
  mockGetIdentifier,
  mockApplyCorsHeaders,
  mockHandleCorsPreflight,
  mockCreateRateLimitResponse,
  mockMergeFields,
  mockAdapter1,
  mockAdapter2,
} = vi.hoisted(() => {
  const m1 = {
    source: "vies-eu-vat",
    displayName: "VIES",
    canDetect: vi.fn(() => true),
    detect: vi.fn(),
  };
  const m2 = {
    source: "gleif-lei",
    displayName: "GLEIF",
    canDetect: vi.fn(() => true),
    detect: vi.fn(),
  };
  return {
    mockPulseLead: { create: vi.fn(), update: vi.fn() },
    mockCheckRateLimit: vi.fn(),
    mockGetIdentifier: vi.fn(() => "ip:1.2.3.4"),
    mockApplyCorsHeaders: vi.fn((res: Response) => res),
    mockHandleCorsPreflight: vi.fn(() => new Response(null, { status: 204 })),
    mockCreateRateLimitResponse: vi.fn(
      () => new Response(JSON.stringify({ error: "rate" }), { status: 429 }),
    ),
    mockMergeFields: vi.fn(() => []),
    mockAdapter1: m1,
    mockAdapter2: m2,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: { pulseLead: mockPulseLead },
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mockCheckRateLimit,
  getIdentifier: mockGetIdentifier,
  createRateLimitResponse: mockCreateRateLimitResponse,
}));

vi.mock("@/lib/cors.server", () => ({
  applyCorsHeaders: mockApplyCorsHeaders,
  handleCorsPreflightResponse: mockHandleCorsPreflight,
}));

vi.mock("@/lib/operator-profile/auto-detection/registry", () => ({
  ADAPTERS: [mockAdapter1, mockAdapter2],
}));

vi.mock("@/lib/operator-profile/auto-detection/cross-verifier.server", () => ({
  mergeFields: mockMergeFields,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST } from "./route";

const HAPPY_BODY = {
  legalName: "OneWeb Limited",
  email: "anna@example.com",
  vatId: "DE123456789",
};

function makeRequest(body?: unknown): Request {
  return new Request("https://app.caelex.com/api/public/pulse/stream", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://caelex.eu",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({
    success: true,
    remaining: 2,
    reset: Date.now() + 60_000,
    limit: 3,
  });
  mockPulseLead.create.mockResolvedValue({
    id: "lead_x",
    createdAt: new Date("2026-04-30T10:00:00Z"),
  });
  mockPulseLead.update.mockResolvedValue({});
  mockAdapter1.canDetect.mockReturnValue(true);
  mockAdapter2.canDetect.mockReturnValue(true);
  mockAdapter1.detect.mockResolvedValue({
    ok: true,
    result: {
      source: "vies-eu-vat",
      fetchedAt: new Date(),
      sourceUrl: "x",
      rawArtifact: null,
      attestation: {
        kind: "public-source",
        source: "other",
        sourceUrl: "x",
        fetchedAt: "x",
      },
      fields: [{ fieldName: "establishment", value: "DE", confidence: 0.98 }],
      warnings: ["test warning"],
    },
  });
  mockAdapter2.detect.mockResolvedValue({
    ok: false,
    source: "gleif-lei",
    errorKind: "remote-error",
    message: "GLEIF returned HTTP 500",
  });
});

// ─── Read SSE helper ───────────────────────────────────────────────────────

async function readAllSseEvents(
  res: Response,
): Promise<Array<{ event: string; data: Record<string, unknown> }>> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
  }
  buf += decoder.decode();

  const events: Array<{ event: string; data: Record<string, unknown> }> = [];
  for (const block of buf.split("\n\n")) {
    if (!block.trim()) continue;
    const lines = block.split("\n");
    let event = "message";
    const dataParts: string[] = [];
    for (const line of lines) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataParts.push(line.slice(5).trim());
    }
    if (dataParts.length === 0) continue;
    try {
      events.push({ event, data: JSON.parse(dataParts.join("\n")) });
    } catch {
      // skip
    }
  }
  return events;
}

// ─── Auth + validation ─────────────────────────────────────────────────────

describe("POST /api/public/pulse/stream — auth + validation", () => {
  it("returns 429 on rate-limit", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
      limit: 3,
    });
    const res = await POST(makeRequest(HAPPY_BODY) as never);
    expect(res.status).toBe(429);
  });

  it("returns 400 on bad JSON body", async () => {
    const req = new Request("https://app.caelex.com/api/public/pulse/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 on validation failure", async () => {
    const res = await POST(makeRequest({ email: "bad" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 500 on PulseLead.create failure", async () => {
    mockPulseLead.create.mockRejectedValueOnce(new Error("DB down"));
    const res = await POST(makeRequest(HAPPY_BODY) as never);
    expect(res.status).toBe(500);
  });
});

// ─── Streaming happy path ──────────────────────────────────────────────────

describe("POST /api/public/pulse/stream — streaming happy path", () => {
  it("returns 200 with text/event-stream + no-cache", async () => {
    const res = await POST(makeRequest(HAPPY_BODY) as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.headers.get("cache-control")).toContain("no-cache");
    expect(res.headers.get("x-accel-buffering")).toBe("no");
  });

  it("emits 'lead' first, then source-checking + source-result, then complete", async () => {
    // The mocked mergeFields was hoisted with vi.fn(() => []) so its
    // inferred return type is `never[]`. Cast for this one-off non-empty
    // override; the route consumes it as MergedField[] regardless.
    (
      mockMergeFields as unknown as {
        mockReturnValueOnce: (v: unknown) => void;
      }
    ).mockReturnValueOnce([
      {
        fieldName: "establishment",
        chosenValue: "DE",
        chosenSource: "vies-eu-vat",
        agreementCount: 1,
        conflicts: [],
        contributingAdapters: ["vies-eu-vat"],
      },
    ]);

    const res = await POST(makeRequest(HAPPY_BODY) as never);
    const events = await readAllSseEvents(res);

    // Sequence: first event is `lead`
    expect(events[0].event).toBe("lead");
    expect(events[0].data.leadId).toBe("lead_x");
    expect(events[0].data.sources).toEqual(["vies-eu-vat", "gleif-lei"]);

    // Last event is `complete`
    expect(events[events.length - 1].event).toBe("complete");
    expect(events[events.length - 1].data.bestPossibleTier).toBe(
      "T2_SOURCE_VERIFIED",
    );

    // source-checking and source-result events for both adapters
    const checkingEvents = events.filter((e) => e.event === "source-checking");
    expect(checkingEvents).toHaveLength(2);
    const resultEvents = events.filter((e) => e.event === "source-result");
    expect(resultEvents).toHaveLength(2);

    // VIES result is ok:true with fields, GLEIF is ok:false with errorKind
    const viesResult = resultEvents.find(
      (e) => e.data.source === "vies-eu-vat",
    )!;
    expect(viesResult.data.ok).toBe(true);
    expect(viesResult.data.fields).toBeDefined();
    const gleifResult = resultEvents.find(
      (e) => e.data.source === "gleif-lei",
    )!;
    expect(gleifResult.data.ok).toBe(false);
    expect(gleifResult.data.errorKind).toBe("remote-error");
  });

  it("emits source-result ok:false when adapter throws", async () => {
    mockAdapter1.detect.mockRejectedValueOnce(new Error("adapter exploded"));
    const res = await POST(makeRequest(HAPPY_BODY) as never);
    const events = await readAllSseEvents(res);
    const viesResult = events.find(
      (e) => e.event === "source-result" && e.data.source === "vies-eu-vat",
    )!;
    expect(viesResult.data.ok).toBe(false);
    expect(viesResult.data.message).toContain("adapter exploded");
  });

  it("complete event carries T0_UNVERIFIED when no fields merged", async () => {
    mockMergeFields.mockReturnValueOnce([]);
    const res = await POST(makeRequest(HAPPY_BODY) as never);
    const events = await readAllSseEvents(res);
    const completeEvent = events.find((e) => e.event === "complete")!;
    expect(completeEvent.data.bestPossibleTier).toBe("T0_UNVERIFIED");
  });

  it("filters adapters via canDetect (skips non-applicable)", async () => {
    mockAdapter2.canDetect.mockReturnValueOnce(false);
    const res = await POST(makeRequest(HAPPY_BODY) as never);
    const events = await readAllSseEvents(res);
    const sourceCheckingForGleif = events.filter(
      (e) => e.event === "source-checking" && e.data.source === "gleif-lei",
    );
    expect(sourceCheckingForGleif).toHaveLength(0);
  });
});
