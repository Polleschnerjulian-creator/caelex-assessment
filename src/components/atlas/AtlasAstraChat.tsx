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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const { language } = useLanguage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const getPageContext = useCallback((): string => {
    if (pathname.includes("/jurisdictions/")) {
      const code = pathname
        .split("/jurisdictions/")[1]
        ?.split("/")[0]
        ?.toUpperCase();
      return `User is viewing the ${code} jurisdiction detail page in the ATLAS Space Law Database.`;
    }
    if (pathname.includes("/sources/")) {
      const id = pathname.split("/sources/")[1]?.split("/")[0];
      return `User is viewing legal source ${id} in the ATLAS Space Law Database.`;
    }
    if (pathname.includes("/comparator"))
      return "User is on the ATLAS jurisdiction comparator page.";
    if (pathname.includes("/settings"))
      return "User is on the ATLAS settings page.";
    return "User is on the ATLAS Space Law Database search page. ATLAS covers 18 jurisdictions, 325 legal sources, and 211 regulatory authorities across European space law.";
  }, [pathname]);

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
          content:
            language === "de"
              ? "Ein Fehler ist aufgetreten. Bitte versuche es erneut."
              : "An error occurred. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, getPageContext, language]);

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

  return (
    <>
      {/* ─── Floating Pill Button ─── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="
            fixed bottom-5 right-5 z-50
            flex items-center gap-2 px-5 py-2.5
            rounded-full
            bg-white/70 backdrop-blur-xl
            border border-white/50
            shadow-[0_4px_30px_rgba(0,0,0,0.08)]
            hover:bg-white/90 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)]
            hover:scale-[1.02]
            active:scale-[0.98]
            transition-all duration-300 ease-out
            group
          "
          aria-label={language === "de" ? "Astra öffnen" : "Open Astra"}
        >
          <Sparkles
            size={15}
            strokeWidth={2}
            aria-hidden="true"
            className="text-gray-500 group-hover:text-gray-900 transition-colors"
          />
          <span className="text-[13px] font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
            Astra
          </span>
        </button>
      )}

      {/* ─── Glass Chat Panel ─── */}
      {open && (
        <div
          className="
            fixed bottom-5 right-5 z-50
            w-[400px] h-[540px]
            flex flex-col
            rounded-3xl
            bg-white/70 backdrop-blur-2xl
            border border-white/60
            shadow-[0_20px_70px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.4)_inset]
            overflow-hidden
          "
          style={{
            animation: "astra-slide-up 0.35s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* ─── Header ─── */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200/40">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <Sparkles
                    size={13}
                    className="text-white"
                    aria-hidden="true"
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white" />
              </div>
              <div>
                <span className="text-[14px] font-semibold text-gray-900 block leading-tight">
                  Astra
                </span>
                <span className="text-[10px] text-gray-400 leading-tight">
                  Space Law Assistant
                </span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-7 w-7 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-colors"
              aria-label={language === "de" ? "Schließen" : "Close"}
            >
              <X
                size={13}
                strokeWidth={2.5}
                className="text-gray-500"
                aria-hidden="true"
              />
            </button>
          </div>

          {/* ─── Messages ─── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-2">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
                  <Sparkles
                    size={20}
                    className="text-gray-500"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-[15px] font-semibold text-gray-900 mb-0.5">
                  {language === "de"
                    ? "Frag mich zum Weltraumrecht"
                    : "Ask me about space law"}
                </p>
                <p className="text-[11px] text-gray-400 mb-5">
                  18 jurisdictions &middot; 325 sources &middot; 211 authorities
                </p>

                <div className="space-y-2 w-full">
                  {suggestions().map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInput(s);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      className="
                        w-full text-left px-4 py-3
                        rounded-2xl
                        bg-white/60 backdrop-blur-sm
                        border border-gray-200/60
                        text-[12px] text-gray-600
                        hover:bg-white hover:border-gray-300/80 hover:shadow-sm
                        transition-all duration-200
                      "
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
                  className={`
                    max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed
                    ${
                      msg.role === "user"
                        ? "bg-gray-900 text-white rounded-[20px] rounded-br-lg"
                        : "bg-white/80 backdrop-blur-sm border border-gray-200/50 text-gray-800 rounded-[20px] rounded-bl-lg shadow-sm"
                    }
                  `}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 px-4 py-3 rounded-[20px] rounded-bl-lg shadow-sm">
                  <div className="flex gap-1.5">
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ─── Input ─── */}
          <div className="px-3 pb-3 pt-1">
            <div
              className="
                flex items-end gap-2
                px-3 py-2
                rounded-2xl
                bg-white/80 backdrop-blur-sm
                border border-gray-200/60
                focus-within:border-gray-300 focus-within:shadow-sm
                transition-all duration-200
              "
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  language === "de"
                    ? "Frage zum Weltraumrecht..."
                    : "Ask about space law..."
                }
                disabled={loading}
                rows={1}
                className="
                  flex-1 resize-none
                  text-[13px] text-gray-900
                  placeholder:text-gray-400
                  bg-transparent border-0 outline-none
                  disabled:opacity-50
                  max-h-[120px]
                  py-1
                "
                aria-label={
                  language === "de" ? "Nachricht eingeben" : "Type your message"
                }
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="
                  flex-shrink-0
                  h-7 w-7 rounded-full
                  bg-gray-900 text-white
                  disabled:opacity-20
                  hover:bg-black
                  active:scale-95
                  flex items-center justify-center
                  transition-all duration-150
                "
                aria-label={language === "de" ? "Senden" : "Send"}
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

      {/* ─── Animation keyframe ─── */}
      <style jsx global>{`
        @keyframes astra-slide-up {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
