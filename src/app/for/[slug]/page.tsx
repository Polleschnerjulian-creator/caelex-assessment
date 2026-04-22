import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { generateMetadata as genMeta } from "@/lib/seo";
import { BreadcrumbJsonLd, FAQPageJsonLd } from "@/components/seo/JsonLd";
import { PERSONAS, getPersonaBySlug, type Persona } from "./personas";

/**
 * /for/[slug] — persona landing pages for LLM + search discovery.
 *
 * Each page answers the user query "does Caelex help [persona]?"
 * with a declarative, citable structure: hero → core regimes →
 * recommended products → workflow → FAQ. The FAQ block ships as
 * both rendered HTML and FAQPage JSON-LD so AI Overviews, AI
 * Search (Perplexity, ChatGPT Search), and LLM-driven answer boxes
 * can all surface the right content.
 *
 * Personas live in personas.ts — a single source of truth feeding
 * metadata, rendering, and sitemap generation.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ─── Static params — pre-generates a route per persona ───────────────

export function generateStaticParams() {
  return PERSONAS.map((p) => ({ slug: p.slug }));
}

// ─── Metadata (per-persona SEO + Open Graph) ─────────────────────────

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const persona = getPersonaBySlug(slug);
  if (!persona) {
    return genMeta({
      title: "Persona",
      description: "Caelex persona page.",
      path: `/for/${slug}`,
    });
  }

  return genMeta({
    title: `Caelex for ${persona.label.toLowerCase()}`,
    description: persona.summary,
    path: `/for/${persona.slug}`,
    keywords: persona.keywords,
  });
}

// ─── Page ────────────────────────────────────────────────────────────

export default async function PersonaPage({ params }: PageProps) {
  const { slug } = await params;
  const persona = getPersonaBySlug(slug);
  if (!persona) notFound();

  return <PersonaLanding persona={persona} />;
}

function PersonaLanding({ persona }: { persona: Persona }) {
  const pageUrl = `https://caelex.eu/for/${persona.slug}`;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://caelex.eu" },
          { name: "For", url: "https://caelex.eu/for" },
          { name: persona.label, url: pageUrl },
        ]}
      />
      <FAQPageJsonLd
        faqs={persona.faqs.map((f) => ({ question: f.q, answer: f.a }))}
      />

      <main className="min-h-screen bg-[#F7F8FA] text-[#111827]">
        <div className="max-w-[880px] mx-auto px-6 md:px-8 py-16 md:py-24">
          {/* Hero — direct answer to the persona query */}
          <header className="mb-14 md:mb-20">
            <p className="text-small uppercase tracking-wider text-[#6B7280] mb-4">
              Caelex for {persona.label.toLowerCase()}
            </p>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.02em] leading-[1.05] text-[#111827] mb-6">
              {persona.tagline}
            </h1>
            <p className="text-body-lg md:text-subtitle text-[#4B5563] leading-relaxed max-w-[700px]">
              {persona.summary}
            </p>
          </header>

          {/* Core regimes */}
          <section className="mb-14 md:mb-20">
            <h2 className="text-display-sm font-medium text-[#111827] mb-6 tracking-[-0.015em]">
              Regimes you&rsquo;ll interact with
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {persona.coreRegimes.map((regime) => (
                <Link
                  key={regime.name}
                  href={regime.href}
                  className="group block border border-[#E5E7EB] bg-white rounded-lg p-5 hover:border-[#D1D5DB] transition-colors"
                >
                  <h3 className="text-body-lg font-medium text-[#111827] mb-2 group-hover:text-[#10B981] transition-colors">
                    {regime.name} →
                  </h3>
                  <p className="text-body text-[#4B5563] leading-relaxed">
                    {regime.blurb}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Recommended products */}
          <section className="mb-14 md:mb-20">
            <h2 className="text-display-sm font-medium text-[#111827] mb-6 tracking-[-0.015em]">
              Which Caelex products fit
            </h2>
            <div className="space-y-5">
              {persona.products.map((product) => (
                <Link
                  key={product.name}
                  href={product.href}
                  className="group block border-t border-[#E5E7EB] pt-5 hover:border-[#D1D5DB] transition-colors"
                >
                  <h3 className="text-title font-medium text-[#111827] mb-2 tracking-[-0.01em] group-hover:text-[#10B981] transition-colors">
                    {product.name} →
                  </h3>
                  <p className="text-body-lg text-[#4B5563] leading-relaxed max-w-[720px]">
                    {product.blurb}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Workflow */}
          <section className="mb-14 md:mb-20">
            <h2 className="text-display-sm font-medium text-[#111827] mb-6 tracking-[-0.015em]">
              How it works
            </h2>
            <ol className="space-y-6">
              {persona.workflow.map((step) => (
                <li key={step.step} className="border-t border-[#E5E7EB] pt-5">
                  <h3 className="text-title font-medium text-[#111827] mb-2 tracking-[-0.01em]">
                    {step.step}
                  </h3>
                  <p className="text-body-lg text-[#4B5563] leading-relaxed max-w-[720px]">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* FAQ */}
          <section className="mb-14 md:mb-20">
            <h2 className="text-display-sm font-medium text-[#111827] mb-6 tracking-[-0.015em]">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {persona.faqs.map((item) => (
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

          {/* CTA — route to whichever product makes most sense for this persona */}
          <section className="border-t border-[#E5E7EB] pt-12 mt-16">
            <h2 className="text-display-sm font-medium text-[#111827] mb-4 tracking-[-0.015em]">
              Next step
            </h2>
            <p className="text-body-lg text-[#4B5563] mb-6 max-w-[560px]">
              {persona.slug === "law-firms"
                ? "Book the Atlas intro call. 30 minutes, free, no commitment."
                : "Run the free compliance assessment or book a personalised demo."}
            </p>
            <div className="flex flex-wrap gap-4">
              {persona.slug === "law-firms" ? (
                <Link
                  href="/atlas-access"
                  className="inline-flex items-center justify-center px-6 py-3 bg-[#111827] text-white rounded-lg font-medium hover:bg-[#374151] transition-colors"
                >
                  Book Atlas intro →
                </Link>
              ) : (
                <>
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
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
