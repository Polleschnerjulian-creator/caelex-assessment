import { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  Globe,
  Trash2,
  Leaf,
  Umbrella,
  Eye,
  FileCheck,
  Radio,
  Lock,
  Users,
  Flag,
  Building2,
  ArrowRight,
  LucideIcon,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { pageMetadata, moduleMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata.modules;

const moduleIcons: Record<string, LucideIcon> = {
  authorization: Shield,
  cybersecurity: Lock,
  "debris-mitigation": Trash2,
  environmental: Leaf,
  insurance: Umbrella,
  supervision: Eye,
  "export-control": FileCheck,
  spectrum: Radio,
  nis2: Shield,
  "copuos-iadc": Users,
  "uk-space-act": Flag,
  "us-regulatory": Building2,
};

export default function ModulesPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Modules", href: "/modules" }]}
            className="mb-8"
          />

          {/* Header */}
          <div className="max-w-3xl mb-16">
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-white mb-6">
              Compliance Modules
            </h1>
            <p className="text-[17px] text-white/50 leading-relaxed">
              12 specialized modules covering every aspect of space regulatory
              compliance — from authorization and licensing to cybersecurity,
              debris mitigation, and export control.
            </p>
          </div>

          {/* Modules Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {moduleMetadata.map((module) => {
              const Icon = moduleIcons[module.slug] || Globe;

              return (
                <Link
                  key={module.slug}
                  href={`/modules/${module.slug}`}
                  className="group p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={24} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[16px] font-medium text-white mb-2 group-hover:text-emerald-400 transition-colors">
                        {module.title}
                      </h2>
                      <p className="text-[13px] text-white/40 leading-relaxed line-clamp-2">
                        {module.description}
                      </p>

                      {/* Jurisdictions Preview */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {module.jurisdictions.slice(0, 3).map((j) => (
                          <span
                            key={j}
                            className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-white/40"
                          >
                            {j}
                          </span>
                        ))}
                        {module.jurisdictions.length > 3 && (
                          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-white/40">
                            +{module.jurisdictions.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-4 text-[13px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn more
                    <ArrowRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <h2 className="text-[24px] font-medium text-white mb-4">
              Not sure which modules apply to you?
            </h2>
            <p className="text-[15px] text-white/50 mb-8 max-w-xl mx-auto">
              Take our free compliance assessment to get a personalized
              regulatory profile across all relevant frameworks.
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
