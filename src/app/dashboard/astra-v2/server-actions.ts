"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  runV2AstraTurn,
  type V2AstraMessage,
} from "@/lib/comply-v2/astra-engine.server";
import {
  createConversation,
  appendTurn,
  archiveConversation,
} from "@/lib/comply-v2/conversation-service.server";

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
  try {
    const updated = await runV2AstraTurn(history, userMessage.trim());
    return { ok: true, history: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Astra failed";
    return { ok: false, error: message };
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

  try {
    const updated = await runV2AstraTurn(conv.messages, userMessage.trim());
    await appendTurn(conversationId, session.user.id, updated);
    revalidatePath("/dashboard/astra-v2");
    return { ok: true, history: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Astra failed";
    return { ok: false, error: message };
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
