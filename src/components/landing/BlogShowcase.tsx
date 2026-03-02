"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
}

const ENTRIES: BlogEntry[] = [
  {
    id: "agentic",
    slug: "agentic-system",
    category: "Product",
    title: "Caelex Agentic System",
    description:
      "Autonomous regulatory intelligence — powered by AI agents that monitor, interpret, and act on space compliance in real time.",
    image: "/images/blog/agentic-system.png",
  },
  {
    id: "intelligence",
    slug: "regulatory-intelligence",
    category: "Platform",
    title: "Regulatory Intelligence Engine",
    description:
      "How Caelex maps 10+ jurisdictions and 119 articles into a single compliance graph — updated continuously.",
    image: "/images/blog/agentic-system.png",
  },
  {
    id: "automation",
    slug: "compliance-automation",
    category: "Technology",
    title: "Compliance Automation",
    description:
      "From gap analysis to audit-ready documentation in minutes. The future of space compliance is automated.",
    image: "/images/blog/agentic-system.png",
  },
];

const AUTO_PLAY_MS = 8000;

export default function BlogShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > activeIndex ? 1 : -1);
      setActiveIndex(index);
    },
    [activeIndex],
  );

  const next = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % ENTRIES.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + ENTRIES.length) % ENTRIES.length);
  }, []);

  // Auto-advance every 8 seconds
  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(next, AUTO_PLAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeIndex, paused, next]);

  const entry = ENTRIES[activeIndex];

  // Slide variants — card slides in from left/right
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "40%" : "-40%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-40%" : "40%",
      opacity: 0,
    }),
  };

  return (
    <section
      className="relative bg-white py-24 md:py-32 overflow-hidden"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Header row: title + nav tabs */}
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
          <div className="flex items-center gap-3">
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

            <div className="flex items-center gap-1 ml-2">
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

        {/* Carousel viewport */}
        <div className="relative w-full">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={entry.slug}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            >
              <Link href={`/blog/${entry.slug}`} className="group block">
                {/* Large Image */}
                <div className="relative w-full h-[50vh] md:h-[60vh] rounded-2xl overflow-hidden bg-[#F1F3F5] border border-[#E5E7EB] mb-6 md:mb-8">
                  <Image
                    src={entry.image}
                    alt={entry.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 100vw, 1400px"
                    priority
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.03] transition-colors duration-500" />
                </div>

                {/* Text */}
                <div className="flex items-start justify-between gap-6 max-w-3xl">
                  <div>
                    <span className="inline-block text-caption font-medium uppercase tracking-wider text-[#9CA3AF] mb-3">
                      {entry.category}
                    </span>
                    <h3 className="text-display-sm md:text-display font-medium text-[#111827] leading-snug mb-3 group-hover:text-[#374151] transition-colors duration-300">
                      {entry.title}
                    </h3>
                    <p className="text-body-lg md:text-subtitle text-[#4B5563] leading-relaxed">
                      {entry.description}
                    </p>
                  </div>
                  <ArrowUpRight
                    size={28}
                    className="flex-shrink-0 mt-2 text-[#9CA3AF] group-hover:text-[#111827] transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots + timer bar */}
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
