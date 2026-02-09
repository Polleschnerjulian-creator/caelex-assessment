"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  Zap,
  FileText,
  Shield,
  ArrowRight,
  Sparkles,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Simulated chat conversation                                        */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  role: "astra" | "user";
  content: string;
  type?: "text" | "document";
  document?: {
    title: string;
    articleRef: string;
    pages: number;
  };
}

const chatSequence: ChatMessage[] = [
  {
    role: "astra",
    content:
      "I can see you're working on Art. 74 — Cybersecurity Requirements. Let me help you generate the required documentation.",
  },
  {
    role: "user",
    content:
      "Yes, generate the cybersecurity baseline assessment for our LEO constellation.",
  },
  {
    role: "astra",
    content:
      "I'll need a few details. What orbit altitude range does your constellation operate in?",
  },
  {
    role: "user",
    content: "550 km LEO, 48 satellites planned.",
  },
  {
    role: "astra",
    content: "Based on your profile, here's the generated document draft:",
    type: "document",
    document: {
      title: "Cybersecurity Baseline Assessment",
      articleRef: "Art. 74",
      pages: 12,
    },
  },
];

const capabilities = [
  {
    icon: FileText,
    title: "Document Generation",
    description:
      "Auto-generate compliance documents, NCA submissions, and assessment reports based on your operator profile.",
  },
  {
    icon: Shield,
    title: "Gap Analysis",
    description:
      "Identify missing requirements across all 119 articles and get prioritized action plans with deadlines.",
  },
  {
    icon: MessageSquare,
    title: "Context-Aware Guidance",
    description:
      "Ask ASTRA about any article. Get instant, regulation-grounded answers specific to your mission parameters.",
  },
];

/* ------------------------------------------------------------------ */
/*  Simulated chat window                                              */
/* ------------------------------------------------------------------ */

