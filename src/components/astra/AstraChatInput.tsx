"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Send } from "lucide-react";
import { useAstra } from "./AstraProvider";

export default function AstraChatInput() {
  const { sendMessage, isTyping, remainingQueries } = useAstra();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchParams = useSearchParams();
  /** Gate the ?prefill= ingest so it runs exactly once per mount —
   *  otherwise re-renders would re-apply the prefill and clobber any
   *  edits the user has made. */
  const prefillAppliedRef = useRef(false);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  // Pre-fill from `?prefill=…` deep-link (e.g. from the Trade list-page
  // EmptyStateRich "Ask Astra: …" shortcut). We pre-fill and focus the
  // textarea, but deliberately do NOT auto-send — the user should always
  // get the chance to edit or cancel before submitting an AI query.
  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const prefill = searchParams.get("prefill");
    if (!prefill) return;
    prefillAppliedRef.current = true;
    setInput(prefill);
    // Focus on next tick so the auto-resize effect has already
    // re-measured the textarea height.
    setTimeout(() => {
      textareaRef.current?.focus();
      // Place caret at end so the user can immediately keep typing.
      const len = prefill.length;
      textareaRef.current?.setSelectionRange(len, len);
    }, 0);
  }, [searchParams]);

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
    <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-gray-200">
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
            className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-body text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] disabled:opacity-50 transition-all resize-none bg-[#F7F8FA]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
            className="p-3 rounded-xl bg-gray-900 hover:bg-black text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <p className="text-[9px] text-gray-400">Shift+Enter for new line</p>
          {remainingQueries !== null && (
            <p className="text-[9px] text-gray-400">
              {remainingQueries} queries remaining
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
