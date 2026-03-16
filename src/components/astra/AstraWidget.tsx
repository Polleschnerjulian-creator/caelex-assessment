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
  Satellite,
  AlertTriangle,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { useAstra } from "./AstraProvider";

// ─── Panel width ────────────────────────────────────────────────────────────

const PANEL_W = 400;

// ─── Suggested quick actions ────────────────────────────────────────────────

const QUICK_TOOLS = [
  {
    icon: BarChart3,
    label: "Compliance Score",
    prompt: "Show me my current compliance overview with all module scores",
  },
  {
    icon: FileText,
    label: "Generate Report",
    prompt: "Help me generate a compliance report for my organization",
  },
  {
    icon: Scale,
    label: "EU Space Act",
    prompt:
      "Explain the key requirements of the EU Space Act that apply to my organization",
  },
  {
    icon: Shield,
    label: "NIS2 Check",
    prompt: "What are my NIS2 obligations and what steps should I take next?",
  },
  {
    icon: Globe,
    label: "Jurisdictions",
    prompt:
      "Compare the regulatory frameworks of the top 3 jurisdictions for my operator type",
  },
  {
    icon: Satellite,
    label: "Satellite Status",
    prompt:
      "Show me the current status of my tracked satellites and any active alerts",
  },
  {
    icon: AlertTriangle,
    label: "Open Incidents",
    prompt: "List all open incidents and their NIS2 reporting status",
  },
  {
    icon: BookOpen,
    label: "Audit Evidence",
    prompt: "What evidence gaps do I have across my compliance modules?",
  },
];

// ─── Markdown Renderer (glass theme) ────────────────────────────────────────

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
        <strong key={pk++} style={{ fontWeight: 600, color: "#111827" }}>
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
            style={{
              padding: "1px 5px",
              borderRadius: 4,
              background: "rgba(0,0,0,0.05)",
              fontSize: "0.9em",
              fontFamily: "monospace",
            }}
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

