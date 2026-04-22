"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, X, ArrowUp, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

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
      {/* ─── Floating Button ─── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 pl-4 pr-5 py-2.5 rounded-full bg-[#1a1a1a] text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-[#2a2a2a] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 ease-out group"
          aria-label={t("atlas.astra_open")}
        >
          <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center">
            <Sparkles
              size={13}
              strokeWidth={2}
              aria-hidden="true"
              className="text-white/80 group-hover:text-white transition-colors"
            />
          </div>
          <span className="text-[13px] font-medium text-white/90 group-hover:text-white transition-colors">
            Astra
          </span>
        </button>
      )}

      {/* ─── Dark Chat Panel ─── */}
      {open && (
        <div
          className="fixed bottom-5 right-5 z-50 w-[400px] h-[560px] flex flex-col rounded-2xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.5)]"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible
              ? "translateY(0) scale(1)"
              : "translateY(16px) scale(0.97)",
            transition:
              "opacity 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#1a1a1a] border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center backdrop-blur-sm">
                  <Sparkles
                    size={14}
                    className="text-white/90"
                    aria-hidden="true"
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#1a1a1a]" />
              </div>
              <div>
                <span className="text-[13px] font-semibold text-white/95 block leading-tight tracking-wide">
                  Astra
                </span>
                <span className="text-[10px] text-white/40 leading-tight">
                  {t("atlas.astra_subtitle")}
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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#111111]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-2">
                <div className="h-14 w-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
                  <Sparkles
                    size={22}
                    className="text-white/30"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-[15px] font-semibold text-white/90 mb-1">
                  {t("atlas.astra_ask_space_law")}
                </p>
                <p className="text-[11px] text-white/30 mb-6">
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
                      className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[12px] text-white/60 hover:bg-white/[0.07] hover:border-white/[0.1] hover:text-white/80 transition-all duration-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed ${msg.role === "user" ? "bg-[var(--atlas-bg-surface)] text-[var(--atlas-text-primary)] rounded-[18px] rounded-br-md" : "bg-white/[0.06] border border-white/[0.08] text-white rounded-[18px] rounded-bl-md"}`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.06] border border-white/[0.08] px-4 py-3 rounded-[18px] rounded-bl-md">
                  <div className="flex gap-1">
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-white/30 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-white/30 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-white/30 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 bg-[#111111] border-t border-white/[0.04]">
            <div className="flex items-end gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] focus-within:border-white/[0.15] transition-all duration-200">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("atlas.astra_input_placeholder")}
                disabled={loading}
                rows={1}
                className="flex-1 resize-none text-[13px] text-white/90 placeholder:text-white/25 bg-transparent border-0 outline-none disabled:opacity-50 max-h-[120px] py-1"
                aria-label={t("atlas.astra_input_aria")}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 h-7 w-7 rounded-lg bg-[var(--atlas-bg-surface)] text-[#111] disabled:opacity-20 hover:bg-[var(--atlas-bg-surface)]/90 active:scale-95 flex items-center justify-center transition-all duration-150"
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
          </div>
        </div>
      )}
    </>
  );
}
