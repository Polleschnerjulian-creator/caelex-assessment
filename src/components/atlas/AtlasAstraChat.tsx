"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AtlasAstraChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const { language } = useLanguage();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Derive page context from URL
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
    if (pathname.includes("/comparator")) {
      return "User is on the ATLAS jurisdiction comparator page.";
    }
    if (pathname.includes("/settings")) {
      return "User is on the ATLAS settings page.";
    }
    return "User is on the ATLAS Space Law Database search page. ATLAS covers 18 jurisdictions, 325 legal sources, and 211 regulatory authorities across European space law.";
  }, [pathname]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
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

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || `Error ${res.status}`);
      }

      const data = await res.json();
      setConversationId(data.conversationId);

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content:
          data.response?.text ||
          data.response?.message ||
          "No response received.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: `e-${Date.now()}`,
        role: "assistant",
        content:
          language === "de"
            ? "Entschuldigung, ein Fehler ist aufgetreten. Bitte versuche es erneut."
            : "Sorry, an error occurred. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
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

  // Suggestions based on current page
  const getSuggestions = useCallback((): string[] => {
    if (pathname.includes("/jurisdictions/")) {
      const code = pathname
        .split("/jurisdictions/")[1]
        ?.split("/")[0]
        ?.toUpperCase();
      return [
        language === "de"
          ? `Fasse das Weltraumrecht von ${code} zusammen`
          : `Summarize ${code} space law`,
        language === "de"
          ? `Welche Versicherungspflichten gelten in ${code}?`
          : `What insurance requirements apply in ${code}?`,
      ];
    }
    if (pathname.includes("/comparator")) {
      return [
        language === "de"
          ? "Vergleiche die Haftungsregime von DE, FR und AT"
          : "Compare liability regimes of DE, FR, and AT",
      ];
    }
    return [
      language === "de"
        ? "Welche Länder haben den Mondvertrag ratifiziert?"
        : "Which countries ratified the Moon Agreement?",
      language === "de"
        ? "Vergleiche Versicherungspflichten DE vs FR"
        : "Compare insurance requirements DE vs FR",
    ];
  }, [pathname, language]);

  return (
    <>
      {/* ─── Floating Button ─── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-gray-900 text-white shadow-lg hover:bg-black transition-all duration-200 group"
          aria-label={language === "de" ? "Astra öffnen" : "Open Astra"}
        >
          <MessageSquare
            size={18}
            strokeWidth={1.5}
            aria-hidden="true"
            className="group-hover:scale-110 transition-transform"
          />
          <span className="text-[13px] font-medium">Astra</span>
        </button>
      )}

      {/* ─── Chat Panel ─── */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[560px] flex flex-col rounded-2xl bg-white border border-gray-200 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gray-900">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[14px] font-semibold text-white tracking-wide">
                Astra
              </span>
              <span className="text-[10px] text-white/50">
                Space Law Assistant
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white transition-colors"
              aria-label={language === "de" ? "Schließen" : "Close"}
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <MessageSquare
                    size={18}
                    className="text-gray-400"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-[14px] font-medium text-gray-900 mb-1">
                  {language === "de"
                    ? "Frag mich zum Weltraumrecht"
                    : "Ask me about space law"}
                </p>
                <p className="text-[11px] text-gray-400 mb-4">
                  {language === "de"
                    ? "18 Jurisdiktionen, 325 Quellen, 211 Behörden"
                    : "18 jurisdictions, 325 sources, 211 authorities"}
                </p>

                {/* Suggestions */}
                <div className="space-y-2 w-full">
                  {getSuggestions().map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-100 text-[12px] text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all"
                    >
                      {suggestion}
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
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gray-900 text-white rounded-br-md"
                      : "bg-gray-100 text-gray-800 rounded-bl-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                  <Loader2
                    size={16}
                    className="animate-spin text-gray-400"
                    aria-hidden="true"
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  language === "de"
                    ? "Frage zum Weltraumrecht..."
                    : "Ask about space law..."
                }
                disabled={loading}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none disabled:opacity-50 transition-colors"
                aria-label={
                  language === "de" ? "Nachricht eingeben" : "Type your message"
                }
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex items-center justify-center h-10 w-10 rounded-xl bg-gray-900 text-white disabled:opacity-30 hover:bg-black transition-all"
                aria-label={language === "de" ? "Senden" : "Send"}
              >
                <Send size={15} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
