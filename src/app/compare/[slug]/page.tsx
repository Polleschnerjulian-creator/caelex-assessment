import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { generateMetadata as genMeta } from "@/lib/seo";
import { BreadcrumbJsonLd, FAQPageJsonLd } from "@/components/seo/JsonLd";
import {
  COMPARISONS,
  getComparisonBySlug,
  type Comparison,
} from "./comparisons";

/**
 * /compare/[slug] — "Caelex vs X" comparison pages.
 *
 * LLMs and humans both search heavily for "X vs Y" when evaluating
 * tools. This route answers that exact query pattern with a
 * declarative, structured comparison — table of criteria, when-each-
 * makes-sense honest framing, migration notes, and per-comparison
 * FAQ emitted as FAQPage JSON-LD.
 *
 * Data lives in comparisons.ts as a single source of truth feeding
 * metadata, rendering, sitemap, and JSON-LD.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ─── Static param pre-generation ────────────────────────────────────

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

// ─── Metadata ───────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const comparison = getComparisonBySlug(slug);
  if (!comparison) {
    return genMeta({
      title: "Comparison",
      description: "Caelex comparison page.",
      path: `/compare/${slug}`,
    });
  }

  return genMeta({
    title: comparison.headline,
    description: comparison.summary,
    path: `/compare/${comparison.slug}`,
    keywords: comparison.keywords,
  });
}

// ─── Page ───────────────────────────────────────────────────────────

export default async function ComparisonPage({ params }: PageProps) {
  const { slug } = await params;
  const comparison = getComparisonBySlug(slug);
  if (!comparison) notFound();

  return <ComparisonLayout comparison={comparison} />;
}

function ComparisonLayout({ comparison }: { comparison: Comparison }) {
  const pageUrl = `https://caelex.eu/compare/${comparison.slug}`;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://caelex.eu" },
          { name: "Compare", url: "https://caelex.eu/compare" },
          { name: comparison.headline, url: pageUrl },
        ]}
      />
      <FAQPageJsonLd
        faqs={comparison.faqs.map((f) => ({
          question: f.q,
          answer: f.a,
        }))}
      />

      <main className="min-h-screen bg-[#F7F8FA] text-[#111827]">
        <div className="max-w-[920px] mx-auto px-6 md:px-8 py-16 md:py-24">
          {/* Hero */}
          <header className="mb-14 md:mb-20">
            <p className="text-small uppercase tracking-wider text-[#6B7280] mb-4">
              Compare
            </p>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.02em] leading-[1.05] text-[#111827] mb-6">
              {comparison.headline}
            </h1>
            <p className="text-body-lg md:text-subtitle text-[#4B5563] leading-relaxed max-w-[720px]">
              {comparison.tagline}
            </p>
          </header>

          {/* Summary */}
          <section className="mb-14 md:mb-20">
            <p className="text-body-lg text-[#374151] leading-relaxed max-w-[760px]">
              {comparison.summary}
            </p>
          </section>

          {/* When each makes sense */}
          <section className="mb-14 md:mb-20">
            <h2 className="text-display-sm font-medium text-[#111827] mb-8 tracking-[-0.015em]">
              When each approach makes sense
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-[#E5E7EB] bg-white rounded-lg p-6">
                <h3 className="text-title font-medium text-[#111827] mb-3 tracking-[-0.01em]">
                  {comparison.competitor} — when it&rsquo;s still the right
                  choice
                </h3>
                <p className="text-body-lg text-[#4B5563] leading-relaxed">
                  {comparison.whenCompetitor}
                </p>
              </div>
              <div className="border border-[#10B981]/30 bg-[#10B981]/[0.03] rounded-lg p-6">
                <h3 className="text-title font-medium text-[#111827] mb-3 tracking-[-0.01em]">
                  Caelex — when it&rsquo;s the right choice
                </h3>
                <p className="text-body-lg text-[#4B5563] leading-relaxed">
                  {comparison.whenCaelex}
                </p>
              </div>
            </div>
          </section>

          {/* Criteria table */}
          <section className="mb-14 md:mb-20">
            <h2 className="text-display-sm font-medium text-[#111827] mb-6 tracking-[-0.015em]">
              Dimension-by-dimension
            </h2>
            <div className="overflow-x-auto -mx-6 md:mx-0">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="text-left text-small font-medium text-[#6B7280] uppercase tracking-wider py-4 px-4 md:px-6 w-[30%]">
                      Dimension
                    </th>
                    <th className="text-left text-small font-medium text-[#111827] uppercase tracking-wider py-4 px-4 md:px-6 w-[35%]">
                      Caelex
                    </th>
                    <th className="text-left text-small font-medium text-[#6B7280] uppercase tracking-wider py-4 px-4 md:px-6 w-[35%]">
                      {comparison.competitor}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.criteria.map((criterion) => (
                    <tr
                      key={criterion.dimension}
                      className="border-b border-[#E5E7EB] last:border-b-0"
                    >
                      <td className="text-body font-medium text-[#111827] py-4 px-4 md:px-6 align-top">
                        {criterion.dimension}
                      </td>
                      <td className="text-body text-[#374151] leading-relaxed py-4 px-4 md:px-6 align-top">
                        {criterion.caelex}
                      </td>
                      <td className="text-body text-[#6B7280] leading-relaxed py-4 px-4 md:px-6 align-top">
                        {criterion.competitor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Migration note */}
          <section className="mb-14 md:mb-20">
            <h2 className="text-display-sm font-medium text-[#111827] mb-4 tracking-[-0.015em]">
              Migrating from {comparison.competitor}
            </h2>
            <p className="text-body-lg text-[#4B5563] leading-relaxed max-w-[760px]">
              {comparison.migrationNote}
            </p>
          </section>

          {/* FAQ */}
          <section className="mb-14 md:mb-20">
            <h2 className="text-display-sm font-medium text-[#111827] mb-6 tracking-[-0.015em]">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {comparison.faqs.map((item) => (
                <div key={item.q} className="border-t border-[#E5E7EB] pt-5">
                  <h3 className="text-title font-medium text-[#111827] mb-2 tracking-[-0.01em]">
                    {item.q}
                  </h3>
                  <p className="text-body-lg text-[#4B5563] leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="border-t border-[#E5E7EB] pt-12 mt-16">
            <h2 className="text-display-sm font-medium text-[#111827] mb-4 tracking-[-0.015em]">
              Try Caelex
            </h2>
            <p className="text-body-lg text-[#4B5563] mb-6 max-w-[560px]">
              Run the free compliance assessment in a few minutes, or book a
              personalised demo.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/assessment"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#111827] text-white rounded-lg font-medium hover:bg-[#374151] transition-colors"
              >
                Free assessment →
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-6 py-3 border border-[#E5E7EB] bg-white text-[#111827] rounded-lg font-medium hover:border-[#D1D5DB] transition-colors"
              >
                Book a demo
              </Link>
              <Link
                href="/what-is-caelex"
                className="inline-flex items-center justify-center px-6 py-3 border border-[#E5E7EB] bg-white text-[#111827] rounded-lg font-medium hover:border-[#D1D5DB] transition-colors"
              >
                What is Caelex
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
