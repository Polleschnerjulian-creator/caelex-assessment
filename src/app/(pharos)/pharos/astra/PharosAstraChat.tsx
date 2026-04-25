"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PharosAstraChat — client component for the authority-side AI chat.
 *
 * Stateless from the server's perspective: keeps message history in
 * local state and re-sends it with each request. After the response,
 * shows the tool-call trace inline so the compliance officer can see
 * which tools were called with which inputs (transparency by design).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useRef, useState } from "react";
import { Sparkles, Send, Wrench, AlertCircle } from "lucide-react";

interface Suggestion {
  oversightId: string;
  operatorName: string;
  oversightTitle: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: { tool: string; input: unknown; ok: boolean }[];
  error?: string;
}

export function PharosAstraChat({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || submitting) return;

      const newUserMessage: Message = { role: "user", content: trimmed };
      const newMessages = [...messages, newUserMessage];
      setMessages(newMessages);
      setInput("");
      setSubmitting(true);

      // Build history for the API: only role+content, drop UI-specific fields.
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const res = await fetch("/api/pharos/astra/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history }),
        });
        const json = await res.json();
        if (!res.ok) {
          setMessages([
            ...newMessages,
            {
              role: "assistant",
              content: "",
              error: json.error ?? "Anfrage fehlgeschlagen",
            },
          ]);
          return;
        }
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: json.reply ?? "",
            toolCalls: json.toolCalls,
          },
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: "",
            error: msg,
          },
        ]);
      } finally {
        setSubmitting(false);
        inputRef.current?.focus();
      }
    },
    [messages, submitting],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  // ─── Empty-state suggestions ──────────────────────────────────────────

  if (messages.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-200">
              Beispiel-Fragen
            </h2>
          </div>
          <ul className="space-y-2 text-sm">
            <SuggestionButton
              onClick={(t) => send(t)}
              text="Welche meiner Aufsichten haben aktuell den niedrigsten Compliance-Score?"
            />
            {suggestions.slice(0, 1).map((s) => (
              <SuggestionButton
                key={s.oversightId}
                onClick={(t) => send(t)}
                text={`Zeige mir den aktuellen Compliance-Status von ${s.operatorName} (Aufsicht ${s.oversightId}).`}
              />
            ))}
            {suggestions.slice(0, 1).map((s) => (
              <SuggestionButton
                key={s.oversightId + "-audit"}
                onClick={(t) => send(t)}
                text={`Fasse die letzten 10 Audit-Einträge der Aufsicht ${s.oversightId} zusammen und zeige mir auffällige Muster.`}
              />
            ))}
            <SuggestionButton
              onClick={(t) => send(t)}
              text="Wann läuft typischerweise eine Aufsicht ab und wie verlängere ich sie?"
            />
          </ul>
        </div>

        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          submitting={submitting}
          inputRef={inputRef}
        />
      </div>
    );
  }

  // ─── Active conversation ─────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {submitting && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Analysiere…
          </div>
        )}
      </div>

      <ChatInput
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        submitting={submitting}
        inputRef={inputRef}
      />
    </div>
  );
}

function SuggestionButton({
  onClick,
  text,
}: {
  onClick: (text: string) => void;
  text: string;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onClick(text)}
        className="w-full text-left text-sm text-slate-300 hover:text-amber-200 px-3 py-2 rounded-md border border-white/10 hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors"
      >
        {text}
      </button>
    </li>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 ${
          isUser
            ? "bg-amber-500/15 border border-amber-500/30 text-amber-50"
            : "bg-navy-900/50 border border-white/5 text-slate-200"
        }`}
      >
        {message.error ? (
          <div className="flex items-start gap-2 text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{message.error}</span>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
            {message.toolCalls.map((tc, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[11px] text-slate-500"
              >
                <Wrench className="w-3 h-3" />
                <span className="font-mono">{tc.tool}</span>
                <span className={tc.ok ? "text-emerald-400" : "text-red-400"}>
                  {tc.ok ? "ok" : "error"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type ChatInputRef = { current: HTMLTextAreaElement | null };

function ChatInput({
  input,
  setInput,
  onSubmit,
  submitting,
  inputRef,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  inputRef: ChatInputRef;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="rounded-lg border border-white/10 bg-navy-900/50 focus-within:border-amber-500/40 transition-colors">
        <textarea
          ref={(node) => {
            inputRef.current = node;
          }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Frage eine regulatorische Frage oder eine Operator-Auswertung…"
          rows={2}
          maxLength={4000}
          className="w-full bg-transparent px-4 py-3 text-sm placeholder:text-slate-500 resize-none outline-none"
        />
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-[10px] text-slate-600">
            Enter = Senden · Shift+Enter = Neue Zeile · {input.length}/4000
          </span>
          <button
            type="submit"
            disabled={submitting || input.trim().length === 0}
            className="inline-flex items-center gap-2 h-8 px-3 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            Senden
          </button>
        </div>
      </div>
    </form>
  );
}
