"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * ChatSidebar — slim left panel with:
 *   • conversation switcher (compressed list at the top)
 *   • scrollable message thread (middle)
 *   • input bar at the bottom
 *
 * Presentational: all chat state (messages, streaming, etc.) lives in
 * the parent `WorkspacePinboard` which owns the SSE wiring. That way
 * we can splice artifact-created events into the pinboard refresh
 * without plumbing refs through layers.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus,
  Trash2,
  MessageSquare,
  ChevronDown,
  Send,
  Loader2,
  Pin,
  Check as CheckIcon,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { LibrarySaveButton } from "@/components/atlas/ai-mode/LibrarySaveButton";

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
}

export interface ToolTrace {
  id: string;
  name: string;
  isError?: boolean;
  completed?: boolean;
  artifactId?: string;
  /** Phase R: server-formatted summary of the tool input args. */
  inputSummary?: string;
}

/** Phase 4 — Atlas Foresight. After the main answer streams, the
 *  server kicks off a small follow-up Claude call asking for 2-3
 *  concrete next-step actions, then emits them via the `foresight`
 *  SSE event. Each suggestion is a title (DE imperative) + a prompt
 *  that gets injected + sent if the lawyer clicks the chip. */
export interface ForesightSuggestion {
  id: string;
  title: string;
  prompt: string;
}

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string;
  streaming?: boolean;
  tools?: ToolTrace[];
  suggestions?: ForesightSuggestion[];
}

const TOOL_LABEL: Record<string, string> = {
  load_compliance_overview: "Compliance-Daten abgerufen",
  search_legal_sources: "Rechtsquellen durchsucht",
  compare_jurisdictions: "Jurisdiktionen verglichen",
  list_matter_documents: "Dokumenten-Vault abgefragt",
  draft_memo_to_note: "Memo gespeichert",
};