function SimulatedChat({ isInView }: { isInView: boolean }) {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isInView) return;

    // Start showing messages after a delay
    const timers: NodeJS.Timeout[] = [];
    chatSequence.forEach((_, i) => {
      timers.push(
        setTimeout(
          () => {
            setVisibleMessages(i + 1);
          },
          1200 + i * 1400,
        ),
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [isInView]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [visibleMessages]);

  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
        <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Zap size={14} className="text-cyan-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-white">ASTRA</span>
            <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400/60 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">
              AI Agent
            </span>
          </div>
          <span className="text-[10px] text-white/30">
            Cybersecurity & Resilience Module
          </span>
        </div>
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
      </div>

      {/* Chat messages */}
      <div
        ref={chatRef}
        className="h-[320px] md:h-[360px] overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
      >
        <AnimatePresence>
          {chatSequence.slice(0, visibleMessages).map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "astra" ? (
                <div className="max-w-[85%] space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 w-6 h-6 rounded-md bg-cyan-500/10 flex items-center justify-center mt-0.5">
                      <Zap size={10} className="text-cyan-400" />
                    </div>
                    <div className="bg-white/[0.03] border-l-2 border-cyan-500/30 rounded-lg rounded-tl-none px-3.5 py-2.5">
                      <p className="text-[12px] text-white/70 leading-[1.7]">
                        {msg.content}
                      </p>
                    </div>
                  </div>

                  {/* Document card */}
                  {msg.type === "document" && msg.document && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                      className="ml-8 bg-white/[0.03] border border-cyan-500/20 rounded-lg p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-md bg-cyan-500/10">
                          <FileText size={14} className="text-cyan-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[12px] font-medium text-white/80">
                            {msg.document.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-cyan-400/60">
                              {msg.document.articleRef}
                            </span>
                            <span className="text-[10px] text-white/25">
                              {msg.document.pages} pages
                            </span>
                          </div>
                          <div className="flex gap-2 mt-2.5">
                            <span className="text-[10px] text-cyan-400/50 bg-cyan-500/10 px-2 py-0.5 rounded cursor-default">
                              Preview
                            </span>
                            <span className="text-[10px] text-cyan-400/50 bg-cyan-500/10 px-2 py-0.5 rounded cursor-default">
                              Download
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="max-w-[75%]">
                  <div className="bg-cyan-500/10 rounded-lg rounded-tr-none px-3.5 py-2.5">
                    <p className="text-[12px] text-white/70 leading-[1.7]">
                      {msg.content}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {visibleMessages > 0 && visibleMessages < chatSequence.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 pl-8"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((j) => (
                <motion.div
                  key={j}
                  className="w-1.5 h-1.5 rounded-full bg-cyan-400/40"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: j * 0.2,
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] text-white/20">
              ASTRA is typing...
            </span>
          </motion.div>
        )}
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 bg-white/[0.03] rounded-lg px-4 py-2.5 border border-white/[0.06]">
          <span className="text-[12px] text-white/20 flex-1">
            Ask ASTRA about any article...
          </span>
          <div className="p-1 rounded bg-cyan-500/20">
            <ArrowRight size={12} className="text-cyan-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Section                                                       */
/* ------------------------------------------------------------------ */

export default function AstraShowcase() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="relative py-32 md:py-40 bg-black overflow-hidden"
    >
      {/* Section number */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        className="absolute top-12 right-6 md:right-12"
      >
        <span className="font-mono text-[11px] text-white/30">03 / 12</span>
      </motion.div>

      {/* Cyan glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-cyan-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <Zap size={14} className="text-cyan-400" />
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-400/60">
              AI-Powered Compliance
            </span>
          </div>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-light tracking-[-0.02em] text-white leading-[1.2] max-w-[700px] mx-auto mb-5">
            Meet ASTRA.
            <br />
            <span className="text-white/50">Your regulatory AI agent.</span>
          </h2>
          <p className="text-[14px] text-white/40 max-w-[520px] mx-auto leading-[1.7]">
            ASTRA understands the EU Space Act, NIS2, and national space laws.
            It generates documents, identifies gaps, and guides you through
            every article — tailored to your mission.
          </p>
        </motion.div>

        {/* Two-column layout: Chat simulation + Capabilities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Simulated chat */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <SimulatedChat isInView={isInView} />
            {/* Glow effect */}
            <div className="absolute -inset-8 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none -z-10" />
          </motion.div>

          {/* Right: Capabilities + CTA */}
          <div className="space-y-6">
            {capabilities.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.12 }}
                  className="group flex gap-5 p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:bg-white/[0.04] hover:border-cyan-500/20 transition-all duration-500"
                >
                  <div className="flex-shrink-0 p-2.5 rounded-lg bg-cyan-500/[0.08] border border-cyan-500/[0.12] group-hover:bg-cyan-500/[0.12] transition-colors">
                    <Icon size={18} className="text-cyan-400/60" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-medium text-white/90 mb-2">
                      {cap.title}
                    </h3>
                    <p className="text-[13px] text-white/45 leading-[1.7]">
                      {cap.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}

            {/* Stats bar */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="grid grid-cols-3 gap-3 pt-4"
            >
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 text-center">
                <p className="font-mono text-[22px] font-light text-cyan-400">
                  119
                </p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-white/30 mt-1">
                  Articles covered
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 text-center">
                <p className="font-mono text-[22px] font-light text-cyan-400">
                  8
                </p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-white/30 mt-1">
                  Modules
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 text-center">
                <p className="font-mono text-[22px] font-light text-cyan-400">
                  10
                </p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-white/30 mt-1">
                  Jurisdictions
                </p>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <Link
                href="/assessment"
                className="group inline-flex items-center gap-3 px-6 py-3.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[14px] font-medium rounded-xl transition-all duration-300 hover:bg-cyan-500/20 hover:border-cyan-500/30 hover:scale-[1.02]"
              >
                <Sparkles size={16} />
                <span>Try ASTRA in Your Dashboard</span>
                <ChevronRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
