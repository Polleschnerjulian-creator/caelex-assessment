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
} from "lucide-react";
import { useAstra } from "./AstraProvider";
import AstraMessageBubble from "./AstraMessageBubble";

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

  const hasUserMessages = messages.some((m) => m.role === "user");

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
            {hasUserMessages && (
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
          {!hasUserMessages ? (
            /* ─── Empty State: 3D Entity Cube + Tool Grid ─── */
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
              {/* Dot grid background pattern */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                  pointerEvents: "none",
                  maskImage:
                    "radial-gradient(ellipse at 50% 30%, black 10%, transparent 60%)",
                  WebkitMaskImage:
                    "radial-gradient(ellipse at 50% 30%, black 10%, transparent 60%)",
                }}
              />

              {/* Animated Logo */}
              <div
                className="astra-logo-container"
                style={{
                  position: "relative",
                  width: "100%",
                  height: 200,
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Subtle radial glow behind logo */}
                <div
                  className="astra-logo-glow"
                  style={{
                    position: "absolute",
                    width: 160,
                    height: 160,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(0,0,0,0.04) 0%, transparent 70%)",
                    pointerEvents: "none",
                  }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="astra-logo-float"
                  src="/images/logo-black.png"
                  alt="Caelex"
                  width={64}
                  height={64}
                  style={{ objectFit: "contain", zIndex: 1 }}
                />
              </div>

              {/* Greeting */}
              <h2
                className="astra-greeting"
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#111827",
                  margin: 0,
                  marginTop: -4,
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
                  fontSize: 13,
                  color: "#9ca3af",
                  margin: "6px 0 0",
                  textAlign: "center",
                  zIndex: 1,
                }}
              >
                I can access all your compliance data. Try a tool:
              </p>

              {/* Tool Grid — 2 columns */}
              <div
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  padding: "16px 16px 16px",
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
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: "14px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0, 0, 0, 0.05)",
                      background: "rgba(255, 255, 255, 0.6)",
                      backdropFilter: "blur(8px)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 180ms ease",
                      animation: `astraCardFadeIn 400ms cubic-bezier(0.16, 1, 0.3, 1) ${150 + i * 50}ms both`,
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <tool.icon size={15} color="#374151" strokeWidth={2} />
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#374151",
                        lineHeight: 1.2,
                      }}
                    >
                      {tool.label}
                    </span>
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
              border: inputFocused ? "2px solid #111827" : "2px solid #e5e7eb",
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
                caretColor: "#111827",
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
                  background: input.trim() ? "#111827" : "transparent",
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

        /* ─── Panel animations ─── */
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

        /* ─── Logo float animation ─── */
        .astra-logo-float {
          animation: astraLogoEntry 800ms cubic-bezier(0.16, 1, 0.3, 1) 100ms both,
                     astraLogoFloat 4s ease-in-out 900ms infinite;
        }
        .astra-logo-glow {
          animation: astraGlowPulse 4s ease-in-out 900ms infinite;
        }
        @keyframes astraLogoEntry {
          from { opacity: 0; transform: scale(0.7) translateY(12px); filter: blur(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes astraLogoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes astraGlowPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }

        /* Text entrance */
        .astra-greeting {
          animation: astraTextReveal 600ms cubic-bezier(0.16, 1, 0.3, 1) 200ms both;
        }
        .astra-subtitle {
          animation: astraTextReveal 600ms cubic-bezier(0.16, 1, 0.3, 1) 320ms both;
        }
        @keyframes astraTextReveal {
          from { opacity: 0; transform: translateY(10px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        /* Tool card stagger + hover */
        @keyframes astraCardFadeIn {
          from { opacity: 0; transform: translateY(14px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .astra-tool-card:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 20px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.03);
          border-color: rgba(0, 0, 0, 0.12) !important;
          background: rgba(255, 255, 255, 0.9) !important;
        }
        .astra-tool-card:active {
          transform: translateY(0) scale(0.98);
        }

        /* ─── Typing dots ─── */
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