interface ChatSidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  messages: ChatMessage[];
  draft: string;
  streaming: boolean;
  error: string | null;
  /** Phase 2 — Memo Live-Pinning. When set, every paragraph in
   *  ASSISTANT messages renders a hover-📌 button that pins that
   *  paragraph to the matter pinboard as a TEXT artifact. Optional
   *  so the component can be reused outside the workspace flow. */
  matterId?: string;
  /** Called after a successful pin so the parent can refresh the
   *  pinboard. */
  onArtifactCreated?: () => void;
  /** Phase 4 — Atlas Foresight chip click. Bypasses the draft input
   *  and directly sends the suggested prompt as a new user message
   *  through the existing chat pipeline. Optional — chips simply
   *  don't render when this is undefined. */
  onSendPrompt?: (prompt: string) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onDraftChange: (v: string) => void;
  onSend: () => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  messages,
  draft,
  streaming,
  error,
  matterId,
  onArtifactCreated,
  onSendPrompt,
  onSelect,
  onCreate,
  onDelete,
  onDraftChange,
  onSend,
}: ChatSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  const active = conversations.find((c) => c.id === activeId);

  return (
    <aside
      className="
        flex flex-col h-full
        border-r border-white/[0.06] bg-black/40
        backdrop-blur-2xl
      "
    >
      {/* Conversation switcher */}
      <div className="flex-shrink-0 border-b border-white/[0.06]">
        <ConversationSwitcher
          conversations={conversations}
          activeId={activeId}
          onSelect={onSelect}
          onCreate={onCreate}
          onDelete={onDelete}
        />
      </div>

      {/* Active title */}
      {active && (
        <div className="px-3 py-2 border-b border-white/[0.04]">
          <div className="text-[10px] tracking-[0.18em] uppercase text-white/35">
            Gespräch
          </div>
          <div className="text-[12px] font-medium text-white/80 truncate">
            {active.title}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
      >
        {messages.length === 0 && (
          <div className="text-center py-8 text-[11px] text-white/35">
            Stelle eine Frage. Claude kennt diesen Mandant.
          </div>
        )}
        {messages.map((m, i) => {
          // Walk backwards from this index to the most recent USER
          // message — that's the question that produced this answer.
          // Used for Library-save provenance (Phase 5).
          let precedingUserText: string | undefined;
          for (let j = i - 1; j >= 0; j--) {
            if (messages[j].role === "USER") {
              precedingUserText = messages[j].content;
              break;
            }
          }
          return (
            <MessageRow
              key={m.id}
              message={m}
              matterId={matterId}
              onArtifactCreated={onArtifactCreated}
              onSendPrompt={onSendPrompt}
              precedingUserText={precedingUserText}
            />
          );
        })}
      </div>

      {error && (
        <div className="flex-shrink-0 px-3 py-1.5 text-[11px] text-red-400 border-t border-red-500/20 bg-red-500/[0.03]">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/[0.06] p-2.5">
        <div className="flex items-end gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 focus-within:border-white/20 transition">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frag Atlas zum Mandat…"
            rows={1}
            disabled={streaming}
            className="flex-1 bg-transparent outline-none text-[12px] text-white placeholder:text-white/30 resize-none py-0.5 leading-relaxed max-h-[120px]"
          />
          <button
            onClick={onSend}
            disabled={!draft.trim() || streaming}
            title="Senden"
            className="p-1.5 rounded-md bg-white text-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90"
          >
            {streaming ? (
              <Loader2 size={12} strokeWidth={2} className="animate-spin" />
            ) : (
              <Send size={12} strokeWidth={2} />
            )}
          </button>
        </div>
        {/* P1-Compliance · KI-VO Art. 50 Transparenz-Hinweis im
            Mandat-Chat. Erinnert die Anwältin / den Anwalt vor jedem
            Send daran, dass Atlas-Antworten anwaltlich zu prüfen sind
            bevor sie an den Mandanten gehen. */}
        <p className="mt-2 text-[9.5px] leading-relaxed text-white/30 text-center">
          Atlas ist KI-Assistenz · Beratungsmittel, keine Rechtsberatung · vor
          Verwendung beim Mandanten prüfen.{" "}
          <a
            href="/legal/ai-disclosure"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted text-white/45 hover:text-white/80 transition"
          >
            Mehr
          </a>
        </p>
      </div>
    </aside>
  );
}

// ─── Conversation switcher (collapsible dropdown) ────────────────────

function ConversationSwitcher({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  const active = conversations.find((c) => c.id === activeId);

  return (
    <details className="group">
      <summary className="list-none cursor-pointer flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.02] transition">
        <MessageSquare
          size={11}
          strokeWidth={1.8}
          className="text-white/50 flex-shrink-0"
        />
        <span className="text-[11px] text-white/60 flex-1 truncate">
          {active
            ? `${active.title} · ${conversations.length} Gespräch${
                conversations.length === 1 ? "" : "e"
              }`
            : `${conversations.length} Gespräch${
                conversations.length === 1 ? "" : "e"
              }`}
        </span>
        <ChevronDown
          size={11}
          strokeWidth={1.8}
          className="text-white/40 flex-shrink-0 transition group-open:rotate-180"
        />
      </summary>
      <ul className="max-h-60 overflow-y-auto px-1 pb-1.5 space-y-0.5">
        <li>
          <button
            onClick={onCreate}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-white/70 hover:text-white hover:bg-white/[0.04] transition"
          >
            <Plus size={11} strokeWidth={1.8} />
            Neues Gespräch
          </button>
        </li>
        {conversations.map((c) => (
          <li key={c.id} className="group/conv">
            <div
              className={`flex items-start gap-1.5 px-2 py-1.5 rounded-md transition ${
                c.id === activeId
                  ? "bg-white/[0.06] text-white"
                  : "hover:bg-white/[0.03] text-white/65"
              }`}
            >
              <button
                onClick={() => onSelect(c.id)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="text-[11px] font-medium truncate">
                  {c.title}
                </div>
                <div className="text-[9px] text-white/35 mt-0.5 tabular-nums">
                  {c.messageCount} Nachr. ·{" "}
                  {new Date(c.lastMessageAt).toLocaleDateString("de-DE")}
                </div>
              </button>
              <button
                onClick={() => onDelete(c.id)}
                className="opacity-0 group-hover/conv:opacity-100 text-white/40 hover:text-red-400 transition p-0.5"
                title="Löschen"
              >
                <Trash2 size={10} strokeWidth={1.8} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

// ─── Single message row ──────────────────────────────────────────────

function MessageRow({
  message,
  matterId,
  onArtifactCreated,
  onSendPrompt,
  precedingUserText,
}: {
  message: ChatMessage;
  matterId?: string;
  onArtifactCreated?: () => void;
  onSendPrompt?: (prompt: string) => void;
  /** The user question that produced this assistant message (for
   *  Phase 5 library-save context). */
  precedingUserText?: string;
}) {
  const isUser = message.role === "USER";
  // Phase 2 — Memo Live-Pinning: assistant paragraphs gain a hover-📌
  // button that pins them as TEXT artifacts. The custom `p` override
  // below wraps each paragraph in a PinnableParagraph component which
  // owns the per-paragraph pin state.
  const pinEnabled = !isUser && Boolean(matterId);
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[95%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
          isUser
            ? "bg-white/10 text-white/95 rounded-tr-sm"
            : "bg-white/[0.025] text-white/85 rounded-tl-sm"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <>
            {/* Tool traces → compact chips, each signals a card on the right */}
            {message.tools && message.tools.length > 0 && (
              <div className="mb-1.5 flex flex-col gap-1">
                {message.tools.map((t) => (
                  <div
                    key={t.id}
                    className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md self-start ${
                      t.isError
                        ? "bg-red-500/10 text-red-300 ring-1 ring-red-500/30"
                        : t.artifactId
                          ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
                          : t.completed
                            ? "bg-white/[0.06] text-white/70 ring-1 ring-white/10"
                            : "bg-white/[0.04] text-white/55 ring-1 ring-white/10"
                    }`}
                  >
                    <span className="text-[8px]">
                      {t.isError
                        ? "⚠"
                        : t.artifactId
                          ? "📌"
                          : t.completed
                            ? "✓"
                            : "•"}
                    </span>
                    <span className="font-medium">
                      {TOOL_LABEL[t.name] ?? t.name}
                    </span>
                    {t.inputSummary && (
                      <span className="text-[9px] opacity-65 max-w-[180px] truncate">
                        · {t.inputSummary}
                      </span>
                    )}
                    {!t.completed && (
                      <span className="text-[9px] opacity-70 animate-pulse">
                        …
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="markdown text-[12px] leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={
                  pinEnabled && matterId
                    ? {
                        p: ({ children }) => (
                          <PinnableParagraph
                            matterId={matterId}
                            onPinned={onArtifactCreated}
                          >
                            {children}
                          </PinnableParagraph>
                        ),
                      }
                    : undefined
                }
              >
                {message.content || (message.streaming ? " " : "")}
              </ReactMarkdown>
              {message.streaming && (
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
              )}
            </div>
            {/* Phase 5 — Library save chip. Persists the whole answer
                (markdown + citations) to the lawyer's cross-matter
                personal library. Different scope from the per-
                paragraph pin button (which targets the matter pinboard).
                Visible only after streaming completes. */}
            {!message.streaming && message.content.trim().length > 30 && (
              <div className="mt-2 flex justify-end">
                <LibrarySaveButton
                  variant="compact"
                  content={message.content}
                  query={precedingUserText}
                  sourceKind="MATTER_CHAT"
                  sourceMatterId={matterId}
                />
              </div>
            )}
            {/* Phase 4 — Atlas Foresight chips. Render only after the
                main answer has finished streaming AND the foresight
                event has populated suggestions. Each chip click
                bypasses the draft input and sends the suggested
                prompt as a fresh user message through the existing
                chat pipeline. */}
            {!message.streaming &&
              message.suggestions &&
              message.suggestions.length > 0 &&
              onSendPrompt && (
                <ForesightChips
                  suggestions={message.suggestions}
                  onSelect={onSendPrompt}
                />
              )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── ForesightChips (Phase 4) ────────────────────────────────────────
//
// Renders 2-3 next-step suggestions below an Atlas message. Each chip
// is a single-line action title; click sends the underlying prompt
// through the chat pipeline as if the lawyer typed it. The opening
// row label "Atlas schlägt vor:" anchors the chips so they read as
// guidance, not an Atlas continuation.
//
// Animation: fade + slide-up on first paint. The chips arrive ~1-2s
// after the main answer (the foresight Claude call adds that latency)
// so the soft entrance reads as "here's a postscript", not "more
// content arriving".

function ForesightChips({
  suggestions,
  onSelect,
}: {
  suggestions: ForesightSuggestion[];
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="mt-2 pt-2 border-t border-white/[0.04] animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles
          size={9}
          strokeWidth={1.8}
          className="text-emerald-300/80"
          aria-hidden="true"
        />
        <span className="text-[9px] tracking-[0.2em] uppercase text-white/40 font-semibold">
          Atlas schlägt vor
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {suggestions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.prompt)}
            title={s.prompt}
            className="
              group/chip inline-flex items-center gap-1.5 self-start
              text-left text-[11px] leading-snug
              text-white/65 hover:text-white
              bg-white/[0.025] hover:bg-emerald-500/10
              ring-1 ring-white/[0.06] hover:ring-emerald-500/30
              rounded-md px-2 py-1
              transition-all duration-150
            "
          >
            <ArrowUpRight
              size={10}
              strokeWidth={1.7}
              className="text-white/35 group-hover/chip:text-emerald-300 flex-shrink-0 mt-px transition-colors"
            />
            <span className="line-clamp-2">{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── PinnableParagraph (Phase 2 — Memo Live-Pinning) ─────────────────
//
// Wraps a markdown paragraph with a hover-📌 button. Click extracts
// the paragraph's plain text, POSTs to the matter's artifacts endpoint
// as a TEXT card, animates a brief "✓ Gepinnt" confirmation, then
// fires onPinned() so the parent refreshes the pinboard.
//
// Why TEXT not MEMO: the artifacts POST endpoint is intentionally
// scoped to TEXT (sticky-note kind). MEMO carries structured payloads
// from tool execution with the scope-gated audit log, and exposing
// MEMO creation client-side would bypass that gate. A pinned excerpt
// from an Atlas answer is conceptually "lawyer-curated note" — TEXT
// is the right kind. The card on the pinboard renders the excerpt
// faithfully and the lawyer can re-title it if needed.

function PinnableParagraph({
  matterId,
  onPinned,
  children,
}: {
  matterId: string;
  onPinned?: () => void;
  children: ReactNode;
}) {
  const [state, setState] = useState<"idle" | "pinning" | "done" | "error">(
    "idle",
  );

  async function handlePin(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (state !== "idle") return;
    const text = childrenToText(children).trim();
    if (text.length < 2) return;
    setState("pinning");
    try {
      const title = text.length > 60 ? `${text.slice(0, 58).trimEnd()}…` : text;
      const res = await fetch(`/api/network/matter/${matterId}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: text }),
      });
      if (!res.ok) {
        setState("error");
        setTimeout(() => setState("idle"), 1600);
        return;
      }
      setState("done");
      onPinned?.();
      // Auto-revert after a beat so the user can pin a sibling
      // paragraph without re-hovering the message bubble.
      setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 1600);
    }
  }

  return (
    <div className="group relative pr-6 -mr-1 my-1">
      <p className="m-0">{children}</p>
      <button
        type="button"
        onClick={handlePin}
        disabled={state !== "idle" && state !== "error"}
        title="An Pinboard heften"
        className={`
          absolute right-0 top-0 inline-flex items-center justify-center
          w-5 h-5 rounded-md transition-all duration-150
          ${
            state === "done"
              ? "bg-emerald-500/20 text-emerald-300 opacity-100"
              : state === "error"
                ? "bg-red-500/15 text-red-300 opacity-100"
                : state === "pinning"
                  ? "bg-white/[0.08] text-white/70 opacity-100"
                  : "bg-white/[0.04] text-white/45 opacity-0 group-hover:opacity-100 hover:bg-emerald-500/15 hover:text-emerald-300"
          }
        `}
        aria-label="An Pinboard heften"
      >
        {state === "done" ? (
          <CheckIcon size={11} strokeWidth={2} />
        ) : state === "pinning" ? (
          <Loader2 size={10} strokeWidth={2} className="animate-spin" />
        ) : (
          <Pin size={10} strokeWidth={1.8} />
        )}
      </button>
    </div>
  );
}

/** Recursively flatten react-markdown's parsed children into a string.
 *  Handles plain-text leaves, numeric leaves, arrays, and nested
 *  React elements (e.g. `<strong>`, `<em>`) by reading their children
 *  prop. Links + code spans flatten to their visible text. */
function childrenToText(children: ReactNode): string {
  if (children == null || children === false) return "";
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(childrenToText).join("");
  if (
    typeof children === "object" &&
    children !== null &&
    "props" in children
  ) {
    const props = (children as { props?: { children?: ReactNode } }).props;
    return childrenToText(props?.children);
  }
  return "";
}
