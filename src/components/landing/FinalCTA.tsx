"use client";

import Link from "next/link";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function FinalCTA() {
  return (
    <section className="relative bg-black py-[120px] lg:py-[200px]">
      {/* Subtle radial glow background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(139,159,255,0.03) 0%, transparent 50%)",
        }}
      />

      <div className="relative max-w-[1000px] mx-auto px-6 md:px-8 text-center">
        <ScrollReveal>
          {/* Headline */}
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-normal text-white tracking-[-0.03em] mb-12">
            Find out what applies to you.
          </h2>

          {/* CTA Button */}
          <Link href="/assessment">
            <button className="bg-white text-black text-[15px] font-medium px-10 py-4 rounded-full hover:scale-[1.03] hover:shadow-[0_0_60px_rgba(255,255,255,0.12)] transition-all duration-500">
              Start Assessment →
            </button>
          </Link>

          {/* Trust line */}
          <p className="font-mono text-[11px] text-white/30 mt-6">
            3 minutes · No account · No data stored · Client-side only
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
