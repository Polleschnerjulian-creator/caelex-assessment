"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PharosAstraChat — client component for the authority-side AI chat.
 *
 * Glass-Box-UI: jede Antwort zeigt
 *   1. Citation-Chips für jede gelieferte Quelle (klickbar → contentHash + retrievedAt)
 *   2. Receipt-Badge mit Ed25519-Signatur (Click → public verify-URL)
 *   3. Abstention-Block (gelb) für strukturierte Verweigerungen
 *   4. Tool-Call-Trace (für Behörden-Auditoren)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Fingerprint,
  Lightbulb,
  Send,
  Sparkles,
  Wrench,
} from "lucide-react";

interface Suggestion {
  oversightId: string;
  operatorName: string;
  oversightTitle: string;
}

interface Citation {
  id: string;
  kind: "data-row" | "computation" | "audit-entry" | "norm";
  source: string;
  span?: string;
  contentHash: string;
  retrievedAt: string;
  url?: string;
}

interface ReceiptInfo {
  receiptHash: string;
  inputHash: string;
  contextHash: string;
  outputHash: string;
  signature: string;
  publicKeyBase64: string;
  signedAt: string;
  algorithm: string;
}

interface ChainEntry {
  oversightId: string;
  entryId: string;
  entryHash: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: { tool: string; input: unknown; ok: boolean }[];
  citations?: Citation[];
  receipt?: ReceiptInfo | null;
  chainEntries?: ChainEntry[];
  abstained?: boolean;
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
            citations: json.citations,
            receipt: json.receipt,
            chainEntries: json.chainEntries,
            abstained: json.abstained,
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

