import { Metadata } from "next";
import Link from "next/link";
import { BookText, ArrowRight, Search } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { pageMetadata } from "@/lib/seo";
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

const categoryColors: Record<string, string> = {
  regulation: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  operator: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  technical: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  legal: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  cybersecurity: "bg-red-500/10 text-red-400 border-red-500/20",
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
    <div className="min-h-screen bg-black text-white">
      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Glossary", href: "/glossary" }]}
            className="mb-8"
          />

          {/* Header */}
          <div className="max-w-3xl mb-12">
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-white mb-6">
              Space Compliance Glossary
            </h1>
            <p className="text-[17px] text-white/50 leading-relaxed">
              Comprehensive definitions for EU Space Act, NIS2 Directive,
              operator classifications, technical standards, and regulatory
              terminology. Your reference guide for space compliance.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div className="text-[28px] font-medium text-white">
                {terms.length}
              </div>
              <div className="text-[13px] text-white/40">Total Terms</div>
            </div>
            {categories.map((cat) => (
              <div
                key={cat}
                className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]"
              >
                <div className="text-[28px] font-medium text-white">
                  {getTermsByCategory(cat).length}
                </div>
                <div className="text-[13px] text-white/40">
                  {categoryLabels[cat]}
                </div>
              </div>
            ))}
          </div>

          {/* A-Z Navigation */}
          <div className="flex flex-wrap gap-2 mb-12 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            {alphabet.map((letter) => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-white/60 hover:text-emerald-400 text-[14px] font-medium transition-colors"
              >
                {letter}
              </a>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-12">
            <Link
              href="/glossary"
              className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[13px] text-emerald-400"
            >
              All Terms
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/glossary?category=${cat}`}
                className={`px-4 py-2 rounded-full border text-[13px] transition-colors ${categoryColors[cat]}`}
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
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-[24px] font-medium text-emerald-400">
                        {letter}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-white/[0.08]" />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {letterTerms.map((term) => (
                      <Link
                        key={term.slug}
                        href={`/glossary/${term.slug}`}
                        className="group p-6 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                            <BookText
                              size={18}
                              className="text-white/40 group-hover:text-emerald-400 transition-colors"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h2 className="text-[16px] font-medium text-white group-hover:text-emerald-400 transition-colors truncate">
                                {term.term}
                              </h2>
                              {term.acronym && (
                                <span className="px-2 py-0.5 rounded bg-white/[0.08] text-[11px] text-white/50">
                                  {term.acronym}
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] text-white/40 leading-relaxed line-clamp-2 mb-3">
                              {term.definition}
                            </p>
                            <div className="flex items-center justify-between">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] border ${categoryColors[term.category]}`}
                              >
                                {categoryLabels[term.category]}
                              </span>
                              <span className="text-[12px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
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
          <div className="mt-20 text-center p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            <BookText size={32} className="text-emerald-400 mx-auto mb-4" />
            <h2 className="text-[24px] font-medium text-white mb-4">
              Need help understanding compliance requirements?
            </h2>
            <p className="text-[15px] text-white/50 mb-8 max-w-xl mx-auto">
              Our AI-powered assessment helps you navigate complex space
              regulations and understand exactly what applies to your mission.
            </p>
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black text-[14px] font-medium hover:bg-white/90 transition-all"
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
