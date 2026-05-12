"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Homepage (UI refresh 2026-05-12).
 *
 * ChatGPT-style empty state:
 *   - generous vertical centring
 *   - serif headline with gentle weight
 *   - refined input pill — single Plus menu, no inline shortcuts
 *
 * Quickstart chips below the input were removed (2026-05-12) — the
 * workflows themselves live on at /atlas/workflows. The homepage is
 * intentionally bare to focus the user on a single thing: typing a
 * question. Same restraint as ChatGPT/Claude.ai's empty state.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatInput } from "./ChatInput";
import type { ChatImageAttachment } from "./types";
import { WavePattern } from "./WavePattern";

export function AtlasHomepage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [seedValue, setSeedValue] = useState<string | undefined>();
  const [seedWorkflowId, setSeedWorkflowId] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (
    text: string,
    toolToggles: Record<string, boolean>,
    images?: ChatImageAttachment[],
    titleHint?: string,
  ) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/atlas/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          toolToggles,
          titleHint,
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
        /* Friendly German for the most common production errors —
           same translation as AtlasChatView so users see consistent
           wording whether they hit the limit on first turn or
           follow-up. */
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

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let chatId: string | null = null;
      while (chatId === null) {
        const { done, value } = await reader.read();
        if (done) break;
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
    <div className="relative flex h-full flex-col items-center justify-center px-6">
      {/* Brand watermark — the wave-pattern at 6 % opacity, centred
          BEHIND the hero stack. Same visual family as the sidebar
          AtlasMark. Pointer-events: none + aria-hidden are baked
          into the WavePattern component itself.

          Width 480 px, natural 2.16:1 aspect → height ≈ 222 px.
          That's slightly taller than the hero stack (h1 + composer
          ≈ 140 px), so the watermark wraps around the hero as a
          subtle envelope — institutional document feel. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[480px] max-w-[85%] -translate-x-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-100"
      >
        <WavePattern width={480} opacity={0.06} />
      </div>

      {/* Hero content stack — sits ABOVE the watermark via z-10. */}
      <div className="relative z-10 w-full max-w-[720px]">
        <h1 className="mb-10 text-center text-[28px] font-normal tracking-tight text-slate-900 dark:text-slate-100 [font-family:ui-serif,Georgia,'Cambria_Style',serif]">
          Wie kann ich helfen?
        </h1>

        <ChatInput
          initialValue={seedValue}
          disabled={submitting}
          onSubmit={(text, toggles, images) =>
            handleSubmit(text, toggles, images)
          }
        />

        {error && (
          <p className="mt-3 text-center text-xs text-red-500 dark:text-red-400">
            {error}
          </p>
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
