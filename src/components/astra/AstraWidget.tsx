"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, Maximize2, Send } from "lucide-react";
import { useAstra } from "./AstraProvider";
import AstraMissionBriefing from "./AstraMissionBriefing";

// ─── Markdown Renderer (light theme) ─────────────────────────────────────────

function processInline(line: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let pk = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0)
        parts.push(
          <span key={pk++}>{remaining.slice(0, boldMatch.index)}</span>,
        );
      parts.push(
        <strong key={pk++} className="font-semibold text-gray-900">
          {boldMatch[1]}
        </strong>,
      );
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else {
      const codeMatch = remaining.match(/`([^`]+)`/);
      if (codeMatch && codeMatch.index !== undefined) {
        if (codeMatch.index > 0)
          parts.push(
            <span key={pk++}>{remaining.slice(0, codeMatch.index)}</span>,
          );
        parts.push(
          <code
            key={pk++}
            className="px-1.5 py-0.5 rounded bg-gray-100 text-small font-mono text-gray-700"
          >
            {codeMatch[1]}
          </code>,
        );
        remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      } else {
        parts.push(<span key={pk++}>{remaining}</span>);
        break;
      }
    }
  }
  return parts;
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="my-1 pl-4 list-disc">
          {listItems.map((item, idx) => (
            <li key={idx} className="mb-0.5 text-gray-600">
              {processInline(item)}
            </li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    if (/^[•\-*]\s/.test(trimmed)) {
      listItems.push(trimmed.slice(2));
      continue;
    }
    const numMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numMatch) {
      listItems.push(numMatch[1]);
      continue;
    }

    flushList();

    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      elements.push(
        <hr key={key++} className="border-t border-gray-200 my-2.5" />,
      );
      continue;
    }
    if (trimmed.startsWith("### ")) {
      elements.push(
        <div
          key={key++}
          className="font-semibold text-small text-gray-800 mt-2.5 mb-0.5"
        >
          {processInline(trimmed.slice(4))}
        </div>,
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <div
          key={key++}
          className="font-semibold text-body text-gray-800 mt-3 mb-1"
        >
          {processInline(trimmed.slice(3))}
        </div>,
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      elements.push(
        <div
          key={key++}
          className="font-semibold text-body-lg text-gray-900 mt-3 mb-1"
        >
          {processInline(trimmed.slice(2))}
        </div>,
      );
      continue;
    }

    elements.push(
      <p key={key++} className="my-0.5">
        {processInline(trimmed)}
      </p>,
    );
  }

  flushList();
  return elements;
}

// ─── Suggestion Pills ───────────────────────────────────────────────────────

const SUGGESTION_PILLS = [
  "Compliance Score anzeigen",
  "NIS2 Status pruefen",
  "Report generieren",
];

// ─── Props ──────────────────────────────────────────────────────────────────

interface AstraWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarMargin: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AstraWidget({
  isOpen,
  onClose,
  sidebarMargin: _sidebarMargin,
}: AstraWidgetProps) {
  const {
    messages,
    isTyping,
    isStreaming,
    sendMessage,
    resetChat,
    setGeneralContext,
  } = useAstra();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initRef = useRef(false);

  // Initialize general context on first open
  useEffect(() => {
    if (isOpen && !initRef.current) {
      initRef.current = true;
      if (messages.length === 0) {
        setGeneralContext();
      }
    }
  }, [isOpen, messages.length, setGeneralContext]);

  // Auto-scroll on new messages / streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Global keyboard shortcuts: Cmd+K to open, ESC to close
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Toggle is handled at layout level via custom event
        window.dispatchEvent(new CustomEvent("astra-toggle"));
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [isOpen, onClose]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isTyping) return;
    sendMessage(input);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  }, [input, isTyping, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasUserMessages = messages.some((m) => m.role === "user");

  // ─── Panel spring animation ───
  const panelSpring = {
    type: "spring" as const,
    damping: 30,
    stiffness: 300,
    mass: 0.8,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ─── Overlay ─── */}
          <motion.div
            key="astra-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/30"
          />

          {/* ─── Slide-Over Panel ─── */}
          <motion.div
            key="astra-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={panelSpring}
            className="
              fixed right-0 top-0 h-full w-[480px] max-w-full z-50
              flex flex-col
              bg-white border-l border-gray-200 shadow-xl
              overflow-hidden
            "
          >
            {/* ─── Header ─── */}
            <div className="h-12 flex items-center justify-between px-4 bg-white border-b border-gray-200 flex-shrink-0 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                <span className="text-small font-medium tracking-wider text-gray-900 uppercase">
                  Astra
                </span>
              </div>
              <div className="flex items-center gap-1">
                {hasUserMessages && (
                  <button
                    onClick={resetChat}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                    title="Neues Gespraech"
                  >
                    <svg
                      width={15}
                      height={15}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                )}
                <Link
                  href="/dashboard/astra"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  title="Vollbild"
                >
                  <Maximize2 size={15} />
                </Link>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  title="Schliessen"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ─── Content Area ─── */}
            <div className="flex-1 overflow-y-auto astra-panel-scroll relative z-10 bg-[#F7F8FA]">
              {!hasUserMessages ? (
                <AstraMissionBriefing onSendMessage={sendMessage} />
              ) : (
                <div className="px-4 py-4 flex flex-col gap-1">
                  {messages.map((msg, msgIdx) => {
                    const isUser = msg.role === "user";
                    const isLastAssistant =
                      !isUser && msgIdx === messages.length - 1;
                    const showCursor = isStreaming && isLastAssistant;

                    if (isUser) {
                      return (
                        <div key={msg.id} className="flex justify-end mb-1.5">
                          <div className="max-w-[82%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-gray-900 text-white text-body leading-relaxed whitespace-pre-wrap break-words">
                            {msg.content}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className="flex gap-2.5 items-start mb-2"
                      >
                        {/* Avatar */}
                        <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-gray-900" />
                        </div>
                        {/* Message */}
                        <div className="flex-1 min-w-0 px-3.5 py-2.5 rounded-2xl bg-white border border-gray-200 text-body leading-relaxed text-gray-800 break-words">
                          {renderMarkdown(msg.content)}
                          {showCursor && (
                            <span className="inline-block w-0.5 h-3.5 bg-gray-900 ml-0.5 align-text-bottom rounded-sm animate-pulse" />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {isTyping && !isStreaming && (
                    <div className="flex gap-2.5 items-start mb-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-gray-900" />
                      </div>
                      <div className="flex gap-1.5 items-center pt-2.5">
                        <span
                          className="astra-typing-dot"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="astra-typing-dot"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="astra-typing-dot"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* ─── Input Area ─── */}
            <div className="flex-shrink-0 p-3 relative z-10">
              {/* Suggestion pills — shown when no messages yet */}
              {!hasUserMessages && (
                <div className="flex gap-2 mb-2.5 flex-wrap">
                  {SUGGESTION_PILLS.map((pill) => (
                    <button
                      key={pill}
                      onClick={() => sendMessage(pill)}
                      className="px-3 py-1.5 rounded-xl text-caption text-gray-600 border border-gray-200 bg-white hover:border-gray-300 hover:text-gray-800 transition-colors"
                    >
                      {pill}
                    </button>
                  ))}
                </div>
              )}

              {/* Command bar input */}
              <div className="flex items-end gap-2 rounded-2xl px-3.5 py-2.5 bg-white border border-gray-200 focus-within:border-gray-400 focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height =
                      Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Frag Astra etwas..."
                  disabled={isTyping}
                  rows={1}
                  className="flex-1 bg-transparent border-none outline-none resize-none text-body text-gray-900 placeholder:text-gray-400 leading-relaxed max-h-[120px]"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className={`
                    w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                    transition-all duration-200
                    ${
                      input.trim()
                        ? "bg-gray-900 text-white hover:bg-gray-800"
                        : "text-gray-300 cursor-default"
                    }
                  `}
                >
                  <Send size={13} />
                </button>
              </div>

              {/* Privacy line */}
              <div className="text-center text-micro text-gray-400 mt-2">
                Powered by Anthropic Claude
              </div>
            </div>
          </motion.div>

          {/* ─── Scoped CSS ─── */}
          <style>{`
            .astra-panel-scroll::-webkit-scrollbar { width: 3px; }
            .astra-panel-scroll::-webkit-scrollbar-track { background: transparent; }
            .astra-panel-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }

            .astra-typing-dot {
              display: inline-block;
              width: 4px;
              height: 4px;
              border-radius: 50%;
              background: rgb(156, 163, 175);
              animation: astraTypingBounce 1s ease-in-out infinite;
            }
            @keyframes astraTypingBounce {
              0%, 80%, 100% { transform: translateY(0); }
              40% { transform: translateY(-3px); }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}
