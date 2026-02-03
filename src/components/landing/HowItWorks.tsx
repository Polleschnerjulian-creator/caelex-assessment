"use client";

import ScrollReveal from "@/components/ui/ScrollReveal";

const steps = [
  {
    number: "01",
    title: "Answer 8 questions",
    description:
      "Your operation type, entity size, orbital parameters, constellation scale, and EU market presence.",
    detail: "~3 minutes · multiple choice",
  },
  {
    number: "02",
    title: "Receive your compliance profile",
    description:
      "Which of the 118 articles apply to you. Your regulatory regime. Authorization path. Estimated compliance timeline and costs.",
    detail: "instant analysis · 7 modules evaluated",
  },
  {
    number: "03",
    title: "Download your report",
    description:
      "PDF with full compliance checklist, module breakdown, applicable articles, risk assessment, and concrete next steps.",
    detail: "PDF export · no data stored",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-black py-[120px] lg:py-[200px]">
      <div className="max-w-[1000px] mx-auto px-6 md:px-8">
        {/* Section Label */}
        <ScrollReveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60 mb-24 text-center">
            PROCESS
          </p>
        </ScrollReveal>

        {/* Steps */}
        <div className="space-y-[100px]">
          {steps.map((step, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <div className="grid grid-cols-1 lg:grid-cols-[120px_1fr] gap-8 items-start">
                {/* Ghost watermark number */}
                <div className="font-mono text-[clamp(60px,10vw,100px)] font-extralight text-white/[0.05] leading-none select-none">
                  {step.number}
                </div>

                {/* Content */}
                <div>
                  {/* Thin horizontal line */}
                  <div className="w-12 h-px bg-white/[0.08] mb-4" />

                  <h3 className="text-[20px] font-medium text-white mb-3 tracking-[-0.01em]">
                    {step.title}
                  </h3>

                  <p className="text-[15px] text-white/60 leading-[1.75] max-w-[450px]">
                    {step.description}
                  </p>

                  {/* Detail line in mono */}
                  <p className="font-mono text-[11px] text-white/30 mt-3">
                    {step.detail}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
