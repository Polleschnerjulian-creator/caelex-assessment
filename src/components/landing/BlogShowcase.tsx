"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useSpring, PanInfo } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BlogEntry {
  id: string;
  slug: string;
  category: string;
  title: string;
  pill: string;
  description: string;
  image: string;
  href?: string;
}

const ENTRIES: BlogEntry[] = [
  {
    id: "agentic",
    slug: "agentic-system",
    href: "/sentinel",
    category: "Product",
    title: "Caelex Agentic System",
    pill: "Sentinel",
    description:
      "Deploy an autonomous agent into your infrastructure that continuously monitors operational data, validates it against regulatory requirements, and sends evidence-based compliance reports back to Caelex — fully automated.",
    image: "/images/blog/agentic-system.png",
  },
  {
    id: "ephemeris",
    slug: "ephemeris",
    href: "/systems/ephemeris",
    category: "Predictive Intelligence · Digital Twin",
    title: "Predictive Compliance Modeling",
    pill: "Ephemeris",
    description:
      "Caelex Ephemeris models every satellite as a living digital twin and computes the compliance future — for every regulation, every satellite, every day of the next five years. Operators don't ask 'are we compliant?' — they ask 'when will we not be?'",
    image: "/images/blog/ephemeris-prediction.png",
  },
  {
    id: "ground-stations",
    slug: "ground-stations-critical-infrastructure",
    href: "/sentinel",
    category: "NIS2 · Critical Infrastructure",
    title: "Ground Stations as Critical Infrastructure",
    pill: "Ground Infra",
    description:
      "Under NIS2 and the EU Space Act, ground stations are classified as critical infrastructure. Our agent monitors uptime, access logs, and security posture — generating audit-ready evidence without manual intervention.",
    image: "/images/blog/ground-station.png",
  },
  {
    id: "comply-engine",
    slug: "comply-engine",
    href: "/comply",
    category: "Regulatory Intelligence Engine",
    title: "The Compliance Engine",
    pill: "Comply",
    description:
      "119 articles. 7 operator classifications. 10 jurisdictions. One deterministic engine. Caelex Comply maps your spacecraft operation to every applicable regulation — filtering by operator type, regime eligibility, and constellation tier — then computes a multi-jurisdiction favorability matrix in under 200ms.",
    image: "/images/blog/compliance-engine.png",
  },
  {
    id: "atlas",
    slug: "atlas",
    href: "/atlas-access",
    category: "Space Law · Searchable Reference",
    title: "The Space-Law Knowledge Base",
    pill: "Atlas",
    description:
      "Caelex Atlas is the searchable space-law database built for law firms. UN treaties, EU instruments, and national legislation across 10 jurisdictions — every article deep-linked to its official source, with shared firm-wide annotations, AI-assisted research, and change alerts the moment any source is amended.",
    // TODO: swap for a dedicated ATLAS asset once the brand shoot lands.
    // compliance-engine.png is the closest thematic match (regulatory
    // text / citation rendering) in the existing set.
    image: "/images/blog/compliance-engine.png",
  },
  {
    id: "verity",
    slug: "verity",
    href: "/verity",
    category: "Cryptographic Attestation · Zero-Knowledge",
    title: "Zero-Knowledge Attestation Protocol",
    pill: "Verity",
    description:
      "Ed25519-signed compliance attestations with SHA-256 commitments and blinding factors. Prove you meet Art. 70 fuel thresholds or NIS2 patch windows — without revealing a single byte of operational data. Offline-verifiable certificates. Tamper-evident hash chains anchored to Sentinel telemetry.",
    image: "/images/verity-hero.png",
  },
  {
    id: "ecosystem",
    slug: "ecosystem",
    href: "/network",
    category: "Stakeholder Network · Secure Collaboration",
    title: "The Compliance Network",
    pill: "Network",
    description:
      "One platform. Every stakeholder. Invite regulators, insurers, auditors, legal counsel, and launch providers into encrypted data rooms with watermarking, granular access control, and hash-chained attestation workflows. Every interaction logged. Every sign-off cryptographically verifiable.",
    image: "/images/blog/ground-station.png",
  },
];

const AUTO_PLAY_MS = 8000;
const GAP_PX = 24;

