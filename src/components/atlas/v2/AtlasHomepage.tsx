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

export function AtlasHomepage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [seedValue, setSeedValue] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-[720px]">
        <h1 className="mb-10 text-center text-[28px] font-normal tracking-tight text-slate-900 dark:text-slate-100 [font-family:ui-serif,Georgia,'Cambria_Style',serif]">
          Wie kann ich helfen?
        </h1>

        <ChatInput
          initialValue={seedValue}
          disabled={submitting}
          onSubmit={(text, toggles) => handleSubmit(text, toggles)}
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
