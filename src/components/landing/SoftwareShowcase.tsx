"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

// ════════════════════════════════════════════════════════════════════════
// BACKGROUND ICONS (Palantir-style subtle gray symbols)
// ════════════════════════════════════════════════════════════════════════

function ShieldIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      <path
        d="M60 10L20 30v30c0 22 16 42 40 50 24-8 40-28 40-50V30L60 10z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M45 58l10 10 20-20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RadarIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      <circle cx="60" cy="60" r="40" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="26" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="12" stroke="currentColor" strokeWidth="1.2" />
      <line
        x1="60"
        y1="60"
        x2="88"
        y2="32"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="60" cy="60" r="3" fill="currentColor" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      <path
        d="M60 20c-8 0-14 4-17 10-6 1-11 6-11 13 0 3 1 6 3 8-2 3-3 6-3 10 0 8 6 15 14 16 3 6 9 10 14 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M60 20c8 0 14 4 17 10 6 1 11 6 11 13 0 3-1 6-3 8 2 3 3 6 3 10 0 8-6 15-14 16-3 6-9 10-14 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <line
        x1="60"
        y1="25"
        x2="60"
        y2="90"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
    </svg>
  );
}

function TimelineIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      <line
        x1="20"
        y1="60"
        x2="100"
        y2="60"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="30" cy="60" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="52" cy="60" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="74" cy="60" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="94" cy="60" r="4" fill="currentColor" />
      <path
        d="M30 52V38M52 52V32M74 52V40"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      <circle cx="60" cy="30" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="30" cy="60" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="90" cy="60" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="40" cy="90" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="80" cy="90" r="6" stroke="currentColor" strokeWidth="1.5" />
      <line
        x1="55"
        y1="35"
        x2="35"
        y2="55"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <line
        x1="65"
        y1="35"
        x2="85"
        y2="55"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <line
        x1="33"
        y1="66"
        x2="38"
        y2="84"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <line
        x1="87"
        y1="66"
        x2="82"
        y2="84"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <line
        x1="46"
        y1="88"
        x2="74"
        y2="88"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      <rect
        x="32"
        y="52"
        width="56"
        height="40"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M42 52V40c0-10 8-18 18-18s18 8 18 18v12"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="60" cy="72" r="5" stroke="currentColor" strokeWidth="1.5" />
      <line
        x1="60"
        y1="77"
        x2="60"
        y2="84"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const BACKGROUND_ICONS = [
  ShieldIcon,
  RadarIcon,
  BrainIcon,
  TimelineIcon,
  GraphIcon,
  LockIcon,
];

// ════════════════════════════════════════════════════════════════════════
// DATA
// ════════════════════════════════════════════════════════════════════════

const PRODUCTS = [
  {
    name: "Comply",
    tagline: "Navigate regulation,\nfrom authorization to audit.",
    description:
      "The regulatory command center. Real-time compliance posture across space law, cybersecurity directives, and national regulations — for every operator type, every jurisdiction, every mission phase.",
    href: "/assessment",
  },
  {
    name: "Sentinel",
    tagline: "Collect compliance evidence,\nfrom orbit to ground.",
    description:
      "Autonomous evidence agents deployed at operator premises. Cryptographically signed hash chains, tamper-evident audit trails, and cross-verification against public orbital data.",
    href: "/blog/agentic-system",
  },
  {
    name: "Astra",
    tagline: "Reason about regulation,\nfrom policy to proof.",
    description:
      "Regulatory AI that reads legislation like a lawyer and structures compliance like an engineer. Multi-hop reasoning across hundreds of regulatory articles and requirements.",
    href: "/dashboard/astra",
  },
  {
    name: "Ephemeris",
    tagline: "Predict compliance risk,\nfrom today to end-of-life.",
    description:
      "Forward-looking risk engine. Models regulatory change propagation, deadline cascades, and compliance decay trajectories across your entire mission lifecycle.",
    href: "/systems/ephemeris",
  },
  {
    name: "Genome",
    tagline: "Map every regulation to every other,\nacross every jurisdiction.",
    description:
      "The regulatory knowledge graph. Cross-references between national space laws, EU directives, IADC guidelines, ITU Radio Regulations, and international treaties — with gap and conflict detection.",
    href: "#",
  },
  {
    name: "Verity",
    tagline: "Prove compliance without\nrevealing what you know.",
    description:
      "Zero-knowledge compliance attestation. Cryptographic proofs that demonstrate regulatory adherence to auditors without exposing proprietary operational data.",
    href: "#",
  },
];

// ════════════════════════════════════════════════════════════════════════
// ANIMATION
// ════════════════════════════════════════════════════════════════════════

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
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
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

// ════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════

export default function SoftwareShowcase() {
  return (
    <section className="bg-white py-32 md:py-44">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Header */}
        <AnimatedRow>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-medium tracking-[-0.02em] text-[#111827]">
            Our Software
          </h2>
        </AnimatedRow>

        {/* Product rows */}
        <div className="mt-20">
          {PRODUCTS.map((product, i) => (
            <AnimatedRow key={product.name} delay={i * 0.06}>
              <ProductRow product={product} index={i} />
            </AnimatedRow>
          ))}
          {/* Bottom border */}
          <div className="border-t border-[#E5E7EB]" />
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// PRODUCT ROW
// ════════════════════════════════════════════════════════════════════════

function ProductRow({
  product,
  index,
}: {
  product: (typeof PRODUCTS)[number];
  index: number;
}) {
  const isClickable = product.href !== "#";
  const BgIcon = BACKGROUND_ICONS[index];

  const inner = (
    <div className="relative">
      {/* Background icon (Palantir-style) */}
      <div className="absolute right-8 lg:right-24 top-1/2 -translate-y-1/2 w-[180px] h-[180px] lg:w-[260px] lg:h-[260px] text-[#F1F3F5] pointer-events-none transition-colors duration-500 group-hover:text-[#E5E7EB]">
        <BgIcon />
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 lg:gap-12 items-start py-12 md:py-16 lg:py-20 border-t border-[#E5E7EB] group-hover:border-[#D1D5DB] transition-colors">
        {/* Left column: tagline */}
        <div className="flex flex-col justify-center">
          <p className="text-[clamp(1rem,1.8vw,1.25rem)] font-normal text-[#111827] leading-[1.4] whitespace-pre-line tracking-[-0.01em]">
            {product.tagline}
          </p>
        </div>

        {/* Right column: product name */}
        <div className="flex items-start justify-end">
          <motion.h3
            className={`text-[clamp(3rem,9vw,7.5rem)] font-normal leading-[0.9] tracking-[-0.04em] text-right select-none transition-colors duration-500 ${
              isClickable ? "text-[#111827]" : "text-[#E5E7EB]"
            }`}
            whileHover={isClickable ? { x: 8 } : undefined}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {product.name}
          </motion.h3>
        </div>
      </div>

      {/* Description */}
      <div className="relative lg:grid lg:grid-cols-[320px_1fr] lg:gap-12 pb-2">
        <div />
        <p className="text-body text-[#9CA3AF] leading-relaxed max-w-2xl lg:text-right lg:ml-auto group-hover:text-[#4B5563] transition-colors duration-500">
          {product.description}
        </p>
      </div>
    </div>
  );

  if (isClickable) {
    return (
      <Link href={product.href} className="group block">
        {inner}
      </Link>
    );
  }

  return <div className="group block">{inner}</div>;
}
