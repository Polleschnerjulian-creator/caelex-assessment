"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Chat view (single chat surface).
 *
 * Renders persisted messages (loaded from /api/atlas/chat/[id]) plus
 * an inline composer at the bottom. Sending a follow-up POSTs to
 * /api/atlas/chat with the current chatId; the SSE stream is rendered
 * in real time as the assistant turn arrives.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  AlertCircle,
  ChevronRight,
  Check as CheckIcon,
  Loader2,
  X as XIcon,
  PenLine,
  Brain,
  Download,
  Copy,
  Bookmark,
} from "lucide-react";
import { ChatInput } from "./ChatInput";
import { CitationsPanel, type CitationRecord } from "./CitationsPanel";
import { MarkdownContent } from "./MarkdownContent";
import { AtlasMark } from "./AtlasLogo";
import { labelFor, CATEGORY_DOT } from "@/lib/atlas/tool-labels";
import {
  downloadChatAsPdf,
  generateChatPdfBlob,
} from "@/lib/atlas/chat-briefing-pdf";
import {
  downloadChatAsDocx,
  generateChatDocxBlob,
} from "@/lib/atlas/chat-briefing-docx";
import type {
  ChatImageAttachment,
  ChatMessageBlock,
  ChatMessageRecord,
  ChatRecord,
} from "./types";

interface Props {
  chatId: string;
}

interface InFlightToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  summary?: string;
  isError?: boolean;
}

