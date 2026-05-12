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
import { Briefcase, Wrench, AlertCircle } from "lucide-react";
import { ChatInput } from "./ChatInput";
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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStreaming(false);
      setStreamingText("");
      setInFlightTools([]);
    }
  };

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
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Briefcase size={10} />
              <span>{chat.mandate.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {chat.messages.map((m) => (
            <MessageRow key={m.id} message={m} />
          ))}

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
            disabled={streaming}
            placeholder="Folgefrage stellen…"
            onSubmit={handleFollowup}
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
          <div className="text-[11px] uppercase tracking-wider text-emerald-400">
            Tools verwendet ({tools.length})
          </div>
          <div className="mt-1 space-y-0.5">
            {tools.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 text-[11px] text-emerald-200"
              >
                <Wrench size={10} className="opacity-70" />
                <span className="font-mono">{t.name}</span>
                {t.completedAt ? (
                  <span className="ml-auto text-emerald-500">
                    ✓ {t.durationMs}ms
                  </span>
                ) : (
                  <span className="ml-auto text-emerald-400/60">läuft…</span>
                )}
              </div>
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
