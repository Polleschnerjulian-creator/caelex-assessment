"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

/**
 * SoftwareShowcase — mirrors the Palantir homepage "Our Software" section 1:1.
 *
 * Verified visual structure (palantir.com homepage, april 2026):
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ Our Software                                                 │
 *   ├──────────────┬──────────────┬───────────────────────────────┤
 *   │ tagline      │ visual block │ HUGE WORDMARK                 │
 *   │ multi-line,  │ (silhouette  │ (product name as display      │
 *   │ /0.X index   │  default,    │  type, dark, ~12vw)           │
 *   │              │  screenshot  │                               │
 *   │              │  on hover)   │                               │
 *   ├──────────────┴──────────────┴───────────────────────────────┤
 *   │ entire row is a clickable link with grey-tint hover bg      │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Differences from palantir we accept (lack of brand assets):
 *   - we don't have product screenshots, so the middle column
 *     uses an abstract emerald gradient placeholder revealed on
 *     hover. swap for real screenshots when available.
 *   - we don't have a custom display typeface for the wordmarks,
 *     so we use the body font at the heaviest available weight.
 */

const PRODUCTS = [
  {
    name: "Comply",
    tagline: "Navigate regulation, from authorization to audit.",
    href: "/platform",
  },
  {
    name: "Sentinel",
    tagline: "Collect compliance evidence, from orbit to ground.",
    href: "/sentinel",
  },
  {
    name: "Ephemeris",
    tagline: "Predict compliance risk, from today to end-of-life.",
    href: "/systems/ephemeris",
  },
  {
    name: "Atlas",
    tagline: "Map the regulatory landscape, jurisdiction by jurisdiction.",
    href: "/atlas",
  },
];

function AnimatedBlock({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function SoftwareShowcase() {
  return (
    <section className="bg-white py-32 md:py-44">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Section heading */}
        <AnimatedBlock>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.025em] text-[#111827] mb-20 md:mb-28">
            Our Software
          </h2>
        </AnimatedBlock>

        {/* Product rows */}
        {PRODUCTS.map((product, i) => (
          <AnimatedBlock key={product.name} delay={0.1 + i * 0.1}>
            <ProductRow product={product} index={i + 1} />
          </AnimatedBlock>
        ))}
      </div>
    </section>
  );
}

function ProductRow({
  product,
  index,
}: {
  product: (typeof PRODUCTS)[number];
  index: number;
}) {
  return (
    <Link
      href={product.href}
      className="group block transition-colors duration-500 hover:bg-[#F5F5F7] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 -mx-6 md:-mx-12 px-6 md:px-12"
    >
      <div className="grid grid-cols-12 gap-6 md:gap-8 py-16 md:py-20 lg:py-24 items-center">
        {/* Column 1: tagline + numeric index (cols 1–3) */}
        <div className="col-span-12 md:col-span-3 flex flex-col justify-between min-h-[180px] md:min-h-[260px]">
          <p className="text-[clamp(1rem,1.4vw,1.25rem)] font-normal text-[#111827] leading-[1.35] tracking-[-0.01em] max-w-[260px]">
            {product.tagline}
          </p>
          <p className="text-small font-normal text-[#9CA3AF] tracking-wide mt-6 md:mt-0 font-mono">
            /0.{index}
          </p>
        </div>

        {/* Column 2: visual block (cols 4–6) — silhouette default, gradient on hover */}
        <div className="col-span-12 md:col-span-3 relative aspect-[4/3] md:aspect-[16/10] overflow-hidden rounded-sm">
          {/* default silhouette layer: faded initial letter */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-[#FAFAFA] transition-opacity duration-700 group-hover:opacity-0"
          >
            <span className="text-[clamp(4rem,10vw,8rem)] font-bold text-[#E5E7EB] leading-none tracking-[-0.04em] select-none">
              {product.name.charAt(0)}
            </span>
          </div>
          {/* hover layer: tinted gradient placeholder for future screenshot */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            style={{
              background:
                "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 50%, #A7F3D0 100%)",
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[clamp(4rem,10vw,8rem)] font-bold text-emerald-600/30 leading-none tracking-[-0.04em] select-none">
                {product.name.charAt(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Column 3: huge product wordmark (cols 7–12) */}
        <div className="col-span-12 md:col-span-6 flex items-center justify-start md:justify-end overflow-hidden">
          <h3 className="text-[clamp(4rem,12vw,11rem)] font-bold tracking-[-0.045em] text-[#111827] leading-[0.85] select-none whitespace-nowrap">
            {product.name}
          </h3>
        </div>
      </div>
    </Link>
  );
}
