import { FAQPageJsonLd } from "@/components/seo/JsonLd";

interface FAQ {
  question: string;
  answer: string;
}

interface ModuleFAQProps {
  moduleName: string;
  faqs: FAQ[];
}

export default function ModuleFAQ({ moduleName, faqs }: ModuleFAQProps) {
  return (
    <>
      <FAQPageJsonLd faqs={faqs} />
      <section className="mt-16 pt-10 border-t border-[#E5E7EB]">
        <span className="text-micro uppercase tracking-[0.25em] text-[#9CA3AF] block mb-4">
          FAQ
        </span>
        <h2 className="text-[clamp(1.25rem,3vw,1.75rem)] font-light text-[#111827] tracking-[-0.01em] mb-8">
          Frequently Asked Questions — {moduleName}
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group bg-white border border-[#E5E7EB] rounded-xl p-5 cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#D1D5DB] transition-all duration-300"
            >
              <summary className="flex items-center justify-between text-body-lg font-medium text-[#111827] list-none [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span className="text-[#9CA3AF] group-open:rotate-45 transition-transform duration-200 flex-shrink-0 ml-4">
                  +
                </span>
              </summary>
              <p className="mt-4 text-body text-[#4B5563] leading-[1.7]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
