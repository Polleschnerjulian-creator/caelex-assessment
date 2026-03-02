import { Metadata } from "next";
import Link from "next/link";
import { BookText, ArrowRight, Search } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { DefinedTermSetJsonLd } from "@/components/seo/JsonLd";
import { pageMetadata, siteConfig } from "@/lib/seo";
import {
  getAllTerms,
  getAlphabetWithTerms,
  getAllCategories,
  getTermsByCategory,
} from "@/content/glossary/terms";

export const metadata: Metadata = {
  ...pageMetadata.glossary,
  title: "Space Compliance Glossary | 50+ Regulatory Terms | Caelex",
  description:
    "Comprehensive glossary of space compliance terminology. Definitions for EU Space Act, NIS2, operator types, technical standards, and regulatory concepts.",
  openGraph: {
    title: "Space Compliance Glossary | Caelex",
    description:
      "50+ definitions covering EU Space Act, NIS2 Directive, space debris mitigation, and regulatory compliance terminology.",
    url: "https://caelex.eu/glossary",
  },
};

export const revalidate = 3600;

const categoryColors: Record<string, string> = {
  regulation: "bg-blue-50 text-blue-700 border-blue-200",
  operator: "bg-emerald-50 text-emerald-700 border-emerald-200",
  technical: "bg-purple-50 text-purple-700 border-purple-200",
  legal: "bg-amber-50 text-amber-700 border-amber-200",
  cybersecurity: "bg-red-50 text-red-700 border-red-200",
};

const categoryLabels: Record<string, string> = {
  regulation: "Regulation",
  operator: "Operator Types",
  technical: "Technical",
  legal: "Legal",
  cybersecurity: "Cybersecurity",
};

export default function GlossaryPage() {
  const terms = getAllTerms();
  const alphabet = getAlphabetWithTerms();
  const categories = getAllCategories();

  return (
    <div className="min-h-screen landing-light bg-[#F7F8FA] text-[#111827]">
      <DefinedTermSetJsonLd
        name="Space Compliance Glossary"
        description="Comprehensive glossary of space compliance terminology covering EU Space Act, NIS2, operator types, technical standards, and regulatory concepts."
        terms={terms.map((t) => ({
          term: t.term,
          definition: t.definition,
          url: `${siteConfig.url}/glossary/${t.slug}`,
        }))}
      />
      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Glossary", href: "/glossary" }]}
            className="mb-8"
          />

          {/* Header */}
          <div className="max-w-3xl mb-12">
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-[#111827] mb-6">
              Space Compliance Glossary
            </h1>
            <p className="text-title text-[#4B5563] leading-relaxed">
              Comprehensive definitions for EU Space Act, NIS2 Directive,
              operator classifications, technical standards, and regulatory
              terminology. Your reference guide for space compliance.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
            <div className="p-4 rounded-xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="text-[28px] font-medium text-[#111827]">
                {terms.length}
              </div>
              <div className="text-body text-[#4B5563]">Total Terms</div>
            </div>
            {categories.map((cat) => (
              <div
                key={cat}
                className="p-4 rounded-xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <div className="text-[28px] font-medium text-[#111827]">
                  {getTermsByCategory(cat).length}
                </div>
                <div className="text-body text-[#4B5563]">
                  {categoryLabels[cat]}
                </div>
              </div>
            ))}
          </div>

          {/* A-Z Navigation */}
          <div className="flex flex-wrap gap-2 mb-12 p-4 rounded-xl bg-[#F1F3F5] border border-[#E5E7EB]">
            {alphabet.map((letter) => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-white hover:bg-[#F1F3F5] text-[#4B5563] hover:text-[#111827] text-body-lg font-medium transition-colors"
              >
                {letter}
              </a>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-12">
            <Link
              href="/glossary"
              className="px-4 py-2 rounded-full bg-[#111827] border border-[#111827] text-body text-white"
            >
              All Terms
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/glossary?category=${cat}`}
                className={`px-4 py-2 rounded-full border text-body transition-colors ${categoryColors[cat]}`}
              >
                {categoryLabels[cat]}
              </Link>
            ))}
          </div>

          {/* Terms by Letter */}
          <div className="space-y-12">
            {alphabet.map((letter) => {
              const letterTerms = terms.filter((t) =>
                t.term.toUpperCase().startsWith(letter),
              );
              if (letterTerms.length === 0) return null;

              return (
                <section key={letter} id={`letter-${letter}`}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[#F1F3F5] flex items-center justify-center">
                      <span className="text-display-sm font-medium text-[#111827]">
                        {letter}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-[#E5E7EB]" />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {letterTerms.map((term) => (
                      <Link
                        key={term.slug}
                        href={`/glossary/${term.slug}`}
                        className="group p-6 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F1F3F5] hover:border-[#D1D5DB] transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#F1F3F5] flex items-center justify-center flex-shrink-0">
                            <BookText
                              size={18}
                              className="text-[#4B5563] group-hover:text-[#111827] transition-colors"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h2 className="text-title font-medium text-[#111827] group-hover:text-[#111827] transition-colors truncate">
                                {term.term}
                              </h2>
                              {term.acronym && (
                                <span className="px-2 py-0.5 rounded bg-[#F1F3F5] text-caption text-[#4B5563]">
                                  {term.acronym}
                                </span>
                              )}
                            </div>
                            <p className="text-body text-[#4B5563] leading-relaxed line-clamp-2 mb-3">
                              {term.definition}
                            </p>
                            <div className="flex items-center justify-between">
                              <span
                                className={`px-2 py-0.5 rounded-full text-caption border ${categoryColors[term.category]}`}
                              >
                                {categoryLabels[term.category]}
                              </span>
                              <span className="text-small text-[#111827] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                Read more <ArrowRight size={12} />
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center p-8 rounded-xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <BookText size={32} className="text-[#111827] mx-auto mb-4" />
            <h2 className="text-display-sm font-medium text-[#111827] mb-4">
              Need help understanding compliance requirements?
            </h2>
            <p className="text-subtitle text-[#4B5563] mb-8 max-w-xl mx-auto">
              Our AI-powered assessment helps you navigate complex space
              regulations and understand exactly what applies to your mission.
            </p>
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#111827] text-white text-body-lg font-medium hover:bg-[#374151] transition-all"
            >
              Start Free Assessment
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
