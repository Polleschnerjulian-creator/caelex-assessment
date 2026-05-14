"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Inline new-chat composer for the mandate-detail view.
 *
 * Mirrors AtlasHomepage's POST→SSE→navigate flow but always passes the
 * mandateId so the chat is mandate-scoped (the chat-engine then injects
 * the mandate's customInstructions + meta into the system prompt).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInput } from "./ChatInput";
import type { ChatImageAttachment } from "./types";

interface Props {
  mandateId: string;
  mandateName: string;
  disabled?: boolean;
}

export function MandateNewChatComposer({
  mandateId,
  mandateName,
  disabled,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* H23 fix — Cancel in-flight fetch + ignore late state updates if the
     user navigates away mid-stream. Without these refs we keep the
     server-side Anthropic call running (and billable) until completion
     even though the UI is gone. */
  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  /* Unmount cleanup — abort the fetch + flip the mounted-flag so any
     pending setState calls inside the reader-loop short-circuit. */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const handleSubmit = async (
    text: string,
    toolToggles: Record<string, boolean>,
    images?: ChatImageAttachment[],
  ) => {
    if (!isMountedRef.current) return;
    setSubmitting(true);
    setError(null);
    /* Fresh AbortController per submission — abort cancels the fetch
       + the reader.read() promise rejects with AbortError, which we
       silently swallow in the catch below (it's the navigation case,
       not a real error). */
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const res = await fetch("/api/atlas/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal,
        body: JSON.stringify({
          message: text,
          mandateId,
          toolToggles,
          /* Title-hint pulls the mandate name in so the new chat is
             instantly recognisable in the sidebar. */
          titleHint: `${mandateName} — ${text.slice(0, 50)}`,
          /* Photo-attachments piggyback on the same POST. */
          images: images && images.length > 0 ? images : undefined,
        }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      /* Read SSE just enough to learn the chatId, then navigate. The
         chat-view will pick up persisted state once the assistant turn
         lands. We continue draining the stream in the background so the
         response actually completes server-side. */
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let chatId: string | null = null;
      while (chatId === null) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!isMountedRef.current) return;
        buffer += decoder.decode(value, { stream: true });
        for (const line of buffer.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const evt = JSON.parse(json);
            if (evt.type === "chat_started") {
              chatId = evt.chatId as string;
              break;
            }
          } catch {
            /* incomplete chunk */
          }
        }
        buffer = buffer.split("\n").slice(-1)[0] ?? "";
      }

      if (chatId) {
        void (async () => {
          while (true) {
            const { done } = await reader.read();
            if (done) break;
          }
          if (!isMountedRef.current) return;
          window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
        })();
        router.push(`/atlas/chat/${chatId}`);
      } else {
        throw new Error("Stream completed without chat_started event");
      }
    } catch (e) {
      /* AbortError = component unmounted mid-stream (user navigated
         away). Silent — that's not a user-facing error. */
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (!isMountedRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p className="mb-2 text-[11px] text-slate-500">
        Neuer Chat in diesem Mandat — Astra erhält Custom-Instructions +
        Mandanten-Kontext automatisch.
      </p>
      <ChatInput
        disabled={disabled || submitting}
        placeholder={
          disabled
            ? "Mandat ist archiviert / geschlossen — Reaktivieren um neue Chats zu starten."
            : "Frage etwas zu diesem Mandat…"
        }
        /* Bewusst KEIN attachedMandate-Chip auf der Mandate-Workspace-
           Page (Issue #1 aus Final-Review): Page-Header zeigt den
           Mandat-Namen schon prominent. Ein zusätzlicher Chip mit
           non-funktionalem [×] (Mandate ist Page-Scope) wäre eine
           dead-end-Affordance. mandateId wird über handleSubmit
           weitergereicht — der Backend-POST kennt das Mandat sowieso
           via geschlossenem closure aus den Composer-Props. */
        onSubmit={handleSubmit}
      />
      {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
      {submitting && (
        <p className="mt-2 text-[11px] text-slate-500">Atlas denkt nach…</p>
      )}
    </div>
  );
}
