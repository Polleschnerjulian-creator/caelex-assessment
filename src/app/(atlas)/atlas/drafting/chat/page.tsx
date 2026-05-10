"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /atlas/drafting/chat — Drafting Chat (Bundle 46).
 *
 * Harvey-style conversational drafting surface. Marie types in natural
 * prose, Astra runs a tool-use loop server-side, generates real draft
 * bodies via Anthropic, and applies state mutations (mandate-create,
 * plan-instantiate, set-plan-item-body, etc.) to her localStorage
 * stores. The chat is the new default entry point — the structured
 * tile/plan studio at /atlas/drafting stays as a power-user fallback.
 *
 * Maximum transparency: every tool call is rendered inline as a card
 * with name, args, status, duration, token usage, and (for draft
 * generations) a "show prompt" / "show generated body" expand. No
 * hidden steps. Marie sees exactly what Astra did.
 *
 * Stateless backend — the page sends the full message history + a
 * snapshot of the browser state on every turn (see
 * src/lib/atlas/drafting-chat/browser-context.ts).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  PenSquare,
  Send,
  Sparkles,
  AlertCircle,
  Loader2,
  Wrench,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Briefcase,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { buildBrowserContext } from "@/lib/atlas/drafting-chat/browser-context";
import { applyActions } from "@/lib/atlas/drafting-chat/action-executor";
import type {
  ChatMessage,
  ChatContentBlock,
  ChatTurnResponse,
  ToolCallRecord,
} from "@/lib/atlas/drafting-chat/types";
import { getActiveMandate, type Mandate } from "@/lib/atlas/mandate-store";

/* ── Per-turn local state ─────────────────────────────────────────── */

