"use server";

import { auth } from "@/lib/auth";
import {
  runV2AstraTurn,
  type V2AstraMessage,
} from "@/lib/comply-v2/astra-engine.server";

/**
 * Send a user message to V2 Astra. The full conversation history is
 * passed in (the chat UI keeps it in component state — no DB
 * persistence in Phase 1; that's V2AstraConversation territory in
 * Phase 2).
 *
 * Returns the updated history with the assistant's reply + any tool
 * calls executed during the turn.
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
