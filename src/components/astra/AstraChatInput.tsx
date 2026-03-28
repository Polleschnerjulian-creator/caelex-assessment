"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Send } from "lucide-react";
import { useAstra } from "./AstraProvider";

export default function AstraChatInput() {
  const { sendMessage, isTyping, remainingQueries } = useAstra();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isTyping) return;
    sendMessage(input);
    setInput("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, isTyping, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-shrink-0 px-4 py-3 glass-surface border-t border-white/[0.06]">
      <div className="max-w-[800px] mx-auto">
        <div className="flex items-end gap-2">
          <label htmlFor="astra-fullpage-input" className="sr-only">
            Ask about regulations
          </label>
          <textarea
            id="astra-fullpage-input"
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about regulations..."
            disabled={isTyping}
            rows={1}
            className="flex-1 glass-elevated rounded-2xl px-4 py-3 text-body text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:shadow-[0_0_20px_rgba(16,185,129,0.08)] disabled:opacity-50 transition-all resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
            className="p-3 rounded-xl glass-interactive bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <p className="text-[9px] text-white/30">Shift+Enter for new line</p>
          {remainingQueries !== null && (
            <p className="text-[9px] text-white/30">
              {remainingQueries} queries remaining
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
