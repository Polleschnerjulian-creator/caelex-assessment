"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  Satellite,
  ChevronRight,
} from "lucide-react";
import { TOUR_STEPS, type TourStep } from "@/data/demo-tour-steps";

// ─── Tour State ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "caelex-demo-tour";

function isTourActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "active";
}

function setTourActive(active: boolean): void {
  if (active) localStorage.setItem(STORAGE_KEY, "active");
  else localStorage.removeItem(STORAGE_KEY);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DemoTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check localStorage on mount
  useEffect(() => {
    setActive(isTourActive());
  }, []);

  // Listen for tour activation events (from admin panel)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.action === "start") {
        setActive(true);
        setTourActive(true);
        setStepIndex(0);
        setPlaying(true);
      }
    };
    window.addEventListener("demo-tour", handler);
    return () => window.removeEventListener("demo-tour", handler);
  }, []);

  const step = TOUR_STEPS[stepIndex] as TourStep | undefined;

  // Navigate to step route
  useEffect(() => {
    if (!active || !step) return;
    if (pathname !== step.route) {
      router.push(step.route);
    }
  }, [active, step, pathname, router]);

  // Auto-advance timer
  const advanceStep = useCallback(() => {
    setStepIndex((prev) => {
      const next = prev + 1;
      if (next >= TOUR_STEPS.length) {
        setActive(false);
        setTourActive(false);
        setPlaying(false);
        return prev;
      }
      return next;
    });
    setProgress(0);
  }, []);

  useEffect(() => {
    if (!active || !playing || !step) return;

    startTimeRef.current = Date.now();

    // Progress animation
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setProgress(Math.min(100, (elapsed / step.durationMs) * 100));
    }, 50);

    // Auto-advance
    timerRef.current = setTimeout(advanceStep, step.durationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [active, playing, stepIndex, step, advanceStep]);

  const handleClose = () => {
    setActive(false);
    setTourActive(false);
    setPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      setProgress(0);
    }
  };

  const handleNext = () => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
      setProgress(0);
    }
  };

  const handlePlayPause = () => {
    setPlaying(!playing);
    if (playing && timerRef.current) clearTimeout(timerRef.current);
  };

  if (!active || !step) return null;

  return (
    <>
      {/* Top info overlay */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)",
          padding: "20px 32px 40px",
          pointerEvents: "none",
        }}
      >
        <div style={{ maxWidth: 720, pointerEvents: "auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
              }}
            >
              Step {stepIndex + 1} of {TOUR_STEPS.length}
            </span>
            {step.badge && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 1,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "rgba(0,212,170,0.15)",
                  color: "#00D4AA",
                  textTransform: "uppercase",
                }}
              >
                {step.badge}
              </span>
            )}
          </div>

          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.2,
              marginBottom: 6,
            }}
          >
            {step.title}
          </h2>

          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            {step.subtitle}
          </p>

          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              lineHeight: 1.6,
              maxWidth: 560,
            }}
          >
            {step.description}
          </p>
        </div>
      </div>

      {/* Bottom control bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            height: 2,
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #00D4AA, #7B8CFF)",
              transition: "width 50ms linear",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 24px",
          }}
        >
          {/* Left: branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Satellite size={14} style={{ color: "#00D4AA" }} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Caelex Platform Tour
            </span>
          </div>

          {/* Center: step indicators */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {TOUR_STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  setStepIndex(i);
                  setProgress(0);
                }}
                style={{
                  width: i === stepIndex ? 24 : 6,
                  height: 6,
                  borderRadius: 3,
                  border: "none",
                  cursor: "pointer",
                  background:
                    i === stepIndex
                      ? "#00D4AA"
                      : i < stepIndex
                        ? "rgba(0,212,170,0.3)"
                        : "rgba(255,255,255,0.15)",
                  transition: "all 300ms ease",
                }}
                title={s.title}
              />
            ))}
          </div>

          {/* Right: controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <button
              onClick={handlePrev}
              disabled={stepIndex === 0}
              style={{
                background: "none",
                border: "none",
                color:
                  stepIndex === 0
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(255,255,255,0.5)",
                cursor: stepIndex === 0 ? "default" : "pointer",
                padding: 4,
              }}
            >
              <SkipBack size={16} />
            </button>

            <button
              onClick={handlePlayPause}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.8)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>

            <button
              onClick={handleNext}
              disabled={stepIndex >= TOUR_STEPS.length - 1}
              style={{
                background: "none",
                border: "none",
                color:
                  stepIndex >= TOUR_STEPS.length - 1
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(255,255,255,0.5)",
                cursor:
                  stepIndex >= TOUR_STEPS.length - 1 ? "default" : "pointer",
                padding: 4,
              }}
            >
              <SkipForward size={16} />
            </button>

            <div
              style={{
                width: 1,
                height: 16,
                background: "rgba(255,255,255,0.1)",
                margin: "0 4px",
              }}
            />

            <button
              onClick={handleClose}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.3)",
                cursor: "pointer",
                padding: 4,
              }}
              title="End tour"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Utility to start the tour from anywhere */
export function startDemoTour(): void {
  window.dispatchEvent(
    new CustomEvent("demo-tour", { detail: { action: "start" } }),
  );
}
