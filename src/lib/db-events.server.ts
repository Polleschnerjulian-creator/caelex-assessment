/**
 * Postgres LISTEN/NOTIFY pub-sub — Sprint 7B
 *
 * Pairs with the SSE helper in src/lib/sse.ts (Sprint 7A) to enable
 * real-time fan-out across Vercel function invocations:
 *
 *   - **Producer side:** any code path calls `emitDbEvent(channel, payload)`
 *     after a state change. The event is broadcast via Postgres
 *     `pg_notify(...)` — every other process LISTENing on that channel
 *     receives it.
 *
 *   - **Consumer side:** an SSE endpoint calls `listenForDbEvents()` at
 *     stream start, gets a typed callback for each notification on its
 *     subscribed channels, and a disposer to clean up. The disposer
 *     fires automatically when the consumer's AbortSignal aborts.
 *
 * # Why Neon's WebSocket Client (not the HTTP-only `neon()` driver)
 *
 * The HTTP edge driver (`neon("...")`) is great for one-shot queries
 * but doesn't keep a persistent connection. LISTEN requires a long-
 * lived session — every NOTIFY you'd otherwise miss between polls.
 * `@neondatabase/serverless` ships a `Client` class (extends pg.Client)
 * that uses WebSockets, and WebSockets work in every Vercel function
 * runtime. One Client per subscription → one persistent connection
 * for the lifetime of the SSE request.
 *
 * # Channel naming
 *
 * Channels are plain strings to Postgres (and identifier-quoted if
 * they contain dots or hyphens). We type them as a union so callers
 * can't typo:
 *
 *   - `comply.proposal.created`
 *   - `comply.proposal.applied`
 *   - `comply.mission.phase_updated`
 *   - `astra.reasoning`
 *
 * Adding a channel is a one-line change to the `DbChannel` union +
 * the `VALID_CHANNELS` set. The two stay in lockstep — runtime
 * validation prevents silent typos in dynamic channel construction.
 *
 * # Payload size limit
 *
 * Postgres NOTIFY caps payloads at 8000 bytes. We enforce a 7900-byte
 * soft limit (leaving headroom for protocol overhead). For larger
 * payloads, store them in a row and notify the row id — the consumer
 * fetches by id when it receives the notification.
 *
 * # Why we don't share a single LISTEN connection across requests
 *
 * Per-request connections trade a small per-stream connection cost
 * for clean disposal: when an SSE client disconnects, the listener's
 * AbortSignal fires, the Client disconnects, and Neon's pool
 * reclaims the slot. A shared singleton would need its own ref-count
 * + cleanup + reconnect logic — overkill until concurrent-listener
 * count gets large.
 */

import "server-only";

import { Client } from "@neondatabase/serverless";

import { prisma } from "./prisma";

// ─── Channels ─────────────────────────────────────────────────────────────

export type DbChannel =
  | "comply.proposal.created"
  | "comply.proposal.applied"
  | "comply.mission.phase_updated"
  | "astra.reasoning";

const VALID_CHANNELS: ReadonlySet<DbChannel> = new Set<DbChannel>([
  "comply.proposal.created",
  "comply.proposal.applied",
  "comply.mission.phase_updated",
  "astra.reasoning",
]);

const PAYLOAD_BYTE_LIMIT = 7900;

// ─── Emit ─────────────────────────────────────────────────────────────────

/**
 * Broadcast a state-change event over Postgres NOTIFY. Every process
 * currently LISTENing on `channel` receives the JSON-encoded payload.
 *
 * Throws on:
 *   - unknown channel (use one of the typed constants)
 *   - payload > 7900 bytes (Postgres limit; store + reference instead)
 */
