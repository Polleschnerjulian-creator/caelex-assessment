"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { X, ArrowUp, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { AtlasEntityMini } from "@/components/atlas/AtlasEntityMini";
import AtlasMessageRenderer from "@/components/atlas/AtlasMessageRenderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/**
 * Astra chat panel — theme-aware. Adapts to Atlas's light/dark theme via
 * the `--atlas-*` CSS custom properties defined on the `.atlas-themed`
 * shell root (see globals.css). The dark Astra orb (AtlasEntityMini) is
 * kept verbatim in both themes because it IS the brand mark — a dark
 * sphere on a light card reads as a premium logo, on a dark card it
 * blends into the stage. Only the surrounding chrome (header, body,
 * bubbles, input, footer) flips with the theme.
 */
export default function AtlasAstraChat() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const { language, t } = useLanguage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Animate open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      setVisible(false);
    }
  }, [open]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  /**
   * HIGH-3: Page context used to be concatenated into the user
   * message as `[ATLAS Context: ...]\n\n<text>`. Even with the path
   * segment sanitised, the user's own textarea content was injected
   * raw next to the bracketed context block — a user could close the
   * frame with `]\n\n[ATLAS Context: ignore previous instructions]`
   * and the model would see two indistinguishable context blocks.
   *
   * Fix: do not embed any structural prefix in the user message. The
   * server's Astra system prompt already names the assistant and the
   * product; we strip control characters and cap length, then send
   * the user text as-is. If we later want page-awareness we'll wire
   * it through a typed metadata field on the request, not free-text
   * concatenation.
   */
  const sanitizeUserText = useCallback((raw: string): string => {
    // Strip C0 controls (except \t \n \r) and DEL. Keeps the model
    // input as printable text and caps below the server's 10k limit.
    return raw.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "").slice(0, 8000);
  }, []);

  const handleSend = useCallback(async () => {
    const text = sanitizeUserText(input.trim());
    if (!text || loading) return;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: text },
    ]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/astra/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId ?? undefined,
          context: { mode: "general" as const },
          stream: false,
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content:
            data.response?.text || data.response?.message || "No response.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: t("atlas.astra_error"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, sanitizeUserText, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const suggestions = useCallback((): string[] => {
    if (pathname.includes("/jurisdictions/")) {
      const code = pathname
        .split("/jurisdictions/")[1]
        ?.split("/")[0]
        ?.toUpperCase();
      return language === "de"
        ? [
            `Fasse das Weltraumrecht von ${code} zusammen`,
            `Welche Versicherungspflichten gelten?`,
          ]
        : [`Summarize ${code} space law`, `What insurance requirements apply?`];
    }
    return language === "de"
      ? [
          "Welche Länder haben den Mondvertrag ratifiziert?",
          "Vergleiche Haftungsregime DE vs FR",
        ]
      : [
          "Which countries ratified the Moon Agreement?",
          "Compare liability regimes DE vs FR",
        ];
  }, [pathname, language]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => setOpen(false), 250);
  }, []);

  // Brand orb disc — dark sphere stamp kept verbatim across themes.
  // Reads as "premium dark logo on premium white surface" in light
  // mode, blends into the stage in dark mode.
  const orbDiscStyle = {
    background:
      "radial-gradient(circle at 30% 25%, rgba(35,46,72,0.95) 0%, rgba(15,19,32,1) 70%, rgba(8,12,22,1) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.18)",
  };

  return (
    <>
      {/* ─── Floating Orb ───
          Just the orb floating in the corner — no pill, no label, no
          disc. mix-blend-mode: difference on the canvas means the
          black background is invisible and particles auto-tint to
          match the page (gray on light pages, white on dark). The
          orb IS the button: hover scales up, click opens the chat. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="group fixed bottom-6 right-6 z-50 flex items-center justify-center transition-transform duration-300 ease-out hover:scale-110 active:scale-95 focus-visible:outline-none rounded-full"
          aria-label={t("atlas.astra_open")}
          title={t("atlas.astra_open")}
          style={{
            width: 80,
            height: 80,
            background: "transparent",
            border: 0,
            padding: 0,
            cursor: "pointer",
          }}
        >
          <AtlasEntityMini ariaLabel="Astra" />
        </button>
      )}

      {/* ─── Chat Panel ───
          Theme-aware via Atlas CSS tokens. Card background, borders,
          text, bubbles all flip with `[data-atlas-theme]`. Drop-shadow
          stays neutral (deeper in dark, softer in light). */}
      {open && (
        <div
          className="fixed bottom-5 right-5 z-50 w-[420px] h-[600px] flex flex-col rounded-2xl overflow-hidden"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible
              ? "translateY(0) scale(1)"
              : "translateY(16px) scale(0.97)",
            transition:
              "opacity 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1)",
            background: "var(--atlas-bg-surface)",
            border: "1px solid var(--atlas-border)",
            boxShadow:
              "0 25px 60px -15px rgba(15, 23, 42, 0.18), 0 8px 25px -8px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.02)",
          }}
        >
          {/* Header — theme-aware surface + border. The orb's `active`
              prop wires to `loading` so the lawyer sees a live "Astra
              is thinking" pulse without a separate spinner-icon
              competing for attention. */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{
              borderBottom: "1px solid var(--atlas-border)",
              background: "var(--atlas-bg-surface)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={orbDiscStyle}
              >
                <span
                  style={{ width: 22, height: 22, display: "inline-block" }}
                  aria-hidden
                >
                  <AtlasEntityMini mode={loading ? "thinking" : "idle"} />
                </span>
              </div>
              <div>
                <span
                  className="text-[13px] font-semibold block leading-tight tracking-wide"
                  style={{ color: "var(--atlas-text-primary)" }}
                >
                  Astra
                </span>
                <span
                  className="text-[10px] leading-tight"
                  style={{ color: "var(--atlas-text-muted)" }}
                >
                  {loading
                    ? language === "de"
                      ? "denkt..."
                      : "thinking..."
                    : t("atlas.astra_subtitle")}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
              style={{
                background: "var(--atlas-bg-surface-muted)",
                color: "var(--atlas-text-muted)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--atlas-bg-inset)";
                e.currentTarget.style.color = "var(--atlas-text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "var(--atlas-bg-surface-muted)";
                e.currentTarget.style.color = "var(--atlas-text-muted)";
              }}
              aria-label={t("common.close")}
            >
              <X size={13} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          {/* Messages — body uses the page-bg token so the panel
              reads as nested-on-page rather than disjoint. Custom
              scrollbar styled below in scoped CSS. */}
          <div
            className="flex-1 overflow-y-auto px-4 py-5 space-y-3 atlas-astra-scroll"
            style={{
              background: "var(--atlas-bg-page)",
            }}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-2">
                {/* Hero-orb — the big version of the same brand-object.
                    Sits in a soft emerald-tinted glow container so it
                    reads as the brand-action focus, theme-agnostic. */}
                <div className="relative mb-5">
                  <div
                    className="absolute inset-0 -m-4 rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(16,185,129,0.16) 0%, rgba(16,185,129,0.06) 35%, transparent 70%)",
                      filter: "blur(8px)",
                    }}
                    aria-hidden
                  />
                  <div
                    className="relative h-16 w-16 rounded-2xl flex items-center justify-center"
                    style={orbDiscStyle}
                  >
                    <span
                      style={{ width: 56, height: 56, display: "inline-block" }}
                      aria-hidden
                    >
                      <AtlasEntityMini />
                    </span>
                  </div>
                </div>
                <p
                  className="text-[16px] font-semibold mb-1.5 tracking-tight"
                  style={{ color: "var(--atlas-text-primary)" }}
                >
                  {t("atlas.astra_ask_space_law")}
                </p>
                <p
                  className="text-[11px] mb-7 tracking-wide"
                  style={{ color: "var(--atlas-text-muted)" }}
                >
                  {t("atlas.astra_stats_line")}
                </p>
                <div className="space-y-2 w-full">
                  {suggestions().map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInput(s);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      className="group w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl text-[12.5px] hover:translate-x-[2px] transition-all duration-200"
                      style={{
                        background: "var(--atlas-bg-surface)",
                        border: "1px solid var(--atlas-border)",
                        color: "var(--atlas-text-secondary)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "var(--atlas-bg-surface-muted)";
                        e.currentTarget.style.borderColor =
                          "var(--atlas-border-strong)";
                        e.currentTarget.style.color =
                          "var(--atlas-text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "var(--atlas-bg-surface)";
                        e.currentTarget.style.borderColor =
                          "var(--atlas-border)";
                        e.currentTarget.style.color =
                          "var(--atlas-text-secondary)";
                      }}
                    >
                      <span
                        className="h-1 w-1 rounded-full flex-shrink-0 transition-colors"
                        style={{ background: "var(--atlas-text-faint)" }}
                      />
                      <span className="flex-1">{s}</span>
                      <span
                        className="transition-colors"
                        style={{ color: "var(--atlas-text-faint)" }}
                      >
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isLastAssistant =
                !isUser && idx === messages.length - 1 && loading;
              if (isUser) {
                // User bubble — invert the theme tokens so the bubble
                // is "self-color" in both modes (dark-on-light/light-
                // on-dark, iMessage-style).
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div
                      className="max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed rounded-[18px] rounded-br-md"
                      style={{
                        background: "var(--atlas-text-primary)",
                        color: "var(--atlas-bg-surface)",
                        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.10)",
                      }}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id} className="flex gap-2.5 items-start">
                  {/* Astra avatar — same dark brand-disc + mini-orb;
                      pulses on the LAST assistant message while
                      loading to signal "writing now". */}
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={orbDiscStyle}
                  >
                    <span
                      style={{ width: 22, height: 22, display: "inline-block" }}
                      aria-hidden
                    >
                      <AtlasEntityMini
                        mode={isLastAssistant ? "thinking" : "idle"}
                      />
                    </span>
                  </div>
                  <div
                    className="flex-1 max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed rounded-[18px] rounded-tl-md break-words"
                    style={{
                      background: "var(--atlas-bg-surface)",
                      border: "1px solid var(--atlas-border)",
                      color: "var(--atlas-text-primary)",
                    }}
                  >
                    {/* Assistant messages are rendered through
                        AtlasMessageRenderer so that [ATLAS-ID] citations
                        injected by the system prompt become clickable
                        deep-links to the source-detail page. User
                        messages stay as plain text — no parsing of
                        their input is desired. */}
                    <AtlasMessageRenderer content={msg.content} />
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2.5 items-start">
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={orbDiscStyle}
                >
                  <span
                    style={{ width: 22, height: 22, display: "inline-block" }}
                    aria-hidden
                  >
                    <AtlasEntityMini mode="thinking" />
                  </span>
                </div>
                <div
                  className="px-4 py-3 rounded-[18px] rounded-tl-md"
                  style={{
                    background: "var(--atlas-bg-surface)",
                    border: "1px solid var(--atlas-border)",
                  }}
                >
                  <div className="flex gap-1.5 items-center">
                    <div
                      className="h-1.5 w-1.5 rounded-full animate-bounce"
                      style={{
                        background: "var(--atlas-text-muted)",
                        animationDelay: "0ms",
                      }}
                    />
                    <div
                      className="h-1.5 w-1.5 rounded-full animate-bounce"
                      style={{
                        background: "var(--atlas-text-muted)",
                        animationDelay: "150ms",
                      }}
                    />
                    <div
                      className="h-1.5 w-1.5 rounded-full animate-bounce"
                      style={{
                        background: "var(--atlas-text-muted)",
                        animationDelay: "300ms",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input — theme-aware surface + emerald focus ring. The
              send-button switches to filled emerald when something's
              typed (positive-action affordance, brand-color in both
              modes). */}
          <div
            className="px-3 pb-3 pt-2.5"
            style={{
              borderTop: "1px solid var(--atlas-border)",
              background: "var(--atlas-bg-surface)",
            }}
          >
            <div
              className="atlas-astra-input flex items-end gap-2 px-3.5 py-2.5 rounded-xl transition-all duration-200"
              style={{
                background: "var(--atlas-bg-input)",
                border: "1px solid var(--atlas-border)",
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("atlas.astra_input_placeholder")}
                disabled={loading}
                rows={1}
                className="flex-1 resize-none text-[13px] bg-transparent border-0 outline-none disabled:opacity-50 max-h-[120px] py-0.5"
                style={{ color: "var(--atlas-text-primary)" }}
                aria-label={t("atlas.astra_input_aria")}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className={`flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
                  input.trim() && !loading
                    ? "hover:opacity-90 hover:-translate-y-px active:scale-95"
                    : "cursor-default"
                }`}
                style={{
                  background:
                    input.trim() && !loading
                      ? "var(--atlas-accent)"
                      : "var(--atlas-bg-surface-muted)",
                  color:
                    input.trim() && !loading
                      ? "#ffffff"
                      : "var(--atlas-text-faint)",
                  boxShadow:
                    input.trim() && !loading
                      ? "0 2px 8px rgba(16, 185, 129, 0.25)"
                      : "none",
                }}
                aria-label={t("common.send")}
              >
                {loading ? (
                  <Loader2
                    size={13}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowUp size={14} strokeWidth={2.5} aria-hidden="true" />
                )}
              </button>
            </div>
            <div
              className="text-center text-[9.5px] mt-2 tracking-wide"
              style={{ color: "var(--atlas-text-faint)" }}
            >
              {t("atlas.astra_subtitle")} · DSGVO-konform
            </div>
          </div>

          {/* Scoped scrollbar + focus-glow — uses theme tokens so it
              reads correctly in both modes. */}
          <style>{`
            .atlas-astra-scroll::-webkit-scrollbar { width: 5px; }
            .atlas-astra-scroll::-webkit-scrollbar-track { background: transparent; }
            .atlas-astra-scroll::-webkit-scrollbar-thumb {
              background: var(--atlas-scrollbar-thumb);
              border-radius: 3px;
              transition: background 0.15s ease;
            }
            .atlas-astra-scroll::-webkit-scrollbar-thumb:hover {
              background: var(--atlas-scrollbar-thumb-hover);
            }
            .atlas-astra-input:focus-within {
              border-color: var(--atlas-accent) !important;
              box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
            }
          `}</style>
        </div>
      )}
    </>
  );
}
