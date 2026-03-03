"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

// ════════════════════════════════════════════════════════════════════════
// DATA
// ════════════════════════════════════════════════════════════════════════

const PRODUCTS = [
  {
    name: "Caelex",
    version: "/0.1",
    tagline: "Navigate space regulation,\nfrom authorization to audit.",
    description:
      "The regulatory command center. Real-time compliance posture across the EU Space Act, NIS2, and 10 national space laws — for every operator type, every jurisdiction, every mission phase.",
    href: "/assessment",
    status: "Live",
  },
  {
    name: "Sentinel",
    version: "/0.2",
    tagline: "Collect compliance evidence,\nfrom orbit to ground.",
    description:
      "Autonomous evidence agents deployed at operator premises. Cryptographically signed hash chains, tamper-evident audit trails, and cross-verification against public orbital data.",
    href: "/blog/agentic-system",
    status: "Live",
  },
  {
    name: "ASTRA",
    version: "/0.3",
    tagline: "Reason about regulation,\nfrom policy to proof.",
    description:
      "Regulatory AI that reads legislation like a lawyer and structures compliance like an engineer. Multi-hop reasoning across 119 EU Space Act articles and 51 NIS2 requirements.",
    href: "/dashboard/astra",
    status: "Live",
  },
  {
    name: "Ephemeris",
    version: "/0.4",
    tagline: "Predict compliance risk,\nfrom today to end-of-life.",
    description:
      "Forward-looking risk engine. Models regulatory change propagation, deadline cascades, and compliance decay trajectories across your entire mission lifecycle.",
    href: "#",
    status: "2025",
  },
  {
    name: "Genome",
    version: "/0.5",
    tagline: "Map every regulation to every other,\nacross every jurisdiction.",
    description:
      "The regulatory knowledge graph. Cross-references between 10 national space laws, EU Space Act, NIS2, IADC guidelines, ITU Radio Regulations, and COPUOS treaties — with gap and conflict detection.",
    href: "#",
    status: "2026",
  },
  {
    name: "Verity",
    version: "/0.6",
    tagline: "Prove compliance without\nrevealing what you know.",
    description:
      "Zero-knowledge compliance attestation. Cryptographic proofs that demonstrate regulatory adherence to auditors and NCAs without exposing proprietary operational data.",
    href: "#",
    status: "2026",
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
            <AnimatedRow key={product.version} delay={i * 0.06}>
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

// ════════════════════════════════════════════════════════════════════════
// PRODUCT ROW
// ════════════════════════════════════════════════════════════════════════

function ProductRow({ product }: { product: (typeof PRODUCTS)[number] }) {
  const isLive = product.status === "Live";

  const inner = (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 lg:gap-12 items-start py-12 md:py-16 lg:py-20 border-t border-[#E5E7EB] group-hover:border-[#D1D5DB] transition-colors">
        {/* Left column: tagline + version */}
        <div className="flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[clamp(1rem,1.8vw,1.25rem)] font-normal text-[#111827] leading-[1.4] whitespace-pre-line tracking-[-0.01em]">
              {product.tagline}
            </p>
          </div>
          <div className="flex items-center gap-4 mt-6">
            <span className="text-body font-mono text-[#C0C5CF]">
              {product.version}
            </span>
            <span
              className={`text-micro font-medium uppercase tracking-[0.1em] px-2 py-0.5 rounded-full ${
                isLive
                  ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                  : "text-[#9CA3AF] bg-[#F7F8FA] border border-[#E5E7EB]"
              }`}
            >
              {product.status}
            </span>
          </div>
        </div>

        {/* Right column: massive product name */}
        <div className="flex items-start justify-end overflow-hidden">
          <h3
            className={`text-[clamp(4rem,12vw,10rem)] font-semibold leading-[0.88] tracking-[-0.06em] text-right transition-colors duration-500 select-none ${
              isLive
                ? "text-[#111827] group-hover:text-emerald-600"
                : "text-[#E5E7EB]"
            }`}
          >
            {product.name}
          </h3>
        </div>
      </div>

      {/* Description */}
      <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-12 pb-2">
        <div />
        <p className="text-body text-[#9CA3AF] leading-relaxed max-w-2xl lg:text-right lg:ml-auto group-hover:text-[#4B5563] transition-colors duration-500">
          {product.description}
        </p>
      </div>
    </>
  );

  if (isLive) {
    return (
      <Link href={product.href} className="group block">
        {inner}
      </Link>
    );
  }

  return <div className="group block">{inner}</div>;
}
