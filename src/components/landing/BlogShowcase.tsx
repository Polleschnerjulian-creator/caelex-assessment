"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useSpring, PanInfo } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

interface BlogEntry {
  id: string;
  slug: string;
  category: string;
  title: string;
  description: string;
  image: string;
  href?: string;
}

const ENTRIES: BlogEntry[] = [
  {
    id: "agentic",
    slug: "agentic-system",
    category: "Product",
    title: "Caelex Agentic System",
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
    description:
      "Caelex Ephemeris models every satellite as a living digital twin and computes the compliance future — for every regulation, every satellite, every day of the next five years. Operators don't ask 'are we compliant?' — they ask 'when will we not be?'",
    image: "/images/blog/ephemeris.svg",
  },
  {
    id: "ground-stations",
    slug: "ground-stations-critical-infrastructure",
    category: "NIS2 · Critical Infrastructure",
    title: "Ground Stations as Critical Infrastructure",
    description:
      "Under NIS2 and the EU Space Act, ground stations are classified as critical infrastructure. Our agent monitors uptime, access logs, and security posture — generating audit-ready evidence without manual intervention.",
    image: "/images/blog/ground-station.png",
  },
  {
    id: "automation",
    slug: "evidence-based-compliance",
    category: "Technology",
    title: "Evidence-Based Compliance",
    description:
      "The Caelex agent collects telemetry, configuration drifts, and incident data from your systems in real time — transforming raw operational data into structured compliance evidence mapped to 119 EU Space Act articles.",
    image: "/images/blog/agentic-system.png",
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
      {/* Header — constrained width */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-14">
          <div>
            <p className="text-body font-medium uppercase tracking-wider text-[#9CA3AF] mb-3">
              Featured
            </p>
            <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-medium tracking-[-0.02em] text-[#111827]">
              What we&apos;re building
            </h2>
          </div>

          {/* Title pills + arrows */}
          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto scrollbar-hide">
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
                {e.title}
              </button>
            ))}

            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <button
                onClick={prev}
                className="p-2 rounded-full bg-[#F1F3F5] text-[#4B5563] hover:bg-[#E9ECEF] hover:text-[#111827] transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={next}
                className="p-2 rounded-full bg-[#F1F3F5] text-[#4B5563] hover:bg-[#E9ECEF] hover:text-[#111827] transition-colors"
                aria-label="Next"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-bleed carousel — track moves, no static padding */}
      <div className="relative overflow-hidden">
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
              <Link
                href={entry.href ?? `/blog/${entry.slug}`}
                className="group block"
                draggable={false}
                onClick={(e) => {
                  // Prevent navigation when dragging
                  const expected = inset - activeIndex * (cardWidth + GAP_PX);
                  if (Math.abs(rawX.get() - expected) > 5) {
                    e.preventDefault();
                  }
                }}
              >
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
                  <ArrowUpRight
                    size={22}
                    className="flex-shrink-0 mt-2 text-[#9CA3AF] group-hover:text-[#111827] transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </div>
          ))}
        </motion.div>
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
