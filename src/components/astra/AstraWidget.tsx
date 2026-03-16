"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  X,
  Send,
  Maximize2,
  Minimize2,
  Shield,
  FileText,
  Scale,
  Globe,
  BookOpen,
  Settings2,
} from "lucide-react";
import { useAstra } from "./AstraProvider";
import AstraMessageBubble from "./AstraMessageBubble";

// ─── Panel width ────────────────────────────────────────────────────────────

const PANEL_W = 400;

// ─── Suggested quick actions ────────────────────────────────────────────────

const SUGGESTED_ACTIONS = [
  {
    icon: Shield,
    label: "Compliance overview",
    description: "Show my current scores",
    prompt: "Show me my current compliance overview with all module scores",
  },
  {
    icon: FileText,
    label: "Generate a report",
    description: "Create compliance documents",
    prompt: "Help me generate a compliance report for my organization",
  },
  {
    icon: Scale,
    label: "EU Space Act",
    description: "Explain key requirements",
    prompt:
      "Explain the key requirements of the EU Space Act that apply to my organization",
  },
  {
    icon: Globe,
    label: "Jurisdiction comparison",
    description: "Compare regulatory frameworks",
    prompt:
      "Compare the regulatory frameworks of the top 3 jurisdictions for my operator type",
  },
  {
    icon: BookOpen,
    label: "NIS2 obligations",
    description: "What do I need to do?",
    prompt: "What are my NIS2 obligations and what steps should I take next?",
  },
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
  sidebarMargin,
}: AstraWidgetProps) {
  const { messages, isTyping, sendMessage, resetChat, setGeneralContext } =
    useAstra();

  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
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

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isTyping) return;
    sendMessage(input);
    setInput("");
    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = "auto";
  }, [input, isTyping, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  const hasMessages = messages.length > 0;

  if (!isOpen) return null;

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning."
      : hour < 18
        ? "Good afternoon."
        : "Good evening.";

  return (
    <>
      {/* Backdrop overlay for expanded mode */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 98,
            background: "rgba(0, 0, 0, 0.15)",
            animation: "astraFadeIn 200ms ease-out",
          }}
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: expanded ? `calc(100vw - ${sidebarMargin}px)` : PANEL_W,
          zIndex: 99,
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          borderLeft: "1px solid #e5e7eb",
          boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.06)",
          overflow: "hidden",
          animation: "astraPanelSlideIn 280ms cubic-bezier(0.16, 1, 0.3, 1)",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
        }}
      >
        {/* ─── Header ─── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid #e5e7eb",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
                letterSpacing: "-0.01em",
              }}
            >
              New conversation
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {hasMessages && (
              <button
                onClick={resetChat}
                style={headerBtnStyle}
                title="New conversation"
              >
                <Plus size={16} />
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              style={headerBtnStyle}
              title={expanded ? "Compact" : "Expand"}
            >
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button onClick={onClose} style={headerBtnStyle} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ─── Content ─── */}
        <div
          className="astra-panel-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {!hasMessages ? (
            /* ─── Empty State: Greeting + Suggested Actions ─── */
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "0 24px",
              }}
            >
              {/* Logo + Greeting */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  paddingTop: 64,
                  paddingBottom: 32,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/logo-black.png"
                  alt=""
                  width={52}
                  height={52}
                  style={{ objectFit: "contain", marginBottom: 20 }}
                />
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#111827",
                    margin: 0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {greeting}
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: "#6b7280",
                    margin: "4px 0 0",
                  }}
                >
                  What are we working on today?
                </p>
              </div>

              {/* Suggested Actions */}
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {SUGGESTED_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.prompt)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "background 120ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f3f4f6";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <action.icon
                        size={18}
                        color="#6b7280"
                        strokeWidth={1.5}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#111827",
                          lineHeight: 1.3,
                        }}
                      >
                        {action.label}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#9ca3af",
                          lineHeight: 1.3,
                          marginTop: 1,
                        }}
                      >
                        {action.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ─── Chat Messages ─── */
            <div
              style={{
                padding: expanded ? "20px 24px" : "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  maxWidth: expanded ? 800 : undefined,
                  margin: expanded ? "0 auto" : undefined,
                  width: "100%",
                }}
              >
                {messages.map((msg) =>
                  expanded ? (
                    <div key={msg.id} style={{ marginBottom: 16 }}>
                      <AstraMessageBubble message={msg} />
                    </div>
                  ) : (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems:
                          msg.role === "user" ? "flex-end" : "flex-start",
                        marginBottom: 10,
                        animation: "astraMsgFadeIn 200ms ease-out",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "88%",
                          padding: "10px 14px",
                          borderRadius:
                            msg.role === "user"
                              ? "14px 14px 4px 14px"
                              : "14px 14px 14px 4px",
                          background:
                            msg.role === "user" ? "#111827" : "#f3f4f6",
                          color: msg.role === "user" ? "#ffffff" : "#111827",
                          fontSize: 13,
                          lineHeight: 1.55,
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ),
                )}
              </div>
              {isTyping && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "14px 14px 14px 4px",
                    background: "#f3f4f6",
                    fontSize: 13,
                    color: "#6b7280",
                    maxWidth: expanded ? 800 : "88%",
                    margin: expanded ? "0 auto" : undefined,
                    width: expanded ? "100%" : undefined,
                    display: "flex",
                    gap: 5,
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
          )}
        </div>

        {/* ─── Privacy Notice ─── */}
        <div
          style={{
            padding: "8px 20px",
            textAlign: "center",
            fontSize: 11,
            color: "#9ca3af",
            lineHeight: 1.4,
          }}
        >
          Chats are processed by Anthropic Claude in accordance with our{" "}
          <span style={{ textDecoration: "underline", cursor: "pointer" }}>
            Privacy Policy
          </span>
          .
        </div>

        {/* ─── Input Area ─── */}
        <div
          style={{
            padding: "12px 16px 16px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              border: inputFocused ? "2px solid #10B981" : "2px solid #e5e7eb",
              borderRadius: 14,
              padding: "10px 14px",
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              transition: "border-color 150ms ease",
              background: "#ffffff",
              maxWidth: expanded ? 800 : undefined,
              margin: expanded ? "0 auto" : undefined,
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="What can we help you with?"
              disabled={isTyping}
              rows={1}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 14,
                color: "#111827",
                caretColor: "#10B981",
                resize: "none",
                background: "transparent",
                lineHeight: 1.5,
                fontFamily: "inherit",
                padding: 0,
                maxHeight: 120,
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "#9ca3af",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 120ms ease",
                }}
                title="Options"
              >
                <Settings2 size={16} />
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "none",
                  background: input.trim() ? "#10B981" : "transparent",
                  color: input.trim() ? "#ffffff" : "#9ca3af",
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
        </div>
      </div>

      {/* ─── Scoped CSS ─── */}
      <style>{`
        .astra-panel-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .astra-panel-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .astra-panel-scroll::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 2px;
        }
        @keyframes astraPanelSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes astraFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
          background: #9ca3af;
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
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "#6b7280",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "color 120ms ease, background 120ms ease",
};
