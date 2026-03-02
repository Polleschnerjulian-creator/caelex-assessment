"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface BlogEntry {
  slug: string;
  category: string;
  title: string;
  description: string;
  image: string;
}

const ENTRIES: BlogEntry[] = [
  {
    slug: "agentic-system",
    category: "Product",
    title: "Caelex Agentic System",
    description:
      "Autonomous regulatory intelligence — powered by AI agents that monitor, interpret, and act on space compliance in real time.",
    image: "/images/blog/agentic-system.png",
  },
  {
    slug: "regulatory-intelligence",
    category: "Platform",
    title: "Regulatory Intelligence Engine",
    description:
      "How Caelex maps 10+ jurisdictions and 119 articles into a single compliance graph — updated continuously.",
    image: "/images/blog/agentic-system.png",
  },
  {
    slug: "compliance-automation",
    category: "Technology",
    title: "Compliance Automation",
    description:
      "From gap analysis to audit-ready documentation in minutes. The future of space compliance is automated.",
    image: "/images/blog/agentic-system.png",
  },
];

export default function BlogShowcase() {
  return (
    <section className="relative py-24 md:py-32 bg-white" aria-label="Featured">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Section Header */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 md:mb-16"
        >
          <p className="text-body font-medium uppercase tracking-wider text-[#9CA3AF] mb-3">
            Featured
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-medium tracking-[-0.02em] text-[#111827]">
            What we&apos;re building
          </h2>
        </motion.div>

        {/* Cards Grid — horizontal on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {ENTRIES.map((entry, i) => (
            <motion.div
              key={entry.slug}
              initial={false}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Link href={`/blog/${entry.slug}`} className="group block">
                {/* Image Container */}
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-[#F1F3F5] border border-[#E5E7EB] mb-5">
                  <Image
                    src={entry.image}
                    alt={entry.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  {/* Subtle overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.03] transition-colors duration-500" />
                </div>

                {/* Text */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-block text-caption font-medium uppercase tracking-wider text-[#9CA3AF] mb-2">
                      {entry.category}
                    </span>
                    <h3 className="text-title md:text-heading font-medium text-[#111827] leading-snug mb-2 group-hover:text-[#374151] transition-colors duration-300">
                      {entry.title}
                    </h3>
                    <p className="text-body text-[#4B5563] leading-relaxed line-clamp-2">
                      {entry.description}
                    </p>
                  </div>
                  <ArrowUpRight
                    size={20}
                    className="flex-shrink-0 mt-1 text-[#9CA3AF] group-hover:text-[#111827] transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
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
