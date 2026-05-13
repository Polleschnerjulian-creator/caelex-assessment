"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Homepage (UX revamp 2026-05-13).
 *
 * Empty-state design philosophy:
 *   - No watermark (the wave-pattern was visual noise behind the
 *     composer; removed)
 *   - Generous vertical centring with serif headline
 *   - Refined input pill — single Plus menu, no inline shortcuts
 *
 * NEW SUBMIT-FLOW (Claude.ai / ChatGPT-style instant transition):
 *   The previous flow waited for the chat_started SSE event before
 *   navigating to /atlas/chat/[id], with a static "Atlas denkt nach…"
 *   line at the bottom. Result: 2-5 second perceived blank wait
 *   followed by a sudden page jump to the fully-loaded chat view.
 *
 *   New flow: as soon as the user submits, the homepage transitions
 *   in-place to a chat-like surface — user message bubble appears
 *   immediately, assistant text streams live below. When the run
 *   completes, we router.push to /atlas/chat/[id] which loads the
 *   persisted conversation. Zero perceived wait.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatInput } from "./ChatInput";
import { MarkdownContent } from "./MarkdownContent";
import { AtlasMark } from "./AtlasLogo";
import type { ChatImageAttachment } from "./types";

export function AtlasHomepage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [seedValue, setSeedValue] = useState<string | undefined>();
  const [seedWorkflowId, setSeedWorkflowId] = useState<string | undefined>();

  /* Brand-new-chat: Mandate-Attach läuft rein lokal, weil noch kein
     chat existiert. Der mandateId wird im initialen POST mitgegeben. */
  const [pendingMandate, setPendingMandate] = useState<{
    id: string;
    name: string;
  } | null>(null);

  /* Submit-flow state — drives the in-place transition from empty
     state to chat-like streaming surface. */
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [submittedImages, setSubmittedImages] = useState<
    ChatImageAttachment[] | null
  >(null);
  const [streamingText, setStreamingText] = useState("");
  const [activity, setActivity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromUrl = searchParams.get("prompt");
    if (fromUrl) setSeedValue(fromUrl);
    /* WorkflowCatalog navigates here with ?workflowId=… so we can
       attribute the resulting chat to its source workflow. The id
       gets forwarded to /api/atlas/chat → stored on AtlasChat for
       admin dashboards. */
    const wfId = searchParams.get("workflowId");
    if (wfId) setSeedWorkflowId(wfId);
  }, [searchParams]);

  /* Auto-scroll on new streaming content. */
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [streamingText]);

  const handleSubmit = async (
    text: string,
    toolToggles: Record<string, boolean>,
    images?: ChatImageAttachment[],
    mandateIdFromInput?: string | null,
  ) => {
    /* Optimistic UI: paint the user-message + thinking-indicator
       IMMEDIATELY, before the network round-trip. The transcript
       UI replaces the empty-state hero. */
    setSubmittedMessage(text);
    setSubmittedImages(images ?? null);
    setStreamingText("");
    setActivity("Plant Recherche");
    setError(null);

    try {
      const res = await fetch("/api/atlas/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          toolToggles,
          /* Mandate-Attach: ChatInput hat höhere Priorität (User hat
             gerade ausgewählt). Falls leer: pending state auf der
             Homepage (Modal-Auswahl ohne Submit). Falls beides leer:
             chat ist global. */
          mandateId: mandateIdFromInput ?? pendingMandate?.id ?? undefined,
          workflowId: seedWorkflowId,
          /* Photo-attachments piggyback on the same POST. Server
             validates + widens into Anthropic ImageBlockParam shape. */
          images: images && images.length > 0 ? images : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          retryAfterMs?: number;
        };
        if (res.status === 429) {
          const seconds = body.retryAfterMs
            ? Math.max(1, Math.ceil(body.retryAfterMs / 1000))
            : 60;
          throw new Error(
            `Zu viele Anfragen. Bitte warte etwa ${seconds}s und versuche es erneut.`,
          );
        }
        if (res.status === 401) {
          throw new Error(
            "Sitzung abgelaufen. Bitte Seite neu laden + erneut anmelden.",
          );
        }
        if (res.status === 503) {
          throw new Error(
            "Atlas ist gerade überlastet. Bitte in einer Minute erneut versuchen.",
          );
        }
        if (res.status >= 500) {
          throw new Error(
            "Serverfehler — wir werden benachrichtigt. Bitte erneut versuchen.",
          );
        }
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      /* Stream the response in-place. Capture chatId from the
         chat_started event but DON'T navigate immediately —
         we want the user to see the live streaming on the same
         surface (no page-jump). Navigation only happens once the
         run is fully done so the destination chat-view loads
         the complete conversation from DB without polling. */
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let chatId: string | null = null;
      let textBuf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const evt = JSON.parse(json);
            switch (evt.type) {
              case "chat_started":
                chatId = evt.chatId as string;
                break;
              case "text":
                textBuf += evt.delta as string;
                setStreamingText(textBuf);
                /* As soon as visible text starts arriving, switch
                   the activity-label so the user knows planning
                   ended and the answer is being written. */
                setActivity("Schreibt Antwort");
                break;
              case "tool_call_start":
                setActivity("Sucht in Atlas-Korpus");
                break;
              case "error":
                throw new Error(
                  (evt.message as string) ?? "Unbekannter Fehler",
                );
            }
          } catch (e) {
            /* JSON parse fails on incomplete chunks — re-throw
               only for actual errors we threw above. */
            if (e instanceof Error && e.message !== "JSON parse error") {
              throw e;
            }
          }
        }
      }

      /* Run complete — sidebar should know about the new chat;
         navigate to the canonical URL. The destination loads from
         DB which now has both messages, so no polling. */
      window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
      if (chatId) {
        router.push(`/atlas/chat/${chatId}`);
      } else {
        throw new Error("Stream completed without chat_started event");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setActivity(null);
    }
  };

  /* Two visual states:
       1. Empty state    — centered hero with composer
       2. Submitted state — chat-like transcript with user msg
                            + streaming assistant response */

  if (submittedMessage !== null) {
    return (
      <div className="flex h-full flex-col">
        <div ref={transcriptRef} className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* User message bubble */}
            <div className="flex flex-col items-end gap-1.5">
              {submittedImages && submittedImages.length > 0 && (
                <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
                  {submittedImages.map((img, i) => {
                    const src = `data:${img.mediaType};base64,${img.data}`;
                    return (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={i}
                        src={src}
                        alt={img.fileName}
                        className="max-h-48 max-w-[240px] rounded-2xl border border-slate-200 object-contain dark:border-white/[0.08]"
                      />
                    );
                  })}
                </div>
              )}
              <div className="max-w-[85%] rounded-3xl bg-slate-100 px-4 py-2.5 text-[14.5px] text-slate-900 dark:bg-white/[0.06] dark:text-slate-100">
                {submittedMessage}
              </div>
            </div>

            {/* Activity / streaming response */}
            {streamingText.length === 0 && activity && (
              <div className="flex items-center gap-2 text-[12.5px] text-slate-600 dark:text-slate-400">
                <span className="inline-flex animate-pulse text-slate-700 dark:text-slate-200">
                  <AtlasMark size={10} />
                </span>
                <span className="font-medium">{activity}…</span>
              </div>
            )}
            {streamingText.length > 0 && (
              <div className="prose prose-sm max-w-none text-[14px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
                <MarkdownContent text={streamingText} />
                <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-slate-600 align-middle dark:bg-slate-300" />
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-[720px]">
        <h1 className="mb-10 text-center text-[28px] font-normal tracking-tight text-slate-900 dark:text-slate-100 [font-family:ui-serif,Georgia,'Cambria_Style',serif]">
          Wie kann ich helfen?
        </h1>

        <ChatInput
          initialValue={seedValue}
          attachedMandate={pendingMandate}
          onAttachMandate={(m) => setPendingMandate(m)}
          onSubmit={(text, toggles, images, mandateId) =>
            handleSubmit(text, toggles, images, mandateId)
          }
        />

        {error && (
          <p className="mt-3 text-center text-xs text-red-500 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
