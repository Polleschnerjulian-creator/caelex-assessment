"use client";

import ScrollReveal from "@/components/ui/ScrollReveal";

const dataPoints = [
  { number: "118", text: "articles mapped" },
  { number: "6", text: "annexes analyzed" },
  { number: "9", text: "-step decision tree" },
  { number: "7", text: "operator classifications" },
  { number: "5", text: "constellation tiers" },
  { number: "3", text: "compliance checklists" },
];

export default function DataFoundation() {
  return (
    <section
      className="bg-black py-[120px] lg:py-[200px]"
      aria-label="Data source"
    >
      <div className="max-w-[600px] mx-auto px-6 md:px-8 text-center">
        {/* Label */}
        <ScrollReveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60 mb-8">
            SOURCE
          </p>
        </ScrollReveal>

        {/* Headline */}
        <ScrollReveal delay={0.1}>
          <h2 className="text-[clamp(1.5rem,2.5vw,2rem)] font-medium text-white mb-12">
            Built on the actual regulation.
          </h2>
        </ScrollReveal>

        {/* Vertical stats list */}
        <div className="space-y-0">
          {dataPoints.map((point, index) => (
            <ScrollReveal key={index} delay={0.1 + index * 0.1}>
              <p className="font-mono text-[14px] text-white/70 leading-[2.5]">
                <span className="text-white font-medium">{point.number}</span>
                {point.text}
              </p>
            </ScrollReveal>
          ))}
        </div>

        {/* Divider */}
        <ScrollReveal delay={0.7}>
          <div className="w-12 h-px bg-white/[0.06] mx-auto my-8" />
        </ScrollReveal>

        {/* Source line */}
        <ScrollReveal delay={0.8}>
          <p className="font-mono text-[12px] text-white/30">
            All data sourced directly from{" "}
            <a
              href="https://eur-lex.europa.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/20 hover:text-white/60 transition-colors"
            >
              EUR-Lex
            </a>
            .
          </p>
        </ScrollReveal>

        {/* Reference */}
        <ScrollReveal delay={0.9}>
          <p className="font-mono text-[11px] text-white/10 mt-2">
            COM(2025) 335 final
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
