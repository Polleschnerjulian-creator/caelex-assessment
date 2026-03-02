"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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

export default function BlogShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Track which card is most visible via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
            setActiveIndex(i);
          }
        },
        { threshold: 0.4 },
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollToCard = useCallback((index: number) => {
    const el = cardRefs.current[index];
    if (el) {
      const navHeight = 80 + 64; // page nav + tab bar height
      const top = el.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative bg-white"
      aria-label="Featured"
    >
      {/* Sticky Title Tabs */}
      <div className="sticky top-20 z-30 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center gap-2 py-4 overflow-x-auto scrollbar-hide">
            <span className="text-caption font-medium uppercase tracking-wider text-[#9CA3AF] mr-3 flex-shrink-0">
              Featured
            </span>
            {ENTRIES.map((entry, i) => (
              <button
                key={entry.id}
                onClick={() => scrollToCard(i)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-body font-medium transition-all duration-300 ${
                  activeIndex === i
                    ? "bg-[#111827] text-white"
                    : "bg-[#F1F3F5] text-[#4B5563] hover:bg-[#E9ECEF] hover:text-[#111827]"
                }`}
              >
                {entry.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Large Cards — stacked vertically, ~65vh each */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12 md:py-20">
        <div className="flex flex-col gap-16 md:gap-24">
          {ENTRIES.map((entry, i) => (
            <motion.div
              key={entry.slug}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              initial={false}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              id={`featured-${entry.id}`}
            >
              <Link href={`/blog/${entry.slug}`} className="group block">
                {/* Large Image — ~60vh on desktop */}
                <div className="relative w-full h-[50vh] md:h-[60vh] rounded-2xl overflow-hidden bg-[#F1F3F5] border border-[#E5E7EB] mb-6 md:mb-8">
                  <Image
                    src={entry.image}
                    alt={entry.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 100vw, 1400px"
                    priority={i === 0}
                  />
                  {/* Subtle overlay on hover */}
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
          ))}
        </div>
      </div>
    </section>
  );
}
