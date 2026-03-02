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

export const revalidate = 3600;

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
      color: "emerald",
      stats: `${postsCount} articles`,
    },
    {
      title: "Glossary",
      description: "Definitions for space compliance terminology and acronyms",
      href: "/glossary",
      icon: BookText,
      color: "emerald",
      stats: `${termsCount} terms`,
    },
    {
      title: "Compliance Modules",
      description:
        "Explore our 12 compliance modules for authorization, cybersecurity, and more",
      href: "/modules",
      icon: Layers,
      color: "emerald",
      stats: "12 modules",
    },
    {
      title: "Jurisdictions",
      description: "Compare space regulations across European countries",
      href: "/jurisdictions",
      icon: Globe,
      color: "emerald",
      stats: "11 countries",
    },
    {
      title: "FAQ",
      description:
        "Frequently asked questions about space compliance and our platform",
      href: "/resources/faq",
      icon: HelpCircle,
      color: "emerald",
      stats: `${faqsCount} questions`,
    },
  ];
}

const colorClasses: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  emerald: {
    bg: "bg-[#F1F3F5]",
    text: "text-[#111827]",
    border: "border-[#E5E7EB] hover:border-[#D1D5DB]",
  },
  blue: {
    bg: "bg-[#F1F3F5]",
    text: "text-[#111827]",
    border: "border-[#E5E7EB] hover:border-[#D1D5DB]",
  },
  purple: {
    bg: "bg-[#F1F3F5]",
    text: "text-[#111827]",
    border: "border-[#E5E7EB] hover:border-[#D1D5DB]",
  },
  amber: {
    bg: "bg-[#F1F3F5]",
    text: "text-[#111827]",
    border: "border-[#E5E7EB] hover:border-[#D1D5DB]",
  },
  cyan: {
    bg: "bg-[#F1F3F5]",
    text: "text-[#111827]",
    border: "border-[#E5E7EB] hover:border-[#D1D5DB]",
  },
  rose: {
    bg: "bg-[#F1F3F5]",
    text: "text-[#111827]",
    border: "border-[#E5E7EB] hover:border-[#D1D5DB]",
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
    <div className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Resources", href: "/resources" }]}
            className="mb-8"
          />

          {/* Header */}
          <div className="max-w-3xl mb-16">
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-[#111827] mb-6">
              Resources
            </h1>
            <p className="text-title text-[#4B5563] leading-relaxed">
              Your comprehensive knowledge hub for space compliance. Access
              guides, articles, glossary terms, and regulatory information to
              navigate EU Space Act, NIS2, and national space laws.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            <div className="p-6 rounded-xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="text-display font-medium text-[#111827]">
                {allGuides.length}
              </div>
              <div className="text-body text-[#4B5563]">
                Comprehensive Guides
              </div>
            </div>
            <div className="p-6 rounded-xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="text-display font-medium text-[#111827]">
                {posts.length}
              </div>
              <div className="text-body text-[#4B5563]">Blog Articles</div>
            </div>
            <div className="p-6 rounded-xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="text-display font-medium text-[#111827]">
                {terms.length}
              </div>
              <div className="text-body text-[#4B5563]">Glossary Terms</div>
            </div>
            <div className="p-6 rounded-xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="text-display font-medium text-[#111827]">
                {faqs.length}
              </div>
              <div className="text-body text-[#4B5563]">FAQ Questions</div>
            </div>
          </div>

          {/* Resource Categories Grid */}
          <section className="mb-20">
            <h2 className="text-display-sm font-medium text-[#111827] mb-8">
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
                    className={`group p-6 rounded-2xl bg-white border ${colors.border} shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon size={24} className={colors.text} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-heading font-medium text-[#111827] mb-2 group-hover:text-[#111827] transition-colors">
                          {category.title}
                        </h3>
                        <p className="text-body text-[#4B5563] leading-relaxed mb-3">
                          {category.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-small text-[#9CA3AF]">
                            {category.stats}
                          </span>
                          <span className="text-small text-[#111827] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
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
              <h2 className="text-display-sm font-medium text-[#111827]">
                Featured Guides
              </h2>
              <Link
                href="/guides"
                className="text-body text-[#111827] hover:text-[#111827] transition-colors flex items-center gap-1"
              >
                View all guides <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {guides.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/guides/${guide.slug}`}
                  className="group p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#D1D5DB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all"
                >
                  <div className="flex items-center gap-2 text-caption text-[#4B5563] mb-3">
                    <BookOpen size={12} />
                    <span>{guide.readingTime} min read</span>
                  </div>
                  <h3 className="text-title font-medium text-[#111827] mb-2 group-hover:text-[#111827] transition-colors line-clamp-2">
                    {guide.title}
                  </h3>
                  <p className="text-body text-[#4B5563] line-clamp-2">
                    {guide.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Latest Articles */}
          <section className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-display-sm font-medium text-[#111827]">
                Latest Articles
              </h2>
              <Link
                href="/blog"
                className="text-body text-[#111827] hover:text-[#111827] transition-colors flex items-center gap-1"
              >
                View all articles <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#D1D5DB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all"
                >
                  <div className="flex items-center gap-2 text-caption text-[#4B5563] mb-3">
                    <span className="px-2 py-0.5 rounded-full bg-[#F1F3F5] text-[#111827]">
                      {post.category}
                    </span>
                  </div>
                  <h3 className="text-title font-medium text-[#111827] mb-2 group-hover:text-[#111827] transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-body text-[#4B5563] line-clamp-2">
                    {post.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Quick Links */}
          <section className="p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h2 className="text-heading-lg font-medium text-[#111827] mb-6">
              Quick Links
            </h2>
            <div className="grid md:grid-cols-4 gap-4">
              <Link
                href="/assessment"
                className="p-4 rounded-xl bg-[#F1F3F5] hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-colors group"
              >
                <div className="text-body-lg text-[#111827] group-hover:text-[#111827] transition-colors">
                  Start Assessment
                </div>
                <div className="text-small text-[#4B5563]">
                  Get your compliance profile
                </div>
              </Link>
              <Link
                href="/demo"
                className="p-4 rounded-xl bg-[#F1F3F5] hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-colors group"
              >
                <div className="text-body-lg text-[#111827] group-hover:text-[#111827] transition-colors">
                  Request Demo
                </div>
                <div className="text-small text-[#4B5563]">
                  See the platform in action
                </div>
              </Link>
              <Link
                href="/pricing"
                className="p-4 rounded-xl bg-[#F1F3F5] hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-colors group"
              >
                <div className="text-body-lg text-[#111827] group-hover:text-[#111827] transition-colors">
                  Pricing
                </div>
                <div className="text-small text-[#4B5563]">
                  Plans for every operator
                </div>
              </Link>
              <Link
                href="/contact"
                className="p-4 rounded-xl bg-[#F1F3F5] hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-colors group"
              >
                <div className="text-body-lg text-[#111827] group-hover:text-[#111827] transition-colors">
                  Contact
                </div>
                <div className="text-small text-[#4B5563]">
                  Get in touch with us
                </div>
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