function renderMarkdownGlass(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul
          key={key++}
          style={{
            margin: "4px 0",
            paddingLeft: 16,
            listStyleType: "disc",
          }}
        >
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 2, color: "#4b5563" }}>
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

    // Bullet list
    if (/^[•\-*]\s/.test(trimmed)) {
      listItems.push(trimmed.slice(2));
      continue;
    }
    // Numbered list
    const numMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numMatch) {
      listItems.push(numMatch[1]);
      continue;
    }

    flushList();

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      elements.push(
        <hr
          key={key++}
          style={{
            border: "none",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            margin: "10px 0",
          }}
        />,
      );
      continue;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      elements.push(
        <div
          key={key++}
          style={{
            fontWeight: 600,
            fontSize: 12,
            color: "#111827",
            marginTop: 10,
            marginBottom: 2,
          }}
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
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: "#111827",
            marginTop: 12,
            marginBottom: 3,
          }}
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
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: "#111827",
            marginTop: 12,
            marginBottom: 4,
          }}
        >
          {processInline(trimmed.slice(2))}
        </div>,
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} style={{ margin: "3px 0" }}>
        {processInline(trimmed)}
      </p>,
    );
  }

  flushList();
  return elements;
}

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
  const {
    messages,
    isTyping,
    isStreaming,
    sendMessage,
    resetChat,
    setGeneralContext,
  } = useAstra();

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

  // Auto-scroll (also during streaming)
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

  const hasUserMessages = messages.some((m) => m.role === "user");

  if (!isOpen) return null;

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

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
            backdropFilter: "blur(2px)",
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
          background: "rgba(250, 250, 250, 0.82)",
          backdropFilter: "blur(40px) saturate(1.6)",
          WebkitBackdropFilter: "blur(40px) saturate(1.6)",
          borderLeft: "1px solid rgba(0, 0, 0, 0.06)",
          boxShadow:
            "-8px 0 40px rgba(0, 0, 0, 0.04), -2px 0 8px rgba(0, 0, 0, 0.02)",
          overflow: "hidden",
          animation: "astraPanelSlideIn 320ms cubic-bezier(0.16, 1, 0.3, 1)",
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
            padding: "12px 14px",
            borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#111827",
                opacity: 0.4,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#6b7280",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              Astra
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
            {hasUserMessages && (
              <button
                onClick={resetChat}
                style={headerBtnStyle}
                title="New conversation"
              >
                <Plus size={15} />
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              style={headerBtnStyle}
              title={expanded ? "Compact" : "Expand"}
            >
              {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button onClick={onClose} style={headerBtnStyle} title="Close">
              <X size={15} />
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
          {!hasUserMessages ? (
            /* ─── Empty State: Glass Orb + Tool Grid ─── */
            <div
              className="astra-empty-state"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Animated grain noise background */}
              <div className="astra-noise" />

              {/* Subtle radial gradient wash */}
              <div
                style={{
                  position: "absolute",
                  top: -40,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 500,
                  height: 400,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse, rgba(0,0,0,0.02) 0%, transparent 70%)",
                  pointerEvents: "none",
                }}
              />

              {/* ─── Glass Orb ─── */}
              <div
                className="astra-orb-area"
                style={{
                  position: "relative",
                  width: "100%",
                  height: 220,
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div className="astra-orb-ring" />
                <div className="astra-glass-orb">
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 14,
                      width: 50,
                      height: 28,
                      borderRadius: "50%",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.7) 0%, transparent 100%)",
                      filter: "blur(8px)",
                      pointerEvents: "none",
                    }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/logo-black.png"
                    alt="Caelex"
                    width={44}
                    height={44}
                    style={{
                      objectFit: "contain",
                      zIndex: 1,
                      position: "relative",
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>

              {/* ─── Greeting ─── */}
              <h2
                className="astra-greeting"
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#111827",
                  margin: 0,
                  marginTop: -8,
                  letterSpacing: "-0.03em",
                  textAlign: "center",
                  zIndex: 1,
                }}
              >
                {greeting}
              </h2>
              <p
                className="astra-subtitle"
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  margin: "8px 0 0",
                  textAlign: "center",
                  zIndex: 1,
                  letterSpacing: "0.01em",
                }}
              >
                How can I help with your compliance?
              </p>

              {/* ─── Glass Tool Cards — 2 columns ─── */}
              <div
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                  padding: "20px 14px 14px",
                  zIndex: 1,
                }}
              >
                {QUICK_TOOLS.map((tool, i) => (
                  <button
                    key={tool.label}
                    className="astra-tool-card"
                    onClick={() => handleQuickAction(tool.prompt)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "11px 10px",
                      borderRadius: 14,
                      border: "1px solid rgba(0, 0, 0, 0.04)",
                      background: "rgba(255, 255, 255, 0.45)",
                      backdropFilter: "blur(12px) saturate(1.2)",
                      WebkitBackdropFilter: "blur(12px) saturate(1.2)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
                      animation: `astraCardFadeIn 500ms cubic-bezier(0.16, 1, 0.3, 1) ${200 + i * 60}ms both`,
                      boxShadow:
                        "0 1px 3px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.5)",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "rgba(0, 0, 0, 0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <tool.icon size={14} color="#6b7280" strokeWidth={1.8} />
                    </div>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 500,
                        color: "#374151",
                        lineHeight: 1.25,
                        flex: 1,
                      }}
                    >
                      {tool.label}
                    </span>
                    <ArrowRight
                      size={12}
                      color="#d1d5db"
                      className="astra-card-arrow"
                      style={{ flexShrink: 0 }}
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ─── Chat Messages ─── */
            <div
              style={{
                padding: "16px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                maxWidth: expanded ? 800 : undefined,
                margin: expanded ? "0 auto" : undefined,
                width: "100%",
              }}
            >
              {messages.map((msg, msgIdx) => {
                const isUser = msg.role === "user";
                const isLastAssistant =
                  !isUser && msgIdx === messages.length - 1;
                const showCursor = isStreaming && isLastAssistant;

                if (isUser) {
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginBottom: 6,
                        animation: "astraMsgFadeIn 200ms ease-out",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "82%",
                          padding: "10px 14px",
                          borderRadius: "16px 16px 4px 16px",
                          background: "rgba(0, 0, 0, 0.78)",
                          backdropFilter: "blur(12px) saturate(1.3)",
                          WebkitBackdropFilter: "blur(12px) saturate(1.3)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          color: "#ffffff",
                          fontSize: 13,
                          lineHeight: 1.55,
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                          boxShadow:
                            "0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                // Assistant message — liquid glass panel
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      marginBottom: 8,
                      animation: "astraMsgFadeIn 250ms ease-out",
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.6)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(0,0,0,0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 2,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/logo-black.png"
                        alt=""
                        width={13}
                        height={13}
                        style={{ objectFit: "contain", opacity: 0.55 }}
                      />
                    </div>

                    {/* Glass message panel */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "10px 14px",
                        borderRadius: 14,
                        background: "rgba(255, 255, 255, 0.45)",
                        backdropFilter: "blur(12px) saturate(1.2)",
                        WebkitBackdropFilter: "blur(12px) saturate(1.2)",
                        border: "1px solid rgba(0, 0, 0, 0.04)",
                        boxShadow:
                          "0 1px 4px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.5)",
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "#374151",
                        wordBreak: "break-word",
                      }}
                    >
                      {renderMarkdownGlass(msg.content)}
                      {showCursor && (
                        <span
                          className="astra-stream-cursor"
                          style={{
                            display: "inline-block",
                            width: 2,
                            height: 14,
                            background: "#111827",
                            marginLeft: 1,
                            verticalAlign: "text-bottom",
                            borderRadius: 1,
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator — show during tool execution (before streaming starts) */}
              {isTyping && !isStreaming && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.6)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(0,0,0,0.04)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/logo-black.png"
                      alt=""
                      width={13}
                      height={13}
                      style={{ objectFit: "contain", opacity: 0.55 }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                      paddingTop: 6,
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
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ─── Input Area ─── */}
        <div
          style={{
            padding: "8px 12px 14px",
            flexShrink: 0,
          }}
        >
          {/* Privacy — minimal */}
          <div
            style={{
              textAlign: "center",
              fontSize: 10,
              color: "#c9cdd3",
              marginBottom: 8,
              letterSpacing: "0.01em",
            }}
          >
            Processed by Anthropic Claude &middot;{" "}
            <span style={{ textDecoration: "underline", cursor: "pointer" }}>
              Privacy
            </span>
          </div>

          <div
            className={`astra-input-wrap ${inputFocused ? "focused" : ""}`}
            style={{
              borderRadius: 16,
              padding: "10px 12px",
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(16px) saturate(1.3)",
              WebkitBackdropFilter: "blur(16px) saturate(1.3)",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              boxShadow:
                "0 1px 4px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6)",
              transition:
                "border-color 200ms ease, box-shadow 200ms ease, background 200ms ease",
              maxWidth: expanded ? 800 : undefined,
              margin: expanded ? "0 auto" : undefined,
            }}
          >
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
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Ask anything..."
              disabled={isTyping}
              rows={1}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 13.5,
                color: "#111827",
                caretColor: "#111827",
                resize: "none",
                background: "transparent",
                lineHeight: 1.5,
                fontFamily: "inherit",
                padding: 0,
                maxHeight: 120,
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <button
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "#c9cdd3",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 120ms ease",
                }}
                title="Options"
              >
                <Settings2 size={15} />
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="astra-send-btn"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "none",
                  background: input.trim() ? "#111827" : "rgba(0, 0, 0, 0.04)",
                  color: input.trim() ? "#ffffff" : "#c9cdd3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: input.trim() ? "pointer" : "default",
                  flexShrink: 0,
                  transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Scoped CSS ─── */}
      <style>{`
        /* ─── Scrollbar ─── */
        .astra-panel-scroll::-webkit-scrollbar { width: 3px; }
        .astra-panel-scroll::-webkit-scrollbar-track { background: transparent; }
        .astra-panel-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 2px; }

        /* ─── Panel slide-in ─── */
        @keyframes astraPanelSlideIn {
          from { transform: translateX(100%); opacity: 0.6; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes astraFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes astraMsgFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ─── Noise texture ─── */
        .astra-noise {
          position: absolute;
          inset: 0;
          opacity: 0.35;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
          background-size: 200px 200px;
          animation: astraNoiseShift 8s linear infinite;
          mix-blend-mode: overlay;
        }
        @keyframes astraNoiseShift {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-200px, -200px); }
        }

        /* ─── Glass Orb ─── */
        .astra-glass-orb {
          position: relative;
          width: 110px;
          height: 110px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.06),
            0 2px 8px rgba(0, 0, 0, 0.04),
            inset 0 1px 1px rgba(255, 255, 255, 0.8),
            inset 0 -2px 4px rgba(0, 0, 0, 0.02);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          animation: astraOrbEntry 700ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both,
                     astraOrbBreathe 5s ease-in-out 800ms infinite;
        }
        .astra-orb-ring {
          position: absolute;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.03);
          z-index: 1;
          animation: astraOrbEntry 700ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both,
                     astraRingPulse 5s ease-in-out 800ms infinite;
        }
        .astra-orb-ring::before {
          content: '';
          position: absolute;
          inset: -12px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.015);
          animation: astraRingPulse 5s ease-in-out 1200ms infinite;
        }
        @keyframes astraOrbEntry {
          from { opacity: 0; transform: scale(0.6); filter: blur(10px); }
          to { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes astraOrbBreathe {
          0%, 100% { transform: scale(1); box-shadow: 0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(0,0,0,0.02); }
          50% { transform: scale(1.02); box-shadow: 0 12px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(0,0,0,0.02); }
        }
        @keyframes astraRingPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.04); }
        }

        /* ─── Text entrance ─── */
        .astra-greeting {
          animation: astraTextReveal 600ms cubic-bezier(0.16, 1, 0.3, 1) 300ms both;
        }
        .astra-subtitle {
          animation: astraTextReveal 600ms cubic-bezier(0.16, 1, 0.3, 1) 420ms both;
        }
        @keyframes astraTextReveal {
          from { opacity: 0; transform: translateY(8px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        /* ─── Glass Tool Cards ─── */
        @keyframes astraCardFadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .astra-tool-card .astra-card-arrow {
          opacity: 0;
          transform: translateX(-4px);
          transition: all 180ms ease;
        }
        .astra-tool-card:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.7) !important;
          border-color: rgba(0, 0, 0, 0.08) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6) !important;
        }
        .astra-tool-card:hover .astra-card-arrow {
          opacity: 1;
          transform: translateX(0);
        }
        .astra-tool-card:active {
          transform: translateY(0) scale(0.98);
        }

        /* ─── Streaming cursor ─── */
        .astra-stream-cursor {
          animation: astraCursorBlink 600ms steps(2) infinite;
        }
        @keyframes astraCursorBlink {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* ─── Input ─── */
        .astra-input-wrap.focused {
          border-color: rgba(0, 0, 0, 0.12) !important;
          background: rgba(255, 255, 255, 0.7) !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04), 0 0 0 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6) !important;
        }
        .astra-send-btn:hover:not(:disabled) {
          transform: scale(1.06);
        }

        /* ─── Typing dots ─── */
        .astra-typing-dot {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #9ca3af;
          animation: astraTypingBounce 1s ease-in-out infinite;
        }
        @keyframes astraTypingBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-3px); }
        }
      `}</style>
    </>
  );
}

const headerBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "#9ca3af",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "color 120ms ease, background 120ms ease",
};
