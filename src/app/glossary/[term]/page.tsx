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
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { generateGlossaryBreadcrumbs } from "@/lib/breadcrumbs";
import { siteConfig } from "@/lib/seo";
import DOMPurify from "isomorphic-dompurify";
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

// ============================================================================
// MARKDOWN RENDERER
// ============================================================================

function renderMarkdown(content: string): string {
  let html = content
    // Bold
    .replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="font-semibold text-[#111827]">$1</strong>',
    )
    // Italic with underscore (for headers like *Design Phase:*)
    .replace(
      /\*([^*]+):\*/g,
      '<em class="text-[#111827] font-medium not-italic">$1:</em>',
    )
    // Lists
    .replace(
      /^- (.+)$/gm,
      '<li class="ml-4 text-[#4B5563] leading-relaxed">$1</li>',
    )
    .replace(
      /^\d+\. (.+)$/gm,
      '<li class="ml-4 text-[#4B5563] leading-relaxed list-decimal">$1</li>',
    )
    // Paragraphs
    .replace(
      /\n\n/g,
      '</p><p class="text-subtitle text-[#4B5563] leading-relaxed mb-4">',
    );

  // Wrap in paragraph
  html = `<p class="text-subtitle text-[#4B5563] leading-relaxed mb-4">${html}</p>`;

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

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h2",
      "h3",
      "h4",
      "p",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "code",
      "pre",
      "a",
      "span",
      "br",
    ],
    ALLOWED_ATTR: ["class", "id", "href", "target", "rel"],
  });
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
    <div className="min-h-screen landing-light bg-[#F7F8FA] text-[#111827]">
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
            className="inline-flex items-center gap-2 text-body text-[#4B5563] hover:text-[#111827] transition-colors mb-8"
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
                    className={`px-3 py-1 rounded-full text-small border ${categoryColors[term.category]}`}
                  >
                    {categoryLabels[term.category]}
                  </span>
                  {term.acronym && (
                    <span className="px-3 py-1 rounded-full bg-[#F1F3F5] text-small text-[#4B5563]">
                      {term.acronym}
                    </span>
                  )}
                </div>

                <h1 className="text-[36px] md:text-display-lg font-medium leading-[1.1] tracking-[-0.02em] text-[#111827] mb-6">
                  {term.term}
                </h1>

                <p className="text-heading text-[#4B5563] leading-relaxed p-6 rounded-xl bg-[#F1F3F5] border border-[#E5E7EB]">
                  {term.definition}
                </p>
              </header>

              {/* Long Description */}
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(term.longDescription),
                }}
              />

              {/* Related Articles */}
              {term.relatedArticles && term.relatedArticles.length > 0 && (
                <div className="mt-10 p-6 rounded-xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <h3 className="text-title font-medium text-[#111827] mb-4 flex items-center gap-2">
                    <ExternalLink size={16} className="text-[#111827]" />
                    Related EU Space Act Articles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {term.relatedArticles.map((article) => (
                      <span
                        key={article}
                        className="px-3 py-1.5 rounded-lg bg-[#F1F3F5] text-body text-[#4B5563]"
                      >
                        {article}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Prev/Next Navigation */}
              <div className="mt-12 pt-8 border-t border-[#E5E7EB] grid grid-cols-2 gap-4">
                {prevTerm ? (
                  <Link
                    href={`/glossary/${prevTerm.slug}`}
                    className="group p-4 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F1F3F5] transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                  >
                    <div className="text-small text-[#4B5563] mb-1 flex items-center gap-1">
                      <ArrowLeft size={12} /> Previous
                    </div>
                    <div className="text-body-lg text-[#111827] group-hover:text-[#111827] transition-colors truncate">
                      {prevTerm.term}
                    </div>
                  </Link>
                ) : (
                  <div />
                )}
                {nextTerm && (
                  <Link
                    href={`/glossary/${nextTerm.slug}`}
                    className="group p-4 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F1F3F5] transition-all text-right shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                  >
                    <div className="text-small text-[#4B5563] mb-1 flex items-center gap-1 justify-end">
                      Next <ArrowRight size={12} />
                    </div>
                    <div className="text-body-lg text-[#111827] group-hover:text-[#111827] transition-colors truncate">
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
                <div className="p-6 rounded-xl bg-white border border-[#E5E7EB] sticky top-32 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <h3 className="text-title font-medium text-[#111827] mb-4 flex items-center gap-2">
                    <Tag size={16} className="text-[#111827]" />
                    Related Terms
                  </h3>
                  <div className="space-y-2">
                    {relatedTerms.map((related) => (
                      <Link
                        key={related.slug}
                        href={`/glossary/${related.slug}`}
                        className="block p-3 rounded-lg bg-[#F1F3F5] hover:bg-[#E5E7EB] transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-body-lg text-[#4B5563] group-hover:text-[#111827] transition-colors">
                            {related.term}
                          </span>
                          {related.acronym && (
                            <span className="text-caption text-[#9CA3AF]">
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
              <div className="p-6 rounded-xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <BookText size={24} className="text-[#111827] mb-4" />
                <h3 className="text-title font-medium text-[#111827] mb-2">
                  Assess Your Compliance
                </h3>
                <p className="text-body text-[#4B5563] mb-4">
                  Understand how regulations apply to your specific mission.
                </p>
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 text-body text-[#111827] hover:text-[#374151] transition-colors"
                >
                  Start Assessment <ArrowRight size={14} />
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
