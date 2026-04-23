"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * AIMode — the full-screen Atlas AI overlay.
 *
 * This is a VISUAL PROTOTYPE only. No backend, no AI calls, no token
 * spend. When the user types a query and submits, we run a mock
 * orchestration sequence (pending → running → done cascade across
 * four fake agents) with hardcoded result cards. The goal is to
 * validate the UX paradigm before wiring up real agents.
 *
 * Design language:
 *   - Dark stage (indigo/slate) with soft vignette
 *   - Centre: Singularity (organic pulsing orb)
 *   - Thinking state: AgentConstellation of satellite nodes around it
 *   - Result cards materialise in a column below the orb as each
 *     satellite completes
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, ArrowUp, Sparkles } from "lucide-react";
import { Singularity, type SingularityState } from "./Singularity";
import { AgentConstellation, type Agent } from "./AgentConstellation";

interface AIModeProps {
  open: boolean;
  onClose: () => void;
}

// Mock agent plan. In the real system this would come from the
// entity's planning step; for the prototype we simulate 4 agents
// that run with staggered completion timers.
const MOCK_AGENTS: Omit<Agent, "status">[] = [
  { id: "a1", label: "Jurisdictional compare · DE / FR" },
  { id: "a2", label: "Live regulatory change monitor" },
  { id: "a3", label: "Matter precedent search" },
  { id: "a4", label: "Paragraph-level citation extract" },
];

interface ResultCard {
  agentId: string;
  title: string;
  body: string;
  citations: number;
  jurisdiction: string;
}

// Demo content only — in the real system these come from agent outputs.
const MOCK_RESULTS: Record<string, ResultCard> = {
  a1: {
    agentId: "a1",
    title: "Lizenzregime im Vergleich",
    body: "DE (BWRG §3): Genehmigung durch BMWK erforderlich, 6-9 Monate. FR (LOS 2008): Registrierung via CNES, 3-4 Monate + Pflicht-Versicherung 50M€.",
    citations: 7,
    jurisdiction: "DE · FR",
  },
  a2: {
    agentId: "a2",
    title: "Aktive Änderungen letzte 14 Tage",
    body: "EU: Space Act Annex II Entwurf v0.8 veröffentlicht (Delegated Act für Debris Mitigation). Kein direkter Mandant-Impact, Review empfohlen.",
    citations: 2,
    jurisdiction: "EU",
  },
  a3: {
    agentId: "a3",
    title: "3 ähnliche Matters gefunden",
    body: "Mandat 2024-112 (in-orbit refueling, DE-Launch): ähnliche Struktur. Precedent-Memo vorhanden — klonen?",
    citations: 1,
    jurisdiction: "Intern",
  },
  a4: {
    agentId: "a4",
    title: "Key Provisions extrahiert",
    body: "OST Art. VI (Staatenverantwortlichkeit), Liability Convention Art. II (absolute Haftung), BWRG §6 (Schadensvorsorge).",
    citations: 12,
    jurisdiction: "INT · DE",
  },
};

type Phase = "idle" | "listening" | "thinking" | "responding";

