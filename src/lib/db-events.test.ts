/**
 * Tests for src/lib/db-events.server.ts.
 *
 * Coverage:
 *
 *   1. emitDbEvent() rejects unknown channel
 *   2. emitDbEvent() rejects oversized payload (> 7900 bytes)
 *   3. emitDbEvent() calls pg_notify with channel + JSON payload
 *   4. listenForDbEvents() rejects unknown channel
 *   5. listenForDbEvents() rejects when DATABASE_URL is missing
 *   6. listenForDbEvents() connects, runs LISTEN per channel, returns disposer
 *   7. notification fan-out: parses JSON payload, calls onMessage
 *   8. notification with empty payload yields payload=null
 *   9. notification with malformed JSON triggers onError
 *  10. notification on unknown channel is ignored
 *  11. abort signal triggers disposal + onClose
 *  12. Pre-aborted signal disposes immediately
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecuteRaw } = vi.hoisted(() => ({
  mockExecuteRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: mockExecuteRaw,
  },
}));

interface FakeClient {
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  connect: () => Promise<void>;
  query: (sql: string) => Promise<unknown>;
  end: () => Promise<void>;
  emit: (event: string, ...args: unknown[]) => void;
}

function makeFakeClient(): FakeClient {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    on(event, handler) {
      handlers.set(event, handler);
    },
    connect: vi.fn(async () => {}),
    query: vi.fn(async () => ({ rows: [] })),
    end: vi.fn(async () => {}),
    emit(event, ...args) {
      handlers.get(event)?.(...args);
    },
  };
}

/**
 * Build a fake constructor that produces a given client when invoked
 * with `new`. Arrow functions can't be used as constructors, so we
 * wrap the fake in a plain `function` declaration which `[[Construct]]`
 * happily accepts. Returning an object from a constructor causes the
 * runtime to use that object as the instance.
 */
type ClientCtorOpt = NonNullable<
  Parameters<typeof import("./db-events.server").listenForDbEvents>[2]
>["ClientCtor"];

function fakeClientCtor(client: FakeClient): ClientCtorOpt {
  function FakeClient(this: object) {
    return client;
  }
  return FakeClient as unknown as ClientCtorOpt;
}

import {
  emitDbEvent,
  listenForDbEvents,
  type DbChannel,
} from "./db-events.server";

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

beforeEach(() => {
  mockExecuteRaw.mockReset();
  mockExecuteRaw.mockResolvedValue({ rows: [] });
  process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
});

// ─── emitDbEvent ─────────────────────────────────────────────────────────

describe("emitDbEvent", () => {
  it("rejects unknown channel", async () => {
    await expect(
      emitDbEvent("not.a.channel" as DbChannel, { foo: 1 }),
    ).rejects.toThrow(/unknown channel/);
    expect(mockExecuteRaw).not.toHaveBeenCalled();
  });

  it("rejects payload that exceeds the 7900-byte NOTIFY limit", async () => {
    const big = "x".repeat(8000);
    await expect(emitDbEvent("astra.reasoning", { text: big })).rejects.toThrow(
      /exceeds.*NOTIFY limit/,
    );
    expect(mockExecuteRaw).not.toHaveBeenCalled();
  });

  it("calls pg_notify(channel, json) for valid input", async () => {
    await emitDbEvent("comply.proposal.created", { id: "p_1", actor: "anna" });
    expect(mockExecuteRaw).toHaveBeenCalledOnce();
    // The mock receives the tagged-template parts; verify channel + payload
    // are bound as parameters.
    const callArgs = mockExecuteRaw.mock.calls[0];
    // Tagged-template binding: first arg is the strings array, then the
    // interpolated values follow as positional args.
    const flat = JSON.stringify(callArgs);
    expect(flat).toContain("comply.proposal.created");
    expect(flat).toContain("p_1");
    expect(flat).toContain("anna");
  });
});

// ─── listenForDbEvents ───────────────────────────────────────────────────

describe("listenForDbEvents — input validation", () => {
  it("rejects unknown channel", async () => {
    await expect(
      listenForDbEvents(
        ["comply.proposal.created", "evil.channel" as DbChannel],
        { onMessage: vi.fn() },
      ),
    ).rejects.toThrow(/unknown channel/);
  });

  it("rejects when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;
    await expect(
      listenForDbEvents(["comply.proposal.created"], { onMessage: vi.fn() }),
    ).rejects.toThrow(/DATABASE_URL is not set/);
    process.env.DATABASE_URL = ORIGINAL_DATABASE_URL ?? "test";
  });
});

