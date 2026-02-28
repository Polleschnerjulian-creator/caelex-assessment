"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import {
  getWelcomeMessage,
  getFieldTip,
  type AstraMessage,
} from "@/lib/assure/onboarding-astra-messages";

// ─── Types ───

interface DisplayMessage extends AstraMessage {
  id: string;
  showTip: boolean;
}

interface AstraCoPilotProps {
  step: number;
  field: string | null;
  fieldVars: Record<string, unknown>;
}

// ─── Typing Indicator ───

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-emerald-400/60"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Component ───

export default function AstraCoPilot({
  step,
  field,
  fieldVars,
}: AstraCoPilotProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messageIdCounter = useRef(0);
  const lastStep = useRef<number>(-1);
  const lastField = useRef<string | null>(null);

  const addMessage = useCallback((msg: AstraMessage) => {
    messageIdCounter.current += 1;
    const newMsg: DisplayMessage = {
      ...msg,
      id: `msg-${messageIdCounter.current}`,
      showTip: false,
    };
    setMessages((prev) => [...prev.slice(-2), newMsg]);
  }, []);

  // On step change: show welcome message with typing animation
  useEffect(() => {
    if (step === lastStep.current) return;
    lastStep.current = step;
    lastField.current = null;

    setIsTyping(true);
    const timer = setTimeout(() => {
      setIsTyping(false);
      const welcome = getWelcomeMessage(step);
      addMessage(welcome);
    }, 1500);

    return () => clearTimeout(timer);
  }, [step, addMessage]);

  // On field change: show field tip
  useEffect(() => {
    if (!field || field === lastField.current) return;
    lastField.current = field;

    const tip = getFieldTip(
      step,
      field,
      fieldVars as Record<string, string | number | boolean | undefined>,
    );
    if (tip) {
      setIsTyping(true);
      const timer = setTimeout(() => {
        setIsTyping(false);
        addMessage(tip);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [step, field, fieldVars, addMessage]);

  const toggleTip = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, showTip: !m.showTip } : m)),
    );
  };

  const getSentimentBorder = (sentiment: AstraMessage["sentiment"]) => {
    switch (sentiment) {
      case "positive":
        return "border-l-emerald-400";
      case "encouraging":
        return "border-l-amber-400";
      default:
        return "border-l-white/10";
    }
  };

  return (
    <div className="glass-surface rounded-xl border border-white/10 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <span className="text-body font-medium text-white">ASTRA</span>
        <span className="text-micro text-white/30">AI Co-Pilot</span>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={`glass-surface rounded-lg p-4 border-l-2 ${getSentimentBorder(msg.sentiment)}`}
            >
              <p className="text-small text-white/80 leading-relaxed">
                {msg.text}
              </p>
              {msg.tip && (
                <div className="mt-2">
                  <button
                    onClick={() => toggleTip(msg.id)}
                    className="flex items-center gap-1 text-micro text-emerald-400/70 hover:text-emerald-400 transition-colors"
                  >
                    {msg.showTip ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    Learn more
                  </button>
                  <AnimatePresence>
                    {msg.showTip && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-micro text-white/40 mt-1.5 leading-relaxed overflow-hidden"
                      >
                        {msg.tip}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-surface rounded-lg"
            >
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
