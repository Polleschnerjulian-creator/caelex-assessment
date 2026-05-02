/**
 * Server-Sent-Events helper — Sprint 7A
 *
 * Caelex has multiple SSE-emitting endpoints (Sprint 4C: pulse-stream;
 * future: COWF live-events, Astra-reasoning-stream, mission-ops-console).
 * Sprint 4C inlined the encoder + close-handling boilerplate; before
 * adding more, that boilerplate is extracted here so every new SSE
 * endpoint gets:
 *
 *   - correct response headers (text/event-stream, no-cache, keep-alive,
 *     x-accel-buffering: no)
 *   - graceful close on client abort (`request.signal`)
 *   - safe `send()` that no-ops post-close instead of throwing
 *   - **heartbeat comment lines every 15s** (default) — proxies kill
 *     idle SSE connections after ~30-60s; a comment "ping" keeps the
 *     pipe warm without polluting the event stream
 *   - centralised error logging
 *
 * # Why a function not a class
 *
 * The caller's flow is "kick off async work, emit events, eventually
 * close". A class would force the caller to manage lifecycle in
 * multiple methods. The function form lets the caller pass an
 * `onStart` handler that gets a typed `SseChannel` and can do
 * everything it needs in one closure.
 *
 * # Why we don't expose the controller
 *
 * Direct `controller.enqueue` / `controller.close` access invites
 * "enqueue-after-close" errors that throw asynchronously and crash
 * the whole stream. The `SseChannel` API makes those calls safe by
 * design: `send()` is a no-op post-close, `close()` is idempotent.
 */

const HEARTBEAT_DEFAULT_MS = 15_000;

/** Channel handle passed to the consumer's `onStart`. */
export interface SseChannel {
  /** Emit a named event with a JSON-serialised payload. No-op post-close. */
  send: (event: string, data: unknown) => void;
  /** Emit a bare comment line (no event name). Default heartbeat path. */
  comment: (text: string) => void;
  /** Close the stream gracefully. Idempotent. */
  close: () => void;
  /** Whether the stream has been closed (locally or by client abort). */
  readonly isClosed: boolean;
}

export interface CreateSseStreamOptions {
  /**
   * The consumer's main work. Receives a typed `SseChannel`. The
   * function may be async — when it resolves, the stream auto-closes.
   * If it throws, the helper catches, emits an `error` event with the
   * message, then closes.
   */
  onStart: (channel: SseChannel) => void | Promise<void>;
  /**
   * Abort signal — pass `request.signal` to cleanly handle client
   * disconnects. Optional but strongly recommended.
   */
  signal?: AbortSignal;
  /**
   * Heartbeat interval in ms. Default 15000. Set to 0 to disable.
   * Heartbeats are SSE comment lines (`: hb\n\n`) that don't trigger
   * EventSource event handlers but keep proxies / load balancers
   * from idle-killing the connection.
   */
  heartbeatMs?: number;
  /**
   * Optional logger — called with the thrown value if `onStart`
   * rejects. Defaults to console.error.
   */
  onError?: (err: unknown) => void;
}

/**
 * Build a `Response` that streams SSE to the client. The consumer
 * supplies an `onStart` callback that receives a `SseChannel` to
 * push events.
 *
 * Usage:
 *
 *     return createSseStream({
 *       signal: request.signal,
 *       async onStart(ch) {
 *         ch.send("hello", { msg: "world" });
 *         await doSomeWork();
 *         ch.send("done", { ok: true });
 *       },
 *     });
 */
export function createSseStream(opts: CreateSseStreamOptions): Response {
  const heartbeatMs = opts.heartbeatMs ?? HEARTBEAT_DEFAULT_MS;
  const onError = opts.onError ?? ((e) => console.error("[sse]", e));
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

      const channel: SseChannel = {
        send(event, data) {
          if (closed) return;
          try {
            controller.enqueue(
              encoder.encode(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
              ),
            );
          } catch {
            // Stream torn down by underlying transport — mark closed
            // so further sends no-op cleanly.
            closed = true;
          }
        },
        comment(text) {
          if (closed) return;
          try {
            // SSE comment: any line starting with ":". Doesn't fire
            // event handlers but counts as bytes-on-the-wire to keep
            // intermediate proxies from idle-killing the connection.
            controller.enqueue(encoder.encode(`: ${text}\n\n`));
          } catch {
            closed = true;
          }
        },
        close() {
          if (closed) return;
          closed = true;
          if (heartbeatTimer !== null) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
          }
          try {
            controller.close();
          } catch {
            // Already closed — ignore.
          }
        },
        get isClosed() {
          return closed;
        },
      };

      // Wire client-disconnect cleanup. We attach BEFORE running
      // onStart so a user who aborts during async work gets cleanup
      // mid-flight rather than after onStart resolves.
      const onAbort = () => channel.close();
      if (opts.signal) {
        if (opts.signal.aborted) {
          channel.close();
          return;
        }
        opts.signal.addEventListener("abort", onAbort, { once: true });
      }

      // Kick off heartbeat. First tick fires after `heartbeatMs`, NOT
      // immediately — the consumer's first send() typically lands well
      // within that window so users don't see a stray comment first.
      if (heartbeatMs > 0) {
        heartbeatTimer = setInterval(() => {
          channel.comment("hb");
        }, heartbeatMs);
      }

      // Run the consumer. Catch + log + emit `error` event so the
      // client gets a chance to handle the failure rather than just
      // seeing a torn-down connection.
      try {
        await opts.onStart(channel);
      } catch (err) {
        onError(err);
        channel.send("error", {
          message: (err as Error)?.message ?? "internal error",
        });
      } finally {
        // Detach the abort listener — pointless to leak it past close.
        if (opts.signal) {
          opts.signal.removeEventListener("abort", onAbort);
        }
        channel.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Disables nginx + similar reverse-proxy buffering that would
      // hold the response open until the body finishes — defeats SSE.
      "x-accel-buffering": "no",
    },
  });
}
