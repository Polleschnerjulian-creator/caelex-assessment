"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Homepage.
 *
 * ChatGPT-style empty state: centred greeting + chat input + quickstart
 * cards. Submitting fires POST /api/atlas/chat (no chatId), reads the
 * SSE stream up to the first `chat_started` event to learn the new
 * chat-id, then redirects to /atlas/chat/[id] with the in-flight stream
 * handed off to the chat-view via sessionStorage.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatInput } from "./ChatInput";
import { QuickstartCards } from "./QuickstartCards";

export function AtlasHomepage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [seedValue, setSeedValue] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Sprint 6: pre-fill from URL ?prompt= when arriving from
     /atlas/workflows. Does NOT auto-submit — gives the user a chance
     to fill in the bracketed placeholders ([Land] / [fileId] / etc).
     One-shot via deps to prevent re-seed on re-renders. */
  useEffect(() => {
    const fromUrl = searchParams.get("prompt");
    if (fromUrl) setSeedValue(fromUrl);
  }, [searchParams]);

  const handleSubmit = async (
    text: string,
    toolToggles: Record<string, boolean>,
    titleHint?: string,
  ) => {
    setSubmitting(true);
    setError(null);
    try {
      /* Stash the pending submission so the chat-view can replay it
         seamlessly after navigation. We POST first to learn the chat-id,
         then navigate; the chat-view picks up where we left off. */
      const res = await fetch("/api/atlas/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          toolToggles,
          titleHint,
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      /* Read the SSE stream just enough to learn the chat-id, then
         navigate. The chat-view will re-issue or continue from the
         persisted user-message + first assistant turn. */
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let chatId: string | null = null;
      const accumulatedEvents: string[] = [];
      while (chatId === null) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        for (const line of buffer.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          accumulatedEvents.push(json);
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
        /* Stash remainder of the stream by reading the rest in
           background and persisting events. The chat-view simply
           reloads the persisted messages once they hit the DB. */
        void (async () => {
          while (true) {
            const { done } = await reader.read();
            if (done) break;
          }
          /* Notify sidebar to refresh once the stream finishes. */
          window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
        })();
        router.push(`/atlas/chat/${chatId}`);
      } else {
        throw new Error("Stream completed without chat_started event");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="mb-8 text-center text-2xl font-semibold tracking-tight text-slate-100">
          Wie kann ich helfen?
        </h1>

        <ChatInput
          initialValue={seedValue}
          disabled={submitting}
          onSubmit={(text, toggles) => handleSubmit(text, toggles)}
        />

        {error && (
          <p className="mt-3 text-center text-xs text-red-400">{error}</p>
        )}

        {!submitting && (
          <div className="mt-10">
            <QuickstartCards
              onPick={(promptHint, titleHint) => {
                setSeedValue(promptHint);
                /* Auto-submit shortly after seeding so the user sees the
                   prompt land + immediately watches the run start. */
                setTimeout(() => {
                  void handleSubmit(
                    promptHint,
                    {
                      korpus: true,
                      compliance: true,
                      comparison: true,
                      drafting: true,
                      validity: true,
                      documents: false,
                      web: false,
                      workflow: true,
                      mandate: true,
                    },
                    titleHint,
                  );
                }, 100);
              }}
            />
          </div>
        )}

        {submitting && (
          <p className="mt-6 text-center text-xs text-slate-500">
            Atlas denkt nach…
          </p>
        )}
      </div>
    </div>
  );
}
