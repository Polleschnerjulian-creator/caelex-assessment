import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookText,
  ArrowRight,
  ArrowLeft,
  Tag,
  ExternalLink,
} from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { generateGlossaryBreadcrumbs } from "@/lib/breadcrumbs";
import { siteConfig } from "@/lib/seo";
import {
  getAllTerms,
  getTermBySlug,
  getRelatedTerms,
  GlossaryTerm,
} from "@/content/glossary/terms";

// ============================================================================
// STATIC PARAMS
// ============================================================================

export async function generateStaticParams() {
  const terms = getAllTerms();
  return terms.map((term) => ({ term: term.slug }));
}

// ============================================================================
// METADATA
// ============================================================================

interface PageProps {
  params: Promise<{ term: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { term: termSlug } = await params;
  const term = getTermBySlug(termSlug);

  if (!term) {
    return {
      title: "Term Not Found",
      description: "The requested glossary term could not be found.",
    };
  }

  const title = term.acronym
    ? `${term.term} (${term.acronym}) - Definition | Space Compliance Glossary`
    : `${term.term} - Definition | Space Compliance Glossary`;

  return {
    title,
    description: term.definition,
    openGraph: {
      title: `${term.term} Definition | Caelex Glossary`,
      description: term.definition,
      url: `${siteConfig.url}/glossary/${term.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${term.term} | Space Compliance Glossary`,
      description: term.definition,
    },
    alternates: {
      canonical: `${siteConfig.url}/glossary/${term.slug}`,
    },
  };
}

// ============================================================================
// JSON-LD SCHEMA
// ============================================================================

function DefinedTermJsonLd({ term }: { term: GlossaryTerm }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term.term,
    description: term.definition,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Space Compliance Glossary",
      url: `${siteConfig.url}/glossary`,
    },
    url: `${siteConfig.url}/glossary/${term.slug}`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ============================================================================
// CATEGORY STYLES
// ============================================================================

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

// ============================================================================
// MARKDOWN RENDERER
// ============================================================================

function renderMarkdown(content: string): string {
  let html = content
    // Bold
    .replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="font-semibold text-white">$1</strong>',
    )
    // Italic with underscore (for headers like *Design Phase:*)
    .replace(
      /\*([^*]+):\*/g,
      '<em class="text-emerald-400 font-medium not-italic">$1:</em>',
    )
    // Lists
    .replace(
      /^- (.+)$/gm,
      '<li class="ml-4 text-white/60 leading-relaxed">$1</li>',
    )
    .replace(
      /^\d+\. (.+)$/gm,
      '<li class="ml-4 text-white/60 leading-relaxed list-decimal">$1</li>',
    )
    // Paragraphs
    .replace(
      /\n\n/g,
      '</p><p class="text-[15px] text-white/60 leading-relaxed mb-4">',
    );

  // Wrap in paragraph
  html = `<p class="text-[15px] text-white/60 leading-relaxed mb-4">${html}</p>`;

