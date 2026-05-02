/**
 * Tests for src/lib/sse.ts.
 *
 * Coverage:
 *
 *   1. Response has correct SSE headers
 *   2. send() emits "event: name\ndata: json\n\n"
 *   3. comment() emits ": text\n\n"
 *   4. send() after close is a no-op
 *   5. close() is idempotent
 *   6. abort signal closes the stream
 *   7. Pre-aborted signal yields an immediately-closed stream
 *   8. onStart throwing emits an "error" event before close
 *   9. Heartbeat fires comments at the configured interval
 *  10. heartbeatMs=0 disables heartbeats
 *  11. isClosed reflects the channel state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSseStream } from "./sse";

const decoder = new TextDecoder();

/** Drain the response stream into a single concatenated string. */
async function readAll(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createSseStream — headers", () => {
  it("returns 200 with text/event-stream content-type", async () => {
    const res = createSseStream({
      onStart: (ch) => ch.close(),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
    await readAll(res); // drain to release
  });

  it("sets cache-control no-cache + connection keep-alive + x-accel-buffering no", async () => {
    const res = createSseStream({ onStart: (ch) => ch.close() });
    expect(res.headers.get("cache-control")).toMatch(/no-cache/);
    expect(res.headers.get("connection")).toBe("keep-alive");
    expect(res.headers.get("x-accel-buffering")).toBe("no");
    await readAll(res);
  });
});

describe("createSseStream — send / comment encoding", () => {
  it("send() emits 'event: NAME\\ndata: JSON\\n\\n'", async () => {
    const res = createSseStream({
      heartbeatMs: 0,
      onStart: (ch) => {
        ch.send("hello", { msg: "world" });
      },
    });
    const body = await readAll(res);
    expect(body).toBe('event: hello\ndata: {"msg":"world"}\n\n');
  });

  it("comment() emits ': TEXT\\n\\n'", async () => {
    const res = createSseStream({
      heartbeatMs: 0,
      onStart: (ch) => {
        ch.comment("hb");
      },
    });
    const body = await readAll(res);
    expect(body).toBe(": hb\n\n");
  });

  it("multiple sends concatenate in order", async () => {
    const res = createSseStream({
      heartbeatMs: 0,
      onStart: (ch) => {
        ch.send("a", 1);
        ch.send("b", 2);
        ch.send("c", 3);
      },
    });
    const body = await readAll(res);
    expect(body).toBe(
      "event: a\ndata: 1\n\nevent: b\ndata: 2\n\nevent: c\ndata: 3\n\n",
    );
  });
});

describe("createSseStream — close behaviour", () => {
  it("send() after close is a no-op", async () => {
    const res = createSseStream({
      heartbeatMs: 0,
      onStart: (ch) => {
        ch.send("first", 1);
        ch.close();
        ch.send("after", 2); // should not appear
      },
    });
    const body = await readAll(res);
    expect(body).toContain("event: first");
    expect(body).not.toContain("event: after");
  });

  it("close() is idempotent", async () => {
    const res = createSseStream({
      heartbeatMs: 0,
      onStart: (ch) => {
        ch.close();
        ch.close(); // must not throw
        ch.close();
      },
    });
    expect(await readAll(res)).toBe("");
  });

  it("isClosed reflects state", async () => {
    let snapshotBefore = false;
    let snapshotAfter = false;
    const res = createSseStream({
      heartbeatMs: 0,
      onStart: (ch) => {
        snapshotBefore = ch.isClosed;
        ch.close();
        snapshotAfter = ch.isClosed;
      },
    });
    await readAll(res);
    expect(snapshotBefore).toBe(false);
    expect(snapshotAfter).toBe(true);
  });
});

describe("createSseStream — abort signal", () => {
  it("aborting the signal closes the stream", async () => {
    const ac = new AbortController();
    const res = createSseStream({
      signal: ac.signal,
      heartbeatMs: 0,
      onStart: async (ch) => {
        ch.send("before", 1);
        // Abort during async work — channel.close() should fire and
        // subsequent sends are dropped.
        ac.abort();
        ch.send("after-abort", 2);
      },
    });
    const body = await readAll(res);
    expect(body).toContain("event: before");
    expect(body).not.toContain("event: after-abort");
  });

  it("pre-aborted signal yields an immediately-closed stream", async () => {
    const ac = new AbortController();
    ac.abort();
    let onStartCalled = false;
    const res = createSseStream({
      signal: ac.signal,
      heartbeatMs: 0,
      onStart: () => {
        onStartCalled = true;
      },
    });
    expect(await readAll(res)).toBe("");
    // Implementation detail: when signal pre-aborted, onStart is
    // not invoked.
    expect(onStartCalled).toBe(false);
  });
});

describe("createSseStream — error handling", () => {
  it("onStart rejection emits an 'error' event before close", async () => {
    const onError = vi.fn();
    const res = createSseStream({
      heartbeatMs: 0,
      onError,
      onStart: async () => {
        throw new Error("boom");
      },
    });
    const body = await readAll(res);
    expect(body).toContain("event: error");
    expect(body).toContain('"message":"boom"');
    expect(onError).toHaveBeenCalledOnce();
  });

  it("onStart synchronous throw is also caught", async () => {
    const res = createSseStream({
      heartbeatMs: 0,
      onError: () => {},
      onStart: () => {
        throw new Error("sync-boom");
      },
    });
    const body = await readAll(res);
    expect(body).toContain('"message":"sync-boom"');
  });
});

describe("createSseStream — heartbeat", () => {
  it("heartbeatMs=0 disables heartbeats", async () => {
    const res = createSseStream({
      heartbeatMs: 0,
      onStart: async (ch) => {
        // Hold the stream open briefly without sending anything.
        await new Promise((r) => setTimeout(r, 50));
        ch.send("done", 1);
      },
    });
    const body = await readAll(res);
    expect(body).not.toContain(": hb");
  });

  it("heartbeat fires comments at the configured interval", async () => {
    const res = createSseStream({
      heartbeatMs: 30,
      onStart: async (ch) => {
        // Hold open long enough for ~3 heartbeats.
        await new Promise((r) => setTimeout(r, 100));
        ch.send("done", 1);
      },
    });
    const body = await readAll(res);
    // At least 1 heartbeat should have fired in 100ms with 30ms interval.
    const hbCount = (body.match(/: hb\n\n/g) ?? []).length;
    expect(hbCount).toBeGreaterThanOrEqual(1);
    expect(body).toContain("event: done");
  });
});
