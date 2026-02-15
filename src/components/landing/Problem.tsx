"use client";

import ScrollReveal from "@/components/ui/ScrollReveal";

const paragraphs = [
  "The EU Space Act introduces the most comprehensive regulatory framework for commercial space activities ever proposed by any jurisdiction.",
  "Every spacecraft operator, launch provider, and in-space service company with EU ties must comply — or face penalties of up to 2% of global annual turnover.",
  "The regulation spans 118 articles and 6 annexes across authorization, cybersecurity, debris mitigation, environmental footprint, and data governance.",
];

export default function Problem() {
  return (
    <section
      className="bg-black py-[120px] lg:py-[200px]"
      aria-label="The challenge"
    >
      <div className="max-w-[1000px] mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20">
          {/* Left Column */}
          <ScrollReveal>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60 mb-8">
                THE CHALLENGE
              </p>
              <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-medium text-white tracking-[-0.02em] leading-[1.2]">
                The regulation no one is ready for.
              </h2>
            </div>
          </ScrollReveal>

          {/* Right Column */}
          <div>
            {paragraphs.map((paragraph, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div className="border-l border-white/12 pl-6 mb-8 hover:border-white/[0.15] transition-all duration-500">
                  <p className="text-[16px] text-white/45 leading-[1.8]">
                    {paragraph}
                  </p>
                </div>
              </ScrollReveal>
            ))}

            {/* Final standalone line */}
            <ScrollReveal delay={0.3}>
              <p className="text-white font-medium text-[17px] mt-4 pl-6">
                Most operators don&apos;t know where to start.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
