"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

const PRODUCTS = [
  {
    name: "Comply",
    tagline: "Navigate regulation, from authorization to audit.",
    description:
      "The regulatory command center. Real-time compliance posture across space law, cybersecurity directives, and national regulations — for every operator type, every jurisdiction, every mission phase.",
    href: "/platform",
  },
  {
    name: "Sentinel",
    tagline: "Collect compliance evidence, from orbit to ground.",
    description:
      "Autonomous evidence agents deployed at operator premises. Cryptographically signed hash chains, tamper-evident audit trails, and cross-verification against public orbital data.",
    href: "/sentinel",
  },
  {
    name: "Ephemeris",
    tagline: "Predict compliance risk, from today to end-of-life.",
    description:
      "Forward-looking risk engine. Models regulatory change propagation, deadline cascades, and compliance decay trajectories across your entire mission lifecycle.",
    href: "/systems/ephemeris",
  },
  {
    name: "Atlas",
    tagline: "Map the regulatory landscape, jurisdiction by jurisdiction.",
    description:
      "Regulatory intelligence layer. Side-by-side jurisdiction comparator, landing rights database, and live regulatory updates feed — for every operator evaluating where to license, launch, or operate next.",
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
        {/* Eyebrow + Headline */}
        <AnimatedRow>
          <p className="text-micro uppercase tracking-[0.2em] text-[#6B7280] mb-5">
            Our Software
          </p>
        </AnimatedRow>
        <AnimatedRow delay={0.1}>
          <h2 className="text-[clamp(1.875rem,4.5vw,3.75rem)] font-medium tracking-[-0.03em] text-[#111827] leading-[1.05] max-w-[900px]">
            The operating system for space regulatory compliance.
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
      <div className="py-12 md:py-16 lg:py-20 max-w-[900px]">
        {/* Arrow + Product name */}
        <div className="flex items-baseline gap-4 md:gap-6 mb-5">
          <span
            aria-hidden="true"
            className="text-[clamp(1.5rem,3vw,2.5rem)] font-light text-[#9CA3AF] leading-none transition-all duration-500 group-hover:text-[#111827] group-hover:translate-x-1"
          >
            ↳
          </span>
          <h3 className="text-[clamp(2.5rem,7vw,6rem)] font-normal leading-[0.9] tracking-[-0.04em] text-[#111827] select-none">
            {product.name}
          </h3>
        </div>

        {/* Tagline */}
        <p className="text-[clamp(1rem,1.75vw,1.375rem)] font-normal text-[#4B5563] leading-[1.35] tracking-[-0.015em] mb-6 md:mb-8">
          {product.tagline}
        </p>

        {/* Description */}
        <p className="text-body-lg text-[#9CA3AF] leading-relaxed max-w-[640px] transition-colors duration-500 group-hover:text-[#4B5563] mb-7 md:mb-9">
          {product.description}
        </p>

        {/* Explore CTA */}
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