describe("listenForDbEvents — connection lifecycle", () => {
  it("connects, runs LISTEN per channel, returns a disposer", async () => {
    const client = makeFakeClient();
    const ClientCtor = fakeClientCtor(client);
    const dispose = await listenForDbEvents(
      ["comply.proposal.created", "astra.reasoning"],
      { onMessage: vi.fn() },
      { ClientCtor },
    );
    expect(client.connect).toHaveBeenCalledOnce();
    expect(client.query).toHaveBeenCalledTimes(2);
    expect((client.query as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      'LISTEN "comply.proposal.created"',
    );
    expect((client.query as ReturnType<typeof vi.fn>).mock.calls[1][0]).toBe(
      'LISTEN "astra.reasoning"',
    );
    expect(typeof dispose).toBe("function");
    await dispose();
    expect(client.end).toHaveBeenCalledOnce();
  });

  it("dispose() is idempotent — multiple calls do not double-end", async () => {
    const client = makeFakeClient();
    const ClientCtor = fakeClientCtor(client);
    const dispose = await listenForDbEvents(
      ["astra.reasoning"],
      {
        onMessage: vi.fn(),
      },
      { ClientCtor },
    );
    await dispose();
    await dispose();
    await dispose();
    expect(client.end).toHaveBeenCalledOnce();
  });

  it("calls onClose after dispose()", async () => {
    const client = makeFakeClient();
    const ClientCtor = fakeClientCtor(client);
    const onClose = vi.fn();
    const dispose = await listenForDbEvents(
      ["astra.reasoning"],
      { onMessage: vi.fn(), onClose },
      { ClientCtor },
    );
    await dispose();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("listenForDbEvents — notification fan-out", () => {
  it("parses JSON payload and forwards to onMessage", async () => {
    const client = makeFakeClient();
    const ClientCtor = fakeClientCtor(client);
    const onMessage = vi.fn();
    await listenForDbEvents(
      ["comply.proposal.created"],
      { onMessage },
      { ClientCtor },
    );
    client.emit("notification", {
      processId: 1,
      channel: "comply.proposal.created",
      payload: '{"id":"p_42"}',
    });
    expect(onMessage).toHaveBeenCalledWith({
      channel: "comply.proposal.created",
      payload: { id: "p_42" },
    });
  });

  it("empty payload → payload null", async () => {
    const client = makeFakeClient();
    const ClientCtor = fakeClientCtor(client);
    const onMessage = vi.fn();
    await listenForDbEvents(["astra.reasoning"], { onMessage }, { ClientCtor });
    client.emit("notification", {
      processId: 1,
      channel: "astra.reasoning",
      payload: "",
    });
    expect(onMessage).toHaveBeenCalledWith({
      channel: "astra.reasoning",
      payload: null,
    });
  });

  it("malformed JSON payload triggers onError, not onMessage", async () => {
    const client = makeFakeClient();
    const ClientCtor = fakeClientCtor(client);
    const onMessage = vi.fn();
    const onError = vi.fn();
    await listenForDbEvents(
      ["astra.reasoning"],
      { onMessage, onError },
      { ClientCtor },
    );
    client.emit("notification", {
      processId: 1,
      channel: "astra.reasoning",
      payload: "{not valid json",
    });
    expect(onMessage).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0].message).toMatch(/parse failed/);
  });

  it("notification on unknown channel is ignored", async () => {
    const client = makeFakeClient();
    const ClientCtor = fakeClientCtor(client);
    const onMessage = vi.fn();
    await listenForDbEvents(["astra.reasoning"], { onMessage }, { ClientCtor });
    client.emit("notification", {
      processId: 1,
      channel: "rogue.channel",
      payload: '{"x":1}',
    });
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("client error event triggers onError + dispose", async () => {
    const client = makeFakeClient();
    const ClientCtor = fakeClientCtor(client);
    const onError = vi.fn();
    const onClose = vi.fn();
    await listenForDbEvents(
      ["astra.reasoning"],
      { onMessage: vi.fn(), onError, onClose },
      { ClientCtor },
    );
    const err = new Error("conn lost");
    client.emit("error", err);
    expect(onError).toHaveBeenCalledWith(err);
    // Wait a microtask for the async dispose() to settle.
    await Promise.resolve();
    await Promise.resolve();
    expect(client.end).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("listenForDbEvents — abort signal", () => {
  it("aborting the signal disposes the listener", async () => {
    const client = makeFakeClient();
    const ClientCtor = fakeClientCtor(client);
    const ac = new AbortController();
    const onClose = vi.fn();
    await listenForDbEvents(
      ["astra.reasoning"],
      { onMessage: vi.fn(), onClose },
      { ClientCtor, signal: ac.signal },
    );
    expect(client.end).not.toHaveBeenCalled();
    ac.abort();
    // Async dispose
    await Promise.resolve();
    await Promise.resolve();
    expect(client.end).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("pre-aborted signal disposes before returning", async () => {
    const client = makeFakeClient();
    const ClientCtor = fakeClientCtor(client);
    const ac = new AbortController();
    ac.abort();
    const onClose = vi.fn();
    await listenForDbEvents(
      ["astra.reasoning"],
      { onMessage: vi.fn(), onClose },
      { ClientCtor, signal: ac.signal },
    );
    expect(client.end).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
