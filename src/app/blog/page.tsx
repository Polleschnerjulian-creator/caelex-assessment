import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Calendar, Tag } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { pageMetadata } from "@/lib/seo";
import {
  getAllPosts,
  getFeaturedPosts,
  getAllCategories,
} from "@/content/blog/posts";

export const metadata: Metadata = pageMetadata.blog;

export default function BlogPage() {
  const posts = getAllPosts();
  const featuredPosts = getFeaturedPosts();
  const categories = getAllCategories();

  return (
    <div className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Blog", href: "/blog" }]}
            className="mb-8"
          />

          {/* Header */}
          <div className="max-w-3xl mb-16">
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-[#111827] mb-6">
              Space Compliance Blog
            </h1>
            <p className="text-title text-[#4B5563] leading-relaxed">
              Expert insights on EU Space Act, NIS2, space debris mitigation,
              export control, and satellite licensing. Stay ahead of regulatory
              changes affecting the space industry.
            </p>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-12">
            <Link
              href="/blog"
              className="px-4 py-2 rounded-full bg-[#F1F3F5] border border-[#D1D5DB] text-body text-[#111827]"
            >
              All Posts
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={`/blog?category=${encodeURIComponent(category)}`}
                className="px-4 py-2 rounded-full bg-white border border-[#E5E7EB] text-body text-[#4B5563] hover:text-[#111827] hover:border-[#D1D5DB] transition-colors"
              >
                {category}
              </Link>
            ))}
          </div>

          {/* Featured Posts */}
          {featuredPosts.length > 0 && (
            <section className="mb-16">
              <h2 className="text-heading-lg font-medium text-[#111827] mb-6">
                Featured Articles
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {featuredPosts.slice(0, 2).map((post) => (
                  <article key={post.slug}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group block p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#D1D5DB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all"
                    >
                      <div className="flex items-center gap-3 text-small text-[#4B5563] mb-4">
                        <span className="px-2 py-0.5 rounded-full bg-[#F1F3F5]">
                          {post.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {post.readingTime} min read
                        </span>
                      </div>
                      <h3 className="text-heading-lg font-medium text-[#111827] mb-3 group-hover:text-[#111827] transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-body-lg text-[#4B5563] leading-relaxed mb-4 line-clamp-2">
                        {post.description}
                      </p>
                      <div className="flex items-center gap-1 text-body text-[#111827]">
                        Read article <ArrowRight size={14} />
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* All Posts */}
          <section>
            <h2 className="text-heading-lg font-medium text-[#111827] mb-6">
              All Articles
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <article key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#D1D5DB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 text-caption text-[#4B5563] mb-3">
                      <span className="px-2 py-0.5 rounded-full bg-[#F1F3F5]">
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {post.readingTime} min
                      </span>
                    </div>
                    <h3 className="text-title font-medium text-[#111827] mb-2 group-hover:text-[#111827] transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-body text-[#4B5563] leading-relaxed line-clamp-2 mb-4">
                      {post.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-caption text-[#9CA3AF] flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(post.publishedAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                      <span className="text-small text-[#111827] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Read <ArrowRight size={12} />
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>

          {/* Newsletter CTA */}
          <section className="mt-20 p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
            <h2 className="text-display-sm font-medium text-[#111827] mb-3">
              Stay Updated
            </h2>
            <p className="text-subtitle text-[#4B5563] mb-6 max-w-lg mx-auto">
              Get the latest space compliance insights delivered to your inbox.
              No spam, unsubscribe anytime.
            </p>
            <Link
              href="/#newsletter"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#111827] text-white text-body-lg font-medium hover:bg-[#374151] transition-colors"
            >
              Subscribe to Newsletter
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
