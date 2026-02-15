"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Zap,
  RotateCcw,
  MessageSquare,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { useAstra } from "./AstraProvider";
import AstraMessageBubble from "./AstraMessageBubble";

export default function AstraChatPanel() {
  const {
    isOpen,
    messages,
    context,
    isTyping,
    remainingQueries,
    error,
    conversationId,
    close,
    sendMessage,
    resetChat,
    clearError,
  } = useAstra();

  const [input, setInput] = useState("");
  const [astraConsented, setAstraConsented] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("caelex-astra-consent") === "true";
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Save previously focused element and restore on close
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
    }
    return () => {
      if (!isOpen && previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [isOpen]);

  // Escape key handler and focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isTyping) return;
    sendMessage(input);
    setInput("");
  }, [input, isTyping, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAcceptAstraConsent = useCallback(() => {
    localStorage.setItem("caelex-astra-consent", "true");
    setAstraConsented(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Check if there are user messages (for showing reset button)
  const hasUserMessages = messages.some((m) => m.role === "user");

  // Mode label
  const getModeLabel = () => {
    if (!context) return "General";
    switch (context.mode) {
      case "article":
        return (context as { articleRef: string }).articleRef;
      case "category":
        return (context as { categoryLabel: string }).categoryLabel;
      case "module":
        return (context as { moduleName: string }).moduleName;
      default:
        return "General";
    }
  };

  // Status indicator
  const getStatusBadge = () => {
    if (conversationId) {
      return (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-medium">
          Connected
        </span>
      );
    }
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium uppercase tracking-wider">
        Ready
      </span>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[59] sm:hidden"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="complementary"
            aria-label="ASTRA AI assistant"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[440px] z-[60] flex flex-col
              bg-[#0A0A0B] border-l border-white/10
              shadow-[-8px_0_30px_rgba(0,0,0,0.4)]"
            style={{
              boxShadow:
                "-8px 0 30px rgba(0,0,0,0.4), -2px 0 15px rgba(6,182,212,0.03)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 bg-white/[0.02] backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <Zap size={14} className="text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-white">
                      ASTRA
                    </span>
                    {getStatusBadge()}
                  </div>
                  <p className="text-[10px] text-white/30">{getModeLabel()}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Conversation indicator */}
                {conversationId && (
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.02] text-white/30"
                    title={`Conversation: ${conversationId.slice(0, 8)}...`}
                    aria-label={`Conversation: ${conversationId.slice(0, 8)}`}
                  >
                    <MessageSquare size={12} aria-hidden="true" />
                  </div>
                )}
                {/* New Chat button */}
                {hasUserMessages && (
                  <button
                    onClick={resetChat}
                    className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
                    aria-label="Start new chat"
                    title="Start new chat"
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                  </button>
                )}
                {/* Close button */}
                <button
                  onClick={close}
                  aria-label="Close ASTRA panel"
                  className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2" role="alert">
                      <AlertCircle
                        size={14}
                        className="text-red-400"
                        aria-hidden="true"
                      />
                      <span className="text-[11px] text-red-400">{error}</span>
                    </div>
                    <button
                      onClick={clearError}
                      aria-label="Dismiss error"
                      className="p-1 rounded hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
              {!astraConsented ? (
                /* ASTRA Consent Notice */
                <div className="flex flex-col items-center justify-center h-full px-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
                    <ShieldCheck size={24} className="text-cyan-400" />
                  </div>
                  <h3 className="text-[15px] font-medium text-white mb-2">
                    ASTRA AI Einwilligung
                  </h3>
                  <p className="text-[12px] text-white/50 text-center leading-relaxed mb-4 max-w-[320px]">
                    ASTRA verwendet Ihre Compliance-Daten, um kontextbezogene
                    regulatorische Beratung zu liefern. Ihre Eingaben werden
                    verarbeitet, aber nicht zum Trainieren von KI-Modellen
                    verwendet.
                  </p>
                  <ul className="text-[11px] text-white/40 space-y-1.5 mb-6 max-w-[300px]">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">&#x2022;</span>
                      <span>
                        Gesprachsdaten werden verschlusselt gespeichert
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">&#x2022;</span>
                      <span>Keine Weitergabe an Dritte</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">&#x2022;</span>
                      <span>Einwilligung jederzeit widerrufbar</span>
                    </li>
                  </ul>
                  <button
                    onClick={handleAcceptAstraConsent}
                    className="px-6 py-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/20 text-cyan-400 text-[13px] font-medium transition-colors"
                  >
                    Einverstanden &mdash; ASTRA aktivieren
                  </button>
                  <p className="text-[10px] text-white/20 mt-3 text-center max-w-[280px]">
                    Siehe unsere{" "}
                    <a
                      href="/legal/privacy"
                      target="_blank"
                      className="text-cyan-500/60 hover:text-cyan-400 underline"
                    >
                      Datenschutzerkl&auml;rung
                    </a>{" "}
                    fur Details zur Datenverarbeitung.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <AstraMessageBubble key={msg.id} message={msg} />
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div
                      className="flex gap-2.5"
                      aria-label="ASTRA is typing"
                      role="status"
                    >
                      <div
                        className="w-7 h-7 rounded-full bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center flex-shrink-0"
                        aria-hidden="true"
                      >
                        <Zap size={13} className="text-cyan-400" />
                      </div>
                      <div className="bg-white/[0.03] border border-white/[0.06] border-l-2 border-l-cyan-500/40 rounded-tr-xl rounded-br-xl rounded-bl-xl px-4 py-3">
                        <div className="flex gap-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Bar */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-white/10 bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <label htmlFor="astra-chat-input" className="sr-only">
                  Ask about regulations
                </label>
                <input
                  id="astra-chat-input"
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    astraConsented
                      ? "Ask about regulations..."
                      : "Bitte erst Einwilligung erteilen..."
                  }
                  disabled={isTyping || !astraConsented}
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3.5 py-2.5 text-[12px] text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/20 disabled:opacity-50 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping || !astraConsented}
                  aria-label="Send message"
                  className="p-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/20 text-cyan-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send size={14} aria-hidden="true" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[9px] text-white/15">ASTRA AI Copilot</p>
                {remainingQueries !== null && (
                  <p className="text-[9px] text-white/30">
                    {remainingQueries} queries remaining
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
