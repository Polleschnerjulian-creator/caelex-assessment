"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Zap,
  ShieldCheck,
  MessageSquare,
  PanelRightOpen,
  PanelLeftOpen,
  RotateCcw,
  AlertCircle,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAstra } from "./AstraProvider";
import AstraMessageBubble from "./AstraMessageBubble";
import AstraChatInput from "./AstraChatInput";
import AstraContextBar from "./AstraContextBar";
import AstraToolBrowser from "./AstraToolBrowser";
import AstraConversationList from "./AstraConversationList";

export default function AstraFullPage() {
  const {
    messages,
    context,
    isTyping,
    conversationId,
    error,
    setArticleContext,
    setCategoryContext,
    setGeneralContext,
    resetChat,
    clearError,
  } = useAstra();

  const searchParams = useSearchParams();
  const [astraConsented, setAstraConsented] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("caelex-astra-consent") === "true";
  });
  const [showToolBrowser, setShowToolBrowser] = useState(false);
  const [showConversations, setShowConversations] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextInitRef = useRef(false);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ─── URL Context Recognition ───
  useEffect(() => {
    if (contextInitRef.current) return;
    contextInitRef.current = true;

    const article = searchParams.get("article");
    const category = searchParams.get("category");
    const convId = searchParams.get("conversation");

    if (article) {
      const ref = searchParams.get("ref") || article;
      const title = searchParams.get("title") || "";
      const severity = searchParams.get("severity") || "mandatory";
      const regulation = searchParams.get("regulation") || "eu-space-act";
      setArticleContext(article, ref, title, severity, regulation);
    } else if (category) {
      const label = searchParams.get("label") || category;
      const regulation = searchParams.get("regulation") || "eu-space-act";
      // Try to load articles from sessionStorage
      let articles: Array<{
        id: string;
        articleRef: string;
        title: string;
        severity: string;
      }> = [];
      try {
        const stored = sessionStorage.getItem(`astra-category-${category}`);
        if (stored) articles = JSON.parse(stored);
      } catch {
        // Ignore
      }
      setCategoryContext(category, label, articles, regulation);
    } else if (convId) {
      // Loading conversation handled by the caller
    } else {
      // General mode — only init if no messages yet
      if (messages.length === 0) {
        setGeneralContext();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAcceptConsent = useCallback(() => {
    localStorage.setItem("caelex-astra-consent", "true");
    setAstraConsented(true);
  }, []);

  const hasUserMessages = messages.some((m) => m.role === "user");

  // ─── Consent Gate ───
  if (!astraConsented) {
    return (
      <div className="flex h-[calc(100vh-64px)] -m-6 lg:-m-8 items-center justify-center bg-dark-bg">
        <div className="max-w-md w-full px-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5">
              <ShieldCheck size={28} className="text-cyan-400" />
            </div>
            <h2 className="text-[18px] font-semibold text-white mb-2">
              ASTRA AI Einwilligung
            </h2>
            <p className="text-[13px] text-white/50 leading-relaxed mb-3">
              ASTRA verwendet Ihre Compliance-Daten, um kontextbezogene
              regulatorische Beratung zu liefern. Ihre Eingaben werden
              verarbeitet, aber nicht zum Trainieren von KI-Modellen verwendet.
            </p>
            <p className="text-[12px] text-amber-400/70 leading-relaxed mb-5 px-3 py-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/10">
              Hinweis gem. EU AI Act Art. 50: ASTRA ist ein KI-System (Large
              Language Model). Alle Antworten sind KI-generiert und stellen
              keine Rechtsberatung dar. Bitte verifizieren Sie regulatorische
              Informationen stets mit qualifizierten Fachleuten.
            </p>
            <ul className="text-[12px] text-white/50 space-y-2 mb-6 text-left">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">&#x2022;</span>
                <span>Gesprachsdaten werden verschlusselt gespeichert</span>
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
              onClick={handleAcceptConsent}
              className="px-8 py-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/20 text-cyan-400 text-[14px] font-medium transition-colors"
            >
              Einverstanden &mdash; ASTRA aktivieren
            </button>
            <p className="text-[10px] text-white/40 mt-4">
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
        </div>
      </div>
    );
  }

  // ─── Main Layout ───
  return (
    <div className="flex h-[calc(100vh-64px)] -m-6 lg:-m-8 bg-dark-bg">
      {/* Conversation List (toggle, left) */}
      <AnimatePresence>
        {showConversations && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden flex-shrink-0"
          >
            <AstraConversationList
              onClose={() => setShowConversations(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-white/10 bg-white/[0.01] flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Toggle Conversations */}
            <button
              onClick={() => setShowConversations(!showConversations)}
              className="p-1.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
              aria-label="Toggle conversations"
              title="Conversations"
            >
              <PanelLeftOpen size={16} />
            </button>

            <div className="w-6 h-6 rounded-md bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
              <Zap size={12} className="text-cyan-400" />
            </div>
            <span className="text-[13px] font-medium text-white">ASTRA</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-medium uppercase tracking-wider">
              Beta
            </span>

            {conversationId && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.03] text-white/20"
                title={`Conversation: ${conversationId.slice(0, 8)}...`}
              >
                <MessageSquare size={10} />
                <span className="text-[9px]">{conversationId.slice(0, 8)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasUserMessages && (
              <button
                onClick={resetChat}
                className="p-1.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
                aria-label="New chat"
                title="New Chat"
              >
                <RotateCcw size={14} />
              </button>
            )}
            {/* Toggle Tool Browser */}
            <button
              onClick={() => setShowToolBrowser(!showToolBrowser)}
              className={`p-1.5 rounded-md transition-colors ${
                showToolBrowser
                  ? "text-cyan-400 bg-cyan-500/10"
                  : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
              }`}
              aria-label="Toggle tool browser"
              title="Tool Browser"
            >
              <PanelRightOpen size={16} />
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
                  <AlertCircle size={14} className="text-red-400" />
                  <span className="text-[11px] text-red-400">{error}</span>
                </div>
                <button
                  onClick={clearError}
                  aria-label="Dismiss error"
                  className="p-1 rounded hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context Bar */}
        {context && context.mode !== "general" && (
          <AstraContextBar
            context={context}
            onDismiss={() => setGeneralContext()}
          />
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
          <div className="max-w-[800px] mx-auto space-y-4">
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
                <div className="w-7 h-7 rounded-full bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
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
          </div>
        </div>

        {/* Chat Input */}
        <AstraChatInput />
      </div>

      {/* Tool Browser (toggle, right) */}
      <AnimatePresence>
        {showToolBrowser && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden flex-shrink-0 hidden lg:block"
          >
            <AstraToolBrowser onClose={() => setShowToolBrowser(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
