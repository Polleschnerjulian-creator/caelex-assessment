"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

const PRODUCTS = [
  {
    name: "Comply",
    tagline: "Navigate regulation,\nfrom authorization to audit.",
    description:
      "The regulatory command center. Real-time compliance posture across space law, cybersecurity directives, and national regulations — for every operator type, every jurisdiction, every mission phase.",
    href: "/platform",
  },
  {
    name: "Sentinel",
    tagline: "Collect compliance evidence,\nfrom orbit to ground.",
    description:
      "Autonomous evidence agents deployed at operator premises. Cryptographically signed hash chains, tamper-evident audit trails, and cross-verification against public orbital data.",
    href: "/sentinel",
  },
  {
    name: "Ephemeris",
    tagline: "Predict compliance risk,\nfrom today to end-of-life.",
    description:
      "Forward-looking risk engine. Models regulatory change propagation, deadline cascades, and compliance decay trajectories across your entire mission lifecycle.",
    href: "/systems/ephemeris",
  },
  {
    name: "Verity",
    tagline: "Prove compliance without\nrevealing what you know.",
    description:
      "Zero-knowledge compliance attestation. Cryptographic proofs that demonstrate regulatory adherence to auditors without exposing proprietary operational data.",
    href: "/verity",
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
              <ProductRow product={product} />
            </AnimatedRow>
          ))}
          {/* Bottom border */}
          <div className="border-t border-[#E5E7EB]" />
        </div>
      </div>
    </section>
  );
}

function ProductRow({ product }: { product: (typeof PRODUCTS)[number] }) {
  const isClickable = product.href !== "#";

  const inner = (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 lg:gap-12 py-12 md:py-16 lg:py-20 border-t border-[#E5E7EB] group-hover:border-[#D1D5DB] transition-colors">
      {/* Left: product name + tagline */}
      <div>
        <motion.h3
          className={`text-[clamp(2.5rem,7vw,6rem)] font-normal leading-[0.9] tracking-[-0.04em] select-none transition-colors duration-500 mb-4 ${
            isClickable ? "text-[#111827]" : "text-[#E5E7EB]"
          }`}
          whileHover={isClickable ? { x: 8 } : undefined}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {product.name}
        </motion.h3>
        <p className="text-[clamp(0.875rem,1.5vw,1.125rem)] font-normal text-[#6B7280] leading-[1.4] whitespace-pre-line tracking-[-0.01em]">
          {product.tagline}
        </p>
      </div>

      {/* Right: description */}
      <div className="flex items-end">
        <p className="text-body-lg text-[#9CA3AF] leading-relaxed max-w-xl group-hover:text-[#4B5563] transition-colors duration-500">
          {product.description}
        </p>
      </div>
    </div>
  );

  if (isClickable) {
    return (
      <Link
        href={product.href}
        className="group block focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 rounded-lg"
      >
        {inner}
      </Link>
    );
  }

  return <div className="group block">{inner}</div>;
}