export async function emitDbEvent(
  channel: DbChannel,
  payload: unknown,
): Promise<void> {
  if (!VALID_CHANNELS.has(channel)) {
    throw new Error(`emitDbEvent: unknown channel "${channel}"`);
  }
  const json = JSON.stringify(payload);
  if (Buffer.byteLength(json, "utf8") > PAYLOAD_BYTE_LIMIT) {
    throw new Error(
      `emitDbEvent: payload exceeds ${PAYLOAD_BYTE_LIMIT}-byte NOTIFY limit ` +
        `(was ${json.length}B). Store the data in a row + NOTIFY the row id.`,
    );
  }
  // pg_notify() takes channel + payload as text args — safer than
  // template-quoting `NOTIFY <channel>, '<payload>'`.
  await prisma.$queryRaw`SELECT pg_notify(${channel}, ${json})`;
}

// ─── Listen ───────────────────────────────────────────────────────────────

export interface DbEventMessage {
  channel: DbChannel;
  /** Parsed JSON payload, or `null` if the producer sent an empty
   *  notification (which is allowed). Parse-errors → null + onError. */
  payload: unknown;
}

export interface DbEventListener {
  /** Fired for every notification on any subscribed channel. */
  onMessage: (msg: DbEventMessage) => void;
  /** Connection-level errors. Called at most once before close. */
  onError?: (err: Error) => void;
  /** Called once after the underlying client has been closed. */
  onClose?: () => void;
}

export interface ListenOptions {
  /** Optional abort signal — when it fires, the listener is disposed. */
  signal?: AbortSignal;
  /**
   * Override the underlying Client constructor. Used by tests to
   * inject a stub. Production code should leave this undefined.
   */
  ClientCtor?: typeof Client;
}

/**
 * Subscribe to one or more channels. Returns a disposer that closes
 * the underlying connection. The disposer is also called automatically
 * when the AbortSignal aborts.
 *
 * Usage with the Sprint 7A SSE helper:
 *
 *     return createSseStream({
 *       signal: request.signal,
 *       async onStart(channel) {
 *         await listenForDbEvents(
 *           ["comply.proposal.created"],
 *           {
 *             onMessage: (msg) => channel.send(msg.channel, msg.payload),
 *           },
 *           { signal: request.signal },
 *         );
 *       },
 *     });
 */
export async function listenForDbEvents(
  channels: DbChannel[],
  listener: DbEventListener,
  opts: ListenOptions = {},
): Promise<() => Promise<void>> {
  for (const c of channels) {
    if (!VALID_CHANNELS.has(c)) {
      throw new Error(`listenForDbEvents: unknown channel "${c}"`);
    }
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("listenForDbEvents: DATABASE_URL is not set");
  }

  const Ctor = opts.ClientCtor ?? Client;
  const client = new Ctor({ connectionString: url });

  let disposed = false;

  const dispose = async (): Promise<void> => {
    if (disposed) return;
    disposed = true;
    try {
      await client.end();
    } catch {
      // Best-effort close — ignore.
    }
    listener.onClose?.();
  };

  // node-postgres's `notification` event payload shape:
  //   { processId, channel, payload }
  // We narrow channel back to DbChannel (validated) and parse payload.
  client.on(
    "notification",
    (notification: {
      processId: number;
      channel: string;
      payload?: string | undefined;
    }) => {
      const ch = notification.channel as DbChannel;
      if (!VALID_CHANNELS.has(ch)) return; // unexpected channel; ignore
      let parsed: unknown = null;
      if (notification.payload && notification.payload.length > 0) {
        try {
          parsed = JSON.parse(notification.payload);
        } catch (err) {
          listener.onError?.(
            new Error(
              `db-event payload parse failed on ${ch}: ${(err as Error).message}`,
            ),
          );
          return;
        }
      }
      listener.onMessage({ channel: ch, payload: parsed });
    },
  );

  client.on("error", (err: Error) => {
    listener.onError?.(err);
    void dispose();
  });

  await client.connect();
  // Quote channel names defensively — "comply.proposal.created" needs
  // double-quoting because it contains dots.
  for (const c of channels) {
    await client.query(`LISTEN "${c}"`);
  }

  if (opts.signal) {
    if (opts.signal.aborted) {
      await dispose();
    } else {
      opts.signal.addEventListener("abort", () => void dispose(), {
        once: true,
      });
    }
  }

  return dispose;
}
