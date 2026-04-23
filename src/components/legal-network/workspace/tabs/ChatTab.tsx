"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * ChatTab — matter-scoped AI conversation. Split-view layout:
 * sidebar lists saved conversations, main area shows the active
 * thread with streaming replies from Claude Sonnet.
 *
 * The assistant is grounded in the matter context via the server-
 * side buildMatterSystemPrompt helper — every answer is aware of
 * the client, the mandate, and the scope that was consented to.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, Plus, Trash2, MessageSquare } from "lucide-react";

interface ConversationSummary {
  id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
  totalTokens: number;
}

interface ToolTrace {
  id: string;
  name: string;
  isError?: boolean;
  completed?: boolean;
}

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string;
  streaming?: boolean;
  tools?: ToolTrace[];
}

const TOOL_LABEL: Record<string, string> = {
  load_compliance_overview: "Compliance-Daten werden abgerufen",
  search_legal_sources: "Atlas-Rechtsquellen werden durchsucht",
  draft_memo_to_note: "Memo wird als Notiz gespeichert",
};

export function ChatTab({ matterId }: { matterId: string }) {
  const [conversations, setConversations] = useState<
    ConversationSummary[] | null
  >(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Load conversation list ─────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/network/matter/${matterId}/conversations`);
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error ?? "Konnte Gespräche nicht laden");
      setConversations(json.conversations);
      if (!activeId && json.conversations.length > 0) {
        setActiveId(json.conversations[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [matterId, activeId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Load active conversation messages ──────────────────────
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/network/matter/${matterId}/conversations/${activeId}`)
      .then(async (r) => {
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(j.error ?? "Konnte Gespräch nicht laden");
          return;
        }
        setMessages(j.conversation?.messages ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [matterId, activeId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Actions ────────────────────────────────────────────────
  async function createConversation() {
    const res = await fetch(`/api/network/matter/${matterId}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (res.ok && json.conversation) {
      setActiveId(json.conversation.id);
      await loadConversations();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  async function deleteConversation(cid: string) {
    if (!confirm("Gespräch (und alle Nachrichten) löschen?")) return;
    await fetch(`/api/network/matter/${matterId}/conversations/${cid}`, {
      method: "DELETE",
    });
    if (activeId === cid) setActiveId(null);
    await loadConversations();
  }

  async function sendMessage() {
    if (!activeId || !draft.trim() || streaming) return;
    const content = draft.trim();
    setDraft("");

    // Optimistic echo of user message
    const optimisticUserId = `tmp-user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticUserId,
        role: "USER",
        content,
        createdAt: new Date().toISOString(),
      },
    ]);
    // Placeholder assistant message for streaming
    const streamingId = `streaming-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: streamingId,
        role: "ASSISTANT",
        content: "",
        createdAt: new Date().toISOString(),
        streaming: true,
      },
    ]);
    setStreaming(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/network/matter/${matterId}/conversations/${activeId}/message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );

      if (res.status === 429) {
        throw new Error("Rate limit erreicht — kurz warten und nochmal.");
      }
      if (res.status === 409) {
        throw new Error("Mandat ist nicht aktiv. Chat nicht möglich.");
      }
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Verbindung fehlgeschlagen");
      }

      // SSE parsing identical to /api/atlas/ai-chat — rAF-batched
      // so streaming doesn't jank the UI.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let textBuffer = "";
      let rafId = 0;

      const flush = () => {
        rafId = 0;
        if (textBuffer.length > 0) {
          const delta = textBuffer;
          textBuffer = "";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId ? { ...m, content: m.content + delta } : m,
            ),
          );
        }
      };
      const scheduleFlush = () => {
        if (!rafId) rafId = requestAnimationFrame(flush);
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const chunks = sseBuffer.split("\n\n");
        sseBuffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const dataLine = chunk
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            const evt = JSON.parse(dataLine.slice(6));
            if (evt.type === "text") {
              textBuffer += evt.text;
              scheduleFlush();
            } else if (evt.type === "user_message_saved") {
              // Replace optimistic ID with real one
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === optimisticUserId ? { ...m, id: evt.messageId } : m,
                ),
              );
            } else if (evt.type === "tool_use_start") {
              // Claude is calling a tool — add a "working" trace chip
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingId
                    ? {
                        ...m,
                        tools: [
                          ...(m.tools ?? []),
                          { id: evt.id, name: evt.name, completed: false },
                        ],
                      }
                    : m,
                ),
              );
            } else if (evt.type === "tool_use_result") {
              // Tool returned — mark that chip complete with success/error
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingId
                    ? {
                        ...m,
                        tools: (m.tools ?? []).map((t) =>
                          t.id === evt.id
                            ? { ...t, completed: true, isError: !!evt.isError }
                            : t,
                        ),
                      }
                    : m,
                ),
              );
            } else if (evt.type === "tool_limit_reached") {
              // Rare edge-case — surface a small footer note
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingId
                    ? {
                        ...m,
                        content:
                          m.content +
                          "\n\n_Hinweis: Tool-Loop-Limit erreicht, Antwort evtl. unvollständig._",
                      }
                    : m,
                ),
              );
            } else if (evt.type === "done") {
              // Final flush + unmark streaming + swap id
              if (rafId) cancelAnimationFrame(rafId);
              flush();
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingId
                    ? { ...m, id: evt.messageId, streaming: false }
                    : m,
                ),
              );
            } else if (evt.type === "error") {
              throw new Error(evt.message ?? "Stream-Fehler");
            }
          } catch {
            // Malformed chunk — ignore
          }
        }
      }
      // Safety: if we didn't get a `done` event, still flush
      if (rafId) cancelAnimationFrame(rafId);
      flush();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingId ? { ...m, streaming: false } : m,
        ),
      );

      await loadConversations(); // refresh lastMessageAt/messageCount
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Fehler";
      setError(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingId
            ? { ...m, content: `Fehler: ${msg}`, streaming: false }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-[240px_1fr] gap-4 h-[calc(100vh-220px)]">
      {/* Sidebar — conversation list */}
      <aside className="border border-white/[0.06] rounded-xl bg-white/[0.02] flex flex-col">
        <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-[10px] tracking-[0.22em] uppercase text-white/40">
            Gespräche
          </span>
          <button
            onClick={createConversation}
            title="Neues Gespräch"
            className="text-white/60 hover:text-white p-0.5"
          >
            <Plus size={14} strokeWidth={1.8} />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto p-1 space-y-0.5">
          {!conversations && (
            <div className="p-3 text-[10px] text-white/40">Lade…</div>
          )}
          {conversations && conversations.length === 0 && (
            <div className="p-4 text-[10px] text-white/40 text-center">
              Noch keine Gespräche.
              <button
                onClick={createConversation}
                className="block mx-auto mt-2 text-[11px] text-white/70 underline"
              >
                Erstes starten
              </button>
            </div>
          )}
          {conversations?.map((c) => (
            <li key={c.id} className="group">
              <div
                className={`flex items-start gap-2 px-2.5 py-2 rounded-lg transition ${
                  c.id === activeId
                    ? "bg-white/[0.08] text-white"
                    : "hover:bg-white/[0.04] text-white/70"
                }`}
              >
                <button
                  onClick={() => setActiveId(c.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="text-[12px] font-medium truncate">
                    {c.title}
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5 flex items-center gap-2">
                    <MessageSquare size={9} strokeWidth={1.8} />
                    {c.messageCount}
                    <span>·</span>
                    <span>
                      {new Date(c.lastMessageAt).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => deleteConversation(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition"
                  title="Löschen"
                >
                  <Trash2 size={11} strokeWidth={1.8} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main chat area */}
      <section className="border border-white/[0.06] rounded-xl bg-white/[0.02] flex flex-col overflow-hidden">
        {!activeId && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center mb-3">
              <Sparkles size={18} strokeWidth={1.5} className="text-white/50" />
            </div>
            <p className="text-sm text-white/60 mb-1">
              Atlas AI — im Mandanten-Kontext
            </p>
            <p className="text-xs text-white/35 max-w-md mb-4">
              Jede Antwort wird auf dieses Mandat zugeschnitten: Mandant, Scope,
              Jurisdiktionen. Perfekt für Memo-Drafts, Strategie- Überlegungen
              und Regulatorik-Fragen zum Fall.
            </p>
            <button
              onClick={createConversation}
              className="px-4 py-2 rounded-lg bg-white text-black text-xs font-medium hover:bg-white/90"
            >
              Gespräch starten
            </button>
          </div>
        )}

        {activeId && (
          <>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
            >
              {messages.length === 0 && (
                <div className="text-center py-12 text-sm text-white/40">
                  Tippe unten deine Frage. Claude kennt diesen Mandant.
                </div>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>

            {error && (
              <div className="px-6 py-2 text-xs text-red-400 border-t border-red-500/20 bg-red-500/[0.03]">
                {error}
              </div>
            )}

            <div className="border-t border-white/[0.06] p-3">
              <div className="flex items-end gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 focus-within:border-white/20 transition">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Frag Atlas zum Mandat…"
                  rows={1}
                  disabled={streaming}
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30 resize-none py-1 leading-relaxed max-h-[140px]"
                />
                <button
                  onClick={sendMessage}
                  disabled={!draft.trim() || streaming}
                  className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {streaming ? "…" : "Senden"}
                </button>
              </div>
              <div className="mt-1.5 text-[10px] text-white/30 px-1">
                Enter zum Senden · Shift+Enter für neue Zeile · Phase 3: Claude
                wird echte Compliance-Daten aus Caelex ziehen können
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "USER";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-white/10 text-white/95 rounded-tr-md"
            : "bg-white/[0.03] text-white/90 rounded-tl-md"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <>
            {/* Tool-use traces — rendered inline so lawyers see
                what Claude actually pulled from Caelex. Anti-black-
                box signal analog zum ContextPanel im Atlas AI Mode. */}
            {message.tools && message.tools.length > 0 && (
              <div className="mb-2 flex flex-col gap-1">
                {message.tools.map((t) => (
                  <div
                    key={t.id}
                    className={`inline-flex items-center gap-2 text-[11px] px-2.5 py-1 rounded-md self-start ${
                      t.isError
                        ? "bg-red-500/10 text-red-300 ring-1 ring-red-500/30"
                        : t.completed
                          ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
                          : "bg-white/[0.05] text-white/60 ring-1 ring-white/10"
                    }`}
                  >
                    <span className="text-[9px]">
                      {t.isError ? "⚠" : t.completed ? "✓" : "•"}
                    </span>
                    <span className="font-medium">
                      {TOOL_LABEL[t.name] ?? t.name}
                    </span>
                    {!t.completed && (
                      <span className="text-[10px] opacity-70 animate-pulse">
                        läuft…
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content || (message.streaming ? " " : "")}
              </ReactMarkdown>
              {message.streaming && (
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