interface ChatTurn {
  /** User input that opened this turn. */
  userMessage: ChatMessage;
  /** Assistant's final response. Undefined while server is processing. */
  assistantMessage?: ChatMessage;
  /** Every tool call run server-side during this turn (in order). */
  toolCalls: ToolCallRecord[];
  /** Estimated USD cost of this turn (chat + draft-generation calls). */
  cost: number;
  /** Total token usage for the turn. */
  inputTokens: number;
  outputTokens: number;
  /** Optional error if the request failed. */
  error?: string;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function extractText(content: string | ChatContentBlock[]): string {
  if (typeof content === "string") return content;
  return content
    .filter(
      (b): b is Extract<ChatContentBlock, { type: "text" }> =>
        b.type === "text",
    )
    .map((b) => b.text)
    .join("\n");
}

function formatCost(usd: number): string {
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ── Tool-call card ───────────────────────────────────────────────── */

function ToolCallCard({ tc, isDe }: { tc: ToolCallRecord; isDe: boolean }) {
  const [argsOpen, setArgsOpen] = useState(false);
  const [bodyOpen, setBodyOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const ok = tc.status === "complete";
  const colorClass = ok
    ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-500/5"
    : "border-red-300 dark:border-red-500/40 bg-red-50/30 dark:bg-red-500/5";

  const handleCopyBody = async () => {
    if (!tc.generatedBody) return;
    try {
      await navigator.clipboard.writeText(tc.generatedBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div
      className={`rounded-md border ${colorClass} text-[11.5px] flex flex-col`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
        <Wrench
          size={11}
          strokeWidth={1.8}
          aria-hidden="true"
          className="text-[var(--atlas-text-muted)]"
        />
        <span className="font-mono font-semibold text-[var(--atlas-text-primary)]">
          {tc.name}
        </span>
        {ok ? (
          <CheckCircle2
            size={11}
            strokeWidth={1.8}
            aria-hidden="true"
            className="text-emerald-600 dark:text-emerald-400"
          />
        ) : (
          <XCircle
            size={11}
            strokeWidth={1.8}
            aria-hidden="true"
            className="text-red-600 dark:text-red-400"
          />
        )}
        <span className="text-[10.5px] text-[var(--atlas-text-faint)]">
          {tc.side === "server"
            ? isDe
              ? "Server"
              : "server"
            : isDe
              ? "Browser"
              : "client"}
          {" · "}
          {formatDuration(tc.durationMs)}
          {tc.inputTokens !== undefined && tc.outputTokens !== undefined && (
            <>
              {" · "}
              {tc.inputTokens.toLocaleString()}↓ /{" "}
              {tc.outputTokens.toLocaleString()}↑ tok
            </>
          )}
        </span>
        {tc.result && (
          <span
            className={`ml-auto text-[10.5px] ${
              ok
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {tc.result.length > 60 ? `${tc.result.slice(0, 60)}…` : tc.result}
          </span>
        )}
      </div>

      {/* Optional error */}
      {tc.error && (
        <div className="px-3 pb-2 text-[10.5px] text-red-700 dark:text-red-400 italic">
          {tc.error}
        </div>
      )}

      {/* Args toggle */}
      <button
        type="button"
        onClick={() => setArgsOpen((o) => !o)}
        className="flex items-center gap-1 px-3 py-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors text-left"
      >
        <ChevronRight
          size={10}
          strokeWidth={1.8}
          aria-hidden="true"
          className={`transition-transform ${argsOpen ? "rotate-90" : ""}`}
        />
        {isDe ? "Argumente" : "Arguments"}
      </button>
      {argsOpen && (
        <pre className="mx-3 mb-2 text-[10px] text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded p-2 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
          {JSON.stringify(tc.input, null, 2)}
        </pre>
      )}

      {/* Generated prompt (only present for draft-generating tools) */}
      {tc.generatedPrompt && (
        <>
          <button
            type="button"
            onClick={() => setPromptOpen((o) => !o)}
            className="flex items-center gap-1 px-3 py-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors text-left"
          >
            <ChevronRight
              size={10}
              strokeWidth={1.8}
              aria-hidden="true"
              className={`transition-transform ${promptOpen ? "rotate-90" : ""}`}
            />
            {isDe ? "Generierter Prompt" : "Generated prompt"}
          </button>
          {promptOpen && (
            <pre className="mx-3 mb-2 text-[10px] text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded p-2 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
              {tc.generatedPrompt}
            </pre>
          )}
        </>
      )}

      {/* Generated body — for draft-generating tools, with copy button */}
      {tc.generatedBody && (
        <>
          <div className="flex items-center justify-between px-3 py-1">
            <button
              type="button"
              onClick={() => setBodyOpen((o) => !o)}
              className="flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
            >
              {bodyOpen ? (
                <EyeOff size={10} strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <Eye size={10} strokeWidth={1.8} aria-hidden="true" />
              )}
              {bodyOpen
                ? isDe
                  ? "Ergebnis ausblenden"
                  : "Hide result"
                : isDe
                  ? `Ergebnis anzeigen (${tc.generatedBody.length} Zeichen)`
                  : `Show result (${tc.generatedBody.length} chars)`}
            </button>
            {bodyOpen && (
              <button
                type="button"
                onClick={handleCopyBody}
                className="inline-flex items-center gap-1 text-[10px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
              >
                {copied ? (
                  <>
                    <Check
                      size={10}
                      strokeWidth={1.8}
                      aria-hidden="true"
                      className="text-emerald-600"
                    />
                    {isDe ? "Kopiert" : "Copied"}
                  </>
                ) : (
                  <>
                    <Copy size={10} strokeWidth={1.8} aria-hidden="true" />
                    {isDe ? "Kopieren" : "Copy"}
                  </>
                )}
              </button>
            )}
          </div>
          {bodyOpen && (
            <pre className="mx-3 mb-3 text-[11.5px] text-[var(--atlas-text-primary)] bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] rounded p-3 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
              {tc.generatedBody}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */

export default function DraftingChatPage() {
  const { language } = useLanguage();
  const isDe = language === "de";
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeMandate, setActiveMandate] = useState<Mandate | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* Auto-scroll to bottom on new content. */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  /* Hydrate active mandate from store + re-pull after each turn so the
     header badge tracks set_active_mandate / create_mandate actions. */
  useEffect(() => {
    setActiveMandate(getActiveMandate());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!loading && turns.length > 0) setActiveMandate(getActiveMandate());
  }, [loading, turns.length]);

  const totalCost = useMemo(
    () => turns.reduce((s, t) => s + t.cost, 0),
    [turns],
  );

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newTurn: ChatTurn = {
      userMessage: userMsg,
      toolCalls: [],
      cost: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
    const draftedTurns = [...turns, newTurn];
    setTurns(draftedTurns);
    setInput("");
    setLoading(true);

    /* Build conversation history — only user + prior final-assistant
       messages. Intermediate tool-use/tool-result blocks aren't part
       of the persistent thread (engine is stateless, browser context
       conveys outcomes). MVP limitation: LLM may forget tool-history
       across turns; mitigated by the rich BrowserContext snapshot. */
    const messages: ChatMessage[] = [];
    for (const t of draftedTurns) {
      messages.push(t.userMessage);
      if (t.assistantMessage) messages.push(t.assistantMessage);
    }

    const ctx = buildBrowserContext({ outputLang: isDe ? "de" : "en" });

    try {
      const res = await fetch("/api/atlas/drafting/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages, context: ctx }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.error ||
            (res.status === 503
              ? "Drafting chat is not configured (missing ANTHROPIC_API_KEY)"
              : `HTTP ${res.status}`),
        );
      }

      const data: ChatTurnResponse = await res.json();
      applyActions(data.actions);

      setTurns((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (!last) return prev;
        updated[updated.length - 1] = {
          ...last,
          assistantMessage: data.assistantMessage,
          toolCalls: data.toolCalls,
          cost: data.estimatedCost,
          inputTokens: data.usage.inputTokens,
          outputTokens: data.usage.outputTokens,
        };
        return updated;
      });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setTurns((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (!last) return prev;
        updated[updated.length - 1] = { ...last, error: errMsg };
        return updated;
      });
    } finally {
      setLoading(false);
      /* Refocus input for the next turn. */
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--atlas-bg-page)]">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)]">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/atlas/drafting"
            className="inline-flex items-center gap-1 text-[11px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
          >
            <ArrowLeft size={11} strokeWidth={1.8} aria-hidden="true" />
            {isDe ? "Studio" : "Studio"}
          </Link>
          <span className="text-[var(--atlas-text-faint)]">·</span>
          <PenSquare className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          <h1 className="text-[16px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
            {isDe ? "Atlas Drafting Chat" : "Atlas Drafting Chat"}
          </h1>
          {activeMandate && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
              <Briefcase size={9} strokeWidth={1.8} aria-hidden="true" />
              {activeMandate.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10.5px] text-[var(--atlas-text-muted)]">
          {turns.length > 0 && (
            <span>
              {turns.length} {isDe ? "Turns" : "turns"} ·{" "}
              {formatCost(totalCost)}
            </span>
          )}
        </div>
      </header>

      {/* Conversation area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full"
      >
        {turns.length === 0 && hydrated && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 max-w-lg mx-auto">
            <Sparkles
              size={36}
              strokeWidth={1.2}
              aria-hidden="true"
              className="text-[var(--atlas-text-faint)]"
            />
            <h2 className="text-[16px] font-semibold text-[var(--atlas-text-primary)]">
              {isDe ? "Frag mich, was du brauchst" : "Tell me what you need"}
            </h2>
            <p className="text-[12.5px] text-[var(--atlas-text-secondary)] leading-relaxed">
              {isDe
                ? "Ich habe Zugriff auf deine Mandate, Plan-Workspaces und das Library. Ich kann Drafts generieren, Pakete instantiieren, Mandate erstellen, Mandanten-E-Mails parsen — alles im Chat. Versuch:"
                : "I have access to your mandates, plan workspaces, and library. I can generate drafts, instantiate packages, create mandates, parse client emails — all in chat. Try:"}
            </p>
            <ul className="text-[12px] text-[var(--atlas-text-muted)] leading-relaxed space-y-1.5 text-left">
              <li>
                ›{" "}
                {isDe
                  ? `"Erstelle einen mutual NDA für Sky-Sat und BHO Legal nach DE-Recht"`
                  : `"Draft a mutual NDA between Sky-Sat and BHO Legal under DE law"`}
              </li>
              <li>
                ›{" "}
                {isDe
                  ? `"Starte das DE-Authorization-Paket für den aktiven Mandanten"`
                  : `"Spin up the DE authorization package for the active mandate"`}
              </li>
              <li>
                ›{" "}
                {isDe
                  ? `"Brief mich zu NIS2 für Satellitenbetreiber"`
                  : `"Brief me on NIS2 for satellite operators"`}
              </li>
              <li>
                ›{" "}
                {isDe
                  ? `"Lege einen neuen Mandanten an: Aero-Partners SARL, FR-Konstellation, 6 LEO-Sats"`
                  : `"Create a new mandate: Aero-Partners SARL, FR constellation, 6 LEO sats"`}
              </li>
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-6">
          {turns.map((t, i) => (
            <div key={i} className="flex flex-col gap-3">
              {/* User bubble */}
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl bg-[var(--atlas-action-bg)] text-[var(--atlas-action-text)] px-4 py-2.5 text-[13px] whitespace-pre-wrap">
                  {extractText(t.userMessage.content)}
                </div>
              </div>

              {/* Assistant content */}
              <div className="flex flex-col gap-2">
                {/* Tool calls — render before final text since they
                    happened during the tool loop. */}
                {t.toolCalls.map((tc) => (
                  <ToolCallCard key={tc.id} tc={tc} isDe={isDe} />
                ))}

                {/* Loading indicator while server is processing. */}
                {!t.assistantMessage && !t.error && (
                  <div className="inline-flex items-center gap-2 text-[12px] text-[var(--atlas-text-muted)]">
                    <Loader2
                      size={12}
                      strokeWidth={1.8}
                      aria-hidden="true"
                      className="animate-spin"
                    />
                    {isDe ? "Astra arbeitet…" : "Astra is working…"}
                  </div>
                )}

                {/* Error message if turn failed. */}
                {t.error && (
                  <div className="rounded-md border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-3 py-2 flex items-start gap-2">
                    <AlertCircle
                      size={12}
                      strokeWidth={1.8}
                      aria-hidden="true"
                      className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
                    />
                    <div className="text-[11.5px] text-red-800 dark:text-red-200 leading-relaxed">
                      {t.error}
                    </div>
                  </div>
                )}

                {/* Final assistant text. */}
                {t.assistantMessage && (
                  <div className="text-[13px] text-[var(--atlas-text-primary)] leading-relaxed whitespace-pre-wrap">
                    {extractText(t.assistantMessage.content)}
                  </div>
                )}

                {/* Per-turn cost footer. */}
                {t.assistantMessage && (
                  <div className="text-[10px] text-[var(--atlas-text-faint)] mt-1">
                    {formatCost(t.cost)} · {t.inputTokens.toLocaleString()}↓ /{" "}
                    {t.outputTokens.toLocaleString()}↑ tok
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={
              isDe
                ? "Was brauchst du? (Enter senden, Shift+Enter Zeilenumbruch)"
                : "What do you need? (Enter to send, Shift+Enter for newline)"
            }
            disabled={loading}
            className="flex-1 rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-3 py-2 text-[13px] text-[var(--atlas-text-primary)] outline-none resize-none placeholder:text-[var(--atlas-text-faint)] disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--atlas-action-text)] text-[12px] font-medium px-4 py-2.5 transition-colors"
          >
            {loading ? (
              <Loader2
                size={12}
                strokeWidth={1.8}
                aria-hidden="true"
                className="animate-spin"
              />
            ) : (
              <Send size={12} strokeWidth={1.8} aria-hidden="true" />
            )}
            {isDe ? "Senden" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
