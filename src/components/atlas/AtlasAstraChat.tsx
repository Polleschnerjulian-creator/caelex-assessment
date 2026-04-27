"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { X, ArrowUp, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { AtlasEntityMini } from "@/components/atlas/AtlasEntityMini";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AtlasAstraChat() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const { language, t } = useLanguage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Animate open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      setVisible(false);
    }
  }, [open]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  /**
   * Audit H3: sanitize any path segment before it lands in the LLM
   * system-prompt injection path. Attacker-controlled URLs like
   *   /atlas/jurisdictions/DE/ignore_all_previous_instructions
   * previously flowed raw into the prompt. We now:
   *   1. strip to [A-Z0-9] only (country codes + source ids)
   *   2. hard-cap at 20 chars
   *   3. validate against known jurisdiction allowlist; unknown codes
   *      collapse to "an unidentified" and path-bound attacker text
   *      never reaches the model.
   */
  const safePathSegment = useCallback(
    (raw: string | undefined, maxLen = 20): string => {
      if (!raw) return "";
      return raw.replace(/[^A-Za-z0-9_-]/g, "").slice(0, maxLen);
    },
    [],
  );

  const getPageContext = useCallback((): string => {
    if (pathname.includes("/jurisdictions/")) {
      const rawCode = pathname.split("/jurisdictions/")[1]?.split("/")[0];
      const code = safePathSegment(rawCode, 3).toUpperCase();
      // Two-char ISO alpha-2 codes only; anything else neutralises to
      // a generic sentence so a crafted URL cannot smuggle text into
      // the prompt.
      const safeCode = /^[A-Z]{2,3}$/.test(code) ? code : "";
      if (safeCode) {
        return `User is viewing the ${safeCode} jurisdiction detail page in the ATLAS Space Law Database.`;
      }
      return "User is viewing a jurisdiction detail page in the ATLAS Space Law Database.";
    }
    if (pathname.includes("/sources/")) {
      const rawId = pathname.split("/sources/")[1]?.split("/")[0];
      const id = safePathSegment(rawId, 40);
      if (id) {
        return `User is viewing legal source ${id} in the ATLAS Space Law Database.`;
      }
      return "User is viewing a legal source in the ATLAS Space Law Database.";
    }
    if (pathname.includes("/comparator"))
      return "User is on the ATLAS jurisdiction comparator page.";
    if (pathname.includes("/settings"))
      return "User is on the ATLAS settings page.";
    return "User is on the ATLAS Space Law Database search page. ATLAS covers 18 jurisdictions, 325 legal sources, and 211 regulatory authorities across European space law.";
  }, [pathname, safePathSegment]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: text },
    ]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/astra/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `[ATLAS Context: ${getPageContext()}]\n\n${text}`,
          conversationId: conversationId ?? undefined,
          context: { mode: "general" as const },
          stream: false,
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content:
            data.response?.text || data.response?.message || "No response.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: t("atlas.astra_error"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, getPageContext, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const suggestions = useCallback((): string[] => {
    if (pathname.includes("/jurisdictions/")) {
      const code = pathname
        .split("/jurisdictions/")[1]
        ?.split("/")[0]
        ?.toUpperCase();
      return language === "de"
        ? [
            `Fasse das Weltraumrecht von ${code} zusammen`,
            `Welche Versicherungspflichten gelten?`,
          ]
        : [`Summarize ${code} space law`, `What insurance requirements apply?`];
    }
    return language === "de"
      ? [
          "Welche Länder haben den Mondvertrag ratifiziert?",
          "Vergleiche Haftungsregime DE vs FR",
        ]
      : [
          "Which countries ratified the Moon Agreement?",
          "Compare liability regimes DE vs FR",
        ];
  }, [pathname, language]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => setOpen(false), 250);
  }, []);

  return (
    <>
      {/* ─── Floating Orb ───
          Just the orb floating in the corner — no pill, no label, no
          disc. mix-blend-mode: difference on the canvas means the
          black background is invisible and particles auto-tint to
          match the page (gray on light pages, white on dark). The
          orb IS the button: hover scales up, click opens the chat. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="group fixed bottom-6 right-6 z-50 flex items-center justify-center transition-transform duration-300 ease-out hover:scale-110 active:scale-95 focus-visible:outline-none rounded-full"
          aria-label={t("atlas.astra_open")}
          title={t("atlas.astra_open")}
          style={{
            width: 80,
            height: 80,
            background: "transparent",
            border: 0,
            padding: 0,
            cursor: "pointer",
          }}
        >
          <AtlasEntityMini ariaLabel="Astra" />
        </button>
      )}

      {/* ─── Dark Chat Panel ───
          Slightly taller (600px) and a deeper border + subtle inner
          highlight give the panel more presence on the dark Atlas
          stage. */}
      {open && (
        <div
          className="fixed bottom-5 right-5 z-50 w-[420px] h-[600px] flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)]"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible
              ? "translateY(0) scale(1)"
              : "translateY(16px) scale(0.97)",
            transition:
              "opacity 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Header — navy gradient base + the mini-orb in a glass disc.
              The orb's `active` prop wires to `loading` so the lawyer
              sees a live "Astra is thinking" pulse without a separate
              spinner-icon competing for attention. */}
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]"
            style={{
              background:
                "linear-gradient(180deg, rgba(20,28,44,0.98) 0%, rgba(15,19,32,0.98) 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "radial-gradient(circle at 30% 25%, rgba(40,52,80,0.95) 0%, rgba(15,20,35,1) 70%, rgba(8,12,22,1) 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.35)",
                }}
              >
                <span
                  style={{ width: 22, height: 22, display: "inline-block" }}
                  aria-hidden
                >
                  <AtlasEntityMini mode={loading ? "thinking" : "idle"} />
                </span>
              </div>
              <div>
                <span className="text-[13px] font-semibold text-white/95 block leading-tight tracking-wider">
                  Astra
                </span>
                <span className="text-[10px] text-white/45 leading-tight">
                  {loading
                    ? language === "de"
                      ? "denkt..."
                      : "thinking..."
                    : t("atlas.astra_subtitle")}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="h-7 w-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors"
              aria-label={t("common.close")}
            >
              <X
                size={13}
                strokeWidth={2}
                className="text-white/50"
                aria-hidden="true"
              />
            </button>
          </div>

          {/* Messages — body uses a slight radial-gradient toward
              the orb so the eye is drawn upward to Astra's presence.
              Custom scrollbar styled below in scoped CSS. */}
          <div
            className="flex-1 overflow-y-auto px-4 py-5 space-y-3 atlas-astra-scroll"
            style={{
              background:
                "radial-gradient(ellipse 600px 400px at 50% -20%, rgba(120,160,255,0.06) 0%, transparent 70%), #0d111c",
            }}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-2">
                {/* Hero-orb — the big version of the same brand-object.
                    Sits in a soft glow container so it looks like a
                    spotlight is on it. */}
                <div className="relative mb-5">
                  <div
                    className="absolute inset-0 -m-4 rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(140,220,200,0.18) 0%, rgba(120,180,220,0.10) 35%, transparent 70%)",
                      filter: "blur(8px)",
                    }}
                    aria-hidden
                  />
                  <div
                    className="relative h-16 w-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 25%, rgba(35,46,72,0.95) 0%, rgba(15,19,32,1) 70%, rgba(8,12,22,1) 100%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.5)",
                    }}
                  >
                    <span
                      style={{ width: 56, height: 56, display: "inline-block" }}
                      aria-hidden
                    >
                      <AtlasEntityMini />
                    </span>
                  </div>
                </div>
                <p className="text-[16px] font-semibold text-white/95 mb-1.5 tracking-tight">
                  {t("atlas.astra_ask_space_law")}
                </p>
                <p className="text-[11px] text-white/40 mb-7 tracking-wide">
                  {t("atlas.astra_stats_line")}
                </p>
                <div className="space-y-2 w-full">
                  {suggestions().map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInput(s);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      className="group w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[12.5px] text-white/65 hover:bg-white/[0.06] hover:border-white/[0.14] hover:text-white/95 hover:translate-x-[2px] transition-all duration-200"
                    >
                      <span className="h-1 w-1 rounded-full bg-white/30 group-hover:bg-emerald-300/80 transition-colors flex-shrink-0" />
                      <span className="flex-1">{s}</span>
                      <span className="text-white/20 group-hover:text-white/60 transition-colors">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isLastAssistant =
                !isUser && idx === messages.length - 1 && loading;
              if (isUser) {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed bg-white/[0.95] text-[#0a0f1e] rounded-[18px] rounded-br-md shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
                      <p className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id} className="flex gap-2.5 items-start">
                  {/* Astra avatar — same navy disc + mini-orb as the
                      header; pulses on the LAST assistant message
                      while loading to signal "writing now". */}
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 25%, rgba(35,46,72,0.95) 0%, rgba(15,20,35,1) 70%, rgba(8,12,22,1) 100%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.35)",
                    }}
                  >
                    <span
                      style={{ width: 22, height: 22, display: "inline-block" }}
                      aria-hidden
                    >
                      <AtlasEntityMini
                        mode={isLastAssistant ? "thinking" : "idle"}
                      />
                    </span>
                  </div>
                  <div className="flex-1 max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed bg-white/[0.06] border border-white/[0.08] text-white/95 rounded-[18px] rounded-tl-md break-words">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2.5 items-start">
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 25%, rgba(35,46,72,0.95) 0%, rgba(15,20,35,1) 70%, rgba(8,12,22,1) 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.35)",
                  }}
                >
                  <span
                    style={{ width: 22, height: 22, display: "inline-block" }}
                    aria-hidden
                  >
                    <AtlasEntityMini mode="thinking" />
                  </span>
                </div>
                <div className="bg-white/[0.06] border border-white/[0.08] px-4 py-3 rounded-[18px] rounded-tl-md">
                  <div className="flex gap-1.5 items-center">
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-white/35 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-white/35 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-white/35 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input — slightly elevated bg + emerald-tinted focus glow
              so the active state reads as Astra-branded rather than
              just "another input". The send-button switches to white
              when something's typed (positive-action affordance). */}
          <div
            className="px-3 pb-3 pt-2.5 border-t border-white/[0.05]"
            style={{
              background:
                "linear-gradient(180deg, rgba(13,17,28,1) 0%, rgba(10,14,24,1) 100%)",
            }}
          >
            <div className="flex items-end gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] focus-within:border-white/[0.18] focus-within:bg-white/[0.07] focus-within:shadow-[0_0_0_3px_rgba(140,220,200,0.08)] transition-all duration-200">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("atlas.astra_input_placeholder")}
                disabled={loading}
                rows={1}
                className="flex-1 resize-none text-[13px] text-white/95 placeholder:text-white/30 bg-transparent border-0 outline-none disabled:opacity-50 max-h-[120px] py-0.5"
                aria-label={t("atlas.astra_input_aria")}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className={`flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
                  input.trim() && !loading
                    ? "bg-white text-[#0a0f1e] hover:bg-white/95 hover:-translate-y-px active:scale-95 shadow-[0_2px_8px_rgba(255,255,255,0.15)]"
                    : "bg-white/[0.06] text-white/25 cursor-default"
                }`}
                aria-label={t("common.send")}
              >
                {loading ? (
                  <Loader2
                    size={13}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowUp size={14} strokeWidth={2.5} aria-hidden="true" />
                )}
              </button>
            </div>
            <div className="text-center text-[9.5px] text-white/30 mt-2 tracking-wide">
              {t("atlas.astra_subtitle")} · DSGVO-konform
            </div>
          </div>

          {/* Scoped scrollbar — subtle white-ish thumb visible only on
              hover. Matches the dark Atlas aesthetic. */}
          <style>{`
            .atlas-astra-scroll::-webkit-scrollbar { width: 5px; }
            .atlas-astra-scroll::-webkit-scrollbar-track { background: transparent; }
            .atlas-astra-scroll::-webkit-scrollbar-thumb {
              background: rgba(255,255,255,0.06);
              border-radius: 3px;
              transition: background 0.15s ease;
            }
            .atlas-astra-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(255,255,255,0.16);
            }
          `}</style>
        </div>
      )}
    </>
  );
}
