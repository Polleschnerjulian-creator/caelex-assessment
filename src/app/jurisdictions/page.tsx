import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { pageMetadata, jurisdictionMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata.jurisdictions;

export const revalidate = 3600;

// Country flag emojis
const countryFlags: Record<string, string> = {
  germany: "DE",
  france: "FR",
  "united-kingdom": "GB",
  luxembourg: "LU",
  netherlands: "NL",
  belgium: "BE",
  austria: "AT",
  denmark: "DK",
  italy: "IT",
  norway: "NO",
  "european-union": "EU",
};

export default function JurisdictionsPage() {
  return (
    <div className="min-h-screen landing-light bg-[#F7F8FA] text-[#111827]">
      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Jurisdictions", href: "/jurisdictions" }]}
            className="mb-8"
          />

          {/* Header */}
          <div className="max-w-3xl mb-16">
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-[#111827] mb-6">
              Space Jurisdictions
            </h1>
            <p className="text-title text-[#4B5563] leading-relaxed">
              Compare space regulations across 10+ European jurisdictions.
              Understand national space laws, licensing requirements, insurance
              mandates, and how they interact with the EU Space Act.
            </p>
          </div>

          {/* EU Section */}
          <div className="mb-12">
            <h2 className="text-heading-lg font-medium text-[#111827] mb-6">
              European Union
            </h2>
            <Link
              href="/jurisdictions/european-union"
              className="block p-6 rounded-xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#D1D5DB] transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#F1F3F5] flex items-center justify-center flex-shrink-0 text-display-sm">
                  EU
                </div>
                <div className="flex-1">
                  <h3 className="text-heading font-medium text-[#111827] mb-2 group-hover:text-[#111827] transition-colors">
                    EU Space Regulation
                  </h3>
                  <p className="text-body-lg text-[#4B5563] mb-3">
                    The EU Space Act and NIS2 Directive — EU-wide frameworks
                    that complement national space laws.
                  </p>
                  <div className="flex items-center gap-2 text-body text-[#111827]">
                    Learn more <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* National Jurisdictions Grid */}
          <div>
            <h2 className="text-heading-lg font-medium text-[#111827] mb-6">
              National Space Laws
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jurisdictionMetadata
                .filter((j) => j.slug !== "european-union")
                .map((jurisdiction) => (
                  <Link
                    key={jurisdiction.slug}
                    href={`/jurisdictions/${jurisdiction.slug}`}
                    className="group p-6 rounded-xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-[#F1F3F5] hover:border-[#D1D5DB] transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#F1F3F5] flex items-center justify-center flex-shrink-0 text-heading-lg font-medium text-[#4B5563]">
                        {countryFlags[jurisdiction.slug] || "??"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-title font-medium text-[#111827] mb-1 group-hover:text-[#111827] transition-colors">
                          {jurisdiction.country}
                        </h3>
                        <p className="text-small text-[#4B5563] mb-2 line-clamp-1">
                          {jurisdiction.spaceLaw}
                        </p>
                        <div className="flex items-center gap-2 text-caption text-[#9CA3AF]">
                          <Building2 size={12} />
                          <span>{jurisdiction.nca}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <h2 className="text-display-sm font-medium text-[#111827] mb-4">
              Not sure which jurisdiction is right for you?
            </h2>
            <p className="text-subtitle text-[#4B5563] mb-8 max-w-xl mx-auto">
              Our assessment analyzes your operations across all jurisdictions
              and recommends the optimal licensing strategy.
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
