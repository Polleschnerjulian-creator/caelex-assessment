import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Clock, Calendar } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { generateGuideBreadcrumbs } from "@/lib/breadcrumbs";
import { ArticleJsonLd } from "@/components/seo/JsonLd";
import { generateMetadata as genMeta, siteConfig } from "@/lib/seo";
import { getAllGuides, getGuideBySlug } from "@/content/guides/guides";

// ============================================================================
// STATIC PARAMS
// ============================================================================

export async function generateStaticParams() {
  const guides = getAllGuides();
  return guides.map((guide) => ({
    slug: guide.slug,
  }));
}

// ============================================================================
// METADATA
// ============================================================================

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return {
      title: "Guide Not Found",
      description: "The requested guide could not be found.",
    };
  }

  return genMeta({
    title: guide.title,
    description: guide.description,
    path: `/guides/${guide.slug}`,
    ogType: "article",
    publishedTime: guide.publishedAt,
    modifiedTime: guide.updatedAt || guide.publishedAt,
    keywords: guide.keywords,
  });
}

// ============================================================================
// TABLE OF CONTENTS GENERATOR
// ============================================================================

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

function generateTOC(content: string): TOCItem[] {
  const headingRegex = /^##\s+(.+)$/gm;
  const items: TOCItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[1];
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    items.push({ id, text, level: 2 });
  }

  return items;
}

// ============================================================================
// MARKDOWN RENDERER
// ============================================================================

function renderMarkdown(content: string): string {
  let html = content
    // H2 headings
    .replace(/^## (.+)$/gm, (_, text) => {
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return `<h2 id="${id}" class="text-[28px] font-medium text-white mt-16 mb-6 scroll-mt-32">${text}</h2>`;
    })
    // H3 headings
    .replace(
      /^### (.+)$/gm,
      '<h3 class="text-[20px] font-medium text-white mt-10 mb-4">$1</h3>',
    )
    // H4 headings
    .replace(
      /^#### (.+)$/gm,
      '<h4 class="text-[16px] font-medium text-white mt-6 mb-3">$1</h4>',
    )
    // Bold
    .replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="font-semibold text-white">$1</strong>',
    )
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    // Code blocks
    .replace(
      /`([^`]+)`/g,
      '<code class="px-1.5 py-0.5 rounded bg-white/10 text-[13px] text-emerald-400 font-mono">$1</code>',
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
      '</p><p class="text-[16px] text-white/60 leading-[1.8] mb-4">',
    );

  // Wrap in paragraph
  html = `<p class="text-[16px] text-white/60 leading-[1.8] mb-4">${html}</p>`;

  // Fix list wrapping
  html = html.replace(
    /(<li[^>]*class="[^"]*list-decimal[^"]*"[^>]*>[\s\S]*?<\/li>)+/g,
    '<ol class="space-y-2 mb-6 list-decimal list-inside">$&</ol>',
  );
  html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>)+/g, (match) => {
    if (!match.includes("list-decimal")) {
      return `<ul class="space-y-2 mb-6 list-disc list-inside">${match}</ul>`;
    }
    return match;
  });

  // Tables
  html = html.replace(
    /\|(.+?)\|(.+?)\|\n\|[-|]+\|\n((?:\|.+?\|.+?\|\n?)+)/g,
    (_, h1, h2, rows) => {
      const headerRow = `<tr class="border-b border-white/10"><th class="px-4 py-3 text-left text-[13px] font-medium text-white">${h1.trim()}</th><th class="px-4 py-3 text-left text-[13px] font-medium text-white">${h2.trim()}</th></tr>`;
      const dataRows = rows
        .trim()
        .split("\n")
        .map((row: string) => {
          const cells = row.split("|").filter((c: string) => c.trim());
          return `<tr class="border-b border-white/[0.06]"><td class="px-4 py-3 text-[13px] text-white/60">${cells[0]?.trim() || ""}</td><td class="px-4 py-3 text-[13px] text-white/60">${cells[1]?.trim() || ""}</td></tr>`;
        })
        .join("");
      return `<table class="w-full mb-6 border border-white/10 rounded-lg overflow-hidden"><thead class="bg-white/[0.04]">${headerRow}</thead><tbody>${dataRows}</tbody></table>`;
    },
  );

  return html;
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const toc = generateTOC(guide.content);
  const otherGuides = getAllGuides()
    .filter((g) => g.slug !== slug)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* JSON-LD */}
      <ArticleJsonLd
        title={guide.title}
        description={guide.description}
        url={`${siteConfig.url}/guides/${guide.slug}`}
        datePublished={guide.publishedAt}
        dateModified={guide.updatedAt || guide.publishedAt}
        authorName={guide.author}
        category="Compliance Guides"
      />

      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={generateGuideBreadcrumbs(guide.title, guide.slug)}
            className="mb-8"
          />

          {/* Back Link */}
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 text-[13px] text-white/40 hover:text-white/60 transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            All Guides
          </Link>

          <div className="grid lg:grid-cols-[1fr_320px] gap-12">
            {/* Main Content */}
            <article>
              {/* Header */}
              <header className="mb-12">
                <div className="flex items-center gap-3 text-[12px] text-white/40 mb-4">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                    <BookOpen size={12} />
                    Comprehensive Guide
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {guide.readingTime} min read
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(guide.publishedAt).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <h1 className="text-[36px] md:text-[48px] font-medium leading-[1.1] tracking-[-0.02em] text-white mb-6">
                  {guide.h1}
                </h1>

                <p className="text-[18px] text-white/50 leading-relaxed">
                  {guide.description}
                </p>
              </header>

              {/* Content */}
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(guide.content),
                }}
              />

              {/* CTA */}
              <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                <h3 className="text-[22px] font-medium text-white mb-3">
                  Ready to assess your compliance?
                </h3>
                <p className="text-[15px] text-white/50 mb-6">
                  Get your personalized regulatory profile across EU Space Act,
                  NIS2, and national space laws in minutes.
                </p>
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white text-[14px] font-medium hover:bg-emerald-400 transition-colors"
                >
                  Start Free Assessment
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="space-y-8">
              {/* Table of Contents */}
              {toc.length > 0 && (
                <div className="sticky top-32 p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  <h4 className="text-[14px] font-medium text-white mb-4">
                    Table of Contents
                  </h4>
                  <nav className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {toc.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="block text-[13px] text-white/40 hover:text-white/70 transition-colors py-1"
                      >
                        {item.text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}

              {/* Other Guides */}
              {otherGuides.length > 0 && (
                <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  <h4 className="text-[14px] font-medium text-white mb-4">
                    More Guides
                  </h4>
                  <div className="space-y-4">
                    {otherGuides.map((otherGuide) => (
                      <Link
                        key={otherGuide.slug}
                        href={`/guides/${otherGuide.slug}`}
                        className="block group"
                      >
                        <h5 className="text-[13px] text-white/60 group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {otherGuide.title}
                        </h5>
                        <span className="text-[11px] text-white/30">
                          {otherGuide.readingTime} min read
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
