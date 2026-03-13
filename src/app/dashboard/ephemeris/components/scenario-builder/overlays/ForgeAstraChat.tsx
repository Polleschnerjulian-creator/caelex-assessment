"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Minus, X, Send } from "lucide-react";
import { useAstra } from "@/components/astra/AstraProvider";

// ─── Caelex Logo (PNG mask) ──────────────────────────────────────────────────

function CaelexLogo({ size = 28 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        backgroundColor: "white",
        maskImage: "url(/images/logo-black.png)",
        maskSize: "140%",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskImage: "url(/images/logo-black.png)",
        WebkitMaskSize: "140%",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ForgeAstraChatProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CHAT_WIDTH = 380;
const CHAT_HEIGHT = 520;
const EDGE_GAP = 28;
const BUTTON_SIZE = 56;
const BUTTON_GAP = 12;

// ─── Caelex Dark Palette ────────────────────────────────────────────────────

const C = {
  bg: "#111114",
  bgElevated: "#18181B",
  bgSurface: "#1C1C1E",
  border: "rgba(255,255,255,0.08)",
  borderMedium: "rgba(255,255,255,0.12)",
  borderStrong: "rgba(255,255,255,0.15)",
  textPrimary: "rgba(255,255,255,0.9)",
  textSecondary: "rgba(255,255,255,0.4)",
  textMuted: "rgba(255,255,255,0.2)",
  userBubble: "rgba(255,255,255,0.1)",
  userBubbleBorder: "rgba(255,255,255,0.12)",
  assistantBubble: "rgba(255,255,255,0.04)",
  assistantBubbleBorder: "rgba(255,255,255,0.06)",
  sendActive: "rgba(255,255,255,0.85)",
  sendInactive: "rgba(255,255,255,0.04)",
  inputBg: "rgba(255,255,255,0.04)",
  inputBorder: "rgba(255,255,255,0.08)",
  inputFocus: "rgba(255,255,255,0.2)",
  caret: "rgba(255,255,255,0.6)",
  scrollbar: "rgba(255,255,255,0.08)",
} as const;

// ─── Glassmorphism Styles ───────────────────────────────────────────────────

const glassWindow: React.CSSProperties = {
  background: C.bg,
  backdropFilter: "blur(80px) saturate(1.6)",
  WebkitBackdropFilter: "blur(80px) saturate(1.6)",
  border: `1px solid ${C.border}`,
  borderRadius: 20,
  boxShadow: [
    "0 40px 80px rgba(0,0,0,0.5)",
    "0 16px 32px rgba(0,0,0,0.3)",
    "inset 0 0 0 0.5px rgba(255,255,255,0.08)",
  ].join(", "),
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ForgeAstraChat({
  isOpen,
  onClose,
}: ForgeAstraChatProps) {
  const { messages, sendMessage, isTyping, resetChat } = useAstra();
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);

  // Reset position to bottom-right each time the chat opens
  useEffect(() => {
    if (isOpen) {
      setPosition({
        x: window.innerWidth - CHAT_WIDTH - EDGE_GAP,
        y:
          window.innerHeight -
          CHAT_HEIGHT -
          EDGE_GAP -
          BUTTON_SIZE -
          BUTTON_GAP,
      });
      setMinimized(false);
    }
  }, [isOpen]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Set initial context for Forge
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      resetChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
    // Prevent Forge shortcuts from firing when typing in chat
    e.stopPropagation();
  };

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    },
    [position],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !dragOffset) return;
      setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    };
    const handleMouseUp = () => {
      dragging.current = false;
      setDragOffset(null);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragOffset]);

  if (!isOpen) return null;

  // Minimized pill
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        style={{
          position: "fixed",
          right: EDGE_GAP,
          bottom: EDGE_GAP + BUTTON_SIZE + BUTTON_GAP,
          zIndex: 99,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 16px",
          background: C.bgElevated,
          backdropFilter: "blur(80px) saturate(1.6)",
          WebkitBackdropFilter: "blur(80px) saturate(1.6)",
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          boxShadow:
            "0 16px 32px rgba(0,0,0,0.3), inset 0 0 0 0.5px rgba(255,255,255,0.08)",
          cursor: "pointer",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Segoe UI', sans-serif",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: C.textPrimary,
          animation: "astraChatOpen 200ms cubic-bezier(0.16, 1, 0.3, 1)",
          transformOrigin: "bottom right",
        }}
      >
        ASTRA <CaelexLogo size={14} />
      </button>
    );
  }

  // Full chat window — anchored bottom-right, draggable
  return (
    <div
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 99,
        width: CHAT_WIDTH,
        height: CHAT_HEIGHT,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "astraChatOpen 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        transformOrigin: "bottom right",
        ...glassWindow,
      }}
    >
      {/* Top refraction highlight */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
          borderRadius: "20px 20px 0 0",
          pointerEvents: "none",
        }}
      />

      {/* Header — draggable */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: `1px solid ${C.border}`,
          cursor: "grab",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CaelexLogo size={18} />
          </div>
          <span
            style={{
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Segoe UI', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: C.textPrimary,
            }}
          >
            ASTRA
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => setMinimized(true)}
            style={headerBtnStyle}
            title="Minimize"
          >
            <Minus size={14} />
          </button>
          <button onClick={onClose} style={headerBtnStyle} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="astra-messages-scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 16px",
              color: C.textSecondary,
              fontSize: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 10px",
              }}
            >
              <CaelexLogo size={22} />
            </div>
            <div
              style={{
                fontWeight: 600,
                color: C.textPrimary,
                marginBottom: 4,
              }}
            >
              Astra AI Assistant
            </div>
            <div>Ask about compliance, regulations, or this scenario.</div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              animation: "astraMsgFadeIn 200ms ease-out",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "8px 12px",
                borderRadius:
                  msg.role === "user"
                    ? "12px 12px 4px 12px"
                    : "12px 12px 12px 4px",
                background:
                  msg.role === "user" ? C.userBubble : C.assistantBubble,
                color: C.textPrimary,
                fontSize: 12,
                lineHeight: 1.5,
                border: `1px solid ${
                  msg.role === "user"
                    ? C.userBubbleBorder
                    : C.assistantBubbleBorder
                }`,
                wordBreak: "break-word",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "12px 12px 12px 4px",
              background: C.assistantBubble,
              border: `1px solid ${C.assistantBubbleBorder}`,
              fontSize: 12,
              color: C.textSecondary,
              maxWidth: "85%",
              display: "flex",
              gap: 4,
              alignItems: "center",
            }}
          >
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
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "6px 16px",
          textAlign: "center",
          fontSize: 10,
          color: C.textMuted,
          borderTop: `1px solid ${C.border}`,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Segoe UI', sans-serif",
          letterSpacing: "0.02em",
        }}
      >
        Powered by ASTRA · Caelex
      </div>

      {/* Input */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder="Ask about regulations..."
          disabled={isTyping}
          style={{
            flex: 1,
            border: `1px solid ${inputFocused ? C.inputFocus : C.inputBorder}`,
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 12,
            background: C.inputBg,
            color: C.textPrimary,
            caretColor: C.caret,
            outline: "none",
            transition: "border-color 150ms ease",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Segoe UI', sans-serif",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            border: "none",
            background: input.trim() ? C.sendActive : C.sendInactive,
            color: input.trim() ? "#000" : C.textMuted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: input.trim() ? "pointer" : "default",
            flexShrink: 0,
            transition: "background 150ms ease, color 150ms ease",
          }}
        >
          <Send size={14} />
        </button>
      </div>

      {/* Scoped CSS */}
      <style>{`
        .astra-messages-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .astra-messages-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .astra-messages-scroll::-webkit-scrollbar-thumb {
          background: ${C.scrollbar};
          border-radius: 2px;
        }
        @keyframes astraMsgFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .astra-typing-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: ${C.textSecondary};
          animation: astraTypingBounce 1s ease-in-out infinite;
        }
        @keyframes astraTypingBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

const headerBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 6,
  border: "none",
  background: "transparent",
  color: "rgba(255,255,255,0.4)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "color 150ms ease",
};