        <GlassBoxNotice />

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

function GlassBoxNotice() {
  return (
    <div className="rounded-lg border border-white/5 bg-navy-900/30 p-4 text-[12px] text-slate-400 leading-relaxed">
      <div className="flex items-center gap-2 text-slate-300 font-medium mb-1">
        <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
        Verifiable Refusal — Glass-Box-Garantie
      </div>
      Jede Antwort enthält klickbare Citations zu jeder Aussage und einen
      Ed25519-signierten Receipt. Wenn keine belastbare Quelle vorliegt,
      verweigert Pharos strukturiert die Antwort —{" "}
      <span className="text-amber-300">[ABSTAIN]</span> ist Feature, nicht Bug.
      Halluzinationen sind architektonisch unmöglich.
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
  const isAbstention = message.abstained === true;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 ${
          isUser
            ? "bg-amber-500/15 border border-amber-500/30 text-amber-50"
            : isAbstention
              ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-50"
              : "bg-navy-900/50 border border-white/5 text-slate-200"
        }`}
      >
        {message.error ? (
          <div className="flex items-start gap-2 text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{message.error}</span>
          </div>
        ) : (
          <>
            {isAbstention && (
              <div className="flex items-center gap-2 text-[11px] tracking-wider uppercase text-yellow-400 font-semibold mb-2">
                <Lightbulb className="w-3.5 h-3.5" />
                Strukturierte Verweigerung
              </div>
            )}
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {renderWithCitationLinks(
                message.content,
                message.citations ?? [],
              )}
            </p>
          </>
        )}

        {message.citations && message.citations.length > 0 && (
          <CitationStrip citations={message.citations} />
        )}

        {message.receipt && message.chainEntries && (
          <ReceiptStrip
            receipt={message.receipt}
            chainEntries={message.chainEntries}
          />
        )}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallStrip toolCalls={message.toolCalls} />
        )}
      </div>
    </div>
  );
}

/** Render the answer text with citation IDs in brackets turned into
 *  inline-clickable mini-chips that scroll to / highlight the matching
 *  citation in the strip below. */
function renderWithCitationLinks(text: string, citations: Citation[]) {
  if (citations.length === 0 || !text) return text;
  // Match [DB:...], [COMP:...], [AUDIT:...], [NORM:...] tokens.
  const tokenRegex = /\[((?:DB|COMP|AUDIT|NORM):[^\]]+)\]/g;
  const parts: Array<string | React.ReactNode> = [];
  let lastIdx = 0;
  let match;
  let key = 0;
  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
    const id = match[1];
    const known = citations.some((c) => c.id === id);
    parts.push(
      <span
        key={`cite-${key++}`}
        className={`inline-flex items-baseline px-1 mx-0.5 rounded text-[10px] font-mono ${
          known
            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
            : "bg-red-500/15 text-red-300 border border-red-500/30"
        }`}
        title={
          known
            ? `Citation: ${id}`
            : `UNVERIFIED — diese Citation wurde nicht von einem Tool geliefert`
        }
      >
        {id}
      </span>,
    );
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

function CitationStrip({ citations }: { citations: Citation[] }) {
  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      <div className="text-[10px] tracking-wider uppercase text-slate-500 mb-2 font-medium">
        Provenance · {citations.length} Citation
        {citations.length === 1 ? "" : "s"}
      </div>
      <div className="space-y-1.5">
        {citations.map((c) => (
          <CitationChip key={c.id} citation={c} />
        ))}
      </div>
    </div>
  );
}

function CitationChip({ citation }: { citation: Citation }) {
  const kindColor = {
    "data-row": "text-blue-300 border-blue-500/30 bg-blue-500/10",
    computation: "text-violet-300 border-violet-500/30 bg-violet-500/10",
    "audit-entry": "text-amber-300 border-amber-500/30 bg-amber-500/10",
    norm: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  }[citation.kind];

  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span
        className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded border font-mono ${kindColor}`}
      >
        {citation.kind}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-slate-300 truncate" title={citation.id}>
          {citation.source}
          {citation.span && (
            <span className="text-slate-500"> · {citation.span}</span>
          )}
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          {citation.contentHash} ·{" "}
          {new Date(citation.retrievedAt).toLocaleString()}
        </div>
      </div>
      {citation.url && (
        <a
          href={citation.url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-slate-500 hover:text-amber-300"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function ReceiptStrip({
  receipt,
  chainEntries,
}: {
  receipt: ReceiptInfo;
  chainEntries: ChainEntry[];
}) {
  const verifyUrl = chainEntries[0]
    ? `/api/pharos/receipt/${chainEntries[0].entryId}`
    : null;

  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[10px] tracking-wider uppercase text-emerald-400 font-semibold">
          Ed25519-Signed Receipt
        </span>
      </div>
      <div className="space-y-1 text-[10px] font-mono text-slate-500">
        <div className="flex gap-2">
          <span className="text-slate-600 w-20 shrink-0">receiptHash</span>
          <span className="text-slate-400 truncate" title={receipt.receiptHash}>
            {receipt.receiptHash.slice(0, 32)}…
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-600 w-20 shrink-0">signature</span>
          <span className="text-slate-400 truncate" title={receipt.signature}>
            {receipt.signature.slice(0, 32)}…
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-600 w-20 shrink-0">publicKey</span>
          <span
            className="text-slate-400 truncate"
            title={receipt.publicKeyBase64}
          >
            {receipt.publicKeyBase64.slice(0, 32)}…
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-600 w-20 shrink-0">signedAt</span>
          <span className="text-slate-400">
            {new Date(receipt.signedAt).toLocaleString()}
          </span>
        </div>
      </div>
      {chainEntries.length > 0 && (
        <div className="mt-2 text-[10px] text-slate-500">
          In {chainEntries.length} Aufsicht-Hash-Chain
          {chainEntries.length === 1 ? "" : "s"} eingetragen — Operator sieht
          jeden Eintrag live in seinem Audit-Center.
        </div>
      )}
      {verifyUrl && (
        <div className="mt-2 flex items-center gap-2">
          <a
            href={verifyUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
          >
            <ExternalLink className="w-3 h-3" />
            Receipt JSON
          </a>
          <code className="text-[10px] text-slate-600 font-mono">
            npx pharos-verify {chainEntries[0].entryId}
          </code>
        </div>
      )}
    </div>
  );
}

function ToolCallStrip({
  toolCalls,
}: {
  toolCalls: { tool: string; input: unknown; ok: boolean }[];
}) {
  return (
    <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
      {toolCalls.map((tc, i) => (
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