export function AtlasChatView({ chatId }: Props) {
  const [chat, setChat] = useState<ChatRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingThinking, setStreamingThinking] = useState("");
  const [inFlightTools, setInFlightTools] = useState<InFlightToolCall[]>([]);
  const [error, setError] = useState<string | null>(null);
  /* Seed value for the composer textarea — used when a programmatic
     event (e.g. quickstart link) wants to pre-fill the input. */
  const [composerSeed, setComposerSeed] = useState<string | undefined>();
  /* Mandate-attach state — synchronisiert mit chat.mandateId aus DB.
     Beim Mount initialisiert aus dem geladenen Chat; Updates schreiben
     sofort via API. */
  const [attachedMandate, setAttachedMandate] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  /* H23 fix — Cancel in-flight follow-up fetch on unmount; flip the
     mounted-flag so any pending setState from the SSE reader-loop
     short-circuits. Without this we keep a server-side Anthropic call
     billing while the user has navigated to a different chat. */
  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);
  /* H24 fix — Track current messages.length without re-arming the
     polling-effect on every message change. Polling-effect deps shrink
     to [chatId, reload] so we get exactly ONE active interval per chat. */
  const messagesLengthRef = useRef<number>(0);
  /* H25 fix — Auto-scroll only fires when the user was already parked
     at the bottom. If they scrolled up to re-read something, leave
     their viewport alone instead of dragging them back down. */
  const userIsAtBottomRef = useRef<boolean>(true);

  /* Keep messagesLengthRef synced with the latest chat — this is a
     read-channel for the polling-effect that doesn't trigger re-arm. */
  useEffect(() => {
    messagesLengthRef.current = chat?.messages.length ?? 0;
  }, [chat?.messages.length]);

  /* Unmount cleanup — abort the fetch + flip mounted flag so any
     pending setState calls inside the reader-loop short-circuit. */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  /* H25 — On user-scroll, recompute "is the user parked at the
     bottom?". 80px threshold tolerates fractional positions + small
     bounces while still respecting deliberate scroll-up. */
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    userIsAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  /* Load persisted chat. The `silent` flag suppresses the loading
     skeleton — used after stream-completion when we already have
     visible content + just want to swap in the canonical persisted
     state (with extracted citations, exact tokens, etc.) WITHOUT
     causing a UI flash.
     H24 — Memoised on [chatId] only. Previously this was a fresh
     function on every render, which made the polling-effect re-arm
     constantly + spawn parallel intervals. */
  const reload = useCallback(
    async (silent = false) => {
      if (!isMountedRef.current) return;
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`/api/atlas/chat/${chatId}`, {
          cache: "no-store",
        });
        if (!isMountedRef.current) return;
        if (!res.ok) {
          if (res.status === 404) {
            setError("Chat nicht gefunden");
          } else {
            setError(`HTTP ${res.status}`);
          }
          return;
        }
        const data = (await res.json()) as { chat: ChatRecord };
        if (!isMountedRef.current) return;
        setChat(data.chat);
      } finally {
        if (!silent && isMountedRef.current) setLoading(false);
      }
    },
    [chatId],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  /* Auto-scroll to bottom on new content — H25 gates this so the
     viewport only follows the stream when the user was already
     looking at the bottom. */
  useEffect(() => {
    if (!userIsAtBottomRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chat?.messages.length, streamingText, inFlightTools.length]);

  /* AUDIT-FIX M42 — Removed eslint-disable. The polling-effect now
     depends on a single derived signal (`needsPoll`) computed from the
     current message-shape via useMemo. When the predicate is true the
     interval arms once; when polling lands a new assistant message
     (length grows past baseline), `needsPoll` flips back to false and
     the cleanup runs.
     H24 contract preserved — exactly ONE interval per chat-poll cycle,
     no per-render re-arm.
     The previous deps `[chatId, chat?.messages.length]` re-armed on
     every length-bump (incl. mid-stream optimistic adds), which defeats
     H24. The new deps `[chatId, needsPoll]` only flip on true→false
     edges, which is what we want. */
  const lastUserIdx = chat
    ? [...chat.messages].reverse().findIndex((m) => m.role === "user")
    : -1;
  const lastAssistantIdx = chat
    ? [...chat.messages].reverse().findIndex((m) => m.role === "assistant")
    : -1;
  const messagesLen = chat?.messages.length ?? 0;
  const userIsLast = lastUserIdx === 0;
  const noAssistantYet = lastAssistantIdx === -1;
  const userOnly = messagesLen === 1 && userIsLast;
  const assistantBehind =
    !noAssistantYet && lastAssistantIdx > lastUserIdx && lastUserIdx >= 0;
  const needsPoll =
    !!chat && ((userIsLast && (noAssistantYet || assistantBehind)) || userOnly);

  useEffect(() => {
    if (!needsPoll) return;
    const baseline = messagesLengthRef.current;
    const interval = setInterval(async () => {
      if (!isMountedRef.current) {
        clearInterval(interval);
        return;
      }
      try {
        const res = await fetch(`/api/atlas/chat/${chatId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { chat: ChatRecord };
        if (!isMountedRef.current) {
          clearInterval(interval);
          return;
        }
        /* Compare against the baseline (length when this interval
           was scheduled) — that's the trigger to know the assistant
           reply has landed. */
        if (
          data.chat.messages.length > baseline ||
          data.chat.messages.length > messagesLengthRef.current
        ) {
          setChat(data.chat);
          clearInterval(interval);
          window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
        }
      } catch {
        /* swallow */
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [chatId, needsPoll]);

  /* Sync local mandate-state when chat finishes loading (or refreshes
     after attach/detach). chat is fetched async, so initial useState
     value would always be null — we hydrate here. */
  useEffect(() => {
    if (chat?.mandateId && chat?.mandate) {
      setAttachedMandate({ id: chat.mandateId, name: chat.mandate.name });
    } else {
      setAttachedMandate(null);
    }
  }, [chat?.mandateId, chat?.mandate]);

  /* Persist a mandate-attach change to the DB via the dedicated
     attach-mandate endpoint. Optimistic UI: the chip updates locally
     first, then the API call rolls in the background. On failure we
     roll back so the UI never diverges from server state. */
  const handleAttachMandate = async (
    m: { id: string; name: string } | null,
  ) => {
    const previous = attachedMandate;
    setAttachedMandate(m);
    try {
      const res = await fetch(`/api/atlas/chat/${chatId}/attach-mandate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mandateId: m?.id ?? null }),
      });
      if (!res.ok) {
        /* Rollback on failure so the chip reflects server-truth. */
        setAttachedMandate(previous);
        throw new Error(`Attach failed (${res.status})`);
      }
      /* Sidebar re-resolve so MandateContextSection (re-)appears with
         the new mandate's context. */
      window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
    } catch (err) {
      console.error("[AtlasChatView] attach-mandate failed", err);
    }
  };

  const handleFollowup = async (
    text: string,
    toolToggles: Record<string, boolean>,
    images?: ChatImageAttachment[],
  ) => {
    if (!chat) return;
    if (!isMountedRef.current) return;
    setStreaming(true);
    setStreamingText("");
    setStreamingThinking("");
    setInFlightTools([]);
    setError(null);
    /* Reset to "at bottom" — fresh user submit means they just typed
       in the composer (which lives at the bottom), so they're looking
       at it. Auto-scroll should follow the assistant reply. */
    userIsAtBottomRef.current = true;
    /* Fresh AbortController per submission so we can cancel cleanly
       on unmount (user navigates to a different chat / sidebar /
       homepage mid-stream). */
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    /* Optimistically add the user's message to local state IMMEDIATELY
       so it stays visible while Atlas streams its reply. The silent
       reload after stream-completion replaces this with the canonical
       persisted version (with proper id, attached images, etc.). */
    const optimisticUserMessage: ChatMessageRecord = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: [{ type: "text", text }],
      inputTokens: null,
      outputTokens: null,
      costUsd: null,
      toolsUsed: [],
      citations: null,
      createdAt: new Date().toISOString(),
    };
    setChat((prev) =>
      prev
        ? { ...prev, messages: [...prev.messages, optimisticUserMessage] }
        : prev,
    );

    try {
      const res = await fetch("/api/atlas/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal,
        body: JSON.stringify({
          chatId: chat.id,
          mandateId: chat.mandateId,
          message: text,
          toolToggles,
          /* Photo-attachments piggyback on the same POST. Server
             validates + widens into Anthropic ImageBlockParam shape
             before forwarding to the model. */
          images: images && images.length > 0 ? images : undefined,
        }),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          retryAfterMs?: number;
        };
        /* Translate the most common production errors into friendly
           German. Rate-limit 429 gets a retry-time hint. */
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
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!isMountedRef.current) return;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const evt = JSON.parse(json);
            handleEvent(evt);
          } catch (parseErr) {
            /* M29 — Only swallow JSON parse failures (incomplete chunk
               crossing a network boundary). Any other error from
               handleEvent (TypeError on bad event-shape, RangeError on
               oversized state-update) MUST propagate so we don't
               silently drop a real bug. */
            if (parseErr instanceof SyntaxError) {
              /* incomplete chunk — wait for next decode pass */
              continue;
            }
            console.warn("[atlas-chat] handleEvent failed", parseErr);
          }
        }
      }
      /* Silent reload — fetch the canonical persisted state (with
         extracted citations + exact tokens) WITHOUT triggering the
         loading skeleton. The streamed content is already visible
         on screen, so reload-flash would be a visible regression. */
      if (!isMountedRef.current) return;
      await reload(true);
      if (!isMountedRef.current) return;
      window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
    } catch (e) {
      /* AbortError = component unmounted mid-stream (user navigated
         away). Silent — that's the navigation case, not a real error
         to surface. */
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (!isMountedRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (isMountedRef.current) {
        setStreaming(false);
        setStreamingText("");
        setStreamingThinking("");
        setInFlightTools([]);
      }
    }
  };

  const handleEvent = (evt: { type: string } & Record<string, unknown>) => {
    /* H23 — Defensive guard. The reader-loop already short-circuits
       on unmount, but stale events queued in micro-tasks could still
       fire after unmount; bail before touching React state. */
    if (!isMountedRef.current) return;
    switch (evt.type) {
      case "text":
        setStreamingText((prev) => prev + (evt.delta as string));
        break;
      case "thinking_delta":
        setStreamingThinking((prev) => prev + (evt.delta as string));
        break;
      case "tool_call_start":
        setInFlightTools((prev) => [
          ...prev,
          {
            id: evt.id as string,
            name: evt.name as string,
            input: evt.input as Record<string, unknown>,
            startedAt: Date.now(),
          },
        ]);
        break;
      case "tool_call_complete":
        setInFlightTools((prev) =>
          prev.map((t) =>
            t.id === evt.id
              ? {
                  ...t,
                  completedAt: Date.now(),
                  durationMs: evt.durationMs as number,
                  summary: evt.summary as string,
                  isError: evt.isError as boolean,
                }
              : t,
          ),
        );
        break;
      case "error":
        setError(evt.message as string);
        break;
      default:
        break;
    }
  };

  if (loading) {
    /* Skeleton mirrors the real chat layout — header strip + a few
       message-shaped placeholder lines — so when the data lands the
       layout doesn't visibly jump. */
    return (
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 px-6 py-3">
          <div className="h-3 w-40 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none dark:bg-white/[0.06]" />
        </header>
        <div className="flex-1 overflow-hidden px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {[80, 60, 70].map((w, i) => (
              <div key={i} className="space-y-2">
                <div
                  className="h-3 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none dark:bg-white/[0.06]"
                  style={{ width: `${w}%` }}
                />
                <div
                  className="h-3 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none dark:bg-white/[0.06]"
                  style={{ width: `${w - 15}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !chat) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-500 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!chat) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Header — soft, ChatGPT-style; no hard border. */}
      <header className="flex shrink-0 items-center justify-between gap-3 px-6 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {chat.title}
          </h1>
          {chat.mandate && (
            <Link
              href={`/atlas/mandate/${chat.mandate.id}`}
              className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-300"
            >
              <Briefcase size={10} />
              <span>{chat.mandate.name}</span>
              <span className="text-slate-400 dark:text-slate-600">→</span>
            </Link>
          )}
        </div>
        <ExportMenu chat={chat} />
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        <div className="mx-auto max-w-3xl space-y-6">
          {chat.messages.map((m) => {
            return (
              <div key={m.id}>
                <MessageRow
                  message={m}
                  chatId={chatId}
                  mandateId={chat.mandateId ?? null}
                />
              </div>
            );
          })}

          {streaming && (
            <StreamingMessage
              tools={inFlightTools}
              text={streamingText}
              thinking={streamingThinking}
            />
          )}

          {error && chat && (
            /* AUDIT-FIX M44 + M45 — Error-banner now exposes a retry-
               button that re-submits the most-recent user message
               through the existing followups handler. M45 is the same
               failure-mode (any fetch-error in AtlasChatView), so this
               retry-CTA covers both findings. */
            <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle size={12} className="shrink-0" />
              <span className="flex-1">{error}</span>
              {(() => {
                /* Find the last user-message in the message-array so the
                   retry-button can re-submit exactly what the user sent.
                   If none exists (shouldn't happen if error follows a
                   submit), the button is hidden. */
                const lastUserMsg = [...chat.messages]
                  .reverse()
                  .find((m) => m.role === "user");
                if (!lastUserMsg) return null;
                const lastUserText = extractText(lastUserMsg.content);
                if (!lastUserText) return null;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      void handleFollowup(lastUserText, {});
                    }}
                    disabled={streaming}
                    className="shrink-0 rounded-md border border-red-400 bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200 dark:hover:bg-red-500/30"
                  >
                    Erneut versuchen
                  </button>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 px-6 pb-6 pt-2">
        <div className="mx-auto max-w-3xl">
          {(() => {
            /* Aggregate CUMULATIVE per-chat usage stats. Sum input +
               output tokens across every assistant turn so the donut
               grows turn-by-turn (matches the lawyer's intuition of
               "wie viel hat dieser Chat bisher verbraucht"). */
            let totalInputTokens = 0;
            let totalOutputTokens = 0;
            let totalCostUsd = 0;
            for (const m of chat.messages) {
              if (m.role === "assistant") {
                if (m.inputTokens !== null && m.inputTokens !== undefined)
                  totalInputTokens += m.inputTokens;
                if (m.outputTokens !== null && m.outputTokens !== undefined)
                  totalOutputTokens += m.outputTokens;
                if (m.costUsd !== null && m.costUsd !== undefined)
                  totalCostUsd += m.costUsd;
              }
            }
            return (
              <ChatInput
                initialValue={composerSeed}
                disabled={streaming}
                placeholder="Folgefrage stellen…"
                contextStats={{
                  totalInputTokens,
                  totalOutputTokens,
                  totalCostUsd,
                }}
                attachedMandate={attachedMandate}
                onAttachMandate={handleAttachMandate}
                onSubmit={(text, toggles, images) => {
                  setComposerSeed(undefined);
                  return handleFollowup(text, toggles, images);
                }}
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function MessageRow({
  message,
  chatId,
  mandateId,
}: {
  message: ChatMessageRecord;
  chatId: string;
  /* Threaded down so AssistantActions' "Save as Note" can persist
     the mandate context alongside the chat reference. */
  mandateId: string | null;
}) {
  if (message.role === "user") {
    const text = extractText(message.content);
    /* Image-blocks ride along inside content[]. We pull them out so we
       can render thumbnails above the text bubble — the lawyer always
       sees what they sent the model, even on reload weeks later. */
    const imageBlocks: ChatMessageBlock[] = Array.isArray(message.content)
      ? (message.content as ChatMessageBlock[]).filter(
          (b) => b.type === "image" && b.source?.data,
        )
      : [];
    return (
      <div className="flex flex-col items-end gap-1.5">
        {imageBlocks.length > 0 && (
          <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
            {imageBlocks.map((b, i) => {
              const src = `data:${b.source!.media_type};base64,${b.source!.data}`;
              return (
                /* eslint-disable-next-line @next/next/no-img-element */
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-opacity hover:opacity-90 dark:border-white/[0.08] dark:bg-white/[0.04]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Anhang ${i + 1}`}
                    className="max-h-48 max-w-[240px] object-contain"
                  />
                </a>
              );
            })}
          </div>
        )}
        {text && (
          <div className="max-w-[85%] rounded-3xl bg-slate-100 px-4 py-2.5 text-[14.5px] text-slate-900 dark:bg-white/[0.06] dark:text-slate-100">
            {text}
          </div>
        )}
      </div>
    );
  }
  /* Assistant turn — extract text + render tool-trace summary if any. */
  const blocks: ChatMessageBlock[] = Array.isArray(message.content)
    ? (message.content as ChatMessageBlock[])
    : [];
  const text = blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  /* Persisted thinking blocks (Anthropic Extended Thinking output).
     Joined as one stream so the lawyer can audit the full chain of
     thought for past answers. */
  const thinkingText = blocks
    .filter((b) => b.type === "thinking")
    .map((b) => b.thinking ?? "")
    .filter(Boolean)
    .join("\n");
  /* Citations are extracted server-side at persistence time. We pass
     them down to MarkdownContent so inline [ATLAS:…] tokens render
     as clickable numbered pills (¹ ² ³) that scroll to the matching
     row in the CitationsPanel below. */
  const citationsForInline =
    Array.isArray(message.citations) && message.citations.length > 0
      ? (message.citations as CitationRecord[]).map((c) => ({
          index: c.index,
          sourceId: c.sourceId,
          citation: c.citation,
          /* Hallucination-Verifier UX (2026-05-13): pass the validity
             badge + corpus metadata through so MarkdownContent can
             color the inline pill by status and render a richer
             hover-tooltip (status, last-verified date). */
          badge: c.badge,
          title: c.title,
          status: c.status,
          lastVerified: c.lastVerified,
        }))
      : undefined;
  return (
    <div className="space-y-2">
      {thinkingText && <ThinkingPanel text={thinkingText} />}
      {message.toolsUsed.length > 0 && (
        <ToolTraceSummary tools={message.toolsUsed} />
      )}
      <div className="prose prose-sm max-w-none text-[14px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
        {/* Markdown rendering handles tables (real <table> render) +
            bold/italic/code marks + ATLAS-citation pills. */}
        <MarkdownContent text={text} citations={citationsForInline} />
      </div>
      {/* Quellen panel with live validity badges. Populated by
          extractCitations() in the chat-engine when persisting the
          assistant turn. The list items have `id="citation-<src-id>"`
          so inline pills can scroll to them. */}
      {Array.isArray(message.citations) && message.citations.length > 0 && (
        <CitationsPanel citations={message.citations as CitationRecord[]} />
      )}
      {/* Inline actions: copy text, save the user-question as a
          workflow. Stays out of the way (small icon row, bottom-
          right) but available for power users. */}
      <AssistantActions
        text={text}
        chatId={chatId}
        mandateId={mandateId ?? null}
      />
      {message.costUsd != null && (
        <div className="text-[10px] text-slate-400 dark:text-slate-600">
          {formatTokens(message.inputTokens ?? 0)}↑ ·{" "}
          {formatTokens(message.outputTokens ?? 0)}↓ tokens ·{" "}
          {formatCost(message.costUsd)}
        </div>
      )}
    </div>
  );
}

