"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import type { IRSPreviewResult } from "@/lib/assure/irs-preview-calculator";
import { getScoreRevealMessages } from "@/lib/assure/onboarding-astra-messages";

// ─── Helpers ───

function getScoreColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#F97316";
  return "#EF4444";
}

function getGradientId(score: number): string {
  if (score >= 80) return "reveal-gradient-green";
  if (score >= 60) return "reveal-gradient-amber";
  if (score >= 40) return "reveal-gradient-orange";
  return "reveal-gradient-red";
}

// ─── Confetti Particle ───

function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const left = Math.random() * 100;
  const duration = 2 + Math.random() * 2;
  const size = 4 + Math.random() * 6;

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${left}%`,
        top: -10,
        width: size,
        height: size,
        backgroundColor: color,
      }}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{
        y: "100vh",
        opacity: [1, 1, 0],
        rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
        x: (Math.random() - 0.5) * 200,
      }}
      transition={{
        duration,
        delay,
        ease: "easeIn",
      }}
    />
  );
}

// ─── Component ───

interface ScoreRevealProps {
  score: IRSPreviewResult;
  onComplete: () => void;
}

export default function ScoreReveal({ score, onComplete }: ScoreRevealProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showGrade, setShowGrade] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  // Animated score counter: 3 seconds, easeOut
  useEffect(() => {
    const target = score.overallScore;
    const duration = 3000;
    const steps = 100;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      // easeOut curve
      const progress = 1 - Math.pow(1 - step / steps, 3);
      const current = Math.round(target * progress);
      setAnimatedScore(Math.min(current, target));
      if (step >= steps) {
        clearInterval(timer);
        setAnimatedScore(target);
        // Show grade after counter finishes
        setTimeout(() => setShowGrade(true), 300);
        setTimeout(() => setShowInsights(true), 800);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score.overallScore]);

  // SVG arc — size 240
  const size = 240;
  const strokeWidth = size * 0.06;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const startAngle = 135;
  const endAngle = 405;
  const totalSweep = endAngle - startAngle;

  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angleDeg: number,
  ) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const describeArc = (
    cx: number,
    cy: number,
    r: number,
    start: number,
    end: number,
  ) => {
    const startPt = polarToCartesian(cx, cy, r, start);
    const endPt = polarToCartesian(cx, cy, r, end);
    const sweep = end - start;
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 1 ${endPt.x} ${endPt.y}`;
  };

  const bgArcPath = describeArc(center, center, radius, startAngle, endAngle);
  const fillAngle = startAngle + (score.overallScore / 100) * totalSweep;
  const fillArcPath =
    score.overallScore > 0
      ? describeArc(center, center, radius, startAngle, fillAngle)
      : "";

  const color = getScoreColor(score.overallScore);
  const gradientId = getGradientId(score.overallScore);
  const percentile = Math.round((score.overallScore / 100) * 30 + 5);

  // ASTRA insight messages
  const sortedComponents = [...score.components].sort(
    (a, b) => b.score - a.score,
  );
  const topComponent = sortedComponents[0]?.label || "Market & Opportunity";
  const weakestComponent =
    sortedComponents[sortedComponents.length - 1]?.label ||
    "Regulatory Position";

  const insightMessages = useMemo(
    () =>
      getScoreRevealMessages(
        score.overallScore,
        score.grade,
        topComponent,
        weakestComponent,
      ),
    [score.overallScore, score.grade, topComponent, weakestComponent],
  );

  // Confetti colors
  const confettiColors = [
    "#10B981",
    "#34D399",
    "#6EE7B7",
    "#F59E0B",
    "#FBBF24",
    "#A78BFA",
    "#60A5FA",
  ];
  const showConfetti = score.overallScore >= 60;

  const getSentimentBorder = (
    sentiment: "positive" | "encouraging" | "neutral",
  ) => {
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto"
    >
      {/* Confetti */}
      {showConfetti && showGrade && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <ConfettiParticle
              key={i}
              delay={i * 0.1}
              color={confettiColors[i % confettiColors.length]}
            />
          ))}
        </div>
      )}

      <div className="max-w-lg w-full text-center">
        {/* Score ring */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex justify-center mb-6"
        >
          <svg
            width={size}
            height={size * 0.85}
            viewBox={`0 0 ${size} ${size * 0.85}`}
            className="overflow-visible"
          >
            <defs>
              <linearGradient
                id="reveal-gradient-green"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
              <linearGradient
                id="reveal-gradient-amber"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#FBBF24" />
              </linearGradient>
              <linearGradient
                id="reveal-gradient-orange"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#EA580C" />
                <stop offset="100%" stopColor="#FB923C" />
              </linearGradient>
              <linearGradient
                id="reveal-gradient-red"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#F87171" />
              </linearGradient>
              <filter
                id="reveal-gauge-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background arc */}
            <path
              d={bgArcPath}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="text-white/10"
            />

            {/* Filled arc */}
            {score.overallScore > 0 && (
              <motion.path
                d={fillArcPath}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                filter="url(#reveal-gauge-glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 3, ease: "easeOut", delay: 0.2 }}
              />
            )}

            {/* Score number */}
            <text
              x={center}
              y={center - size * 0.05}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-white"
              style={{
                fontSize: size * 0.28,
                fontWeight: 700,
                fontFamily:
                  "ui-sans-serif, system-ui, -apple-system, sans-serif",
              }}
            >
              {animatedScore}
            </text>

            {/* Grade */}
            <AnimatePresence>
              {showGrade && (
                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  x={center}
                  y={center + size * 0.15}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={color}
                  style={{
                    fontSize: size * 0.1,
                    fontWeight: 700,
                    fontFamily:
                      "ui-sans-serif, system-ui, -apple-system, sans-serif",
                  }}
                >
                  Grade {score.grade}
                </motion.text>
              )}
            </AnimatePresence>
          </svg>
        </motion.div>

        {/* Grade label */}
        <AnimatePresence>
          {showGrade && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-2"
            >
              <h2 className="text-display-sm font-bold text-white">
                {score.gradeLabel}
              </h2>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Peer comparison */}
        <AnimatePresence>
          {showGrade && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-body-lg text-white/40 mb-8"
            >
              Top {percentile}% of European space startups
            </motion.p>
          )}
        </AnimatePresence>

        {/* ASTRA insight messages */}
        <AnimatePresence>
          {showInsights && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3 mb-8 text-left"
            >
              {insightMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.3 }}
                  className={`glass-surface rounded-lg p-4 border-l-2 ${getSentimentBorder(msg.sentiment)}`}
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-small text-white/80 leading-relaxed">
                        {msg.text}
                      </p>
                      {msg.tip && (
                        <p className="text-micro text-white/40 mt-1">
                          {msg.tip}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA Button */}
        <AnimatePresence>
          {showInsights && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
            >
              <button
                onClick={onComplete}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body rounded-lg px-8 py-3 transition-all inline-flex items-center gap-2"
              >
                Enter Your Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
