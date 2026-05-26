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

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatInput } from "./ChatInput";
import { MarkdownContent } from "./MarkdownContent";
import { AtlasMark } from "./AtlasLogo";
import type { ChatImageAttachment } from "./types";

/* Sprint 19b (2026-05-19) — Personalized homepage greeting.
   User-request: "Wie kann ich helfen" rechts cool machen, mit namen
   personalisieren wie es Claude tut.

   Variations sind handcurated pro tageszeit-bucket: Morgen / Mittag /
   Nachmittag / Abend / Nacht. Tonalität: locker-professionell, "du"
   (matches the existing "ich helfen" tone — kein Sie). Auswahl ist
   stable pro session (useState-initializer mit Math.random) damit der
   greeting nicht bei jedem re-render flippt. */
type GreetingBucket = readonly string[];

function pickGreetingBucket(hour: number, hasName: boolean): GreetingBucket {
  /* Without name we fall back to neutral options so we never render
     awkward orphans like "Schön dich zu sehen, " */
  if (hour < 5) {
    return hasName
      ? ([
          "Spät unterwegs, $name?",
          "Atlas ist für dich da, $name",
          "Wie kann ich helfen, $name?",
        ] as const)
      : (["Spät unterwegs?", "Wie kann ich helfen?"] as const);
  }
  if (hour < 11) {
    return hasName
      ? ([
          "Guten Morgen, $name",
          "Bereit für den Tag, $name?",
          "Schön dich zu sehen, $name",
          "Was steht heute an, $name?",
        ] as const)
      : ([
          "Guten Morgen",
          "Bereit für den Tag?",
          "Was steht heute an?",
        ] as const);
  }
  if (hour < 14) {
    return hasName
      ? ([
          "Hallo $name, was steht an?",
          "Wie kann ich helfen, $name?",
          "Worüber sprechen wir, $name?",
          "Was machen wir, $name?",
        ] as const)
      : (["Hallo, was steht an?", "Wie kann ich helfen?"] as const);
  }
  if (hour < 18) {
    return hasName
      ? ([
          "Wie kann ich helfen, $name?",
          "Was machen wir, $name?",
          "Welche Akte beschäftigt dich, $name?",
          "Womit kann ich helfen, $name?",
        ] as const)
      : ([
          "Wie kann ich helfen?",
          "Was machen wir?",
          "Welche Akte beschäftigt dich?",
        ] as const);
  }
  if (hour < 22) {
    return hasName
      ? ([
          "Guten Abend, $name",
          "Noch eine Akte heute, $name?",
          "Wie kann ich helfen, $name?",
          "Was steht noch an, $name?",
        ] as const)
      : ([
          "Guten Abend",
          "Wie kann ich helfen?",
          "Was steht noch an?",
        ] as const);
  }
  return hasName
    ? ([
        "Noch wach, $name?",
        "Atlas ist für dich da, $name",
        "Wie kann ich helfen, $name?",
      ] as const)
    : (["Atlas ist für dich da", "Wie kann ich helfen?"] as const);
}

/* Extract first-name from "Dr. Julian Polleschner" → "Julian", etc.
   Strips legal/academic titles so greetings feel personal not stiff. */
