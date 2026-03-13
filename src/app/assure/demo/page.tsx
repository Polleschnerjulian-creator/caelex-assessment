"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import { DEMO_CHAPTERS } from "@/data/assure/demo-tour-chapters";

// ─── IRS Dashboard Illustration ───

function IRSDashboardIllustration() {
  const components = [
    { label: "Market", score: 82 },
    { label: "Technology", score: 71 },
    { label: "Team", score: 68 },
    { label: "Financials", score: 75 },
    { label: "Regulatory", score: 88 },
    { label: "Traction", score: 55 },
  ];

  const overall = Math.round(
    components.reduce((sum, c) => sum + c.score, 0) / components.length,
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
          className="inline-flex items-baseline gap-1"
        >
          <span className="text-display-lg font-bold text-emerald-400">
            {overall}
          </span>
          <span className="text-body-lg text-white/40">/100</span>
        </motion.div>
        <p className="text-caption text-white/50 mt-1">
          Investment Readiness Score
        </p>
      </div>
      <div className="space-y-3">
        {components.map((comp, i) => (
          <div key={comp.label} className="flex items-center gap-3">
            <span className="text-small text-white/40 w-20 text-right">
              {comp.label}
            </span>
            <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${comp.score}%` }}
                transition={{ duration: 0.8, delay: 0.15 * i, ease: "easeOut" }}
                className="h-full rounded-full bg-emerald-500/80"
              />
            </div>
            <span className="text-small text-white/50 w-8 text-right font-mono">
              {comp.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RCR Rating Illustration ───

function RCRRatingIllustration() {
  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotateY: -90 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ duration: 0.7, type: "spring", bounce: 0.35 }}
        className="glass-elevated rounded-2xl border border-emerald-500/20 px-12 py-8 text-center"
      >
        <p className="text-micro text-white/50 uppercase tracking-widest mb-2">
          Regulatory Credit Rating
        </p>
        <span className="text-display-lg font-bold text-emerald-400">A-</span>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-small text-emerald-400/80">
            Outlook: Positive
          </span>
        </div>
      </motion.div>
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="flex items-center gap-4 text-small text-white/40"
      >
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Peer percentile: 84th</span>
        </div>
        <span className="text-white/30">|</span>
        <span>Rating watch: None</span>
      </motion.div>
    </div>
  );
}

// ─── Data Room Illustration ───

function DataRoomIllustration() {
  const folders = [
    { name: "Corporate Documents", status: "complete" },
    { name: "Financial Statements", status: "complete" },
    { name: "Regulatory Filings", status: "complete" },
    { name: "Technical Documentation", status: "partial" },
    { name: "Insurance Policies", status: "partial" },
    { name: "IP & Patents", status: "empty" },
    { name: "Team & Governance", status: "complete" },
  ];

  const statusColors: Record<string, string> = {
    complete: "bg-emerald-400",
    partial: "bg-amber-400",
    empty: "bg-white/20",
  };

  const statusLabels: Record<string, string> = {
    complete: "Complete",
    partial: "Partial",
    empty: "Empty",
  };

  return (
    <div className="space-y-2">
      {folders.map((folder, i) => (
        <motion.div
          key={folder.name}
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 * i, duration: 0.4 }}
          className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-2.5"
        >
          <span
            className={`h-2 w-2 rounded-full flex-shrink-0 ${statusColors[folder.status]}`}
          />
          <span className="text-small text-white/70 flex-1">{folder.name}</span>
          <span className="text-micro text-white/50">
            {statusLabels[folder.status]}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Risk Heatmap Illustration ───

function RiskHeatmapIllustration() {
  // 5x5 grid: rows = likelihood (top=5), cols = impact (left=1)
  // Values: 0=empty, 1=green, 2=amber, 3=red
  const grid = [
    [0, 0, 2, 3, 3],
    [0, 1, 2, 2, 3],
    [1, 1, 1, 2, 2],
    [1, 1, 1, 1, 2],
    [0, 1, 1, 1, 1],
  ];

  const cellColors: Record<number, string> = {
    0: "bg-white/[0.03]",
    1: "bg-emerald-500/30",
    2: "bg-amber-500/40",
    3: "bg-red-500/40",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1">
        <div className="flex flex-col items-center mr-2">
          <span className="text-micro text-white/40 rotate-0 mb-1">
            Likelihood
          </span>
        </div>
        <div className="flex-1 space-y-1">
          {grid.map((row, ri) => (
            <div key={ri} className="flex gap-1">
              {row.map((cell, ci) => (
                <motion.div
                  key={`${ri}-${ci}`}
                  initial={false}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.04 * (ri * 5 + ci),
                    duration: 0.3,
                    ease: "easeOut",
                  }}
                  className={`flex-1 aspect-square rounded-sm ${cellColors[cell]}`}
                />
              ))}
            </div>
          ))}
          <div className="flex justify-between mt-1 px-1">
            <span className="text-micro text-white/40">Low</span>
            <span className="text-micro text-white/40">Impact</span>
            <span className="text-micro text-white/40">High</span>
          </div>
        </div>
      </div>
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="flex items-center justify-center gap-4 text-micro text-white/50 pt-2"
      >
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-500/30" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-amber-500/40" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-red-500/40" />
          <span>High</span>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Comply Integration Illustration ───

function ComplyIntegrationIllustration() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-6 w-full">
        {/* Comply card */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.08] p-5 text-center"
        >
          <p className="text-micro text-white/50 uppercase tracking-wider mb-2">
            Caelex Comply
          </p>
          <span className="text-display-sm font-bold text-white/80">87%</span>
          <p className="text-micro text-white/50 mt-1">Compliance Coverage</p>
        </motion.div>

        {/* Animated connecting line */}
        <div className="relative w-12 flex items-center justify-center">
          <motion.div
            initial={false}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="h-0.5 w-full origin-left"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.1), rgb(16,185,129), rgba(255,255,255,0.1))",
            }}
          />
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
            className="absolute"
          >
            <ArrowRight className="h-3 w-3 text-emerald-400" />
          </motion.div>
        </div>

        {/* Assure card */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex-1 rounded-xl bg-white/[0.04] border border-emerald-500/20 p-5 text-center"
        >
          <p className="text-micro text-white/50 uppercase tracking-wider mb-2">
            Caelex Assure
          </p>
          <span className="text-display-sm font-bold text-emerald-400">A-</span>
          <p className="text-micro text-white/50 mt-1">Regulatory Rating</p>
        </motion.div>
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="text-center"
      >
        <p className="text-small text-white/40">
          47 EU Space Act cross-references mapped automatically
        </p>
        <p className="text-micro text-emerald-400/60 mt-1">
          +5 bonus on regulatory component for linked accounts
        </p>
      </motion.div>
    </div>
  );
}

// ─── Demo Illustration Router ───

function DemoIllustration({ chapterId }: { chapterId: string }) {
  switch (chapterId) {
    case "irs-dashboard":
      return <IRSDashboardIllustration />;
    case "rcr-rating":
      return <RCRRatingIllustration />;
    case "data-room":
      return <DataRoomIllustration />;
    case "risk-heatmap":
      return <RiskHeatmapIllustration />;
    case "comply-integration":
      return <ComplyIntegrationIllustration />;
    default:
      return null;
  }
}

// ═══════════════════════════════════════════
// ─── PAGE ─────────────────────────────────
// ═══════════════════════════════════════════

export default function DemoTourPage() {
  const [currentChapter, setCurrentChapter] = useState(0);
  const [direction, setDirection] = useState(1);

  const chapter = DEMO_CHAPTERS[currentChapter];
  const isFirst = currentChapter === 0;
  const isLast = currentChapter === DEMO_CHAPTERS.length - 1;

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > currentChapter ? 1 : -1);
      setCurrentChapter(index);
    },
    [currentChapter],
  );

  const goNext = useCallback(() => {
    if (!isLast) {
      setDirection(1);
      setCurrentChapter((prev) => prev + 1);
    }
  }, [isLast]);

  const goPrev = useCallback(() => {
    if (!isFirst) {
      setDirection(-1);
      setCurrentChapter((prev) => prev - 1);
    }
  }, [isFirst]);

  const Icon = chapter.icon;

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-emerald-500/[0.03] blur-[160px]" />
      </div>

      {/* Content */}
      <div className="relative max-w-[1100px] mx-auto px-6 md:px-12 pt-32 pb-24">
        {/* ─── Progress Bar ─── */}
        <div className="flex gap-2 mb-16">
          {DEMO_CHAPTERS.map((ch, i) => (
            <button
              key={ch.id}
              onClick={() => goTo(i)}
              className="flex-1 group cursor-pointer"
            >
              <div
                className={`h-1 rounded-full transition-colors duration-300 ${
                  i <= currentChapter ? "bg-emerald-500" : "bg-white/10"
                }`}
              />
              <p
                className={`text-micro mt-2 transition-colors duration-300 hidden sm:block ${
                  i === currentChapter ? "text-emerald-400" : "text-white/50"
                }`}
              >
                {ch.title}
              </p>
            </button>
          ))}
        </div>

        {/* ─── Chapter Content ─── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={chapter.id}
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="grid lg:grid-cols-[1fr_1fr] gap-12 items-center min-h-[480px]"
          >
            {/* Left column — text */}
            <div className="space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
                <Icon className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-micro text-emerald-400">
                  {chapter.subtitle}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-display font-bold text-white">
                {chapter.title}
              </h2>

              {/* Description */}
              <p className="text-body-lg text-white/60 leading-relaxed">
                {chapter.description}
              </p>

              {/* Highlights */}
              <ul className="space-y-3">
                {chapter.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="flex items-start gap-3 text-body-lg text-white/50"
                  >
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right column — illustration */}
            <div className="glass-elevated rounded-2xl border border-white/[0.08] p-8 min-h-[400px] flex items-center justify-center">
              <div className="w-full">
                <DemoIllustration chapterId={chapter.id} />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ─── Bottom Navigation ─── */}
        <div className="border-t border-white/[0.06] mt-16 pt-8">
          <div className="flex items-center justify-between">
            {/* Back */}
            <button
              onClick={goPrev}
              disabled={isFirst}
              className={`flex items-center gap-2 text-body-lg text-white/40 hover:text-white/60 transition-colors ${
                isFirst ? "opacity-0 pointer-events-none" : ""
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {/* Counter */}
            <span className="text-caption text-white/50">
              {currentChapter + 1} of {DEMO_CHAPTERS.length}
            </span>

            {/* Next / CTA */}
            {isLast ? (
              <Link
                href="/assure/book"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 text-subtitle font-medium transition-colors shadow-[0_0_32px_rgba(16,185,129,0.3)]"
              >
                <Sparkles className="h-4 w-4" />
                Book a Call
              </Link>
            ) : (
              <button
                onClick={goNext}
                className="flex items-center gap-2 text-body-lg text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
