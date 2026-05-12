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

import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { ChatInput } from "./ChatInput";
import { SuggestedFollowups } from "./SuggestedFollowups";
import { CitationsPanel, type CitationRecord } from "./CitationsPanel";
import { MarkdownContent } from "./MarkdownContent";
import { labelFor, CATEGORY_DOT } from "@/lib/atlas/tool-labels";
import type { ChatMessageBlock, ChatMessageRecord, ChatRecord } from "./types";

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
  /* Bumped after every successful assistant turn so the
     SuggestedFollowups child re-fetches with fresh context. */
  const [followupRefreshKey, setFollowupRefreshKey] = useState(0);
  /* Lifts the seed value into ChatInput so suggested-followup clicks
     can populate + auto-submit it. */
  const [composerSeed, setComposerSeed] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Load persisted chat. */
  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/atlas/chat/${chatId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 404) {
          setError("Chat nicht gefunden");
        } else {
          setError(`HTTP ${res.status}`);
        }
        return;
      }
      const data = (await res.json()) as { chat: ChatRecord };
      setChat(data.chat);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  /* Auto-scroll to bottom on new content. */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chat?.messages.length, streamingText, inFlightTools.length]);

  /* If the latest message is a user-message and there's no following
     assistant-message, the chat was created via homepage POST and the
     stream is still in flight server-side. Auto-poll until the
     assistant message lands. */
  useEffect(() => {
    if (!chat) return;
    const lastUserIdx = [...chat.messages]
      .reverse()
      .findIndex((m) => m.role === "user");
    const lastAssistantIdx = [...chat.messages]
      .reverse()
      .findIndex((m) => m.role === "assistant");
    const userIsLast = lastUserIdx === 0;
    const noAssistantYet = lastAssistantIdx === -1;
    const userOnly = chat.messages.length === 1 && userIsLast;
    const assistantBehind =
      !noAssistantYet && lastAssistantIdx > lastUserIdx && lastUserIdx >= 0;
    if ((userIsLast && (noAssistantYet || assistantBehind)) || userOnly) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/atlas/chat/${chatId}`, {
            cache: "no-store",
          });
          if (!res.ok) return;
          const data = (await res.json()) as { chat: ChatRecord };
          if (data.chat.messages.length > chat.messages.length) {
            setChat(data.chat);
            clearInterval(interval);
            window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
          }
        } catch {
          /* swallow */
        }
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [chat, chatId]);

  const handleFollowup = async (
    text: string,
    toolToggles: Record<string, boolean>,
  ) => {
    if (!chat) return;
    setStreaming(true);
    setStreamingText("");
    setStreamingThinking("");
    setInFlightTools([]);
    setError(null);
    try {
      const res = await fetch("/api/atlas/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chatId: chat.id,
          mandateId: chat.mandateId,
          message: text,
          toolToggles,
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
          } catch {
            /* incomplete chunk */
          }
        }
      }
      /* Reload persisted messages so the streamed assistant turn
         enters the canonical render path. */
      await reload();
      window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
      /* Bump the suggested-followups key so the chips re-fetch with
         the just-completed assistant turn as their seed. */
      setFollowupRefreshKey((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStreaming(false);
      setStreamingText("");
      setStreamingThinking("");
      setInFlightTools([]);
    }
  };

  /* Bump followupRefreshKey on first load so the chips fetch under the
     existing last assistant turn (when the user lands here via the
     homepage handoff). */
  useEffect(() => {
    if (!loading && chat && chat.messages.some((m) => m.role === "assistant")) {
      setFollowupRefreshKey((n) => (n === 0 ? 1 : n));
    }
  }, [loading, chat]);

  const handleEvent = (evt: { type: string } & Record<string, unknown>) => {
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
          <div className="h-3 w-40 animate-pulse rounded-full bg-slate-200 dark:bg-white/[0.06]" />
        </header>
        <div className="flex-1 overflow-hidden px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {[80, 60, 70].map((w, i) => (
              <div key={i} className="space-y-2">
                <div
                  className="h-3 animate-pulse rounded-full bg-slate-200 dark:bg-white/[0.06]"
                  style={{ width: `${w}%` }}
                />
                <div
                  className="h-3 animate-pulse rounded-full bg-slate-200 dark:bg-white/[0.06]"
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
        <div className="min-w-0">
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
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {chat.messages.map((m, idx) => {
            const isLast = idx === chat.messages.length - 1;
            const showFollowups =
              isLast && m.role === "assistant" && !streaming;
            return (
              <div key={m.id}>
                <MessageRow message={m} />
                {showFollowups && followupRefreshKey > 0 && (
                  <SuggestedFollowups
                    chatId={chatId}
                    refreshKey={followupRefreshKey}
                    onPick={(text) => {
                      setComposerSeed(text);
                      void handleFollowup(text, {
                        korpus: true,
                        compliance: true,
                        comparison: true,
                        drafting: true,
                        validity: true,
                        documents: false,
                        web: false,
                        workflow: true,
                        mandate: true,
                      });
                    }}
                  />
                )}
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
            <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle size={12} />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 px-6 pb-6 pt-2">
        <div className="mx-auto max-w-3xl">
          <ChatInput
            initialValue={composerSeed}
            disabled={streaming}
            placeholder="Folgefrage stellen…"
            onSubmit={(text, toggles) => {
              setComposerSeed(undefined);
              return handleFollowup(text, toggles);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: ChatMessageRecord }) {
  if (message.role === "user") {
    const text = extractText(message.content);
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl bg-slate-100 px-4 py-2.5 text-[14.5px] text-slate-900 dark:bg-white/[0.06] dark:text-slate-100">
          {text}
        </div>
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
  return (
    <div className="space-y-2">
      {thinkingText && <ThinkingPanel text={thinkingText} />}
      {message.toolsUsed.length > 0 && (
        <ToolTraceSummary tools={message.toolsUsed} />
      )}
      <div className="prose prose-sm max-w-none text-[14px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
        {/* Sprint 6: MarkdownContent handles markdown tables (real
            <table> render) + bold/italic/code/[ATLAS:…] inline marks. */}
        <MarkdownContent text={text} />
      </div>
      {/* Sprint 4 — Quellen panel with live validity badges. Populated
          by extractCitations() in the chat-engine when persisting the
          assistant turn. */}
      {Array.isArray(message.citations) && message.citations.length > 0 && (
        <CitationsPanel citations={message.citations as CitationRecord[]} />
      )}
      {message.costUsd != null && (
        <div className="text-[10px] text-slate-400 dark:text-slate-600">
          {message.inputTokens}↑ · {message.outputTokens}↓ tokens · $
          {message.costUsd.toFixed(4)}
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
          {/* Live activity header */}
          {activity && (
            <div className="flex items-center gap-2 border-b border-slate-200 bg-white/40 px-3 py-2 dark:border-white/[0.05] dark:bg-white/[0.02]">
              {writingAnswer ? (
                <PenLine
                  size={12}
                  className="shrink-0 text-slate-500 dark:text-slate-400"
                />
              ) : (
                <Loader2
                  size={12}
                  className="shrink-0 animate-spin text-slate-500 dark:text-slate-400"
                />
              )}
              <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">
                {activity.verb}
                {activity.detail ? "…" : "…"}
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
          <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-slate-600 align-middle dark:bg-slate-300" />
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
    <div className="overflow-hidden rounded-xl border border-violet-200 bg-violet-50/60 dark:border-violet-500/15 dark:bg-violet-500/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-violet-100/50 dark:hover:bg-violet-500/[0.08]"
      >
        <Brain
          size={12}
          className={`shrink-0 text-violet-600 dark:text-violet-300 ${streaming ? "animate-pulse" : ""}`}
        />
        <span className="text-[12px] font-medium text-violet-900 dark:text-violet-100">
          {streaming ? "Denkt nach…" : "Gedankengang"}
        </span>
        <span className="ml-auto text-[10.5px] text-violet-700/70 dark:text-violet-300/70">
          {streaming
            ? `${text.length} Zeichen`
            : open
              ? "ausblenden"
              : "anzeigen"}
        </span>
        <ChevronRight
          size={11}
          className={`shrink-0 text-violet-600 transition-transform dark:text-violet-300 ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-violet-200 px-3 py-2 dark:border-violet-500/15">
          <div className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-violet-900/90 dark:text-violet-100/85">
            {text}
            {streaming && (
              <span className="ml-1 inline-block h-2.5 w-1 animate-pulse bg-violet-400 align-middle dark:bg-violet-300" />
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
              className="animate-spin text-slate-500 dark:text-slate-400"
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
