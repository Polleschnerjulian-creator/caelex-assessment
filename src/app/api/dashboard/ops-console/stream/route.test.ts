/**
 * Tests for /api/dashboard/ops-console/stream — Sprint 7D.
 *
 * Coverage:
 *
 *   1. 401 when no session
 *   2. Returns 200 + text/event-stream when authed
 *   3. Initial 'connected' event includes userId + channel list
 *   4. listenForDbEvents called with all DB channels + signal
 *   5. db-event onMessage forwards to SSE channel.send()
 *   6. db-event onError emits 'db-error' SSE event
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuth, mockListen } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockListen: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/db-events.server", () => ({
  listenForDbEvents: mockListen,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

const decoder = new TextDecoder();

async function readUntil(
  res: Response,
  containsToken: string,
  maxBytes = 4096,
): Promise<string> {
  const reader = res.body!.getReader();
  let out = "";
  while (out.length < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
    if (out.includes(containsToken)) break;
  }
  reader.cancel().catch(() => {});
  return out;
}

describe("ops-console/stream — auth gate", () => {
  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null);
    const ac = new AbortController();
    const res = await GET(
      new Request("http://localhost/api/dashboard/ops-console/stream", {
        signal: ac.signal,
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when session exists but no user.id", async () => {
    mockAuth.mockResolvedValue({ user: { email: "x@example.com" } });
    const ac = new AbortController();
    const res = await GET(
      new Request("http://localhost/api/dashboard/ops-console/stream", {
        signal: ac.signal,
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe("ops-console/stream — happy path", () => {
  it("returns 200 + text/event-stream when authed", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u_1" } });
    mockListen.mockResolvedValue(async () => {});
    const ac = new AbortController();
    const res = await GET(
      new Request("http://localhost/api/dashboard/ops-console/stream", {
        signal: ac.signal,
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
    ac.abort();
    await readUntil(res, "connected", 1024).catch(() => {});
  });

  it("first SSE event is 'connected' with userId + channel list", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u_42" } });
    mockListen.mockResolvedValue(async () => {});
    const ac = new AbortController();
    const res = await GET(
      new Request("http://localhost/api/dashboard/ops-console/stream", {
        signal: ac.signal,
      }),
    );
    const out = await readUntil(res, '"channels"');
    expect(out).toMatch(/event: connected/);
    expect(out).toContain('"userId":"u_42"');
    expect(out).toContain('"comply.proposal.created"');
    expect(out).toContain('"astra.reasoning"');
    ac.abort();
  });

  it("listenForDbEvents is called with all 4 channels and the request signal", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u_1" } });
    mockListen.mockResolvedValue(async () => {});
    const ac = new AbortController();
    const res = await GET(
      new Request("http://localhost/api/dashboard/ops-console/stream", {
        signal: ac.signal,
      }),
    );
    await readUntil(res, "connected", 512);
    expect(mockListen).toHaveBeenCalledOnce();
    const channels = mockListen.mock.calls[0][0];
    const opts = mockListen.mock.calls[0][2];
    expect(channels).toEqual([
      "comply.proposal.created",
      "comply.proposal.applied",
      "comply.mission.phase_updated",
      "astra.reasoning",
    ]);
    // Reference equality isn't guaranteed (Request wraps the signal
    // through fetch internals); structural check is what matters —
    // an AbortSignal IS forwarded.
    expect(opts.signal).toBeInstanceOf(AbortSignal);
    ac.abort();
  });
});

describe("ops-console/stream — DB-event forwarding", () => {
  it("notification on a DB channel produces a same-named SSE event", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u_1" } });
    interface CapturedListener {
      onMessage: (m: { channel: string; payload: unknown }) => void;
      onError?: (e: Error) => void;
    }
    let capturedListener: CapturedListener | null = null;
    mockListen.mockImplementation(
      async (_channels: unknown, listener: CapturedListener) => {
        capturedListener = listener;
        return async () => {};
      },
    );
    const ac = new AbortController();
    const res = await GET(
      new Request("http://localhost/api/dashboard/ops-console/stream", {
        signal: ac.signal,
      }),
    );
    // Wait for connected event first
    const reader = res.body!.getReader();
    let buf = "";
    while (!buf.includes("connected")) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
    }
    // Fire a synthetic notification through the captured listener.
    // Cast through unknown — TS narrows the let-bound variable to
    // `null` because it can't track callback-time mutation.
    const cl1 = capturedListener as unknown as CapturedListener | null;
    cl1?.onMessage({
      channel: "comply.proposal.created",
      payload: { id: "p_42", actor: "anna" },
    });
    while (!buf.includes("comply.proposal.created\n")) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
    }
    expect(buf).toMatch(/event: comply\.proposal\.created/);
    expect(buf).toContain('"id":"p_42"');
    expect(buf).toContain('"actor":"anna"');
    ac.abort();
    reader.cancel().catch(() => {});
  });

  it("listener onError emits a 'db-error' SSE event", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u_1" } });
    interface CapturedListener {
      onMessage: (m: { channel: string; payload: unknown }) => void;
      onError?: (e: Error) => void;
    }
    let capturedListener: CapturedListener | null = null;
    mockListen.mockImplementation(
      async (_channels: unknown, listener: CapturedListener) => {
        capturedListener = listener;
        return async () => {};
      },
    );
    const ac = new AbortController();
    const res = await GET(
      new Request("http://localhost/api/dashboard/ops-console/stream", {
        signal: ac.signal,
      }),
    );
    const reader = res.body!.getReader();
    let buf = "";
    while (!buf.includes("connected")) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
    }
    const cl2 = capturedListener as unknown as CapturedListener | null;
    cl2?.onError?.(new Error("listener died"));
    while (!buf.includes("db-error")) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
    }
    expect(buf).toMatch(/event: db-error/);
    expect(buf).toContain("listener died");
    ac.abort();
    reader.cancel().catch(() => {});
  });
});
