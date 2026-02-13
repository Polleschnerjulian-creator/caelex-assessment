import { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, ChevronDown, ArrowRight } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
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
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  nis2: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
  },
  licensing: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  compliance: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  platform: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
  technical: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
  },
};

export default function FAQPage() {
  const allFaqs = getAllFaqs();
  const categories = getAllCategories();

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
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
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-white mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-[17px] text-white/50 leading-relaxed">
              Get answers to common questions about EU Space Act, NIS2
              Directive, space licensing, and regulatory compliance.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 mb-12">
            <div className="px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
              <span className="text-[14px] text-white/60">
                <span className="text-white font-medium">{allFaqs.length}</span>{" "}
                Questions
              </span>
            </div>
            <div className="px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
              <span className="text-[14px] text-white/60">
                <span className="text-white font-medium">
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
                  className={`px-4 py-2 rounded-full ${colors.bg} ${colors.border} border text-[13px] ${colors.text} hover:opacity-80 transition-opacity`}
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
                    <h2 className="text-[24px] font-medium text-white">
                      {getCategoryLabel(category)}
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {categoryFaqs.map((faq) => (
                      <details
                        key={faq.id}
                        className="group rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.12] transition-colors"
                      >
                        <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                          <h3 className="text-[16px] font-medium text-white pr-8 group-hover:text-emerald-400 transition-colors">
                            {faq.question}
                          </h3>
                          <ChevronDown
                            size={20}
                            className="text-white/40 flex-shrink-0 transition-transform group-open:rotate-180"
                          />
                        </summary>
                        <div className="px-6 pb-6 pt-0">
                          <p className="text-[15px] text-white/60 leading-relaxed">
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

          <section className="mt-20 p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 text-center">
            <HelpCircle size={32} className="text-emerald-400 mx-auto mb-4" />
            <h2 className="text-[24px] font-medium text-white mb-4">
              Still have questions?
            </h2>
            <p className="text-[15px] text-white/50 mb-8 max-w-xl mx-auto">
              Our AI assistant ASTRA can answer complex regulatory questions
              instantly.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/astra"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-[14px] font-medium hover:bg-white/90 transition-all"
              >
                Ask ASTRA AI <ArrowRight size={16} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white text-[14px] font-medium hover:border-white/40 transition-all"
              >
                Contact Team
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
