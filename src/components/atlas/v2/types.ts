/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — shared client types.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface ChatListItem {
  id: string;
  title: string;
  mandateId: string | null;
  updatedAt: string;
  createdAt: string;
  mandate: { id: string; name: string } | null;
}

export interface MandateListItem {
  id: string;
  name: string;
  clientName: string | null;
  jurisdiction: string | null;
  operatorType: string | null;
  primaryAuthority: string | null;
  status: string;
  updatedAt: string;
  createdAt: string;
  _count: { chats: number; files: number };
}

export interface ChatMessageBlock {
  type:
    | "text"
    | "tool_use"
    | "tool_result"
    | "thinking"
    | "redacted_thinking"
    | "image";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
  /** Anthropic Extended Thinking: the model's internal reasoning text.
   *  Only present when `type === "thinking"`. Persisted into
   *  AtlasMessage.content so the audit trail captures the full chain
   *  of thought for legal-compliance review. */
  thinking?: string;
  /** Anthropic Extended Thinking signature, required when the message
   *  is sent back to the model in subsequent tool-use turns. Opaque
   *  token — UI ignores it. */
  signature?: string;
  /** Anthropic Vision: image attachment on a user-message. The shape
   *  matches Anthropic's ImageBlockParam exactly so we can persist the
   *  block as-is and replay it on follow-up turns. Stored base64 to
   *  keep AtlasMessage self-contained (no R2 round-trip needed for
   *  rehydration). Capped at 5 MB per image / 4 images per turn at
   *  the input layer. */
  source?: {
    type: "base64";
    media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    data: string;
  };
}

/** Client-side image attachment, captured by ChatInput, posted to
 *  /api/atlas/chat as part of the request body. Server widens this
 *  into a proper ImageBlockParam before forwarding to Anthropic. */
export interface ChatImageAttachment {
  /** Original file name — kept for thumbnail captions + audit trail. */
  fileName: string;
  /** MIME type. Validated against Anthropic's accepted set. */
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  /** Base64-encoded image bytes (no data: prefix). */
  data: string;
}

export interface ChatMessageRecord {
  id: string;
  role: "user" | "assistant";
  content: ChatMessageBlock[] | string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  toolsUsed: string[];
  citations: unknown;
  createdAt: string;
}

export interface ChatRecord {
  id: string;
  title: string;
  mandateId: string | null;
  toolToggles: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  mandate: { id: string; name: string; jurisdiction: string | null } | null;
  messages: ChatMessageRecord[];
}

export type StreamEvent =
  | { type: "chat_started"; chatId: string }
  | { type: "text"; delta: string }
  | { type: "thinking_delta"; delta: string }
  | {
      type: "tool_call_start";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | {
      type: "tool_call_complete";
      id: string;
      name: string;
      durationMs: number;
      summary: string;
      isError: boolean;
    }
  | {
      type: "done";
      messageId: string;
      usage: { inputTokens: number; outputTokens: number; costUsd: number };
      toolsUsed: string[];
    }
  | { type: "error"; message: string };

/* The 6 quickstart workflow seeds shown on the homepage.
   Tied to actual Atlas tools — the user click pre-fills the chat
   input + sets relevant tool-toggles + enters a new chat. */
export interface Quickstart {
  id: string;
  emoji: string;
  title: string;
  promptHint: string; // pre-fills the input text-area
  toolToggles?: Record<string, boolean>; // override defaults if needed
}

export const QUICKSTARTS: Quickstart[] = [
  {
    id: "eu-space-act-applicability",
    emoji: "⚖️",
    title: "EU Space Act Applicability",
    promptHint:
      "Prüfe die Anwendbarkeit des EU Space Act für meinen Mandanten. Beziehe die einschlägigen Artikel ein und nenne Behörden + Fristen.",
  },
  {
    id: "multi-jurisdiction-comparison",
    emoji: "🌍",
    title: "Multi-Jurisdiktion-Vergleich",
    promptHint:
      "Vergleiche DE, FR, IT, UK und LU für Satelliten-Authorisierung (Behörde, Liability-Cap, Insurance-Min, Spektrum-Coordinator, Export-Lizenz).",
  },
  {
    id: "itar-ear-classification",
    emoji: "📋",
    title: "ITAR/EAR Klassifizierung",
    promptHint:
      "Klassifiziere folgende Komponente nach ITAR/EAR und nenne die maßgeblichen Listings sowie Genehmigungswege:",
  },
  {
    id: "nis2-auto-classification",
    emoji: "🛡️",
    title: "NIS2 Auto-Classification",
    promptHint:
      "Klassifiziere meinen Operator nach NIS2 (Essential / Important / Out-of-Scope) und nenne die Pflichten + Fristen.",
  },
  {
    id: "bnetza-filing-pack",
    emoji: "📑",
    title: "BNetzA Filing-Pack",
    promptHint:
      "Erstelle ein Filing-Pack für die BNetzA-Frequenzanmeldung für folgende Mission:",
  },
  {
    id: "ecss-conformity-matrix",
    emoji: "🔍",
    title: "ECSS Conformity Matrix",
    promptHint:
      "Erstelle eine ECSS-Konformitätsmatrix (Requirements × Status × Evidence × Owner) für folgendes Projekt:",
  },
];