  // Fix list wrapping
  html = html.replace(
    /(<li[^>]*class="[^"]*list-decimal[^"]*"[^>]*>[\s\S]*?<\/li>)+/g,
    '<ol class="space-y-2 mb-4 list-decimal list-inside">$&</ol>',
  );
  html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>)+/g, (match) => {
    if (!match.includes("list-decimal")) {
      return `<ul class="space-y-2 mb-4 list-disc list-inside">${match}</ul>`;
    }
    return match;
  });

  return html;
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default async function GlossaryTermPage({ params }: PageProps) {
  const { term: termSlug } = await params;
  const term = getTermBySlug(termSlug);

  if (!term) {
    notFound();
  }

  const relatedTerms = getRelatedTerms(term);
  const allTerms = getAllTerms();
  const currentIndex = allTerms.findIndex((t) => t.slug === term.slug);
  const prevTerm = currentIndex > 0 ? allTerms[currentIndex - 1] : null;
  const nextTerm =
    currentIndex < allTerms.length - 1 ? allTerms[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      {/* JSON-LD */}
      <DefinedTermJsonLd term={term} />

      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={generateGlossaryBreadcrumbs(term.term, term.slug)}
            className="mb-8"
          />

          {/* Back Link */}
          <Link
            href="/glossary"
            className="inline-flex items-center gap-2 text-[13px] text-white/40 hover:text-white/60 transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            Back to Glossary
          </Link>

          <div className="grid lg:grid-cols-[1fr_320px] gap-12">
            {/* Main Content */}
            <article>
              {/* Header */}
              <header className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-[12px] border ${categoryColors[term.category]}`}
                  >
                    {categoryLabels[term.category]}
                  </span>
                  {term.acronym && (
                    <span className="px-3 py-1 rounded-full bg-white/[0.08] text-[12px] text-white/60">
                      {term.acronym}
                    </span>
                  )}
                </div>

                <h1 className="text-[36px] md:text-[48px] font-medium leading-[1.1] tracking-[-0.02em] text-white mb-6">
                  {term.term}
                </h1>

                <p className="text-[18px] text-white/70 leading-relaxed p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  {term.definition}
                </p>
              </header>

              {/* Long Description */}
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(term.longDescription),
                }}
              />

              {/* Related Articles */}
              {term.relatedArticles && term.relatedArticles.length > 0 && (
                <div className="mt-10 p-6 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <h3 className="text-[16px] font-medium text-white mb-4 flex items-center gap-2">
                    <ExternalLink size={16} className="text-emerald-400" />
                    Related EU Space Act Articles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {term.relatedArticles.map((article) => (
                      <span
                        key={article}
                        className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-[13px] text-white/60"
                      >
                        {article}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Prev/Next Navigation */}
              <div className="mt-12 pt-8 border-t border-white/[0.08] grid grid-cols-2 gap-4">
                {prevTerm ? (
                  <Link
                    href={`/glossary/${prevTerm.slug}`}
                    className="group p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-all"
                  >
                    <div className="text-[12px] text-white/40 mb-1 flex items-center gap-1">
                      <ArrowLeft size={12} /> Previous
                    </div>
                    <div className="text-[14px] text-white group-hover:text-emerald-400 transition-colors truncate">
                      {prevTerm.term}
                    </div>
                  </Link>
                ) : (
                  <div />
                )}
                {nextTerm && (
                  <Link
                    href={`/glossary/${nextTerm.slug}`}
                    className="group p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-all text-right"
                  >
                    <div className="text-[12px] text-white/40 mb-1 flex items-center gap-1 justify-end">
                      Next <ArrowRight size={12} />
                    </div>
                    <div className="text-[14px] text-white group-hover:text-emerald-400 transition-colors truncate">
                      {nextTerm.term}
                    </div>
                  </Link>
                )}
              </div>
            </article>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Related Terms */}
              {relatedTerms.length > 0 && (
                <div className="p-6 rounded-xl bg-white/[0.04] border border-white/[0.08] sticky top-32">
                  <h3 className="text-[16px] font-medium text-white mb-4 flex items-center gap-2">
                    <Tag size={16} className="text-emerald-400" />
                    Related Terms
                  </h3>
                  <div className="space-y-2">
                    {relatedTerms.map((related) => (
                      <Link
                        key={related.slug}
                        href={`/glossary/${related.slug}`}
                        className="block p-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[14px] text-white/70 group-hover:text-emerald-400 transition-colors">
                            {related.term}
                          </span>
                          {related.acronym && (
                            <span className="text-[11px] text-white/40">
                              {related.acronym}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                <BookText size={24} className="text-emerald-400 mb-4" />
                <h3 className="text-[16px] font-medium text-white mb-2">
                  Assess Your Compliance
                </h3>
                <p className="text-[13px] text-white/50 mb-4">
                  Understand how regulations apply to your specific mission.
                </p>
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 text-[13px] text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Start Assessment <ArrowRight size={14} />
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