export default function BlogShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewportW, setViewportW] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Measure viewport
  useEffect(() => {
    const measure = () => setViewportW(window.innerWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Card = ~40% of viewport on desktop (2.5 visible), ~85% on mobile
  const cardWidth =
    viewportW > 0 ? (viewportW > 768 ? viewportW * 0.38 : viewportW * 0.85) : 0;

  // Content-grid left inset: matches max-w-[1400px] mx-auto px-12
  const inset =
    viewportW > 768 ? Math.max(24, (viewportW - 1400) / 2 + 48) : 24;

  // Spring-animated x offset
  const rawX = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 300, damping: 40, mass: 0.8 });

  // Slide offset: first card starts at `inset`, subsequent ones shift by cardWidth + gap
  useEffect(() => {
    const offset = inset - activeIndex * (cardWidth + GAP_PX);
    rawX.set(offset);
  }, [activeIndex, cardWidth, inset, rawX]);

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % ENTRIES.length);
  }, []);

  const prev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + ENTRIES.length) % ENTRIES.length);
  }, []);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(next, AUTO_PLAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeIndex, paused, next]);

  // Drag / swipe
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = cardWidth * 0.15;
      if (info.offset.x < -threshold && activeIndex < ENTRIES.length - 1) {
        setActiveIndex((prev) => prev + 1);
      } else if (info.offset.x > threshold && activeIndex > 0) {
        setActiveIndex((prev) => prev - 1);
      } else {
        // Snap back
        rawX.set(inset - activeIndex * (cardWidth + GAP_PX));
      }
    },
    [activeIndex, cardWidth, inset, rawX],
  );

  return (
    <section
      className="relative bg-white py-24 md:py-32"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        Slide {activeIndex + 1} of {ENTRIES.length}:{" "}
        {ENTRIES[activeIndex].title}
      </div>

      {/* Header — constrained width */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-14">
          <div>
            <p className="text-body font-medium uppercase tracking-wider text-[#9CA3AF] mb-3">
              Capabilities
            </p>
            <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-medium tracking-[-0.02em] text-[#111827]">
              The platform, in depth
            </h2>
          </div>

          {/* Title pills */}
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <button
              onClick={() => setPaused(!paused)}
              aria-label={paused ? "Resume carousel" : "Pause carousel"}
              aria-pressed={paused}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-[#E5E7EB] text-[#86868b] hover:text-[#1d1d1f] hover:border-[#1d1d1f] transition-colors"
            >
              {paused ? (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              ) : (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              )}
            </button>
            {ENTRIES.map((e, i) => (
              <button
                key={e.id}
                onClick={() => goTo(i)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-body font-medium transition-all duration-300 ${
                  activeIndex === i
                    ? "bg-[#111827] text-white"
                    : "bg-[#F1F3F5] text-[#4B5563] hover:bg-[#E9ECEF] hover:text-[#111827]"
                }`}
              >
                {e.pill}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Full-bleed carousel — track moves, no static padding */}
      <div className="relative overflow-hidden group/carousel">
        <motion.div
          ref={trackRef}
          className="flex cursor-grab active:cursor-grabbing"
          style={{ x, gap: GAP_PX }}
          drag="x"
          dragConstraints={{
            left: inset - (ENTRIES.length - 1) * (cardWidth + GAP_PX),
            right: inset,
          }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
        >
          {ENTRIES.map((entry, i) => (
            <div
              key={entry.slug}
              className="flex-shrink-0"
              style={{ width: cardWidth || "38vw" }}
            >
              <div className="group block" draggable={false}>
                {/* Image */}
                <div className="relative w-full h-[55vw] md:h-[24vw] rounded-2xl overflow-hidden bg-[#F1F3F5] border border-[#E5E7EB] mb-5 md:mb-6">
                  <Image
                    src={entry.image}
                    alt={entry.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    sizes="(min-width: 768px) 38vw, 85vw"
                    priority={i === 0}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.03] transition-colors duration-500" />
                </div>

                {/* Text */}
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <span className="inline-block text-caption font-medium uppercase tracking-wider text-[#9CA3AF] mb-3">
                      {entry.category}
                    </span>
                    <h3 className="text-title md:text-display-sm font-medium text-[#111827] leading-snug mb-2 group-hover:text-[#374151] transition-colors duration-300">
                      {entry.title}
                    </h3>
                    <p className="text-body md:text-body-lg text-[#4B5563] leading-relaxed">
                      {entry.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Floating scroll arrows */}
        {activeIndex > 0 && (
          <button
            onClick={prev}
            className="hidden md:flex absolute left-6 top-[28%] -translate-y-1/2 z-10 w-12 h-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-[#E5E7EB] text-[#111827] shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 hover:bg-white hover:shadow-md"
            aria-label="Previous"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {activeIndex < ENTRIES.length - 1 && (
          <button
            onClick={next}
            className="hidden md:flex absolute right-6 top-[28%] -translate-y-1/2 z-10 w-12 h-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-[#E5E7EB] text-[#111827] shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 hover:bg-white hover:shadow-md"
            aria-label="Next"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Progress bars — constrained width */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="flex items-center gap-3 mt-8 md:mt-12">
          {ENTRIES.map((e, i) => (
            <button
              key={e.id}
              onClick={() => goTo(i)}
              className="relative h-1 flex-1 rounded-full bg-[#E5E7EB] overflow-hidden"
              aria-label={`Go to ${e.title}`}
            >
              {activeIndex === i ? (
                <motion.div
                  className="absolute inset-y-0 left-0 bg-[#111827] rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{
                    duration: paused ? 99999 : AUTO_PLAY_MS / 1000,
                    ease: "linear",
                  }}
                  key={`progress-${activeIndex}`}
                />
              ) : i < activeIndex ? (
                <div className="absolute inset-0 bg-[#111827] rounded-full" />
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
