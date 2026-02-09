"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Zap, RotateCcw } from "lucide-react";
import { useAstra } from "./AstraProvider";
import AstraMessageBubble from "./AstraMessageBubble";

export default function AstraChatPanel() {
  const { isOpen, messages, context, isTyping, close, sendMessage, resetChat } =
    useAstra();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
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

  // Check if there are user messages (for showing reset button)
  const hasUserMessages = messages.some((m) => m.role === "user");

  // Mode label
  const modeLabel =
    context?.mode === "article"
      ? context.articleRef
      : context?.mode === "category"
        ? context.categoryLabel
        : "General";

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
                <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
                  <Zap size={14} className="text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-white">
                      ASTRA
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium uppercase tracking-wider">
                      Framework
                    </span>
                  </div>
                  <p className="text-[10px] text-white/30">{modeLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* New Chat button */}
                {hasUserMessages && (
                  <button
                    onClick={resetChat}
                    className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
                    title="Neuen Chat starten"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                {/* Close button */}
                <button
                  onClick={close}
                  className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
              {messages.map((msg) => (
                <AstraMessageBubble key={msg.id} message={msg} />
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-2.5">
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

            {/* Input Bar */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-white/10 bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nachricht eingeben..."
                  disabled={isTyping}
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3.5 py-2.5 text-[12px] text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/20 disabled:opacity-50 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="p-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/20 text-cyan-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="text-[9px] text-white/15 mt-1.5 text-center">
                ASTRA Framework-Modus · Phase 1
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
