import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { pageMetadata, jurisdictionMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata.jurisdictions;

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
    <div className="min-h-screen bg-black text-white">
      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Jurisdictions", href: "/jurisdictions" }]}
            className="mb-8"
          />

          {/* Header */}
          <div className="max-w-3xl mb-16">
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-white mb-6">
              Space Jurisdictions
            </h1>
            <p className="text-[17px] text-white/50 leading-relaxed">
              Compare space regulations across 10+ European jurisdictions.
              Understand national space laws, licensing requirements, insurance
              mandates, and how they interact with the EU Space Act.
            </p>
          </div>

          {/* EU Section */}
          <div className="mb-12">
            <h2 className="text-[20px] font-medium text-white mb-6">
              European Union
            </h2>
            <Link
              href="/jurisdictions/european-union"
              className="block p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-[24px]">
                  EU
                </div>
                <div className="flex-1">
                  <h3 className="text-[18px] font-medium text-white mb-2 group-hover:text-emerald-400 transition-colors">
                    EU Space Regulation
                  </h3>
                  <p className="text-[14px] text-white/50 mb-3">
                    The EU Space Act and NIS2 Directive — EU-wide frameworks
                    that complement national space laws.
                  </p>
                  <div className="flex items-center gap-2 text-[13px] text-emerald-400">
                    Learn more <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* National Jurisdictions Grid */}
          <div>
            <h2 className="text-[20px] font-medium text-white mb-6">
              National Space Laws
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jurisdictionMetadata
                .filter((j) => j.slug !== "european-union")
                .map((jurisdiction) => (
                  <Link
                    key={jurisdiction.slug}
                    href={`/jurisdictions/${jurisdiction.slug}`}
                    className="group p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0 text-[20px] font-medium text-white/60">
                        {countryFlags[jurisdiction.slug] || "??"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] font-medium text-white mb-1 group-hover:text-emerald-400 transition-colors">
                          {jurisdiction.country}
                        </h3>
                        <p className="text-[12px] text-white/40 mb-2 line-clamp-1">
                          {jurisdiction.spaceLaw}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-white/30">
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
            <h2 className="text-[24px] font-medium text-white mb-4">
              Not sure which jurisdiction is right for you?
            </h2>
            <p className="text-[15px] text-white/50 mb-8 max-w-xl mx-auto">
              Our assessment analyzes your operations across all jurisdictions
              and recommends the optimal licensing strategy.
            </p>
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black text-[14px] font-medium hover:bg-white/90 transition-all"
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
