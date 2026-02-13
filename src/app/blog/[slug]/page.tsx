import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, Calendar, Tag } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { generateBlogBreadcrumbs } from "@/lib/breadcrumbs";
import { ArticleJsonLd } from "@/components/seo/JsonLd";
import { generateBlogPostMetadata, siteConfig } from "@/lib/seo";
import {
  getAllPosts,
  getPostBySlug,
  getRelatedPosts,
} from "@/content/blog/posts";

// ============================================================================
// STATIC PARAMS
// ============================================================================

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
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
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested blog post could not be found.",
    };
  }

  return generateBlogPostMetadata({
    slug: post.slug,
    title: post.title,
    description: post.description,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    author: post.author,
    category: post.category,
    keywords: post.tags,
    readingTime: post.readingTime,
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
  // Process headings with IDs
  let html = content
    // H2 headings
    .replace(/^## (.+)$/gm, (_, text) => {
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return `<h2 id="${id}" class="text-[24px] font-medium text-white mt-12 mb-4 scroll-mt-32">${text}</h2>`;
    })
    // H3 headings
    .replace(
      /^### (.+)$/gm,
      '<h3 class="text-[18px] font-medium text-white mt-8 mb-3">$1</h3>',
    )
    // Bold
    .replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="font-semibold text-white">$1</strong>',
    )
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-white/60">$1</li>')
    // Paragraphs
    .replace(
      /\n\n/g,
      '</p><p class="text-[15px] text-white/60 leading-relaxed mb-4">',
    )
    // Tables
    .replace(
      /\|(.+)\|/g,
      '<tr class="border-b border-white/[0.08]"><td class="px-4 py-2 text-[13px] text-white/60">$1</td></tr>',
    );

  // Wrap in paragraph
  html = `<p class="text-[15px] text-white/60 leading-relaxed mb-4">${html}</p>`;

  // Fix list wrapping
  html = html.replace(
    /(<li[^>]*>[\s\S]*?<\/li>)+/g,
    '<ul class="space-y-2 mb-4 list-disc list-inside">$&</ul>',
  );

  return html;
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(slug, 3);
  const toc = generateTOC(post.content);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      {/* JSON-LD */}
      <ArticleJsonLd
        title={post.title}
        description={post.description}
        url={`${siteConfig.url}/blog/${post.slug}`}
        datePublished={post.publishedAt}
        dateModified={post.updatedAt || post.publishedAt}
        authorName={post.author}
        category={post.category}
      />

      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={generateBlogBreadcrumbs(
              post.title,
              post.slug,
              post.category,
            )}
            className="mb-8"
          />

          {/* Back Link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-[13px] text-white/40 hover:text-white/60 transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            Back to Blog
          </Link>

          <div className="grid lg:grid-cols-[1fr_300px] gap-12">
            {/* Main Content */}
            <article>
              {/* Header */}
              <header className="mb-12">
                <div className="flex items-center gap-3 text-[12px] text-white/40 mb-4">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {post.readingTime} min read
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <h1 className="text-[36px] md:text-[42px] font-medium leading-[1.15] tracking-[-0.02em] text-white mb-6">
                  {post.title}
                </h1>

                <p className="text-[17px] text-white/50 leading-relaxed">
                  {post.description}
                </p>
              </header>

              {/* Content */}
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(post.content),
                }}
              />

              {/* Tags */}
              <div className="mt-12 pt-8 border-t border-white/[0.08]">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag size={14} className="text-white/30" />
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-white/[0.06] text-[12px] text-white/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                <h3 className="text-[20px] font-medium text-white mb-3">
                  Ready to assess your compliance?
                </h3>
                <p className="text-[14px] text-white/50 mb-6">
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
                    In this article
                  </h4>
                  <nav className="space-y-2">
                    {toc.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="block text-[13px] text-white/40 hover:text-white/70 transition-colors"
                      >
                        {item.text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}

              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  <h4 className="text-[14px] font-medium text-white mb-4">
                    Related Articles
                  </h4>
                  <div className="space-y-4">
                    {relatedPosts.map((relatedPost) => (
                      <Link
                        key={relatedPost.slug}
                        href={`/blog/${relatedPost.slug}`}
                        className="block group"
                      >
                        <h5 className="text-[13px] text-white/60 group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {relatedPost.title}
                        </h5>
                        <span className="text-[11px] text-white/30">
                          {relatedPost.readingTime} min read
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

      <Footer />
    </div>
  );
}
