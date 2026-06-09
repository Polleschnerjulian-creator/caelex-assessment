"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

// Geist (Vercel's neo-grotesk) is injected as a CSS variable by next/font in the
// root layout. We reference it directly so the font is independent of Tailwind's
// theme resolution (which the multi-root workspace can mis-resolve in dev).
const GEIST = "var(--font-geist), system-ui, sans-serif";
const INK = "#1E1F2B"; // Palantir's near-black ink

// The five public Caelex products, in order, Palantir-style: a big name, a small
// version tag, and one sharp line. Descriptions are intentionally terse.
const PRODUCTS = [
  {
    name: "Atlas",
    version: "/0.1",
    description:
      "The workspace that runs a space-law practice — research, draft, and advise, end to end.",
    href: "/atlas-access",
  },
  {
    name: "Comply",
    version: "/0.2",
    description:
      "Total regulatory command — every obligation, from authorization to audit.",
    href: "/platform",
  },
  {
    name: "Passage",
    version: "/0.3",
    description:
      "Export control on autopilot — classify, screen, and clear every shipment.",
    href: "/trade-access",
  },
  {
    name: "Ephemeris",
    version: "/0.4",
    description:
      "See compliance risk before it arrives — forecast every deadline to end-of-life.",
    href: "/systems/ephemeris",
  },
  {
    name: "Scholar",
    version: "/0.5",
    description:
      "Space law for the next generation — built for students, academics, and universities.",
    href: "/scholar",
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
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function SoftwareShowcase() {
  return (
    <section className="bg-white py-32 md:py-44">
      <div className="max-w-[1500px] mx-auto px-6 md:px-12">
        {/* Section label — 20px, regular, dark (matches Palantir) */}
        <AnimatedRow>
          <h2
            style={{
              fontFamily: GEIST,
              fontSize: "20px",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: INK,
            }}
          >
            Our Software
          </h2>
        </AnimatedRow>

        {/* Product rows — each name flies in from the side on scroll (Palantir) */}
        <div className="mt-8 md:mt-10">
          {PRODUCTS.map((product) => (
            <ProductRow key={product.name} product={product} />
          ))}
          {/* Closing divider */}
          <div className="border-t" style={{ borderColor: "#ECECEC" }} />
        </div>
      </div>
    </section>
  );
}

function ProductRow({ product }: { product: (typeof PRODUCTS)[number] }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-90px" });
  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

  return (
    <Link
      href={product.href}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2"
    >
      <div
        ref={ref}
        className="overflow-hidden border-t transition-colors group-hover:!border-[#D8D8D8]"
        style={{
          borderColor: "#ECECEC",
          paddingTop: "16px",
          paddingBottom: "32px",
        }}
      >
        {/* Big name (flies in from the left + fades) + version tag */}
        <div className="flex items-start justify-between gap-6">
          <motion.h3
            className="select-none"
            style={{
              fontFamily: GEIST,
              fontSize: "clamp(2.75rem, 7.5vw, 80px)",
              fontWeight: 400,
              letterSpacing: "-0.05em",
              lineHeight: 1,
              color: INK,
            }}
            initial={{ opacity: 0, x: -80 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -80 }}
            whileHover={{ x: 8 }}
            transition={{ duration: 0.7, ease }}
          >
            {product.name}
          </motion.h3>
          <motion.span
            className="whitespace-nowrap tabular-nums"
            style={{
              fontFamily: GEIST,
              fontSize: "18px",
              fontWeight: 400,
              color: "#AAAAAA",
            }}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease }}
          >
            {product.version}
          </motion.span>
        </div>

        {/* One sharp line — fades up just after the name */}
        <motion.p
          className="mt-4 max-w-none"
          style={{
            fontFamily: GEIST,
            fontSize: "20px",
            fontWeight: 400,
            lineHeight: 1.15,
            color: INK,
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.6, delay: 0.18, ease }}
        >
          {product.description}
        </motion.p>
      </div>
    </Link>
  );
}
