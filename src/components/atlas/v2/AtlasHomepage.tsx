"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Homepage (UI refresh 2026-05-12).
 *
 * ChatGPT-style empty state:
 *   - generous vertical centring
 *   - serif headline with gentle weight
 *   - refined input pill with icon-only chips
 *   - chip-row of 4 quickstarts (was 6-card grid)
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
        const body = await res.json().catch(() => ({}));
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

        {!submitting && (
          <div className="mt-12">
            <QuickstartCards
              onPick={(promptHint, titleHint) => {
                setSeedValue(promptHint);
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
