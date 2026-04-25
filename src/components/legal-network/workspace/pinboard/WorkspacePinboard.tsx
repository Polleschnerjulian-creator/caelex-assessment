"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * WorkspacePinboard — Phase 5 matter workspace shell.
 *
 * Two visual states, one component:
 *
 *   1. **Hero state** — no conversations exist yet. Full-screen centered
 *      prompt input (matches the Atlas AI Mode look). Submitting creates
 *      a conversation + sends the first message, transitioning to:
 *
 *   2. **Split state** — orb top-left, slim ChatSidebar on the left,
 *      masonry Pinboard on the right. Every tool call Claude makes
 *      materialises as a card on the pinboard.
 *
 * Owns SSE streaming logic (copied from ChatTab) — extra for Phase 5
 * is the `artifact_created` event which triggers `pinboardRef.refresh()`
 * so new cards appear without a full reload.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowUp, Loader2 } from "lucide-react";
import type { ScopeItem } from "@/lib/legal-network/scope";
import { MiniOrb } from "./MiniOrb";
import { Pinboard, type PinboardHandle } from "./Pinboard";
import {
  ChatSidebar,
  type ChatMessage,
  type ConversationSummary,
} from "./ChatSidebar";
import {
  MatterStatusBanner,
  shouldShowStatusBanner,
} from "./MatterStatusBanner";

interface MatterContext {
  id: string;
  name: string;
  reference: string | null;
  description: string | null;
  status: string;
  scope: ScopeItem[];
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  handshakeHash: string;
  acceptedAt: string | null;
  lawFirmOrg: { id: string; name: string; logoUrl: string | null };
  clientOrg: { id: string; name: string; logoUrl: string | null };
  _count: { accessLogs: number; invitations: number };
}

const HERO_SUGGESTIONS = [
  "Zeig mir den Compliance-Status des Mandanten.",
  "Such nach relevanten EU Space Act Artikeln für diesen Fall.",
  "Draft ein Memo zur NIS2-Einstufung.",
  "Welche Jurisdiktionen sind hier relevant?",
];

