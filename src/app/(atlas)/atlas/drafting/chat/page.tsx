"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /atlas/drafting/chat — Drafting Chat (Bundle 46, redesigned 47).
 *
 * Harvey-style conversational drafting surface. Marie types in natural
 * prose, Astra runs a tool-use loop server-side, generates real draft
 * bodies via Anthropic, and applies state mutations to her localStorage
 * stores.
 *
 * Design principles (Bundle 47 redesign):
 *   - Center content, max-w-3xl. No full-bleed marketing-page feel.
 *   - No heavy bubbles — assistant text reads like prose, user input
 *     gets a subtle right-aligned pill.
 *   - Tool calls render as compact inline pills, expandable.
 *   - Empty state: hero + 4 clickable prompt cards (click fills input).
 *   - Input: floating glass card at the bottom, large enough to feel
 *     like a command box, not a textarea.
 *   - Maximum transparency: every prompt + body + token count + cost
 *     is one click away.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Send,
  Sparkles,
  AlertCircle,
  Loader2,
  ChevronDown,
  Briefcase,
  Eye,
  Copy,
  Check,
  ArrowUpRight,
  Wrench,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { buildBrowserContext } from "@/lib/atlas/drafting-chat/browser-context";
import { applyActions } from "@/lib/atlas/drafting-chat/action-executor";
import {
  AtlasChatPrivacyBanner,
  AtlasChatPrivacyModal,
  useChatPrivacyGate,
} from "@/components/atlas/AtlasChatPrivacyGate";
import type {
  ChatMessage,
  ChatContentBlock,
  ChatTurnResponse,
  ToolCallRecord,
} from "@/lib/atlas/drafting-chat/types";
import { getActiveMandate, type Mandate } from "@/lib/atlas/mandate-store";

/* ── Per-turn local state ─────────────────────────────────────────── */

interface ChatTurn {
  userMessage: ChatMessage;
  assistantMessage?: ChatMessage;
  toolCalls: ToolCallRecord[];
  cost: number;
  inputTokens: number;
  outputTokens: number;
  error?: string;
}

/* ── Small helpers ────────────────────────────────────────────────── */

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
  if (usd === 0) return "—";
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ── Example-prompt cards for the empty state ─────────────────────── */

interface PromptExample {
  label: { de: string; en: string };
  prompt: { de: string; en: string };
  icon: typeof Sparkles;
  accent: string;
}

const EXAMPLES: PromptExample[] = [
  {
    label: {
      de: "DE-Filing-Paket starten",
      en: "Spin up DE filing package",
    },
    prompt: {
      de: "Starte das DE-Authorization-Paket für den aktiven Mandanten.",
      en: "Spin up the DE authorization package for the active mandate.",
    },
    icon: Zap,
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: {
      de: "NDA generieren",
      en: "Generate NDA",
    },
    prompt: {
      de: "Erstelle einen mutual NDA für Sky-Sat und BHO Legal nach DE-Recht, 5 Jahre Laufzeit.",
      en: "Draft a mutual NDA between Sky-Sat and BHO Legal under DE law, 5-year term.",
    },
    icon: Sparkles,
    accent: "text-amber-600 dark:text-amber-400",
  },
  {
    label: {
      de: "Mandant anlegen",
      en: "Create mandate",
    },
    prompt: {
      de: "Lege einen neuen Mandanten an: Aero-Partners SARL, FR, satellite operator, 6 LEO-Sats Ka-Band 28/18 GHz, Launch Q3/2027.",
      en: "Create a new mandate: Aero-Partners SARL, FR, satellite operator, 6 LEO sats Ka-band 28/18 GHz, launch Q3/2027.",
    },
    icon: Briefcase,
    accent: "text-blue-600 dark:text-blue-400",
  },
  {
    label: {
      de: "NIS2-Briefing",
      en: "NIS2 briefing",
    },
    prompt: {
      de: "Brief mich zu NIS2-Pflichten für Satellitenbetreiber — Klassifizierung, Art. 21 Maßnahmen, Reporting an BSI.",
      en: "Brief me on NIS2 obligations for satellite operators — classification, Art. 21 measures, BSI reporting.",
    },
    icon: Sparkles,
    accent: "text-violet-600 dark:text-violet-400",
  },
];

