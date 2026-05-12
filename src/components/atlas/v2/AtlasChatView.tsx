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
import { Briefcase, Wrench, AlertCircle, ChevronRight } from "lucide-react";
import { ChatInput } from "./ChatInput";
import { SuggestedFollowups } from "./SuggestedFollowups";
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
        const body = await res.json().catch(() => ({}));
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
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Lädt Chat…
      </div>
    );
  }

  if (error && !chat) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!chat) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/60 px-6 py-3">
        <div className="min-w-0">
          <h1 className="line-clamp-1 text-sm font-semibold text-slate-100">
            {chat.title}
          </h1>
          {chat.mandate && (
            <Link
              href={`/atlas/mandate/${chat.mandate.id}`}
              className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-emerald-300"
            >
              <Briefcase size={10} />
              <span>{chat.mandate.name}</span>
              <span className="text-slate-600">→</span>
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
            <StreamingMessage tools={inFlightTools} text={streamingText} />
          )}

          {error && chat && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertCircle size={12} />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-slate-800 bg-slate-950/60 px-6 py-4">
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
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald-500/10 px-4 py-2.5 text-[14px] text-slate-100">
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
  return (
    <div className="space-y-2">
      {message.toolsUsed.length > 0 && (
        <ToolTraceSummary tools={message.toolsUsed} />
      )}
      <div className="prose prose-invert prose-sm max-w-none text-[14px] leading-relaxed">
        {text.split("\n\n").map((p, i) => (
          <p key={i} className="mb-3 last:mb-0">
            {p}
          </p>
        ))}
      </div>
      {message.costUsd != null && (
        <div className="text-[10px] text-slate-600">
          {message.inputTokens}↑ · {message.outputTokens}↓ tokens · $
          {message.costUsd.toFixed(4)}
        </div>
      )}
    </div>
  );
}

function StreamingMessage({
  tools,
  text,
}: {
  tools: InFlightToolCall[];
  text: string;
}) {
  return (
    <div className="space-y-2">
      {tools.length > 0 && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-emerald-400">
            <span>Tools verwendet ({tools.length})</span>
            <span className="text-emerald-500/60">
              {tools.filter((t) => t.completedAt).length} / {tools.length}
            </span>
          </div>
          <div className="mt-1 space-y-1">
            {tools.map((t) => (
              <ExpandableToolCallRow key={t.id} call={t} />
            ))}
          </div>
        </div>
      )}
      <div className="prose prose-invert prose-sm max-w-none text-[14px] leading-relaxed">
        {text.split("\n\n").map((p, i) => (
          <p key={i} className="mb-3 last:mb-0">
            {p}
            {i === text.split("\n\n").length - 1 && (
              <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-emerald-400 align-middle" />
            )}
          </p>
        ))}
      </div>
    </div>
  );
}

function ExpandableToolCallRow({ call }: { call: InFlightToolCall }) {
  const [open, setOpen] = useState(false);
  const inputJson = JSON.stringify(call.input ?? {}, null, 2);
  const inputTooLong = inputJson.length > 80;
  const inputPreview = inputTooLong
    ? inputJson.replace(/\s+/g, " ").slice(0, 60) + "…"
    : inputJson.replace(/\s+/g, " ");
  return (
    <div className="rounded border border-emerald-500/10 bg-emerald-500/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-1.5 py-1 text-left text-[11px] text-emerald-200 hover:bg-emerald-500/10"
      >
        <ChevronRight
          size={10}
          className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <Wrench size={10} className="shrink-0 opacity-70" />
        <span className="font-mono">{call.name}</span>
        <span className="ml-auto shrink-0 text-emerald-400/70">
          {call.completedAt ? (
            call.isError ? (
              <span className="text-red-400">✗ Error</span>
            ) : (
              <span className="text-emerald-500">✓ {call.durationMs}ms</span>
            )
          ) : (
            <span className="text-emerald-400/60">läuft…</span>
          )}
        </span>
      </button>
      {open && (
        <div className="space-y-1 border-t border-emerald-500/10 px-2 py-1.5 font-mono text-[10px]">
          <div className="text-emerald-500/80">Input:</div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all text-emerald-200/80">
            {inputJson}
          </pre>
          {call.summary && (
            <>
              <div className="mt-1 text-emerald-500/80">Output:</div>
              <pre className="whitespace-pre-wrap break-words text-emerald-200/80">
                {call.summary}
              </pre>
            </>
          )}
        </div>
      )}
      {!open && inputTooLong && (
        <div className="px-2 pb-1 font-mono text-[10px] text-emerald-200/40">
          {inputPreview}
        </div>
      )}
    </div>
  );
}

function ToolTraceSummary({ tools }: { tools: string[] }) {
  return (
    <details className="rounded-md border border-slate-700/40 bg-slate-900/40 px-3 py-1.5 text-[11px]">
      <summary className="cursor-pointer text-slate-400 hover:text-slate-200">
        🔧 {tools.length} {tools.length === 1 ? "Tool" : "Tools"} verwendet
      </summary>
      <div className="mt-2 space-y-0.5">
        {tools.map((t, i) => (
          <div key={i} className="flex items-center gap-2 text-slate-400">
            <Wrench size={9} className="opacity-50" />
            <span className="font-mono text-[11px]">{t}</span>
          </div>
        ))}
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
