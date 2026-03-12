"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface FooterPageData {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  features: Array<{ title: string; description: string }>;
}

interface Props {
  page: FooterPageData;
  category: string;
}

export default function FooterPageTemplate({ page, category }: Props) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="pt-44 pb-20 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-micro uppercase tracking-[0.2em] text-[#86868b] mb-6"
          >
            {category}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[clamp(2rem,5vw,3.5rem)] font-semibold tracking-[-0.03em] text-[#1d1d1f] max-w-4xl leading-[1.1]"
          >
            {page.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-heading md:text-display-sm text-[#6e6e73] mt-6 max-w-2xl leading-relaxed font-normal"
          >
            {page.tagline}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="flex items-center gap-4 mt-10"
          >
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 bg-[#1d1d1f] text-white text-body-lg font-medium px-7 py-3.5 rounded-full hover:bg-[#424245] transition-colors"
            >
              Get Started
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-[#1d1d1f] text-body-lg font-medium px-7 py-3.5 rounded-full border border-[#d2d2d7] hover:bg-[#f5f5f7] transition-colors"
            >
              Contact Us
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Separator */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="w-full h-px bg-[#d2d2d7]" />
      </div>

      {/* Description */}
      <section className="py-20 md:py-28 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="text-body-lg md:text-subtitle text-[#1d1d1f] leading-[1.7]">
              {page.description}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28 px-6 md:px-12 bg-[#FAFAFA]">
        <div className="max-w-[1400px] mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-micro uppercase tracking-[0.2em] text-[#86868b] mb-12"
          >
            Key Capabilities
          </motion.p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#E5E7EB] rounded-2xl overflow-hidden">
            {page.features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="bg-white p-8 md:p-10"
              >
                <h3 className="text-title font-semibold text-[#1d1d1f] mb-3">
                  {feature.title}
                </h3>
                <p className="text-body-lg text-[#6e6e73] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 md:py-32 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-display-sm md:text-display font-semibold tracking-[-0.02em] text-[#1d1d1f] mb-4"
          >
            Get started today
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-body-lg text-[#6e6e73] mb-10 max-w-lg mx-auto"
          >
            See how Caelex transforms space regulatory compliance.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 bg-[#1d1d1f] text-white text-body-lg font-medium px-8 py-4 rounded-full hover:bg-[#424245] transition-colors"
            >
              Request a Demo
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
