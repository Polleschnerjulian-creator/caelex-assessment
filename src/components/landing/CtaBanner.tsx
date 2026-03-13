"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CtaBanner() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Left: Request a Demo — light card */}
          <Link
            href="/contact"
            className="group relative flex flex-col justify-between bg-[#F0F1F3] rounded-2xl p-10 md:p-14 min-h-[200px] md:min-h-[260px] transition-colors duration-300 hover:bg-[#E5E7EB]"
          >
            <h3 className="text-[clamp(1.75rem,4vw,2.75rem)] font-normal tracking-[-0.03em] text-[#111827] leading-[1.1]">
              Request a Demo
            </h3>
            <div className="flex justify-end mt-8">
              <ArrowRight
                className="w-7 h-7 text-[#111827] transition-transform duration-300 group-hover:translate-x-2"
                strokeWidth={1.5}
              />
            </div>
          </Link>

          {/* Right: Start Assessment — dark card */}
          <Link
            href="/assessment"
            className="dark-section group relative flex flex-col justify-between bg-[#111827] rounded-2xl p-10 md:p-14 min-h-[200px] md:min-h-[260px] transition-colors duration-300 hover:bg-[#1E293B]"
          >
            <h3 className="text-[clamp(1.75rem,4vw,2.75rem)] font-normal tracking-[-0.03em] text-white leading-[1.1]">
              Start Assessment
            </h3>
            <div className="flex justify-end mt-8">
              <ArrowRight
                className="w-7 h-7 text-white transition-transform duration-300 group-hover:translate-x-2"
                strokeWidth={1.5}
              />
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
