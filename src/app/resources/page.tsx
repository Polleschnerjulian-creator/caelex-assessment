import { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  BookText,
  HelpCircle,
  Calendar,
  ArrowRight,
  Newspaper,
  Globe,
  Layers,
} from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getAllPosts, getFeaturedPosts } from "@/content/blog/posts";
import { getAllGuides } from "@/content/guides/guides";
import { getAllTerms } from "@/content/glossary/terms";
import { getAllFaqs } from "@/content/faq/faqs";

export const metadata: Metadata = {
  title: "Resources | Space Compliance Knowledge Hub | Caelex",
  description:
    "Access comprehensive space compliance resources: guides, blog articles, glossary, FAQ, and regulatory timelines. Everything you need to navigate EU Space Act, NIS2, and national space laws.",
};

function getResourceCategories(
  guidesCount: number,
  postsCount: number,
  termsCount: number,
  faqsCount: number,
) {
  return [
    {
      title: "Compliance Guides",
      description:
        "In-depth guides on EU Space Act, NIS2, debris mitigation, and more",
      href: "/guides",
      icon: BookOpen,
      color: "emerald",
      stats: `${guidesCount} comprehensive guides`,
    },
    {
      title: "Blog",
      description: "Latest insights, regulatory updates, and expert analysis",
      href: "/blog",
      icon: Newspaper,
      color: "blue",
      stats: `${postsCount} articles`,
    },
    {
      title: "Glossary",
      description: "Definitions for space compliance terminology and acronyms",
      href: "/glossary",
      icon: BookText,
      color: "purple",
      stats: `${termsCount} terms`,
    },
    {
      title: "Compliance Modules",
      description:
        "Explore our 12 compliance modules for authorization, cybersecurity, and more",
      href: "/modules",
      icon: Layers,
      color: "amber",
      stats: "12 modules",
    },
    {
      title: "Jurisdictions",
      description: "Compare space regulations across European countries",
      href: "/jurisdictions",
      icon: Globe,
      color: "cyan",
      stats: "11 countries",
    },
    {
      title: "FAQ",
      description:
        "Frequently asked questions about space compliance and our platform",
      href: "/resources/faq",
      icon: HelpCircle,
      color: "rose",
      stats: `${faqsCount} questions`,
    },
  ];
}

const colorClasses: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20 hover:border-blue-500/40",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20 hover:border-purple-500/40",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20 hover:border-amber-500/40",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20 hover:border-cyan-500/40",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20 hover:border-rose-500/40",
  },
};

export default function ResourcesPage() {
  const featuredPosts = getFeaturedPosts().slice(0, 3);
  const allGuides = getAllGuides();
  const guides = allGuides.slice(0, 3);
  const terms = getAllTerms();
  const posts = getAllPosts();
  const faqs = getAllFaqs();
  const resourceCategories = getResourceCategories(
    allGuides.length,
    posts.length,
    terms.length,
    faqs.length,
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Resources", href: "/resources" }]}
            className="mb-8"
          />

          {/* Header */}
          <div className="max-w-3xl mb-16">
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-white mb-6">
              Resources
            </h1>
            <p className="text-[17px] text-white/50 leading-relaxed">
              Your comprehensive knowledge hub for space compliance. Access
              guides, articles, glossary terms, and regulatory information to
              navigate EU Space Act, NIS2, and national space laws.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            <div className="p-6 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div className="text-[32px] font-medium text-white">
                {allGuides.length}
              </div>
              <div className="text-[13px] text-white/40">
                Comprehensive Guides
              </div>
            </div>
            <div className="p-6 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div className="text-[32px] font-medium text-white">
                {posts.length}
              </div>
              <div className="text-[13px] text-white/40">Blog Articles</div>
            </div>
            <div className="p-6 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div className="text-[32px] font-medium text-white">
                {terms.length}
              </div>
              <div className="text-[13px] text-white/40">Glossary Terms</div>
            </div>
            <div className="p-6 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div className="text-[32px] font-medium text-white">
                {faqs.length}
              </div>
              <div className="text-[13px] text-white/40">FAQ Questions</div>
            </div>
          </div>

          {/* Resource Categories Grid */}
          <section className="mb-20">
            <h2 className="text-[24px] font-medium text-white mb-8">
              Browse by Category
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resourceCategories.map((category) => {
                const Icon = category.icon;
                const colors = colorClasses[category.color];

                return (
                  <Link
                    key={category.href}
                    href={category.href}
                    className={`group p-6 rounded-2xl bg-white/[0.04] border ${colors.border} transition-all duration-300 hover:bg-white/[0.06]`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon size={24} className={colors.text} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-[18px] font-medium text-white mb-2 group-hover:text-emerald-400 transition-colors">
                          {category.title}
                        </h3>
                        <p className="text-[13px] text-white/40 leading-relaxed mb-3">
                          {category.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-white/30">
                            {category.stats}
                          </span>
                          <span className="text-[12px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            Explore <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Featured Guides */}
          <section className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[24px] font-medium text-white">
                Featured Guides
              </h2>
              <Link
                href="/guides"
                className="text-[13px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
              >
                View all guides <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {guides.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/guides/${guide.slug}`}
                  className="group p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-center gap-2 text-[11px] text-emerald-400/70 mb-3">
                    <BookOpen size={12} />
                    <span>{guide.readingTime} min read</span>
                  </div>
                  <h3 className="text-[16px] font-medium text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {guide.title}
                  </h3>
                  <p className="text-[13px] text-white/40 line-clamp-2">
                    {guide.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Latest Articles */}
          <section className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[24px] font-medium text-white">
                Latest Articles
              </h2>
              <Link
                href="/blog"
                className="text-[13px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                View all articles <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group p-6 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
                >
                  <div className="flex items-center gap-2 text-[11px] text-white/40 mb-3">
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                      {post.category}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-medium text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-[13px] text-white/40 line-clamp-2">
                    {post.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Quick Links */}
          <section className="p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            <h2 className="text-[20px] font-medium text-white mb-6">
              Quick Links
            </h2>
            <div className="grid md:grid-cols-4 gap-4">
              <Link
                href="/assessment"
                className="p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors group"
              >
                <div className="text-[14px] text-white group-hover:text-emerald-400 transition-colors">
                  Start Assessment
                </div>
                <div className="text-[12px] text-white/40">
                  Get your compliance profile
                </div>
              </Link>
              <Link
                href="/demo"
                className="p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors group"
              >
                <div className="text-[14px] text-white group-hover:text-emerald-400 transition-colors">
                  Request Demo
                </div>
                <div className="text-[12px] text-white/40">
                  See the platform in action
                </div>
              </Link>
              <Link
                href="/pricing"
                className="p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors group"
              >
                <div className="text-[14px] text-white group-hover:text-emerald-400 transition-colors">
                  Pricing
                </div>
                <div className="text-[12px] text-white/40">
                  Plans for every operator
                </div>
              </Link>
              <Link
                href="/contact"
                className="p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors group"
              >
                <div className="text-[14px] text-white group-hover:text-emerald-400 transition-colors">
                  Contact
                </div>
                <div className="text-[12px] text-white/40">
                  Get in touch with us
                </div>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