export function WorkspacePinboard({ matterId }: { matterId: string }) {
  const router = useRouter();
  const pinboardRef = useRef<PinboardHandle>(null);

  // ── Matter context ────────────────────────────────────────────
  const [matter, setMatter] = useState<MatterContext | null>(null);
  const [matterErr, setMatterErr] = useState<string | null>(null);

  const loadMatter = useCallback(async () => {
    try {
      const res = await fetch(`/api/network/matter/${matterId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Mandat nicht ladbar");
      setMatter(json.matter);
    } catch (err) {
      setMatterErr((err as Error).message);
    }
  }, [matterId]);

  useEffect(() => {
    loadMatter();
  }, [loadMatter]);

  // ── Conversations + messages ──────────────────────────────────
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [convLoaded, setConvLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/network/matter/${matterId}/conversations`);
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error ?? "Gespräche konnten nicht geladen werden");
      setConversations(json.conversations ?? []);
      setConvLoaded(true);
      // Select the newest conversation if none selected yet.
      if (!activeId && json.conversations?.length > 0) {
        setActiveId(json.conversations[0].id);
      }
    } catch (err) {
      setChatError((err as Error).message);
      setConvLoaded(true);
    }
  }, [matterId, activeId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for the active conversation
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
          setChatError(j.error ?? "Gespräch nicht ladbar");
          return;
        }
        setMessages(j.conversation?.messages ?? []);
      })
      .catch((e) => {
        if (!cancelled) setChatError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [matterId, activeId]);

  // ── Create conversation ────────────────────────────────────────
  const createConversation = useCallback(async (): Promise<string | null> => {
    const res = await fetch(`/api/network/matter/${matterId}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (!res.ok || !json.conversation) {
      setChatError(json.error ?? "Konnte Gespräch nicht erstellen");
      return null;
    }
    setActiveId(json.conversation.id);
    await loadConversations();
    return json.conversation.id as string;
  }, [matterId, loadConversations]);

  const deleteConversation = useCallback(
    async (cid: string) => {
      if (!confirm("Gespräch (und alle Nachrichten) löschen?")) return;
      await fetch(`/api/network/matter/${matterId}/conversations/${cid}`, {
        method: "DELETE",
      });
      if (activeId === cid) setActiveId(null);
      await loadConversations();
    },
    [matterId, activeId, loadConversations],
  );

  // ── Send message ─────────────────────────────────────────────
  //
  // Accepts an optional targetConversationId so the hero path can
  // create + send in one call without waiting for React state to
  // commit the new activeId.
  const sendMessage = useCallback(
    async (content: string, targetConversationId?: string) => {
      const cid = targetConversationId ?? activeId;
      if (!cid || !content.trim() || streaming) return;
      const trimmed = content.trim();
      setDraft("");
      setChatError(null);

      const optimisticUserId = `tmp-user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticUserId,
          role: "USER",
          content: trimmed,
          createdAt: new Date().toISOString(),
        },
      ]);
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

      try {
        const res = await fetch(
          `/api/network/matter/${matterId}/conversations/${cid}/message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: trimmed }),
          },
        );
        if (res.status === 429)
          throw new Error("Rate limit — kurz warten und nochmal.");
        if (res.status === 409)
          throw new Error("Mandat ist nicht aktiv. Chat nicht möglich.");
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "Verbindung fehlgeschlagen");
        }

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
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === optimisticUserId ? { ...m, id: evt.messageId } : m,
                  ),
                );
              } else if (evt.type === "tool_use_start") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamingId
                      ? {
                          ...m,
                          tools: [
                            ...(m.tools ?? []),
                            {
                              id: evt.id,
                              name: evt.name,
                              completed: false,
                              // Phase R: humanised input summary
                              inputSummary: evt.inputSummary,
                            },
                          ],
                        }
                      : m,
                  ),
                );
              } else if (evt.type === "tool_use_result") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamingId
                      ? {
                          ...m,
                          tools: (m.tools ?? []).map((t) =>
                            t.id === evt.id
                              ? {
                                  ...t,
                                  completed: true,
                                  isError: !!evt.isError,
                                }
                              : t,
                          ),
                        }
                      : m,
                  ),
                );
              } else if (evt.type === "artifact_created") {
                // New card — refresh the pinboard
                pinboardRef.current?.refresh();
                // Tag the matching tool trace with artifactId for
                // the "📌 pinned" visual signal.
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamingId
                      ? {
                          ...m,
                          tools: (m.tools ?? []).map((t) =>
                            t.name === evt.tool && !t.artifactId
                              ? { ...t, artifactId: evt.artifactId }
                              : t,
                          ),
                        }
                      : m,
                  ),
                );
              } else if (evt.type === "tool_limit_reached") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamingId
                      ? {
                          ...m,
                          content:
                            m.content +
                            "\n\n_Hinweis: Tool-Loop-Limit erreicht._",
                        }
                      : m,
                  ),
                );
              } else if (evt.type === "done") {
                if (rafId) cancelAnimationFrame(rafId);
                flush();
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamingId
                      ? { ...m, id: evt.messageId, streaming: false }
                      : m,
                  ),
                );
              } else if (evt.type === "foresight") {
                // Phase 4 — Atlas Foresight. Event arrives ~1-2s after
                // `done`, addressed by the post-done messageId. Attach
                // suggestions to that assistant message so the chip row
                // renders below the answer. Fire-and-forget — if the
                // user has already navigated away, the setMessages
                // call no-ops on a stale tree.
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === evt.messageId
                      ? { ...m, suggestions: evt.suggestions }
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

        if (rafId) cancelAnimationFrame(rafId);
        flush();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId ? { ...m, streaming: false } : m,
          ),
        );

        await loadConversations();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Fehler";
        setChatError(msg);
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
    },
    [matterId, activeId, streaming, loadConversations],
  );

  // Submit from the centered hero input: create a conversation THEN send.
  const onHeroSubmit = useCallback(
    async (content: string) => {
      if (!content.trim() || streaming) return;
      const cid = await createConversation();
      if (cid) await sendMessage(content, cid);
    },
    [createConversation, sendMessage, streaming],
  );

  // ── Loading & error states ─────────────────────────────────────
  if (matterErr && !matter) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-sm text-red-400">
          {matterErr} ·{" "}
          <button
            onClick={() => router.push("/atlas/network")}
            className="underline"
          >
            zurück
          </button>
        </div>
      </div>
    );
  }

  if (!matter) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-sm text-white/40 animate-pulse">Lade Mandat…</div>
      </div>
    );
  }

  // ── Empty state: no conversations → centered hero ─────────────
  // The hero handles two scenarios via the `isActive`-aware copy
  // inside it: ACTIVE shows the prompt input, anything else shows a
  // status banner explaining why chat is unavailable. Both look like
  // a hero (centered) when there are no conversations.
  const isActive = matter.status === "ACTIVE";
  const showHero = convLoaded && conversations.length === 0;

  if (showHero) {
    return (
      <WorkspaceHero
        matter={matter}
        onSubmit={onHeroSubmit}
        streaming={streaming}
        matterId={matterId}
        viewerSide="ATLAS"
      />
    );
  }

  // ── Active: split layout ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col">
      {/* Top bar — orb + breadcrumb */}
      <header className="flex-shrink-0 px-4 py-3 border-b border-white/[0.05] flex items-center gap-3">
        <MiniOrb active={streaming} size={28} />
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link
            href={`/atlas/network/${matterId}`}
            className="text-[10px] text-white/40 hover:text-white/70 transition flex-shrink-0"
          >
            ← Details
          </Link>
          <span className="text-white/20">·</span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/40 truncate">
            {matter.clientOrg.name}
          </span>
          <StatusPill status={matter.status} />
          <span className="text-white/20 hidden md:inline">·</span>
          <h1 className="text-[13px] font-medium text-white/90 truncate hidden md:block">
            {matter.name}
          </h1>
        </div>
        <div className="flex-shrink-0 flex items-center gap-3 text-[10px] text-white/35">
          {matter.reference && <span>Ref. {matter.reference}</span>}
          {matter.effectiveUntil && (
            <span>
              bis {new Date(matter.effectiveUntil).toLocaleDateString("de-DE")}
            </span>
          )}
        </div>
      </header>

      {/* Status banner — only renders when matter is non-ACTIVE.
          Sits above the grid so the user immediately sees why chat
          is locked even though history is still browseable. */}
      {!isActive && shouldShowStatusBanner(matter.status) && (
        <div className="flex-shrink-0">
          <MatterStatusBanner
            status={matter.status}
            matterId={matterId}
            counterpartyName={matter.clientOrg.name}
            viewerSide="ATLAS"
          />
        </div>
      )}

      {/* Main: two-column split */}
      <div className="flex-1 min-h-0 grid grid-cols-[320px_1fr]">
        <ChatSidebar
          conversations={conversations}
          activeId={activeId}
          messages={messages}
          draft={draft}
          streaming={streaming || !isActive}
          error={chatError}
          matterId={matterId}
          onArtifactCreated={() => pinboardRef.current?.refresh()}
          onSendPrompt={(prompt) => sendMessage(prompt)}
          onSelect={setActiveId}
          onCreate={async () => {
            await createConversation();
          }}
          onDelete={deleteConversation}
          onDraftChange={setDraft}
          onSend={() => sendMessage(draft)}
        />
        <main className="overflow-y-auto">
          <Pinboard ref={pinboardRef} matterId={matterId} />
        </main>
      </div>
    </div>
  );
}

// ─── Hero state ───────────────────────────────────────────────────────
// The empty-workspace look: centered prompt, matter context visible
// but quiet. Once the user sends anything, the whole layout transitions
// to split mode.

function WorkspaceHero({
  matter,
  onSubmit,
  streaming,
  matterId,
  viewerSide,
}: {
  matter: MatterContext;
  onSubmit: (content: string) => void | Promise<void>;
  streaming: boolean;
  matterId: string;
  viewerSide: "ATLAS" | "CAELEX";
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Active matters get the prompt input; everything else (PENDING_*,
  // SUSPENDED, REVOKED, CLOSED) shows the status banner explaining
  // why chat is unavailable + what the next action is.
  const isActive = matter.status === "ACTIVE";

  useEffect(() => {
    if (isActive) textareaRef.current?.focus();
  }, [isActive]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !streaming) {
        onSubmit(value.trim());
      }
    }
  }

  return (
    <div className="relative min-h-screen bg-[#050608] text-white overflow-hidden">
      {/* Ambient background glow — softer when not active so the
          status banner gets the visual focus instead. */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: isActive
              ? "radial-gradient(circle, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0) 60%)"
              : "radial-gradient(circle, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 60%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Breadcrumb (quiet, top-left) */}
      <header className="absolute top-0 left-0 right-0 px-6 py-5 flex items-center gap-2 z-10">
        <Link
          href={`/atlas/network/${matterId}`}
          className="text-[10px] text-white/40 hover:text-white/70 transition"
        >
          ← Details
        </Link>
        <span className="text-white/20">·</span>
        <span className="text-[10px] tracking-[0.2em] uppercase text-white/40">
          {matter.clientOrg.name}
        </span>
        <span className="text-white/20">·</span>
        <span className="text-[10px] text-white/40 truncate">
          {matter.name}
        </span>
      </header>

      {/* Centered hero */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        {/* Big orb */}
        <div className="mb-6">
          <MiniOrb active={streaming} size={72} />
        </div>

        <h1 className="text-2xl md:text-3xl font-light text-center text-white/90 mb-2">
          Workspace für{" "}
          <span className="font-medium text-emerald-300">
            {matter.clientOrg.name}
          </span>
        </h1>
        <p className="text-[13px] text-white/45 text-center mb-8 max-w-md">
          {isActive
            ? "Stelle Claude eine Frage — jede Antwort wird auf dieses Mandat zugeschnitten. Tool-Ergebnisse landen hier als Karten."
            : "Mandat ist noch nicht aktiv. Sobald freigeschaltet, kannst du hier mit Claude arbeiten."}
        </p>

        {/* Status banner replaces input when matter is non-ACTIVE */}
        {!isActive && shouldShowStatusBanner(matter.status) && (
          <div className="w-full max-w-2xl">
            <MatterStatusBanner
              status={matter.status}
              matterId={matterId}
              counterpartyName={
                viewerSide === "ATLAS"
                  ? matter.clientOrg.name
                  : matter.lawFirmOrg.name
              }
              viewerSide={viewerSide}
            />
          </div>
        )}

        {/* Input — only when matter is ACTIVE */}
        {isActive && (
          <div className="w-full max-w-2xl">
            <div className="relative rounded-2xl border border-white/[0.1] bg-white/[0.025] backdrop-blur-2xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] focus-within:border-white/[0.22] transition">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Was soll Claude zu diesem Mandat herausfinden?"
                disabled={streaming}
                rows={2}
                className="w-full bg-transparent outline-none resize-none text-[14px] text-white placeholder:text-white/35 px-5 pt-4 pb-12 leading-relaxed"
              />
              <button
                onClick={() => {
                  if (value.trim() && !streaming) onSubmit(value.trim());
                }}
                disabled={!value.trim() || streaming}
                className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition"
                title="Senden"
              >
                {streaming ? (
                  <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                ) : (
                  <ArrowUp size={14} strokeWidth={2.2} />
                )}
              </button>
              <div className="absolute bottom-3 left-4 text-[10px] text-white/25">
                Enter zum Senden · Shift+Enter für neue Zeile
              </div>
            </div>

            {/* Suggestions */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {HERO_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setValue(s);
                    textareaRef.current?.focus();
                  }}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-white/[0.08] text-white/55 hover:text-white hover:border-white/20 hover:bg-white/[0.03] transition"
                >
                  <Sparkles
                    size={9}
                    strokeWidth={1.8}
                    className="inline mr-1.5 -mt-0.5"
                  />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status pill ─────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const color =
    status === "ACTIVE"
      ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40"
      : status === "SUSPENDED"
        ? "bg-amber-500/20 text-amber-300 ring-amber-500/40"
        : status === "REVOKED" || status === "CLOSED"
          ? "bg-red-500/20 text-red-300 ring-red-500/40"
          : "bg-white/10 text-white/70 ring-white/20";
  return (
    <span
      className={`text-[9px] font-medium px-2 py-0.5 rounded-full ring-1 ${color}`}
    >
      {status.toLowerCase().replace("_", " ")}
    </span>
  );
}
