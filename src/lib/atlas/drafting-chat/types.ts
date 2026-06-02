/**
 * Atlas Drafting Chat — shared types (Bundle 44).
 *
 * The drafting chat is a Harvey-style conversational surface on top of
 * the existing Atlas drafting tooling. The user types in natural prose
 * ("erstelle das DE-Filing-Paket für Sky-Sat"), the engine routes via
 * Anthropic tool-use, server-side tools generate actual draft bodies,
 * client-side actions are returned for the frontend to apply against
 * its localStorage stores.
 *
 * This module holds the shared shapes — types are deliberately serial-
 * isable JSON because they cross the wire between server (Anthropic
 * loop) and browser (action executor + chat renderer).
 */

import type { Mandate } from "../mandate-store";
import type { Clause } from "../clause-library";
import type { MandateIntake } from "../mandate-intake";
import type { PlanWorkspace } from "../plan-workspace-store";
import type { DraftKind } from "../drafting-history";

/* ── Chat message shape ───────────────────────────────────────────── */

/** Role on a chat turn. */
export type ChatRole = "user" | "assistant";

/** Slim content-block shape mirroring the subset of Anthropic's API
 *  we actually round-trip. Frontend persists these so it can re-send
 *  the conversation history on the next turn. */
export type ChatContentBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | {
      type: "tool_result";
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    };

export interface ChatMessage {
  role: ChatRole;
  content: string | ChatContentBlock[];
}

/* ── Browser-side context ─────────────────────────────────────────── */

/**
 * Snapshot of the browser's drafting state, sent with every chat
 * request. Lets the engine reason about mandates / workspaces / clauses
 * without needing to query localStorage (which only exists in the
 * browser anyway).
 *
 * Slim shapes so the payload stays under a few KB even with multiple
 * mandates and dozens of recent drafts.
 */
export interface BrowserContext {
  /** All mandates the user has saved. */
  mandates: Mandate[];
  /** Currently active mandate id. Drafts default to this. */
  activeMandateId: string | null;
  /** Active plan workspaces (slim — body text omitted). */
  activeWorkspaces: PlanWorkspaceSlim[];
  /** Last 10 dispatched draft library entries (slim). */
  recentDrafts: DraftLibrarySlim[];
  /** Clauses currently attached to the session. */
  attachedClauses: Clause[];
  /** Output draft language preference (UI-locale-independent). */
  outputLang: "de" | "en";
  /** Whether the privilege marker is currently on. */
  privileged: boolean;
}

/** Slim workspace projection — omits body text, keeps statuses for
 *  reasoning ("3 of 4 items accepted"). */
export interface PlanWorkspaceSlim {
  id: string;
  planId: string;
  mandateId: string | null;
  outputLang: "de" | "en";
  itemStatuses: Record<string, string>; /* itemId → status */
  updatedAt: number;
}

/** Slim library projection — title + kind + ts only. */
export interface DraftLibrarySlim {
  id: string;
  kind: DraftKind;
  title: string;
  outputLocale: string;
  ts: number;
  mandateId?: string;
  mandateName?: string;
}

/* ── Tool call records (transparency layer) ───────────────────────── */

/** Record of a single tool invocation, persisted by the engine and
 *  sent back to the frontend so Marie sees every step the assistant
 *  took. Renders as inline cards in the chat. */
export interface ToolCallRecord {
  /** Anthropic tool_use id — links request and result. */
  id: string;
  /** Tool name (e.g. "generate_draft"). */
  name: string;
  /** Tool input args, sanitized for display. */
  input: Record<string, unknown>;
  /** Whether the tool ran server-side (executed by engine) or returned
   *  to the client as an action to execute. */
  side: "server" | "client";
  /** Status — "complete" once the engine finishes the call. */
  status: "complete" | "error";
  /** Tool result for server tools. For client tools, this is the
   *  optimistic acknowledgment the engine returns to the LLM. */
  result?: string;
  /** Error message if status === "error". */
  error?: string;
  /** Wall-clock duration ms. */
  durationMs: number;
  /** For draft-generating tools: the actual prompt that was sent to
   *  the generation model. Surfaces in the "Show prompt" toggle for
   *  full transparency. */
  generatedPrompt?: string;
  /** For draft-generating tools: the body the generation model
   *  produced. Same value also flows into a client action so the
   *  workspace gets the body. */
  generatedBody?: string;
  /** Token usage for any LLM calls inside this tool. */
  inputTokens?: number;
  outputTokens?: number;
}

/* ── Client actions (mutations the browser must apply) ────────────── */

/** Discriminated union of state mutations the frontend should apply
 *  after the chat round-trip completes. The engine collects these from
 *  client-side tool_use blocks and returns them to the browser. */
export type ClientAction =
  | {
      type: "set_active_mandate";
      mandateId: string;
    }
  | {
      type: "create_mandate";
      name?: string;
      intake?: Partial<MandateIntake>;
      makeActive?: boolean;
    }
  | {
      type: "update_mandate";
      mandateId: string;
      name?: string;
      intake?: Partial<MandateIntake>;
    }
  | {
      type: "delete_mandate";
      mandateId: string;
    }
  | {
      type: "instantiate_plan";
      planId: string;
      mandateId: string | null;
      outputLang: "de" | "en";
    }
  | {
      type: "set_plan_item_body";
      workspaceId: string;
      itemId: string;
      body: string;
      /** Auto-mark generated when body is set, accepted when explicit. */
      status?: "generated" | "accepted";
    }
  | {
      type: "accept_plan_item";
      workspaceId: string;
      itemId: string;
    }
  | {
      type: "skip_plan_item";
      workspaceId: string;
      itemId: string;
    }
  | {
      type: "attach_clause_to_session";
      clauseId: string;
    }
  | {
      type: "detach_clause_from_session";
      clauseId: string;
    }
  | {
      /* Flat shape (matches the engine's `{type, ...toolInput}` spread).
         A-H10: body IS now persisted. The engine threads the most-recent
         generate_draft body from the same turn onto this action so Marie
         can view/restore the full generated text from My Drafts. */
      type: "push_to_library";
      kind: DraftKind;
      title: string;
      prompt: string;
      outputLocale: string;
      privileged: boolean;
      mandateId?: string;
      mandateName?: string;
      /** A-H10 — The generated body text. Threaded from the most-recent
       *  generate_draft call in the same turn. Optional: if the LLM calls
       *  push_to_library without a preceding generate_draft (unusual), the
       *  library entry will have no body (prompt-only, legacy behaviour). */
      body?: string;
    };

/* ── Final chat-turn response ─────────────────────────────────────── */

/** What the API returns for a chat POST. Frontend uses this to render
 *  the assistant's message + apply the actions + show the tool-call
 *  trace. */
export interface ChatTurnResponse {
  /** The final assistant message (after the tool-use loop finishes).
   *  Shape mirrors Anthropic's content-block array. */
  assistantMessage: ChatMessage;
  /** Every tool call that ran during this turn — newest last. */
  toolCalls: ToolCallRecord[];
  /** Mutations the browser must apply. Order matters. */
  actions: ClientAction[];
  /** Total token usage across all LLM calls in this turn (chat +
   *  any draft generations). */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  /** Estimated dollar cost (USD), for the transparency UI. */
  estimatedCost: number;
}
