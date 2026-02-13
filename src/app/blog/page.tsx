import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Calendar, Tag } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
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
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Blog", href: "/blog" }]}
            className="mb-8"
          />

          {/* Header */}
          <div className="max-w-3xl mb-16">
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-white mb-6">
              Space Compliance Blog
            </h1>
            <p className="text-[17px] text-white/50 leading-relaxed">
              Expert insights on EU Space Act, NIS2, space debris mitigation,
              export control, and satellite licensing. Stay ahead of regulatory
              changes affecting the space industry.
            </p>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-12">
            <Link
              href="/blog"
              className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[13px] text-emerald-400"
            >
              All Posts
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={`/blog?category=${encodeURIComponent(category)}`}
                className="px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-[13px] text-white/60 hover:text-white hover:border-white/20 transition-colors"
              >
                {category}
              </Link>
            ))}
          </div>

          {/* Featured Posts */}
          {featuredPosts.length > 0 && (
            <section className="mb-16">
              <h2 className="text-[20px] font-medium text-white mb-6">
                Featured Articles
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {featuredPosts.slice(0, 2).map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
                  >
                    <div className="flex items-center gap-3 text-[12px] text-emerald-400/70 mb-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20">
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {post.readingTime} min read
                      </span>
                    </div>
                    <h3 className="text-[20px] font-medium text-white mb-3 group-hover:text-emerald-400 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-[14px] text-white/50 leading-relaxed mb-4 line-clamp-2">
                      {post.description}
                    </p>
                    <div className="flex items-center gap-1 text-[13px] text-emerald-400">
                      Read article <ArrowRight size={14} />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* All Posts */}
          <section>
            <h2 className="text-[20px] font-medium text-white mb-6">
              All Articles
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
                >
                  <div className="flex items-center gap-3 text-[11px] text-white/40 mb-3">
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.08]">
                      {post.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {post.readingTime} min
                    </span>
                  </div>
                  <h3 className="text-[16px] font-medium text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-[13px] text-white/40 leading-relaxed line-clamp-2 mb-4">
                    {post.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/30 flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(post.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-[12px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Read <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Newsletter CTA */}
          <section className="mt-20 p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-center">
            <h2 className="text-[24px] font-medium text-white mb-3">
              Stay Updated
            </h2>
            <p className="text-[15px] text-white/50 mb-6 max-w-lg mx-auto">
              Get the latest space compliance insights delivered to your inbox.
              No spam, unsubscribe anytime.
            </p>
            <Link
              href="/#newsletter"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 text-white text-[14px] font-medium hover:bg-emerald-400 transition-colors"
            >
              Subscribe to Newsletter
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
