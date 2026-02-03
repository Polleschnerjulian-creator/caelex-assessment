"use client";

import ScrollReveal from "@/components/ui/ScrollReveal";

const cards = [
  {
    number: "01",
    title: "Compliance Profile",
    body: "Operator classification, regulatory regime, authorization pathway, estimated costs, and key compliance deadlines.",
    articles: "Based on Art. 4-16, Art. 75-83",
  },
  {
    number: "02",
    title: "Applicable Articles",
    body: "Which of the 118 articles apply to your specific operation, categorized by compliance module.",
    articles: "Full regulation mapping",
  },
  {
    number: "03",
    title: "Module Status",
    body: "7 compliance modules individually assessed: required, simplified, or not applicable for your operation.",
    articles: "Art. 18-43, Art. 44-51, Art. 52-60",
  },
  {
    number: "04",
    title: "Action Checklist",
    body: "Step-by-step next actions with article references, priority levels, and module assignments.",
    articles: "Personalized action items",
  },
];

export default function WhatYouGet() {
  return (
    <section className="bg-black py-[120px] lg:py-[200px]">
      <div className="max-w-[1000px] mx-auto px-6 md:px-8">
        {/* Header */}
        <ScrollReveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60 mb-6 text-center">
            OUTPUT
          </p>
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-medium text-white text-center mb-16">
            Your compliance report
          </h2>
        </ScrollReveal>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <div className="relative bg-white/[0.015] border border-white/10 rounded-lg p-8 overflow-hidden hover:border-white/[0.1] hover:bg-white/[0.025] transition-all duration-500">
                {/* Corner number */}
                <span className="absolute top-4 right-4 font-mono text-[10px] text-white/10">
                  {card.number}
                </span>

                {/* Title */}
                <h3 className="text-[16px] font-semibold text-white mb-3">
                  {card.title}
                </h3>

                {/* Body */}
                <p className="text-[14px] text-white/35 leading-[1.7]">
                  {card.body}
                </p>

                {/* Article references */}
                <div className="font-mono text-[10px] text-white/10 mt-6 pt-4 border-t border-white/10">
                  {card.articles}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
