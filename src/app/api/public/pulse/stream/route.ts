/**
 * POST /api/public/pulse/stream — Sprint 4C
 *
 * Streaming variant of /api/public/pulse/detect. Same input + lead capture
 * + verification pipeline, but emits Server-Sent-Events as each adapter
 * resolves so the UI can reveal source-by-source instead of "wait 4
 * seconds → everything appears at once".
 *
 * **Event sequence:**
 *
 *   1. `lead`           — { leadId, receivedAt, sources: SourceKey[] }
 *      Emitted immediately after PulseLead row is created.
 *   2. `source-checking` — { source }
 *      Emitted just before each adapter is invoked.
 *   3. `source-result`  — { source, ok, fields?, errorKind?, message?, warnings? }
 *      Emitted when each adapter resolves. May arrive in any order.
 *   4. `complete`       — Final aggregated result with mergedFields, all
 *                         warnings, bestPossibleTier.
 *
 * **Why SSE over WebSocket:** ADR-006 picked SSE for COWF live-updates
 * and the same calculus applies here. Easier, native EventSource API,
 * Vercel-edge-friendly, no upgrade negotiation. We don't need bidirectional
 * (the client never talks back during the stream).
 *
 * **Backpressure:** none needed — total payload across the stream is
 * < 100 KB. Each event is < 5 KB.
 *
 * **Why POST not GET:** SSE is traditionally GET, but the request body
 * carries lead data (legalName, vatId, email) which we don't want in
 * URL query strings (logged everywhere, leaks via Referer headers).
 * Modern browsers support fetch+ReadableStream for POST-based SSE; the
 * client uses `response.body.getReader()` to consume.
 *
 * **Note for the rate-limit gate:** same `pulse` tier as /detect. A
 * single attempt either uses the streaming or non-streaming endpoint
 * but counts as ONE request against the limit.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  applyCorsHeaders,
  handleCorsPreflightResponse,
} from "@/lib/cors.server";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { PulseDetectSchema } from "@/lib/validations/pulse";
import { ADAPTERS } from "@/lib/operator-profile/auto-detection/registry";
import { mergeFields } from "@/lib/operator-profile/auto-detection/cross-verifier.server";
import { fireDay0Delivery } from "@/lib/email/pulse/dispatcher.server";
import type {
  AdapterInput,
  AdapterOutcome,
  AdapterResult,
} from "@/lib/operator-profile/auto-detection/types";

export const runtime = "nodejs";
export const maxDuration = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pulseLead = (prisma as any).pulseLead;

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return handleCorsPreflightResponse(origin, "*");
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  // 1. Rate-limit (same `pulse` tier as /detect)
  const identifier = getIdentifier(request);
  const rateLimit = await checkRateLimit("pulse", identifier);
  if (!rateLimit.success) {
    return applyCorsHeaders(createRateLimitResponse(rateLimit), origin, "*");
  }

  // 2. Parse + validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return applyCorsHeaders(
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
      origin,
      "*",
    );
  }
  const parsed = PulseDetectSchema.safeParse(body);
  if (!parsed.success) {
    return applyCorsHeaders(
      NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      ),
      origin,
      "*",
    );
  }
  const input = parsed.data;

  // 3. Create lead row first
  const ipAddress = identifier.startsWith("ip:")
    ? identifier.slice(3)
    : identifier;
  const userAgent = request.headers.get("user-agent") ?? null;

  let lead: { id: string; createdAt: Date };
  try {
    lead = await pulseLead.create({
      data: {
        legalName: input.legalName,
        vatId: input.vatId ?? null,
        email: input.email,
        ipAddress,
        userAgent,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        referrer: input.referrer ?? null,
      },
      select: { id: true, createdAt: true },
    });
  } catch (err) {
    logger.error("[pulse-stream] PulseLead create failed", err);
    return applyCorsHeaders(
      NextResponse.json(
        { error: "Lead capture failed; please try again later" },
        { status: 500 },
      ),
      origin,
      "*",
    );
  }

  // 4. Build adapter input + filter to applicable adapters
  const adapterInput: AdapterInput = {
    organizationId: `pulse-anon-${Date.now()}`,
    legalName: input.legalName,
    vatId: input.vatId,
    establishment: input.establishment,
    signal: request.signal,
  };
  const applicable = ADAPTERS.filter((a) => a.canDetect(adapterInput));

  // 5. Build streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          closed = true;
        }
      };

      const cleanup = () => {
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", cleanup);

      try {
        // 5a. Initial 'lead' event with leadId + which sources will be checked
        send("lead", {
          leadId: lead.id,
          receivedAt: lead.createdAt.toISOString(),
          sources: applicable.map((a) => a.source),
        });

        // 5b. Run each applicable adapter, emit source-checking + source-result
        //     in parallel via Promise.allSettled; events are emitted as each
        //     resolves so the UI fills in cards as data arrives.
        const successful: AdapterResult[] = [];
        const allWarnings: string[] = [];

        const tasks = applicable.map(async (adapter) => {
          send("source-checking", { source: adapter.source });
          let outcome: AdapterOutcome;
          try {
            outcome = await adapter.detect(adapterInput);
          } catch (err) {
            // Adapter contract says detect() shouldn't throw, but defend.
            outcome = {
              ok: false,
              source: adapter.source,
              errorKind: "remote-error",
              message:
                (err as Error).message ?? String(err) ?? "adapter exploded",
            };
          }
          if (outcome.ok) {
            successful.push(outcome.result);
            allWarnings.push(...outcome.result.warnings);
            send("source-result", {
              source: adapter.source,
              ok: true,
              fields: outcome.result.fields,
              warnings: outcome.result.warnings,
            });
          } else {
            send("source-result", {
              source: adapter.source,
              ok: false,
              errorKind: outcome.errorKind,
              message: outcome.message,
            });
          }
        });

        await Promise.allSettled(tasks);

        // 5c. Cross-verify the successful results
        const merged = mergeFields(successful);

        // 5d. Update lead with snapshot
        try {
          await pulseLead.update({
            where: { id: lead.id },
            data: {
              detectionResult: {
                successfulSources: successful.map((s) => s.source),
                mergedFields: merged.map((m) => ({
                  fieldName: m.fieldName,
                  value: m.chosenValue,
                  agreementCount: m.agreementCount,
                  contributingAdapters: m.contributingAdapters,
                })),
                warnings: allWarnings,
                streamedAt: new Date().toISOString(),
              },
            },
          });
        } catch (err) {
          logger.warn("[pulse-stream] lead-update failed (non-fatal)", {
            error: (err as Error).message ?? String(err),
          });
        }

        // 5e. Final 'complete' event with merged fields + best-possible-tier
        send("complete", {
          mergedFields: merged.map((m) => ({
            fieldName: m.fieldName,
            value: m.chosenValue,
            agreementCount: m.agreementCount,
            contributingAdapters: m.contributingAdapters,
          })),
          warnings: allWarnings,
          bestPossibleTier:
            merged.length > 0 ? "T2_SOURCE_VERIFIED" : "T0_UNVERIFIED",
        });

        // 5f. Sprint 4E — fire day-0 delivery email after the stream
        //     completes (lead.detectionResult is now populated, so the
        //     email can include a real fields-summary). Fire-and-forget.
        void fireDay0Delivery(lead.id);
      } catch (err) {
        logger.error("[pulse-stream] orchestration error", err);
        send("error", {
          message: (err as Error).message ?? "internal error",
        });
      } finally {
        cleanup();
      }
    },
  });

  const response = new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no", // disable nginx-style buffering
    },
  });
  // applyCorsHeaders is typed for NextResponse but at runtime only uses
  // .headers.set() — Response has the same shape. Safe cast.
  return applyCorsHeaders(response as unknown as NextResponse, origin, "*");
}