/* ── Live "Atlas arbeitet" panel + persisted summary ─────────────────────
 *
 * The blackbox-problem fix: while the model streams, we render a
 * Claude-style reasoning panel that shows, per tool, in plain German:
 *   • status icon (running / done / error)
 *   • friendly label ("Korpus durchsucht", "Validität geprüft")
 *   • parameter description (e.g. „Art. 14 EU Space Act")
 *   • source pill ("Atlas-Korpus", "EU Space Act", "Validity-Index")
 *   • duration on right
 *   • optional first-line preview of the output
 *
 * A header strip above shows the current activity ("Sucht in Atlas-
 * Korpus…", "Schreibt Antwort…") so the user always knows what the
 * assistant is doing right now. Auto-expanded; no clicks needed to
 * see the trace mid-stream. Once the stream completes the trace
 * collapses to a one-line `<details>` for compactness.
 */

function StreamingMessage({
  tools,
  text,
  thinking,
}: {
  tools: InFlightToolCall[];
  text: string;
  thinking: string;
}) {
  /* What's happening right now: most-recent-not-yet-completed tool,
     OR — if every tool finished and text has begun arriving — the
     "Schreibt Antwort…" state. */
  const inFlight = [...tools].reverse().find((t) => !t.completedAt);
  const allDone = tools.length > 0 && tools.every((t) => t.completedAt);
  const writingAnswer = allDone && text.length > 0;
  const isThinking =
    thinking.length > 0 && tools.length === 0 && text.length === 0;

  let activity: { verb: string; detail?: string } | null = null;
  if (isThinking) {
    activity = { verb: "Denkt nach" };
  } else if (inFlight) {
    const lbl = labelFor(inFlight.name);
    activity = { verb: lbl.running, detail: lbl.describe?.(inFlight.input) };
  } else if (writingAnswer) {
    activity = { verb: "Schreibt Antwort" };
  } else if (tools.length === 0 && text.length === 0) {
    activity = { verb: "Plant Recherche" };
  }

  return (
    <div className="space-y-3">
      {/* Thinking panel — Claude's internal chain-of-thought stream.
          Auto-expanded during streaming so the user sees Atlas reason
          in real time. Renders only when thinking is enabled (server-
          side env var) AND content has arrived. */}
      {thinking && <ThinkingPanel text={thinking} streaming />}
      {(tools.length > 0 || activity) && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 dark:border-white/[0.06] dark:bg-white/[0.02]">
          {/* Live activity header — Atlas-Mark als Brand-Spinner
              statt generischem Loader2. Mark pulsiert während der
              Agent denkt/sucht — dieselbe Idee wie Claudes orange
              "Claude denkt..." Animation, nur mit eigener Brand. */}
          {activity && (
            <div className="flex items-center gap-2 border-b border-slate-200 bg-white/40 px-3 py-2 dark:border-white/[0.05] dark:bg-white/[0.02]">
              {writingAnswer ? (
                <PenLine
                  size={12}
                  className="shrink-0 text-slate-500 dark:text-slate-400"
                />
              ) : (
                <span className="inline-flex shrink-0 animate-pulse text-slate-700 motion-reduce:animate-none dark:text-slate-200">
                  <AtlasMark size={10} />
                </span>
              )}
              <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">
                {activity.verb}…
              </span>
              {activity.detail && (
                <span className="line-clamp-1 text-[12px] text-slate-500">
                  {activity.detail}
                </span>
              )}
            </div>
          )}
          {/* Per-tool steps, auto-expanded */}
          {tools.length > 0 && (
            <div className="divide-y divide-slate-200 dark:divide-white/[0.04]">
              {tools.map((t) => (
                <ToolStepRow key={t.id} call={t} />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="prose prose-sm max-w-none text-[14.5px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
        <MarkdownContent text={text} />
        {!allDone || text.length > 0 ? (
          <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-slate-600 align-middle motion-reduce:animate-none dark:bg-slate-300" />
        ) : null}
      </div>
    </div>
  );
}

/**
 * "Gedankengang" panel — surfaces Anthropic Extended Thinking
 * content. Two modes:
 *   • streaming=true  → auto-expanded, shows live thinking text
 *   • streaming=false → collapsed by default with a "Gedankengang
 *                       anzeigen" toggle. Used in persisted history.
 *
 * Why we surface this prominently for legal AI: a lawyer reviewing
 * a past Atlas answer can re-read the model's reasoning chain and
 * sanity-check whether the conclusion follows from valid steps.
 * That's a trust+audit signal that's been missing from the SaaS-
 * legal-AI category until now.
 */
function ThinkingPanel({
  text,
  streaming,
}: {
  text: string;
  streaming?: boolean;
}) {
  const [open, setOpen] = useState(streaming ?? false);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-100/60 dark:hover:bg-white/[0.04]"
      >
        <Brain
          size={12}
          className={`shrink-0 text-slate-500 dark:text-slate-400 ${streaming ? "animate-pulse motion-reduce:animate-none" : ""}`}
        />
        <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">
          {streaming ? "Denkt nach…" : "Gedankengang"}
        </span>
        <span className="ml-auto text-[10.5px] text-slate-500 dark:text-slate-400">
          {streaming
            ? `${text.length} Zeichen`
            : open
              ? "ausblenden"
              : "anzeigen"}
        </span>
        <ChevronRight
          size={11}
          className={`shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-slate-200 px-3 py-2 dark:border-white/[0.05]">
          <div className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-300">
            {text}
            {streaming && (
              <span className="ml-1 inline-block h-2.5 w-1 animate-pulse bg-slate-500 align-middle motion-reduce:animate-none dark:bg-slate-400" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * One row in the live trace. Designed to read at a glance:
 *   ● Korpus durchsucht                           128ms
 *     „EU Space Act Art. 14 Konformität"  · Atlas-Korpus
 *     → Found: Artikel 14 — Konformitätsbewertung
 *
 * The raw JSON input/output is still available behind a chevron, but
 * the natural-language summary is what's surfaced by default.
 */
function ToolStepRow({ call }: { call: InFlightToolCall }) {
  const [open, setOpen] = useState(false);
  const lbl = labelFor(call.name);
  const detail = lbl.describe?.(call.input);
  const completed = !!call.completedAt;
  const errored = !!call.isError;
  const inputJson = JSON.stringify(call.input ?? {}, null, 2);
  const summaryPreview = call.summary
    ? (call.summary.split("\n").find((l) => l.trim()) ?? "")
    : "";
  const previewTruncated =
    summaryPreview.length > 140
      ? summaryPreview.slice(0, 137) + "…"
      : summaryPreview;

  return (
    <div className="px-3 py-2">
      <div className="flex items-start gap-2.5">
        {/* Status icon */}
        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          {errored ? (
            <XIcon
              size={12}
              className="text-red-500 dark:text-red-400"
              strokeWidth={2.5}
            />
          ) : completed ? (
            <CheckIcon
              size={12}
              className="text-emerald-600 dark:text-emerald-400"
              strokeWidth={2.5}
            />
          ) : (
            <Loader2
              size={12}
              className="animate-spin text-slate-500 motion-reduce:animate-none dark:text-slate-400"
            />
          )}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[12.5px] font-medium text-slate-800 dark:text-slate-100">
              {completed ? lbl.done : lbl.running}
            </span>
            <span className="ml-auto shrink-0 text-[10.5px] tabular-nums text-slate-400 dark:text-slate-500">
              {completed ? (
                errored ? (
                  <span className="text-red-500 dark:text-red-400">Fehler</span>
                ) : (
                  <span>{call.durationMs}ms</span>
                )
              ) : (
                <span>läuft…</span>
              )}
            </span>
          </div>

          {/* Detail (parameter) + source pill */}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-slate-500">
            {detail && <span className="line-clamp-2">{detail}</span>}
            <span className="inline-flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORY_DOT[lbl.category]}`}
              />
              <span>{lbl.source}</span>
            </span>
          </div>

          {/* Output preview (one line) */}
          {previewTruncated && (
            <div className="mt-1 line-clamp-1 text-[11.5px] text-slate-500 dark:text-slate-400">
              <span className="mr-1 text-slate-300 dark:text-slate-600">→</span>
              {previewTruncated}
            </div>
          )}

          {/* Expand for raw I/O */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
          >
            <ChevronRight
              size={9}
              className={`transition-transform ${open ? "rotate-90" : ""}`}
            />
            <span>{open ? "Details ausblenden" : "Rohdaten"}</span>
          </button>

          {open && (
            <div className="mt-1.5 space-y-1 rounded-md bg-white px-2 py-1.5 font-mono text-[10.5px] dark:bg-white/[0.03]">
              <div className="text-slate-400 dark:text-slate-500">Input</div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all text-slate-700 dark:text-slate-300">
                {inputJson}
              </pre>
              {call.summary && (
                <>
                  <div className="mt-1 text-slate-400 dark:text-slate-500">
                    Output
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300">
                    {call.summary}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Persisted-message variant: after the stream lands the only data we
 * have on disk is `string[]` (tool names). We translate them through
 * `labelFor()` and render a one-line summary that opens to a clean
 * vertical list — preserving "what did Atlas use to answer this" as
 * a permanent audit trail.
 */
/**
 * Inline actions surfaced under each assistant message:
 *   • Copy text → clipboard. Visual "kopiert!" feedback for 1.5s.
 *   • Bookmark  → toggles a localStorage flag the user can later
 *                 use to filter "ihre wichtigsten Antworten". Stored
 *                 client-side only (no backend) — graduation to a
 *                 server-side Bookmark model is a Sprint 7+ item.
 *
 * Row stays out of the way (small icon row, faint by default,
 * full opacity on hover/focus) so the answer text remains primary.
 */
function AssistantActions({
  text,
  chatId,
  mandateId,
}: {
  text: string;
  chatId: string;
  mandateId: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [noteState, setNoteState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Browser may reject clipboard in non-secure contexts —
         fail silently. */
    }
  };

  /* Save the assistant message as an AtlasNote — server-persisted,
     surfaces in /atlas/notes. Differs from the old localStorage
     "bookmark" which was a placeholder; this is real. */
  const saveAsNote = async () => {
    if (noteState !== "idle") return;
    setNoteState("saving");
    try {
      const res = await fetch("/api/atlas/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          excerpt: text.slice(0, 4000),
          chatId,
          mandateId: mandateId ?? undefined,
          tags: [],
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setNoteState("saved");
      /* Reset to idle after 2s so a second save is possible. */
      setTimeout(() => setNoteState("idle"), 2000);
    } catch {
      setNoteState("error");
      setTimeout(() => setNoteState("idle"), 2500);
    }
  };

  return (
    <div className="mt-1 flex items-center gap-1 opacity-50 transition-opacity hover:opacity-100 focus-within:opacity-100">
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Kopiert!" : "Antwort kopieren"}
        aria-label="Antwort kopieren"
        className="inline-flex h-6 items-center gap-1 rounded px-1.5 text-[11px] text-slate-500 transition-colors hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-200"
      >
        {copied ? (
          <CheckIcon
            size={11}
            className="text-emerald-600 dark:text-emerald-400"
          />
        ) : (
          <Copy size={11} />
        )}
        <span>{copied ? "Kopiert" : "Kopieren"}</span>
      </button>
      <button
        type="button"
        onClick={saveAsNote}
        disabled={noteState === "saving"}
        title={
          noteState === "saved"
            ? "In Notizen gespeichert!"
            : noteState === "error"
              ? "Speichern fehlgeschlagen"
              : "Als Notiz speichern"
        }
        aria-label="Antwort als Notiz speichern"
        className={`inline-flex h-6 items-center gap-1 rounded px-1.5 text-[11px] transition-colors ${
          noteState === "saved"
            ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
            : noteState === "error"
              ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
              : "text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-200"
        }`}
      >
        {noteState === "saving" ? (
          <Loader2
            size={11}
            className="animate-spin motion-reduce:animate-none"
          />
        ) : noteState === "saved" ? (
          <CheckIcon size={11} />
        ) : (
          <Bookmark size={11} />
        )}
        <span>
          {noteState === "saving"
            ? "Speichert…"
            : noteState === "saved"
              ? "Gespeichert"
              : noteState === "error"
                ? "Fehler"
                : "Notiz"}
        </span>
      </button>
    </div>
  );
}

function ToolTraceSummary({ tools }: { tools: string[] }) {
  return (
    <details className="rounded-md bg-slate-50 px-3 py-1.5 text-[11.5px] dark:bg-white/[0.02]">
      <summary className="cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-slate-300">
        Gedankengang anzeigen ({tools.length}{" "}
        {tools.length === 1 ? "Schritt" : "Schritte"})
      </summary>
      <div className="mt-2 space-y-1">
        {tools.map((t, i) => {
          const lbl = labelFor(t);
          return (
            <div
              key={i}
              className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400"
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORY_DOT[lbl.category]}`}
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {lbl.done}
              </span>
              <span className="text-slate-400 dark:text-slate-500">
                · {lbl.source}
              </span>
            </div>
          );
        })}
      </div>
    </details>
  );
}

function extractText(content: ChatMessageBlock[] | string): string {
  if (typeof content === "string") return content;
  return content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n");
}

/**
 * M30 — Compact token formatter — 12,345 → "12k", 1,200,000 → "1.2M".
 * Mirrors `formatTokens()` in ContextWindowIndicator.tsx so the per-
 * message footer reads consistently with the header donut tooltip.
 * Defined locally (not imported) to avoid coupling AtlasChatView to
 * ContextWindowIndicator's internal helpers.
 */
function formatTokens(n: number): string {
  if (n < 1_000) return n.toString();
  if (n < 1_000_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/**
 * M31 — Format per-message cost. Hides "$0.0000" noise on cheap turns
 * (Haiku / cache hits) by showing "<$0.001" once cost dips below the
 * resolution of 3-decimal display. Above that, shows two decimals so
 * the lawyer sees a meaningful number.
 */
function formatCost(usd: number): string {
  if (usd < 0.001) return "<$0.001";
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

/**
 * Header export menu — replaces the single Download icon with a
 * 4-format picker (PDF / DOCX / Markdown / Plain text). Lawyers
 * pick the deliverable format for client / matter file / internal
 * note. Click-outside closes.
 *
 * Why these four:
 *   - PDF      Mandanten-Deliverable (read-only, printable)
 *   - DOCX     Lawyer-editable in Word/LibreOffice before sending
 *   - MD       Source-of-truth for re-rendering / dev workflows
 *   - TXT      Plain copy for older systems / DMS pipelines
 */
function ExportMenu({ chat }: { chat: ChatRecord }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "pdf" | "docx" | "md" | "txt">(null);
  /* When the chat lives in a mandate, default-on a "also file in
     mandate" toggle. The lawyer gets the deliverable AND it lands
     automatically in the mandate's vault so it becomes part of the
     matter file. */
  const inMandate = !!chat.mandateId;
  const [alsoFile, setAlsoFile] = useState(inMandate);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  /* POST a generated blob to the mandate's file-upload endpoint.
     Uses the same multipart contract the manual upload UI uses, so
     the file lands as a regular AtlasMandateFile row + appears in
     MandateFilesList alongside user-uploaded docs. */
  const fileToMandate = async (
    blob: Blob,
    filename: string,
    mimeType: string,
  ) => {
    if (!chat.mandateId) return;
    const fd = new FormData();
    fd.append("file", new File([blob], filename, { type: mimeType }));
    try {
      await fetch(`/api/atlas/mandate/${chat.mandateId}/files`, {
        method: "POST",
        body: fd,
      });
      /* Sidebar refresh so the new file appears in MandateContextSection
         + MandateFilesList without a page reload. */
      window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
    } catch {
      /* Auto-file is best-effort; primary download already succeeded. */
    }
  };

  const run = async (fmt: "pdf" | "docx" | "md" | "txt") => {
    setBusy(fmt);
    try {
      if (fmt === "pdf") {
        if (alsoFile && chat.mandateId) {
          /* AUDIT-FIX C04: generateChatPdfBlob became async (jsPDF
             dynamic-loaded). */
          const { blob, filename } = await generateChatPdfBlob(chat);
          /* Trigger download */
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          /* Plus mandate-file */
          await fileToMandate(blob, filename, "application/pdf");
        } else {
          /* AUDIT-FIX C04: downloadChatAsPdf became async too. */
          await downloadChatAsPdf(chat);
        }
      } else if (fmt === "docx") {
        if (alsoFile && chat.mandateId) {
          const { blob, filename } = await generateChatDocxBlob(chat);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          await fileToMandate(
            blob,
            filename,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          );
        } else {
          await downloadChatAsDocx(chat);
        }
      } else if (fmt === "md") {
        downloadChatAsMarkdown(chat);
      } else {
        downloadChatAsPlainText(chat);
      }
    } finally {
      setBusy(null);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Chat exportieren"
        aria-label="Chat exportieren"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-100"
      >
        {busy ? (
          <Loader2
            size={13}
            className="animate-spin motion-reduce:animate-none"
          />
        ) : (
          <Download size={13} />
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,0.10)] dark:border-white/[0.08] dark:bg-[#1f1f1f] dark:shadow-[0_8px_24px_rgba(0,0,0,0.40)]"
        >
          <ExportItem
            label="PDF — Mandanten-Briefing"
            hint=".pdf"
            onClick={() => run("pdf")}
            disabled={busy !== null}
          />
          <ExportItem
            label="Word — editierbar"
            hint=".docx"
            onClick={() => run("docx")}
            disabled={busy !== null}
          />
          <ExportItem
            label="Markdown"
            hint=".md"
            onClick={() => run("md")}
            disabled={busy !== null}
          />
          <ExportItem
            label="Plain Text"
            hint=".txt"
            onClick={() => run("txt")}
            disabled={busy !== null}
          />
          {inMandate && (
            <div className="border-t border-slate-200 px-3 py-2 dark:border-white/[0.06]">
              <label className="flex items-center gap-2 text-[12px] text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={alsoFile}
                  onChange={(e) => setAlsoFile(e.target.checked)}
                  className="h-3.5 w-3.5 accent-slate-900 dark:accent-emerald-500"
                />
                <span>Auch in Mandat ablegen</span>
              </label>
              <p className="mt-0.5 pl-5 text-[10.5px] text-slate-500">
                Gilt für PDF + Word. MD/TXT wird nur heruntergeladen.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExportItem({
  label,
  hint,
  onClick,
  disabled,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-white/[0.05]"
    >
      <span>{label}</span>
      <span className="text-[10.5px] text-slate-400 dark:text-slate-500">
        {hint}
      </span>
    </button>
  );
}

/**
 * Plain-text export — strips Markdown markers and ATLAS-tokens,
 * keeps line-breaks. Useful for DMS / paste-into-email workflows.
 */
function downloadChatAsPlainText(chat: ChatRecord) {
  const lines: string[] = [];
  lines.push(chat.title);
  lines.push("=".repeat(Math.min(chat.title.length, 60)));
  lines.push("");
  if (chat.mandate) lines.push(`Mandat: ${chat.mandate.name}`);
  lines.push(`Erstellt: ${new Date(chat.createdAt).toLocaleString("de-DE")}`);
  lines.push(
    `Aktualisiert: ${new Date(chat.updatedAt).toLocaleString("de-DE")}`,
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  let qNum = 0;
  for (const m of chat.messages) {
    const text = extractText(m.content);
    if (m.role === "user") {
      qNum++;
      lines.push(`FRAGE ${qNum}:`);
      lines.push(text);
      lines.push("");
    } else {
      lines.push(`ANTWORT:`);
      lines.push(
        text
          .replace(/\[ATLAS:[^\]]+\]/g, "")
          .replace(/\*\*(.+?)\*\*/g, "$1")
          .replace(/^#{1,3}\s+/gm, ""),
      );
      lines.push("");
      if (Array.isArray(m.citations) && m.citations.length > 0) {
        lines.push("Quellen:");
        for (const c of m.citations as Array<{
          index: number;
          citation: string;
          title: string | null;
          sourceUrl: string | null;
        }>) {
          const url = c.sourceUrl ? ` ${c.sourceUrl}` : "";
          lines.push(
            `  ${c.index}. ${c.citation}${c.title ? ` — ${c.title}` : ""}${url}`,
          );
        }
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    }
  }

  const slug =
    chat.title
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "chat";
  const date = new Date(chat.updatedAt).toISOString().slice(0, 10);
  const filename = `atlas-chat-${slug}-${date}.txt`;

  const blob = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Convert a full chat into a Markdown document + trigger browser
 * download. Used by the header export button. Produces a self-
 * contained `.md` file the lawyer can paste into Word, email to a
 * colleague, or store in the client matter folder.
 *
 * Structure mirrors the visible chat:
 *   - Title + mandate + date metadata
 *   - User question + assistant answer pairs
 *   - Tools-used trace per turn (collapsed in source as plain text)
 *   - Citations list at the bottom of each assistant turn
 */
function downloadChatAsMarkdown(chat: ChatRecord) {
  const lines: string[] = [];
  lines.push(`# ${chat.title}`);
  lines.push("");
  if (chat.mandate) {
    lines.push(`**Mandat:** ${chat.mandate.name}`);
  }
  lines.push(
    `**Erstellt:** ${new Date(chat.createdAt).toLocaleString("de-DE")}`,
  );
  lines.push(
    `**Aktualisiert:** ${new Date(chat.updatedAt).toLocaleString("de-DE")}`,
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  let qNum = 0;
  for (const m of chat.messages) {
    const text = extractText(m.content);
    if (m.role === "user") {
      qNum++;
      lines.push(`## Frage ${qNum}`);
      lines.push("");
      lines.push(text);
      lines.push("");
    } else {
      lines.push(`### Antwort`);
      lines.push("");
      lines.push(text);
      lines.push("");
      if (m.toolsUsed && m.toolsUsed.length > 0) {
        lines.push(
          `_Tools verwendet: ${m.toolsUsed.map((t) => `\`${t}\``).join(", ")}_`,
        );
        lines.push("");
      }
      if (Array.isArray(m.citations) && m.citations.length > 0) {
        lines.push(`**Quellen:**`);
        lines.push("");
        for (const c of m.citations as Array<{
          index: number;
          citation: string;
          title: string | null;
          sourceUrl: string | null;
          lastVerified: string | null;
        }>) {
          const url = c.sourceUrl ? ` — <${c.sourceUrl}>` : "";
          const title = c.title ? ` — ${c.title}` : "";
          const verified = c.lastVerified
            ? ` (verified ${c.lastVerified})`
            : "";
          lines.push(`${c.index}. **${c.citation}**${title}${url}${verified}`);
        }
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    }
  }

  /* Filename: atlas-chat-<sanitized-title>-<YYYY-MM-DD>.md
     Sanitize title to a filesystem-safe slug. */
  const slug =
    chat.title
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "chat";
  const date = new Date(chat.updatedAt).toISOString().slice(0, 10);
  const filename = `atlas-chat-${slug}-${date}.md`;

  const blob = new Blob([lines.join("\n")], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  /* Free the blob URL after a short delay — most browsers wait for
     the download to start before they actually use the URL. */
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