export function AIMode({ open, onClose }: AIModeProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [results, setResults] = useState<ResultCard[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset when closing
  useEffect(() => {
    if (!open) return;
    setPhase("idle");
    setQuery("");
    setSubmittedQuery("");
    setAgents([]);
    setResults([]);
    // Small delay before focusing so the mount animation plays first
    const t = setTimeout(() => inputRef.current?.focus(), 700);
    return () => clearTimeout(t);
  }, [open]);

  // Phase transitions when typing
  useEffect(() => {
    if (phase === "thinking" || phase === "responding") return;
    setPhase(query.length > 0 ? "listening" : "idle");
  }, [query, phase]);

  // Run the mock agent simulation. Purely client-side — no fetch, no
  // AI, no tokens. This is the hook to rip out and replace with real
  // agent dispatching later.
  const runMockPipeline = () => {
    if (!query.trim()) return;
    setSubmittedQuery(query.trim());
    setQuery("");
    setPhase("thinking");
    setResults([]);
    const initialAgents: Agent[] = MOCK_AGENTS.map((a) => ({
      ...a,
      status: "pending",
    }));
    setAgents(initialAgents);

    // Stagger: each agent starts running 400ms after the previous,
    // completes 1800-3200ms after its start. Creates a natural
    // "orchestrated activity" rhythm.
    initialAgents.forEach((agent, i) => {
      const startDelay = 500 + i * 400;
      const runDuration = 1800 + Math.random() * 1400;

      setTimeout(() => {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agent.id ? { ...a, status: "running" } : a,
          ),
        );
      }, startDelay);

      setTimeout(() => {
        setAgents((prev) =>
          prev.map((a) => (a.id === agent.id ? { ...a, status: "done" } : a)),
        );
        const result = MOCK_RESULTS[agent.id];
        if (result) {
          setResults((prev) => [...prev, result]);
        }
      }, startDelay + runDuration);
    });

    // After the last agent's worst-case finish + synthesis time,
    // swing into "responding" to signal the entity has the answer.
    const totalTime = 500 + (initialAgents.length - 1) * 400 + 3200 + 600;
    setTimeout(() => setPhase("responding"), totalTime);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runMockPipeline();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const resetConversation = () => {
    setPhase("idle");
    setQuery("");
    setSubmittedQuery("");
    setAgents([]);
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dark stage with subtle gradient.
              deep indigo → near-black radial vignette → centre */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, #1e1b4b 0%, #0a0a1a 50%, #000000 100%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Ambient noise particles. 40 tiny dots drifting slowly —
              gives the stage atmosphere without stealing focus. */}
          <ParticleDust />

          {/* Close button — top-right, discreet but findable */}
          <button
            onClick={onClose}
            aria-label="Exit AI Mode"
            className="absolute top-6 right-6 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08] transition-all text-[11px] tracking-wide backdrop-blur-sm"
          >
            <X size={14} strokeWidth={1.8} />
            Classic Mode
          </button>

          {/* Brand tag — top-left */}
          <div className="absolute top-6 left-6 z-30 flex items-center gap-2">
            <Sparkles size={14} className="text-violet-300/80" />
            <span className="text-[11px] font-medium tracking-[0.25em] uppercase text-white/60">
              Atlas · AI Mode
            </span>
          </div>

          {/* Submitted query — appears above the orb once user submits */}
          <AnimatePresence>
            {submittedQuery && (
              <motion.div
                className="absolute top-24 left-1/2 -translate-x-1/2 z-20 max-w-2xl px-6"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <p className="text-center text-[15px] text-white/70 italic">
                  „{submittedQuery}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stage centre — Singularity + agent constellation.
              Fixed mid-height so results can flow below. */}
          <div
            className="absolute inset-x-0 z-10 flex items-center justify-center"
            style={{ top: "20vh", height: 420 }}
          >
            <div className="relative flex items-center justify-center">
              <AgentConstellation
                agents={agents}
                visible={phase === "thinking" || phase === "responding"}
                radius={220}
              />
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 180,
                  damping: 20,
                  delay: 0.15,
                }}
              >
                <Singularity state={phase as SingularityState} size={240} />
              </motion.div>
            </div>
          </div>

          {/* Result cards column — streams in as agents complete */}
          <div
            className="absolute inset-x-0 z-10"
            style={{ top: "calc(20vh + 440px)" }}
          >
            <div className="max-w-3xl mx-auto px-6 space-y-2">
              <AnimatePresence>
                {results.map((r) => (
                  <motion.div
                    key={r.agentId}
                    initial={{ opacity: 0, y: 20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5 hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-[13px] font-semibold text-white/90 tracking-tight">
                        {r.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">
                          {r.jurisdiction}
                        </span>
                        <span className="text-[9px] font-medium text-emerald-300/80 bg-emerald-500/10 rounded-full px-2 py-0.5 border border-emerald-500/20">
                          {r.citations} cit.
                        </span>
                      </div>
                    </div>
                    <p className="text-[12px] text-white/70 leading-relaxed">
                      {r.body}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Synthesis footer once responding */}
              <AnimatePresence>
                {phase === "responding" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="flex items-center justify-between pt-4 px-2"
                  >
                    <span className="text-[10px] tracking-wider uppercase text-emerald-300/70">
                      · Synthese fertig · {results.length} Agents ·{" "}
                      {results.reduce((s, r) => s + r.citations, 0)} Citations ·
                    </span>
                    <button
                      onClick={resetConversation}
                      className="text-[11px] text-white/50 hover:text-white/80 transition"
                    >
                      Neue Frage
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Input bar — always bottom-centre */}
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4, ease: "easeOut" }}
          >
            <div
              className={`flex items-end gap-3 rounded-2xl border backdrop-blur-xl transition-colors ${
                phase === "thinking"
                  ? "border-violet-400/30 bg-white/[0.04]"
                  : phase === "listening"
                    ? "border-teal-400/30 bg-white/[0.05]"
                    : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <textarea
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  phase === "thinking"
                    ? "Agents arbeiten…"
                    : "Frag Atlas alles — „Was muss mein Mandant für in-orbit-servicing in DE und FR beachten?"
                }
                rows={1}
                disabled={phase === "thinking"}
                className="flex-1 bg-transparent resize-none outline-none text-[15px] text-white placeholder:text-white/30 py-4 pl-5 leading-relaxed"
                style={{ maxHeight: 140 }}
              />
              <div className="flex items-center gap-2 pr-3 pb-3">
                <button
                  type="button"
                  aria-label="Voice input (coming soon)"
                  disabled
                  className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white/[0.04] text-white/30 cursor-not-allowed border border-white/5"
                  title="Voice — coming soon"
                >
                  <Mic size={15} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={runMockPipeline}
                  disabled={!query.trim() || phase === "thinking"}
                  aria-label="Ask Atlas"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white/90 hover:bg-white text-black disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowUp size={15} strokeWidth={2.4} />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between px-2">
              <span className="text-[10px] text-white/30 tracking-wide">
                Enter to send · Esc to exit
              </span>
              <span className="text-[10px] text-white/30 tracking-wide">
                Prototyp · keine echten Agents · 0 Tokens
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Ambient particle dust ────────────────────────────────────────────
//
// 40 tiny dots distributed randomly, each drifting on its own slow loop.
// Reference-seeded so SSR + client hydration produce the same layout.

function ParticleDust() {
  // Pseudo-random but deterministic positions. Using (index * prime)
  // keeps client + server renders identical without needing state.
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: (i * 37) % 100,
    y: (i * 59) % 100,
    delay: (i * 0.17) % 4,
    duration: 10 + ((i * 3) % 8),
    size: i % 4 === 0 ? 2 : 1,
  }));
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/40"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
