"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  runV2AstraTurn,
  type V2AstraMessage,
} from "@/lib/comply-v2/astra-engine.server";
import {
  createConversation,
  appendTurn,
  archiveConversation,
} from "@/lib/comply-v2/conversation-service.server";
import { createDeltaBuffer } from "@/lib/delta-buffer";
import { emitDbEvent } from "@/lib/db-events.server";

/**
 * Server actions backing the V2 Astra chat UI.
 *
 *   - sendV2AstraMessage: ephemeral chat (no persistence). Used as a
 *     fallback when the user is on a fresh page without a
 *     conversationId yet.
 *
 *   - sendInConversation: persisted chat. Loads conversation by ID,
 *     runs the engine, appends the new turn to the DB, returns the
 *     updated history.
 *
 *   - createNewConversation: form action — creates a new conversation
 *     row and redirects to /dashboard/astra-v2?c=<id>.
 *
 *   - archiveConversationAction: form action — soft-deletes the
 *     conversation and revalidates the sidebar.
 */

/**
 * Sprint 7E — Build a delta buffer that fans Anthropic streaming
 * deltas out to the `astra.reasoning` Postgres NOTIFY channel. Any
 * Ops Console viewer (Sprint 7D) sees Astra's reasoning live.
 *
 * `userId` + `conversationId` are tagged on every emitted chunk so
 * a future filtered-subscribe path can scope reasoning streams per
 * user / per conversation. For now the Ops Console shows everyone's
 * to demo the live-streaming pipeline.
 */
function makeReasoningPipe(
  userId: string,
  conversationId: string | null,
): { onDelta: (d: string) => void; finalize: () => Promise<void> } {
  const seq = { i: 0 };
  const buffer = createDeltaBuffer({
    onFlush: async (chunk) => {
      try {
        await emitDbEvent("astra.reasoning", {
          userId,
          conversationId,
          seq: seq.i++,
          chunk,
          emittedAt: new Date().toISOString(),
        });
      } catch (err) {
        // Reasoning fan-out is best-effort — never crash the chat
        // turn just because the DB notify failed. Log and continue.
        logger.warn("[astra-reasoning] emitDbEvent failed", {
          error: (err as Error).message ?? String(err),
        });
      }
    },
  });
  return {
    onDelta: (d) => buffer.append(d),
    finalize: () => buffer.done(),
  };
}

export async function sendV2AstraMessage(
  history: V2AstraMessage[],
  userMessage: string,
): Promise<
  { ok: true; history: V2AstraMessage[] } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in to use Astra V2" };
  }
  if (!userMessage.trim()) {
    return { ok: false, error: "Message must not be empty" };
  }
  const pipe = makeReasoningPipe(session.user.id, null);
  try {
    const updated = await runV2AstraTurn(history, userMessage.trim(), {
      onDelta: pipe.onDelta,
    });
    return { ok: true, history: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Astra failed";
    return { ok: false, error: message };
  } finally {
    await pipe.finalize();
  }
}

/**
 * Send a message inside a persisted conversation. Loads existing
 * history server-side, runs the engine, appends the new turn,
 * returns the new history. The client never sends history over the
 * wire — only the conversationId + new user message — so payloads
 * stay small and we can't "lose" persisted state.
 */
export async function sendInConversation(
  conversationId: string,
  userMessage: string,
): Promise<
  { ok: true; history: V2AstraMessage[] } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in to use Astra V2" };
  }
  if (!userMessage.trim()) {
    return { ok: false, error: "Message must not be empty" };
  }

  // Lazy import to keep the server-actions module thin and avoid
  // unused imports when only the ephemeral path is exercised.
  const { loadConversation } =
    await import("@/lib/comply-v2/conversation-service.server");
  const conv = await loadConversation(conversationId, session.user.id);
  if (!conv) {
    return { ok: false, error: "Conversation not found" };
  }

  const pipe = makeReasoningPipe(session.user.id, conversationId);
  try {
    const updated = await runV2AstraTurn(conv.messages, userMessage.trim(), {
      onDelta: pipe.onDelta,
    });
    await appendTurn(conversationId, session.user.id, updated);
    revalidatePath("/dashboard/astra-v2");
    return { ok: true, history: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Astra failed";
    return { ok: false, error: message };
  } finally {
    await pipe.finalize();
  }
}

export async function createNewConversation(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/astra-v2");
  }
  const conv = await createConversation(session.user.id);
  revalidatePath("/dashboard/astra-v2");
  redirect(`/dashboard/astra-v2?c=${conv.id}`);
}

export async function archiveConversationAction(
  formData: FormData,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const id = formData.get("conversationId");
  if (typeof id !== "string" || !id) return;
  await archiveConversation(id, session.user.id);
  revalidatePath("/dashboard/astra-v2");
  redirect("/dashboard/astra-v2");
}
