"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (contextInitRef.current) return;
    contextInitRef.current = true;

    const article = searchParams.get("article");
    const category = searchParams.get("category");

    if (article) {
      const ref = searchParams.get("ref") || article;
      const title = searchParams.get("title") || "";
      const severity = searchParams.get("severity") || "mandatory";
      const regulation = searchParams.get("regulation") || "eu-space-act";
      setArticleContext(article, ref, title, severity, regulation);
    } else if (category) {
      const label = searchParams.get("label") || category;
      const regulation = searchParams.get("regulation") || "eu-space-act";
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
    } else {
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
      <div className="flex h-[calc(100vh-64px)] -m-6 lg:-m-8 items-center justify-center bg-[#F7F8FA]">
        <div className="max-w-md w-full px-6">
          <div className="flex flex-col items-center text-center bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
              <ShieldCheck size={28} className="text-gray-600" />
            </div>
            <h2 className="text-[18px] font-semibold text-gray-900 mb-2">
              ASTRA AI Einwilligung
            </h2>
            <p className="text-[13px] text-gray-500 leading-relaxed mb-3">
              ASTRA verwendet Ihre Compliance-Daten, um kontextbezogene
              regulatorische Beratung zu liefern. Ihre Eingaben werden
              verarbeitet, aber nicht zum Trainieren von KI-Modellen verwendet.
            </p>
            <p className="text-[12px] text-amber-700 leading-relaxed mb-5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              Hinweis gem. EU AI Act Art. 50: ASTRA ist ein KI-System (Large
              Language Model). Alle Antworten sind KI-generiert und stellen
              keine Rechtsberatung dar.
            </p>
            <ul className="text-[12px] text-gray-500 space-y-2 mb-6 text-left">
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">&#x2022;</span>
                <span>Gesprächsdaten werden verschlüsselt gespeichert</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">&#x2022;</span>
                <span>Keine Weitergabe an Dritte</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">&#x2022;</span>
                <span>Einwilligung jederzeit widerrufbar</span>
              </li>
            </ul>
            <button
              onClick={handleAcceptConsent}
              className="px-8 py-3 rounded-xl bg-gray-900 text-white text-[14px] font-medium hover:bg-black transition-colors"
            >
              Einverstanden — ASTRA aktivieren
            </button>
            <p className="text-[10px] text-gray-400 mt-4">
              Siehe unsere{" "}
              <a
                href="/legal/privacy"
                target="_blank"
                className="text-gray-500 hover:text-gray-700 underline"
              >
                Datenschutzerklärung
              </a>{" "}
              für Details zur Datenverarbeitung.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Layout ───
  return (
    <div className="flex h-[calc(100vh-64px)] -m-6 lg:-m-8 bg-[#F7F8FA]">
      {/* Conversation List */}
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
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConversations(!showConversations)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Toggle conversations"
            >
              <PanelLeftOpen size={16} />
            </button>

            <div className="h-8 w-8 rounded-xl bg-gray-900 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <span className="text-[14px] font-semibold text-gray-900 block leading-tight">
                Astra
              </span>
              <span className="text-[10px] text-gray-400 leading-tight">
                Compliance Copilot
              </span>
            </div>

            {conversationId && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-400">
                <MessageSquare size={10} />
                <span className="text-[9px]">{conversationId.slice(0, 8)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasUserMessages && (
              <button
                onClick={resetChat}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="New chat"
                title="New Chat"
              >
                <RotateCcw size={14} />
              </button>
            )}
            <button
              onClick={() => setShowToolBrowser(!showToolBrowser)}
              className={`p-1.5 rounded-lg transition-colors ${showToolBrowser ? "text-gray-900 bg-gray-100" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
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
              <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center justify-between">
                <div className="flex items-center gap-2" role="alert">
                  <AlertCircle size={14} className="text-red-500" />
                  <span className="text-[12px] text-red-600">{error}</span>
                </div>
                <button
                  onClick={clearError}
                  aria-label="Dismiss error"
                  className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
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
        <div className="flex-1 overflow-y-auto px-4 py-6">
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
                <div className="w-7 h-7 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={13} className="text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
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

      {/* Tool Browser */}
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
