"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Minus, X, Send, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { useAstra } from "./AstraProvider";
import AstraMessageBubble from "./AstraMessageBubble";

// ─── Caelex Logo (Triskelion) ────────────────────────────────────────────────

function CaelexLogo({
  size = 28,
  color = "white",
}: {
  size?: number;
  color?: string;
}) {
  const arms = [
    "M -1.3 2 C -3.5 -3, -2.2 -8, -0.7 -12",
    "M 0 2 C -2.2 -3, -0.9 -8, 0 -12",
    "M 1.3 2 C -0.9 -3, 0.4 -8, 0.7 -12",
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="-14 -14 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {[0, 120, 240].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 0 2)`}>
          {arms.map((d, i) => (
            <path
              key={i}
              d={d}
              stroke={color}
              strokeWidth="0.9"
              strokeLinecap="round"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface AstraWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarMargin: number;
}

// ─── Caelex Dark Palette ────────────────────────────────────────────────────

const C = {
  bg: "#111114",
  bgElevated: "#18181B",
  border: "rgba(255,255,255,0.08)",
  borderMedium: "rgba(255,255,255,0.12)",
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

// ─── Compact dimensions ─────────────────────────────────────────────────────

const COMPACT_W = 380;
const COMPACT_H = 520;
const FAB_SIZE = 56;
const FAB_GAP = 12;
const EDGE = 28;

// ─── Component ──────────────────────────────────────────────────────────────

export default function AstraWidget({
  isOpen,
  onClose,
  sidebarMargin,
}: AstraWidgetProps) {
  const { messages, isTyping, sendMessage, resetChat, setGeneralContext } =
    useAstra();

  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setMinimized(false);
    }
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
  };

  const hasUserMessages = messages.some((m) => m.role === "user");

  if (!isOpen) return null;

  // Minimized pill
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        style={{
          position: "fixed",
          right: EDGE,
          bottom: EDGE + FAB_SIZE + FAB_GAP,
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
          animation: "astraWidgetOpen 200ms cubic-bezier(0.16, 1, 0.3, 1)",
          transformOrigin: "bottom right",
        }}
      >
        ASTRA <CaelexLogo size={14} />
      </button>
    );
  }

  // Window styles — compact vs expanded
  const windowStyle: React.CSSProperties = expanded
    ? {
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: sidebarMargin,
        zIndex: 99,
        display: "flex",
        flexDirection: "column",
        background: C.bg,
        backdropFilter: "blur(80px) saturate(1.6)",
        WebkitBackdropFilter: "blur(80px) saturate(1.6)",
        borderLeft: `1px solid ${C.border}`,
        overflow: "hidden",
        animation: "astraWidgetExpand 300ms cubic-bezier(0.16, 1, 0.3, 1)",
      }
    : {
        position: "fixed",
        right: EDGE,
        bottom: EDGE + FAB_SIZE + FAB_GAP,
        zIndex: 99,
        width: COMPACT_W,
        height: COMPACT_H,
        display: "flex",
        flexDirection: "column",
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
        overflow: "hidden",
        animation: "astraWidgetOpen 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        transformOrigin: "bottom right",
      };

  return (
    <>
      <div style={windowStyle}>
        {/* Top refraction highlight (compact only) */}
        {!expanded && (
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
        )}

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: expanded ? "12px 20px" : "10px 16px",
            borderBottom: `1px solid ${C.border}`,
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
            {expanded && (
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.06)",
                  color: C.textSecondary,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Beta
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {hasUserMessages && (
              <button
                onClick={resetChat}
                style={headerBtnStyle}
                title="New Chat"
              >
                <RotateCcw size={13} />
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              style={headerBtnStyle}
              title={expanded ? "Compact" : "Expand"}
            >
              {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            {!expanded && (
              <button
                onClick={() => setMinimized(true)}
                style={headerBtnStyle}
                title="Minimize"
              >
                <Minus size={14} />
              </button>
            )}
            <button onClick={onClose} style={headerBtnStyle} title="Close">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          className="astra-widget-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: expanded ? "20px 24px" : "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: expanded ? 16 : 10,
          }}
        >
          {expanded ? (
            // Expanded: use full AstraMessageBubble component
            <div style={{ maxWidth: 800, margin: "0 auto", width: "100%" }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ marginBottom: 16 }}>
                  <AstraMessageBubble message={msg} />
                </div>
              ))}
            </div>
          ) : (
            // Compact: simple inline bubbles
            <>
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
                  <div>Ask about compliance, regulations, or your data.</div>
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
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </>
          )}
          {isTyping && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "12px 12px 12px 4px",
                background: C.assistantBubble,
                border: `1px solid ${C.assistantBubbleBorder}`,
                fontSize: 12,
                color: C.textSecondary,
                maxWidth: expanded ? 800 : "85%",
                margin: expanded ? "0 auto" : undefined,
                width: expanded ? "100%" : undefined,
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
            padding: expanded ? "12px 20px" : "10px 12px",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <input
            ref={inputRef}
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
              maxWidth: expanded ? 800 : undefined,
              margin: expanded ? "0 auto" : undefined,
              border: `1px solid ${inputFocused ? C.inputFocus : C.inputBorder}`,
              borderRadius: 10,
              padding: expanded ? "10px 14px" : "8px 12px",
              fontSize: expanded ? 13 : 12,
              background: C.inputBg,
              color: C.textPrimary,
              caretColor: C.caret,
              outline: "none",
              transition: "border-color 150ms ease",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Segoe UI', sans-serif",
              width: expanded ? "100%" : undefined,
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
      </div>

      {/* Scoped CSS */}
      <style>{`
        .astra-widget-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .astra-widget-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .astra-widget-scroll::-webkit-scrollbar-thumb {
          background: ${C.scrollbar};
          border-radius: 2px;
        }
        @keyframes astraWidgetOpen {
          0% { opacity: 0; transform: scale(0.4); filter: blur(8px); }
          70% { opacity: 1; transform: scale(1.02); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes astraWidgetExpand {
          0% { opacity: 0.8; }
          100% { opacity: 1; }
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
    </>
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
