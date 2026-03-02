import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { pageMetadata } from "@/lib/seo";
import { getAllGuides } from "@/content/guides/guides";

export const metadata: Metadata = pageMetadata.guides;

export const revalidate = 3600;

export default function GuidesPage() {
  const guides = getAllGuides();

  return (
    <div className="min-h-screen landing-light bg-[#F7F8FA] text-[#111827]">
      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Guides", href: "/guides" }]}
            className="mb-8"
          />

          {/* Header */}
          <div className="max-w-3xl mb-16">
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-[#111827] mb-6">
              Compliance Guides
            </h1>
            <p className="text-title text-[#4B5563] leading-relaxed">
              In-depth guides on EU Space Act, NIS2 Directive, space debris
              mitigation, export control, and satellite licensing. Expert
              knowledge for space operators navigating complex regulations.
            </p>
          </div>

          {/* Guides Grid */}
          <div className="space-y-6">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="block group p-8 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F1F3F5] hover:border-[#D1D5DB] transition-all duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-xl bg-[#F1F3F5] flex items-center justify-center flex-shrink-0">
                    <BookOpen size={28} className="text-[#111827]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 text-small text-[#4B5563] mb-3">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {guide.readingTime} min read
                      </span>
                      <span>Comprehensive Guide</span>
                    </div>
                    <h2 className="text-heading-lg font-medium text-[#111827] mb-3 group-hover:text-[#111827] transition-colors">
                      {guide.title}
                    </h2>
                    <p className="text-subtitle text-[#4B5563] leading-relaxed mb-4">
                      {guide.description}
                    </p>
                    <div className="flex items-center gap-1 text-body-lg text-[#111827]">
                      Read guide <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <h2 className="text-display-sm font-medium text-[#111827] mb-4">
              Need personalized guidance?
            </h2>
            <p className="text-subtitle text-[#4B5563] mb-8 max-w-xl mx-auto">
              Our AI-powered assessment analyzes your specific situation and
              provides tailored compliance recommendations.
            </p>
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#111827] text-white text-body-lg font-medium hover:bg-[#374151] transition-all"
            >
              Start Free Assessment
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