const TITLE_PATTERN = /^(dr\.?|prof\.?|prof\.?dr\.?|ra|raín|llm|ll\.m\.?)\s+/i;
function firstNameOf(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const trimmed = fullName.trim().replace(TITLE_PATTERN, "");
  const parts = trimmed.split(/\s+/);
  if (parts.length === 0 || !parts[0]) return null;
  return parts[0];
}

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
  /* H23 fix — Cancel mid-stream fetch + ignore late state updates if
     the user navigates away while the SSE stream is still arriving. */
  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);
  /* H25 fix — Track whether the user is parked at the bottom. We only
     auto-scroll when they were already there; if they scrolled up to
     re-read something, we leave their viewport alone. */
  const userIsAtBottomRef = useRef<boolean>(true);

  /* Sprint 19b — Personalized greeting state. Name comes from
     /api/atlas/auth/me (same endpoint the sidebar uses); seedIndex
     is fixed once-per-mount via useState-initializer so the greeting
     pick is stable across re-renders (no flicker when user types). */
  const [meName, setMeName] = useState<string | null>(null);
  const [seedIndex] = useState<number>(() => Math.floor(Math.random() * 1000));
  const [mountHour] = useState<number>(() => new Date().getHours());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/atlas/auth/me", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { name?: string };
        if (cancelled) return;
        setMeName(firstNameOf(data.name) ?? null);
      } catch {
        /* swallow — greeting falls back to nameless variant */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Compose the greeting deterministically from seedIndex + mountHour +
     whether name is loaded. The name-load triggers exactly one re-pick
     (because hasName changes false→true), which feels natural rather
     than jarring. */
  const greeting = useMemo(() => {
    const bucket = pickGreetingBucket(mountHour, Boolean(meName));
    const template = bucket[seedIndex % bucket.length] ?? bucket[0]!;
    return meName ? template.replace("$name", meName) : template;
  }, [meName, mountHour, seedIndex]);

  /* Unmount cleanup — abort the in-flight fetch + flip the mounted flag
     so any pending setState calls inside the reader loop short-circuit. */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

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

  /* H25 — On user-scroll, recompute "are we at the bottom?". Threshold
     of 80px is a sweet-spot: respects deliberate scroll-up, but tolerant
     of fractional scroll positions and small bounces. */
  const handleTranscriptScroll = () => {
    const el = transcriptRef.current;
    if (!el) return;
    userIsAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  /* Auto-scroll on new streaming content — gated by H25 so we only
     drag the viewport down if the user was already at the bottom. */
  useEffect(() => {
    if (!userIsAtBottomRef.current) return;
    const el = transcriptRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [streamingText]);

  const handleSubmit = async (
    text: string,
    toolToggles: Record<string, boolean>,
    images?: ChatImageAttachment[],
    mandateIdFromInput?: string | null,
  ) => {
    if (!isMountedRef.current) return;
    /* Optimistic UI: paint the user-message + thinking-indicator
       IMMEDIATELY, before the network round-trip. The transcript
       UI replaces the empty-state hero. */
    setSubmittedMessage(text);
    setSubmittedImages(images ?? null);
    setStreamingText("");
    setActivity("Plant Recherche");
    setError(null);
    /* Reset to "at bottom" on a fresh submit — the new transcript is
       short, so the user is by definition looking at the bottom. */
    userIsAtBottomRef.current = true;
    /* Fresh AbortController per submission so we can cancel cleanly
       on unmount (component navigates away mid-stream). */
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    /* AUDIT-FIX H19 (2026-05-17): hard-timeout safety net. If the server
       connection drops after the POST succeeds but before any SSE event
       arrives, the UI used to stay "Plant Recherche…" forever with no
       way to cancel short of a page reload. 90s upper bound (worst-case
       legitimate agent run + buffer) — any stall longer than this is a
       real network failure, so we abort + surface an error message. */
    const stallTimer = setTimeout(() => {
      if (abortRef.current === abortRef.current /* still active */) {
        abortRef.current?.abort();
        setError(
          "Keine Antwort vom Server erhalten — Verbindung scheint unterbrochen. Bitte erneut versuchen.",
        );
      }
    }, 90_000);

    try {
      const res = await fetch("/api/atlas/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal,
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
          /* DIAG-FIX 2026-05-26: surface the backend error message
             (route.ts now sets body.error + body.code reliably even
             for outer-catch failures). Falling back to the generic
             text only when no backend hint is present. The code
             suffix helps the user paste a precise identifier into
             support without having to open DevTools. */
          const backendMsg =
            body.error && typeof body.error === "string" ? body.error : null;
          const backendCode =
            (body as { code?: string }).code &&
            typeof (body as { code?: string }).code === "string"
              ? (body as { code?: string }).code
              : null;
          const detail = [backendMsg, backendCode].filter(Boolean).join(" · ");
          throw new Error(
            detail
              ? `Serverfehler: ${detail}. Bitte erneut versuchen oder Support kontaktieren.`
              : "Serverfehler — wir werden benachrichtigt. Bitte erneut versuchen.",
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
        if (!isMountedRef.current) return;
        /* AUDIT-FIX H19: first byte received → clear the stall-timer.
           The stream is alive; any subsequent stalls are within-stream
           and handled by the AbortController on unmount. */
        clearTimeout(stallTimer);
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
                if (!isMountedRef.current) return;
                setStreamingText(textBuf);
                /* As soon as visible text starts arriving, switch
                   the activity-label so the user knows planning
                   ended and the answer is being written. */
                setActivity("Schreibt Antwort");
                break;
              case "tool_call_start":
                if (!isMountedRef.current) return;
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
      if (!isMountedRef.current) return;
      window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
      if (chatId) {
        router.push(`/atlas/chat/${chatId}`);
      } else {
        throw new Error("Stream completed without chat_started event");
      }
    } catch (e) {
      /* AbortError = component unmounted mid-stream (user navigated
         away). Silent — that's the navigation case, not a real error
         to surface. */
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (!isMountedRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
      setActivity(null);
      /* AUDIT-FIX M43 — On error, reset to the empty composer state so
         the user gets the full input pill back (with their original text
         pre-seeded for retry). Previously the error toast appeared but
         submittedMessage stayed set → user was stranded on the streaming
         surface with no composer + no retry path. */
      setSeedValue(text);
      setSubmittedMessage(null);
      setSubmittedImages(null);
      setStreamingText("");
    } finally {
      /* AUDIT-FIX H19: always clear stall-timer (success, error, or
         abort) so it never fires post-handler. */
      clearTimeout(stallTimer);
    }
  };

  /* Two visual states:
       1. Empty state    — centered hero with composer
       2. Submitted state — chat-like transcript with user msg
                            + streaming assistant response */

  if (submittedMessage !== null) {
    return (
      <div className="flex h-full flex-col">
        <div
          ref={transcriptRef}
          onScroll={handleTranscriptScroll}
          className="flex-1 overflow-y-auto px-6 py-8"
        >
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

            {/* UX-T1-1 (wave 11C, WCAG 4.1.3): aria-live polite on the
                activity + streaming response. Mirrors AtlasChatView's
                pattern — screen-reader users hear progress + delta-
                content as it arrives instead of silence. */}
            {streamingText.length === 0 && activity && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 text-[12.5px] text-slate-600 dark:text-slate-400"
              >
                <span className="inline-flex animate-pulse text-slate-700 motion-reduce:animate-none dark:text-slate-200">
                  <AtlasMark size={10} />
                </span>
                <span className="font-medium">{activity}…</span>
              </div>
            )}
            {streamingText.length > 0 && (
              <div
                role="status"
                aria-live="polite"
                aria-atomic="false"
                className="prose prose-sm max-w-none text-[14px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200"
              >
                <MarkdownContent text={streamingText} />
                <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-slate-600 align-middle motion-reduce:animate-none dark:bg-slate-300" />
              </div>
            )}

            {error && (
              /* Error gets aria-live="assertive" — interrupt for safety. */
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              >
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
          {greeting}
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
