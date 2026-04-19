"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

/**
 * SoftwareShowcase — mirrors the Palantir homepage "Platforms" section 1:1.
 *
 * Verified structure (from palantir.com CMS, April 2026):
 *  - Section eyebrow: "Platforms"
 *  - Section headline: a single big statement under the eyebrow
 *  - Each product row has exactly three things:
 *      1. heading = "↳ [Name]"  (arrow is part of the heading text)
 *      2. subheading = one-line tagline, Title Case
 *      3. CTA = "Explore [Name]" inline link
 *  - No description paragraph. No images. No body copy.
 */

const PRODUCTS = [
  {
    name: "Comply",
    tagline: "Operating System for Regulatory Compliance",
    href: "/platform",
  },
  {
    name: "Sentinel",
    tagline: "Operating System for Compliance Evidence",
    href: "/sentinel",
  },
  {
    name: "Ephemeris",
    tagline: "Operating System for Compliance Forecasting",
    href: "/systems/ephemeris",
  },
  {
    name: "Atlas",
    tagline: "Operating System for Regulatory Intelligence",
    href: "/atlas",
  },
];

function AnimatedRow({
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
        {/* Eyebrow */}
        <AnimatedRow>
          <p className="text-micro uppercase tracking-[0.2em] text-[#6B7280] mb-5">
            Platforms
          </p>
        </AnimatedRow>

        {/* Headline */}
        <AnimatedRow delay={0.1}>
          <h2 className="text-[clamp(1.875rem,4.5vw,3.75rem)] font-medium tracking-[-0.03em] text-[#111827] leading-[1.05] max-w-[900px]">
            Foundational software for the new space economy.
          </h2>
        </AnimatedRow>

        {/* Product rows */}
        <div className="mt-24 md:mt-32">
          {PRODUCTS.map((product, i) => (
            <AnimatedRow key={product.name} delay={0.2 + i * 0.08}>
              <ProductRow product={product} />
            </AnimatedRow>
          ))}
          {/* Closing divider below last row */}
          <div className="border-t border-[#E5E7EB]" />
        </div>
      </div>
    </section>
  );
}

function ProductRow({ product }: { product: (typeof PRODUCTS)[number] }) {
  return (
    <Link
      href={product.href}
      className="group block border-t border-[#E5E7EB] transition-colors duration-500 hover:border-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 rounded-sm"
    >
      <div className="py-16 md:py-20 lg:py-24">
        {/* Heading: ↳ Product Name */}
        <h3 className="text-[clamp(2.5rem,7vw,6rem)] font-normal leading-[0.95] tracking-[-0.04em] text-[#111827] select-none mb-5 md:mb-6">
          <span
            aria-hidden="true"
            className="inline-block mr-3 md:mr-5 text-[#9CA3AF] font-light transition-all duration-500 group-hover:text-[#111827] group-hover:translate-x-1"
          >
            ↳
          </span>
          {product.name}
        </h3>

        {/* Tagline (subheading) */}
        <p className="text-[clamp(1.125rem,2vw,1.5rem)] font-normal text-[#4B5563] leading-[1.3] tracking-[-0.015em] mb-8 md:mb-10 max-w-[720px]">
          {product.tagline}
        </p>

        {/* Inline CTA: Explore [Name] */}
        <span className="inline-flex items-center gap-2 text-body font-medium text-[#111827]">
          Explore {product.name}
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:translate-x-2"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
