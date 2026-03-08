"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Zap, Minus, X, Send } from "lucide-react";
import { useAstra } from "@/components/astra/AstraProvider";
import { GLASS } from "../../../theme";

// ─── Props ──────────────────────────────────────────────────────────────────

interface ForgeAstraChatProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ForgeAstraChat({
  isOpen,
  onClose,
}: ForgeAstraChatProps) {
  const { messages, sendMessage, isTyping, resetChat } = useAstra();
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [position, setPosition] = useState({
    x: 100,
    y: window.innerHeight - 560,
  });
  const dragging = useRef(false);

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
          left: position.x,
          bottom: 24,
          zIndex: 55,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 16px",
          background: "rgba(255,255,255,0.75)",
          backdropFilter: `blur(${GLASS.blur}px)`,
          WebkitBackdropFilter: `blur(${GLASS.blur}px)`,
          border: "1px solid rgba(255,255,255,0.8)",
          borderRadius: 20,
          boxShadow:
            "0 4px 12px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.08)",
          cursor: "pointer",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "#0F172A",
        }}
      >
        ASTRA <Zap size={12} />
      </button>
    );
  }

  // Full chat window
  return (
    <div
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 55,
        width: 380,
        height: 500,
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.75)",
        backdropFilter: `blur(${GLASS.blur}px)`,
        WebkitBackdropFilter: `blur(${GLASS.blur}px)`,
        border: "1px solid rgba(255,255,255,0.8)",
        borderRadius: 20,
        boxShadow: "0 4px 12px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      {/* Header — draggable */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          cursor: "grab",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Zap size={14} color="#2563EB" />
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "#0F172A",
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
              color: "#94A3B8",
              fontSize: 12,
            }}
          >
            <Zap size={20} color="#2563EB" style={{ margin: "0 auto 8px" }} />
            <div style={{ fontWeight: 600, color: "#334155", marginBottom: 4 }}>
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
                  msg.role === "user" ? "#2563EB" : "rgba(255,255,255,0.6)",
                color: msg.role === "user" ? "#fff" : "#0F172A",
                fontSize: 12,
                lineHeight: 1.5,
                border:
                  msg.role === "user" ? "none" : "1px solid rgba(0,0,0,0.06)",
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
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(0,0,0,0.06)",
              fontSize: 12,
              color: "#94A3B8",
              maxWidth: "85%",
            }}
          >
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid rgba(0,0,0,0.06)",
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
          placeholder="Ask about regulations..."
          disabled={isTyping}
          style={{
            flex: 1,
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 12,
            background: "rgba(255,255,255,0.5)",
            color: "#0F172A",
            outline: "none",
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
            background: input.trim() ? "#2563EB" : "rgba(0,0,0,0.06)",
            color: input.trim() ? "#fff" : "#94A3B8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: input.trim() ? "pointer" : "default",
            flexShrink: 0,
            transition: "background 150ms ease",
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

const headerBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 6,
  border: "none",
  background: "transparent",
  color: "#64748B",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