/* ── Tool-call card (compact, expandable) ─────────────────────────── */

function ToolCallCard({ tc, isDe }: { tc: ToolCallRecord; isDe: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const ok = tc.status === "complete";

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

  /* Display name — strip the snake_case for friendliness. */
  const displayName = tc.name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] overflow-hidden">
      {/* Header — always visible, click to expand */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
      >
        <span
          className={`flex items-center justify-center w-5 h-5 rounded-md ${
            ok
              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
          }`}
        >
          {ok ? (
            <CheckCircle2 size={11} strokeWidth={2} aria-hidden="true" />
          ) : (
            <XCircle size={11} strokeWidth={2} aria-hidden="true" />
          )}
        </span>
        <Wrench
          size={11}
          strokeWidth={1.8}
          aria-hidden="true"
          className="text-[var(--atlas-text-faint)]"
        />
        <span className="text-[12.5px] font-medium text-[var(--atlas-text-primary)]">
          {displayName}
        </span>
        <span className="text-[10.5px] text-[var(--atlas-text-faint)] ml-auto flex items-center gap-2">
          {formatDuration(tc.durationMs)}
          {tc.outputTokens !== undefined && tc.outputTokens > 0 && (
            <span>{tc.outputTokens.toLocaleString()} tok</span>
          )}
          <ChevronDown
            size={11}
            strokeWidth={1.8}
            aria-hidden="true"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-[var(--atlas-border-subtle)] px-3.5 py-3 flex flex-col gap-3 text-[11.5px]">
          {tc.error && (
            <div className="text-red-700 dark:text-red-400 italic">
              {tc.error}
            </div>
          )}

          {/* Args */}
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1.5">
              {isDe ? "Argumente" : "Arguments"}
            </div>
            <pre className="text-[10.5px] text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded-md p-2.5 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
              {JSON.stringify(tc.input, null, 2)}
            </pre>
          </div>

          {/* Generated prompt — for draft-generating tools */}
          {tc.generatedPrompt && (
            <details>
              <summary className="cursor-pointer text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors">
                {isDe ? "Generierter Prompt" : "Generated prompt"}
              </summary>
              <pre className="mt-1.5 text-[10.5px] text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded-md p-2.5 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                {tc.generatedPrompt}
              </pre>
            </details>
          )}

          {/* Generated body — main payload */}
          {tc.generatedBody && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)]">
                  {isDe ? "Ergebnis" : "Result"}
                  <span className="ml-2 text-[var(--atlas-text-faint)] normal-case font-normal tracking-normal">
                    {tc.generatedBody.length.toLocaleString()}{" "}
                    {isDe ? "Zeichen" : "chars"}
                  </span>
                </div>
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
              </div>
              <pre className="text-[12px] text-[var(--atlas-text-primary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded-md p-3 whitespace-pre-wrap font-mono max-h-[28rem] overflow-y-auto leading-relaxed">
                {tc.generatedBody}
              </pre>
            </div>
          )}
        </div>
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

  /* Hydrate active mandate from store + re-pull after each turn. */
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

  /* Compliance-Audit 2026-05: chat-privacy gate. Drafting chat is the
     higher-risk surface because it serialises full mandate identity
     into every turn's BrowserContext snapshot (see
     lib/atlas/drafting-chat/browser-context.ts). The informed-consent
     ack matters here, not less. */
  const privacyGate = useChatPrivacyGate(language);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    /* Gate before any work. gate() runs the queued submit
       synchronously when consent already exists; otherwise opens the
       modal and runs it from `accept`. */
    privacyGate.gate(() => {
      void runSend(text);
    });
  };

  const runSend = async (text: string): Promise<void> => {
    const userMsg: ChatMessage = { role: "user", content: text };
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

    /* Conversation history — only user + prior final-assistant
       messages. (See engine.server.ts for the stateless rationale.) */
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
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const handleExampleClick = (text: string) => {
    setInput(text);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--atlas-bg-page)]">
      {/* ── Header — minimal, monochrome ─────────────────────────── */}
      <header className="flex items-center justify-between gap-3 flex-wrap px-5 py-3 border-b border-[var(--atlas-border-subtle)]">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/atlas/drafting"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
          >
            <ArrowLeft size={12} strokeWidth={1.8} aria-hidden="true" />
            {isDe ? "Studio" : "Studio"}
          </Link>
          <span className="text-[var(--atlas-text-faint)] select-none">·</span>
          <h1 className="text-[14px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
            {isDe ? "Drafting Chat" : "Drafting Chat"}
          </h1>
          {activeMandate && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 text-[10.5px] font-medium text-emerald-800 dark:text-emerald-300">
              <Briefcase size={9} strokeWidth={2} aria-hidden="true" />
              {activeMandate.name}
            </span>
          )}
        </div>
        {turns.length > 0 && (
          <div className="text-[10.5px] text-[var(--atlas-text-faint)] tabular-nums">
            {turns.length} {isDe ? "Turns" : "turns"} · {formatCost(totalCost)}
          </div>
        )}
      </header>

      {/* ── Conversation area ────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Empty state */}
        {turns.length === 0 && hydrated && (
          <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
            <div className="max-w-2xl w-full text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 mb-6">
                <Sparkles
                  size={22}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <h2 className="text-[28px] font-semibold tracking-tight text-[var(--atlas-text-primary)] mb-3">
                {isDe ? "Was brauchst du heute?" : "What do you need today?"}
              </h2>
              <p className="text-[14px] text-[var(--atlas-text-secondary)] leading-relaxed max-w-xl mx-auto mb-10">
                {isDe ? (
                  <>
                    Ich habe Zugriff auf deine Mandate, Plan-Workspaces und
                    Library. Drafts generieren, Pakete instantiieren, Mandanten
                    anlegen, Klausel-E-Mails parsen — alles im Chat.
                  </>
                ) : (
                  <>
                    I have access to your mandates, plan workspaces, and
                    library. Generate drafts, instantiate packages, create
                    mandates, parse client emails — all in chat.
                  </>
                )}
              </p>

              {/* Clickable prompt cards in a 2x2 grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                {EXAMPLES.map((ex) => {
                  const Icon = ex.icon;
                  return (
                    <button
                      key={ex.label.en}
                      type="button"
                      onClick={() =>
                        handleExampleClick(isDe ? ex.prompt.de : ex.prompt.en)
                      }
                      className="group flex items-start gap-3 rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] hover:border-[var(--atlas-border-strong)] hover:bg-[var(--atlas-bg-surface-muted)] p-3.5 transition-all text-left"
                    >
                      <span className={`flex-shrink-0 mt-0.5 ${ex.accent}`}>
                        <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12.5px] font-medium text-[var(--atlas-text-primary)] mb-1">
                          {isDe ? ex.label.de : ex.label.en}
                        </span>
                        <span className="block text-[11.5px] text-[var(--atlas-text-muted)] leading-relaxed line-clamp-2">
                          {isDe ? ex.prompt.de : ex.prompt.en}
                        </span>
                      </span>
                      <ArrowUpRight
                        size={12}
                        strokeWidth={1.8}
                        aria-hidden="true"
                        className="flex-shrink-0 text-[var(--atlas-text-faint)] group-hover:text-[var(--atlas-text-primary)] transition-colors mt-0.5"
                      />
                    </button>
                  );
                })}
              </div>

              {!activeMandate && (
                <p className="mt-8 text-[10.5px] text-[var(--atlas-text-faint)] italic">
                  {isDe
                    ? "Tipp: Lege erst einen Mandanten an, dann fühlt sich alles persönlicher an."
                    : "Tip: create a mandate first — every subsequent draft auto-uses its context."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Conversation */}
        {turns.length > 0 && (
          <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-10">
            {turns.map((t, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {/* User message — subtle right-aligned pill */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-4 py-2.5 text-[13.5px] text-[var(--atlas-text-primary)] whitespace-pre-wrap leading-relaxed">
                    {extractText(t.userMessage.content)}
                  </div>
                </div>

                {/* Assistant content — left-aligned, no bubble */}
                <div className="flex flex-col gap-3">
                  {/* Tool calls — compact pill cards */}
                  {t.toolCalls.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {t.toolCalls.map((tc) => (
                        <ToolCallCard key={tc.id} tc={tc} isDe={isDe} />
                      ))}
                    </div>
                  )}

                  {/* Loading indicator */}
                  {!t.assistantMessage && !t.error && (
                    <div className="inline-flex items-center gap-2 text-[12.5px] text-[var(--atlas-text-muted)]">
                      <Loader2
                        size={12}
                        strokeWidth={1.8}
                        aria-hidden="true"
                        className="animate-spin"
                      />
                      {isDe ? "Astra arbeitet…" : "Astra is working…"}
                    </div>
                  )}

                  {/* Error */}
                  {t.error && (
                    <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3.5 py-2.5 flex items-start gap-2.5">
                      <AlertCircle
                        size={14}
                        strokeWidth={1.8}
                        aria-hidden="true"
                        className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
                      />
                      <div className="text-[12px] text-red-800 dark:text-red-200 leading-relaxed">
                        {t.error}
                      </div>
                    </div>
                  )}

                  {/* Final assistant text — clean prose */}
                  {t.assistantMessage && (
                    <div className="text-[13.5px] text-[var(--atlas-text-primary)] leading-[1.7] whitespace-pre-wrap">
                      {extractText(t.assistantMessage.content)}
                    </div>
                  )}

                  {/* Per-turn footer */}
                  {t.assistantMessage && (
                    <div className="text-[10px] text-[var(--atlas-text-faint)] tabular-nums">
                      {formatCost(t.cost)} · {t.inputTokens.toLocaleString()}↓ /{" "}
                      {t.outputTokens.toLocaleString()}↑ tok
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Input bar — floating glass card ──────────────────────── */}
      <div className="px-6 pb-6 pt-3">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm focus-within:border-[var(--atlas-border-strong)] focus-within:shadow-md transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={
                isDe
                  ? "Was brauchst du? — Enter senden, Shift+Enter Zeilenumbruch"
                  : "What do you need? — Enter to send, Shift+Enter for newline"
              }
              disabled={loading}
              className="w-full bg-transparent px-4 py-3.5 pr-14 text-[14px] text-[var(--atlas-text-primary)] outline-none resize-none placeholder:text-[var(--atlas-text-faint)] disabled:opacity-60 max-h-48"
              style={{ minHeight: "52px" }}
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!input.trim() || loading}
              aria-label={isDe ? "Senden" : "Send"}
              className="absolute right-2 bottom-2 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all"
            >
              {loading ? (
                <Loader2
                  size={14}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="animate-spin"
                />
              ) : (
                <Send size={14} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-[var(--atlas-text-faint)] text-center">
            {isDe
              ? "Astra hat Zugriff auf alle deine Drafting-Daten. Drafts werden mit Claude Sonnet generiert."
              : "Astra has access to all your drafting data. Drafts are generated with Claude Sonnet."}
          </p>
          {/* Compliance-Audit 2026-05 · § 203 StGB / DSGVO Banner.
              Persistent direkt unter dem Input. */}
          <div className="mt-3">
            <AtlasChatPrivacyBanner language={language} />
          </div>
        </div>
      </div>

      {privacyGate.modalOpen && (
        <AtlasChatPrivacyModal
          language={language}
          onAccept={privacyGate.accept}
          onCancel={privacyGate.cancel}
        />
      )}
    </div>
  );
}
