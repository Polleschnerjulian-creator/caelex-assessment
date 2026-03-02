import { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, ChevronDown, ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { siteConfig } from "@/lib/seo";
import {
  getAllFaqs,
  getFaqsByCategory,
  getAllCategories,
  getCategoryLabel,
  FAQ,
} from "@/content/faq/faqs";

export const metadata: Metadata = {
  title: "FAQ | Space Compliance Questions Answered | Caelex",
  description:
    "Frequently asked questions about EU Space Act, NIS2 Directive, space licensing, debris mitigation, and regulatory compliance. Expert answers for space operators.",
  openGraph: {
    title: "Space Compliance FAQ | Caelex",
    description:
      "Get answers to common questions about EU Space Act, NIS2, authorization, and space regulatory compliance.",
    url: `${siteConfig.url}/resources/faq`,
  },
  alternates: {
    canonical: `${siteConfig.url}/resources/faq`,
  },
};

export const revalidate = 3600;

function FAQPageJsonLd({ faqs }: { faqs: FAQ[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

const categoryColors: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  "eu-space-act": {
    bg: "bg-[#F1F3F5]",
    text: "text-[#111827]",
    border: "border-[#E5E7EB]",
  },
  nis2: {
    bg: "bg-[#F1F3F5]",
    text: "text-[#111827]",
    border: "border-[#E5E7EB]",
  },
  licensing: {
    bg: "bg-[#F1F3F5]",
    text: "text-[#111827]",
    border: "border-[#E5E7EB]",
  },
  compliance: {
    bg: "bg-[#F1F3F5]",
    text: "text-[#111827]",
    border: "border-[#E5E7EB]",
  },
  platform: {
    bg: "bg-[#F1F3F5]",
    text: "text-[#111827]",
    border: "border-[#E5E7EB]",
  },
  technical: {
    bg: "bg-[#F1F3F5]",
    text: "text-[#111827]",
    border: "border-[#E5E7EB]",
  },
};

export default function FAQPage() {
  const allFaqs = getAllFaqs();
  const categories = getAllCategories();

  return (
    <div className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      <FAQPageJsonLd faqs={allFaqs} />

      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <Breadcrumbs
            items={[
              { label: "Resources", href: "/resources" },
              { label: "FAQ", href: "/resources/faq" },
            ]}
            className="mb-8"
          />

          <div className="max-w-3xl mb-12">
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-[#111827] mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-title text-[#4B5563] leading-relaxed">
              Get answers to common questions about EU Space Act, NIS2
              Directive, space licensing, and regulatory compliance.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 mb-12">
            <div className="px-4 py-2 rounded-lg bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span className="text-body-lg text-[#4B5563]">
                <span className="text-[#111827] font-medium">
                  {allFaqs.length}
                </span>{" "}
                Questions
              </span>
            </div>
            <div className="px-4 py-2 rounded-lg bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span className="text-body-lg text-[#4B5563]">
                <span className="text-[#111827] font-medium">
                  {categories.length}
                </span>{" "}
                Categories
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-12">
            {categories.map((category) => {
              const colors = categoryColors[category];
              const count = getFaqsByCategory(category).length;
              return (
                <a
                  key={category}
                  href={`#${category}`}
                  className={`px-4 py-2 rounded-full ${colors.bg} ${colors.border} border text-body ${colors.text} hover:opacity-80 transition-opacity`}
                >
                  {getCategoryLabel(category)} ({count})
                </a>
              );
            })}
          </div>

          <div className="space-y-16">
            {categories.map((category) => {
              const categoryFaqs = getFaqsByCategory(category);
              const colors = categoryColors[category];
              return (
                <section key={category} id={category}>
                  <div className="flex items-center gap-4 mb-8">
                    <div
                      className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}
                    >
                      <HelpCircle size={20} className={colors.text} />
                    </div>
                    <h2 className="text-display-sm font-medium text-[#111827]">
                      {getCategoryLabel(category)}
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {categoryFaqs.map((faq) => (
                      <details
                        key={faq.id}
                        className="group rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#D1D5DB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-colors"
                      >
                        <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                          <h3 className="text-title font-medium text-[#111827] pr-8 group-hover:text-[#111827] transition-colors">
                            {faq.question}
                          </h3>
                          <ChevronDown
                            size={20}
                            className="text-[#4B5563] flex-shrink-0 transition-transform group-open:rotate-180"
                          />
                        </summary>
                        <div className="px-6 pb-6 pt-0">
                          <p className="text-subtitle text-[#4B5563] leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <section className="mt-20 p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
            <HelpCircle size={32} className="text-[#111827] mx-auto mb-4" />
            <h2 className="text-display-sm font-medium text-[#111827] mb-4">
              Still have questions?
            </h2>
            <p className="text-subtitle text-[#4B5563] mb-8 max-w-xl mx-auto">
              Our AI assistant ASTRA can answer complex regulatory questions
              instantly.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/astra"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#111827] text-white text-body-lg font-medium hover:bg-[#374151] transition-all"
              >
                Ask ASTRA AI <ArrowRight size={16} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#D1D5DB] text-[#4B5563] text-body-lg font-medium hover:border-[#111827] hover:text-[#111827] transition-all"
              >
                Contact Team
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
