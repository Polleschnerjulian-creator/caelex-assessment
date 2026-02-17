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
    <div className="flex-shrink-0 px-4 py-3 border-t border-white/10 bg-white/[0.01]">
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
            className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/20 disabled:opacity-50 transition-all resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
            className="p-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/20 text-cyan-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <p className="text-[9px] text-white/40">Shift+Enter for new line</p>
          {remainingQueries !== null && (
            <p className="text-[9px] text-white/40">
              {remainingQueries} queries remaining
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
