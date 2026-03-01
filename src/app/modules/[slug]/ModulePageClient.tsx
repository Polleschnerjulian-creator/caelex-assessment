"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  FileText,
  Sparkles,
} from "lucide-react";
import type { UnifiedModuleData } from "@/data/module-page-data";

// ============================================================================
// TYPES
// ============================================================================

interface ModulePageClientProps {
  module: UnifiedModuleData;
  prevModule: UnifiedModuleData | null;
  nextModule: UnifiedModuleData | null;
}

// ============================================================================
// SCROLL-TRIGGERED SECTION WRAPPER
// ============================================================================

function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ModulePageClient({
  module: mod,
  prevModule,
  nextModule,
}: ModulePageClientProps) {
  const totalModules = 14;

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="pt-32 pb-0">
        <div className="max-w-[900px] mx-auto px-6 md:px-12">
          {/* ─────────────────────────────────────────────────────────────
             1. BREADCRUMBS
          ───────────────────────────────────────────────────────────── */}
          <motion.nav
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-body text-white/45 mb-12"
          >
            <Link href="/" className="hover:text-white/70 transition-colors">
              Home
            </Link>
            <ChevronRight size={12} className="text-white/20" />
            <Link
              href="/#modules"
              className="hover:text-white/70 transition-colors"
            >
              Modules
            </Link>
            <ChevronRight size={12} className="text-white/20" />
            <span className="text-white/70">{mod.name}</span>
          </motion.nav>

          {/* ─────────────────────────────────────────────────────────────
             2. HERO
          ───────────────────────────────────────────────────────────── */}
          <section className="mb-16">
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <span className="text-caption uppercase tracking-[0.3em] text-emerald-500/50 block mb-4">
                Module {mod.id} of {String(totalModules).padStart(2, "0")}
              </span>
              <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-light tracking-[-0.03em] leading-[1.1] text-white mb-6">
                {mod.name}
              </h1>
            </motion.div>

            <motion.p
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-heading md:text-heading-lg text-white/45 font-light leading-[1.5] max-w-[650px] mb-8"
            >
              {mod.headline}
            </motion.p>

            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <span className="inline-block text-caption text-white/30 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-full">
                {mod.articleRange}
              </span>
            </motion.div>
          </section>

          {/* ─────────────────────────────────────────────────────────────
             3. OVERVIEW
          ───────────────────────────────────────────────────────────── */}
          <RevealSection className="mb-20">
            <div className="w-16 h-[1px] bg-white/[0.1] mb-8" />
            <p className="text-subtitle text-white/45 leading-[1.8] max-w-[700px]">
              {mod.overview}
            </p>
          </RevealSection>

          {/* ─────────────────────────────────────────────────────────────
             4. REGULATORY CONTEXT
          ───────────────────────────────────────────────────────────── */}
          {(mod.seo.regulations.length > 0 ||
            mod.seo.jurisdictions.length > 0) && (
            <RevealSection className="mb-20">
              <span className="text-micro uppercase tracking-[0.25em] text-white/25 block mb-6">
                Regulatory Context
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Regulations */}
                {mod.seo.regulations.length > 0 && (
                  <div>
                    <h2 className="text-body-lg font-medium text-white/70 mb-4">
                      Regulations
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {mod.seo.regulations.map((reg) => (
                        <span
                          key={reg}
                          className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-small text-white/45"
                        >
                          {reg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Jurisdictions */}
                {mod.seo.jurisdictions.length > 0 && (
                  <div>
                    <h2 className="text-body-lg font-medium text-white/70 mb-4">
                      Jurisdictions
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {mod.seo.jurisdictions.map((j) => (
                        <span
                          key={j}
                          className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-small text-emerald-400/80"
                        >
                          {j}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </RevealSection>
          )}

          {/* ─────────────────────────────────────────────────────────────
             5. KEY CAPABILITIES — 2x2 Glass Cards
          ───────────────────────────────────────────────────────────── */}
          <RevealSection className="mb-20">
            <span className="text-micro uppercase tracking-[0.25em] text-white/25 block mb-4">
              Key Capabilities
            </span>
            <h2 className="text-[clamp(1.25rem,3vw,1.75rem)] font-light text-white tracking-[-0.01em] mb-10">
              What this module does
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {mod.keyCapabilities.map((cap, i) => (
                <RevealSection
                  key={cap.title}
                  delay={0.1 + i * 0.06}
                  className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-500"
                >
                  <h3 className="text-subtitle font-medium text-white mb-3">
                    {cap.title}
                  </h3>
                  <p className="text-body text-white/45 leading-[1.7]">
                    {cap.description}
                  </p>
                </RevealSection>
              ))}
            </div>
          </RevealSection>

          {/* ─────────────────────────────────────────────────────────────
             6. ASSESSMENT CHECKLIST
          ───────────────────────────────────────────────────────────── */}
          {mod.assessmentIncludes.length > 0 && (
            <RevealSection className="mb-20">
              <span className="text-micro uppercase tracking-[0.25em] text-white/25 block mb-4">
                Assessment
              </span>
              <h2 className="text-[clamp(1.25rem,3vw,1.75rem)] font-light text-white tracking-[-0.01em] mb-8">
                What the assessment includes
              </h2>
              <ul className="space-y-4">
                {mod.assessmentIncludes.map((item, i) => (
                  <RevealSection
                    key={item}
                    delay={0.1 + i * 0.06}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle
                      size={16}
                      className="text-emerald-500 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-body-lg text-white/45 leading-[1.6]">
                      {item}
                    </span>
                  </RevealSection>
                ))}
              </ul>
            </RevealSection>
          )}

          {/* ─────────────────────────────────────────────────────────────
             7. DOCUMENTS
          ───────────────────────────────────────────────────────────── */}
          {mod.documentsGenerated.length > 0 && (
            <RevealSection className="mb-20">
              <span className="text-micro uppercase tracking-[0.25em] text-white/25 block mb-4">
                Output
              </span>
              <h2 className="text-[clamp(1.25rem,3vw,1.75rem)] font-light text-white tracking-[-0.01em] mb-8">
                Auto-generated compliance documents
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mod.documentsGenerated.map((doc, i) => (
                  <RevealSection
                    key={doc}
                    delay={0.1 + i * 0.06}
                    className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4"
                  >
                    <FileText
                      size={16}
                      className="text-white/25 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-body-lg text-white/45">{doc}</span>
                  </RevealSection>
                ))}
              </div>
            </RevealSection>
          )}

          {/* ─────────────────────────────────────────────────────────────
             8. AUTOMATIONS
          ───────────────────────────────────────────────────────────── */}
          {mod.automations.length > 0 && (
            <RevealSection className="mb-20">
              <div className="flex items-center gap-2.5 mb-4">
                <Sparkles size={14} className="text-emerald-500/50" />
                <span className="text-micro uppercase tracking-[0.25em] text-white/25">
                  Automation
                </span>
              </div>
              <h2 className="text-[clamp(1.25rem,3vw,1.75rem)] font-light text-white tracking-[-0.01em] mb-8">
                What we automate for you
              </h2>
              <div className="space-y-4">
                {mod.automations.map((automation, i) => (
                  <RevealSection
                    key={automation}
                    delay={0.1 + i * 0.06}
                    className="flex items-start gap-4 py-1"
                  >
                    <CheckCircle
                      size={16}
                      className="text-emerald-500/40 mt-0.5 flex-shrink-0"
                    />
                    <p className="text-body-lg text-white/45 leading-[1.6]">
                      {automation}
                    </p>
                  </RevealSection>
                ))}
              </div>
            </RevealSection>
          )}

          {/* ─────────────────────────────────────────────────────────────
             9. RELATED MODULES
          ───────────────────────────────────────────────────────────── */}
          {mod.relatedModules.length > 0 && (
            <RevealSection className="mb-20">
              <span className="text-micro uppercase tracking-[0.25em] text-white/25 block mb-6">
                Related Modules
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mod.relatedModules.map((slug, i) => (
                  <RevealSection key={slug} delay={0.1 + i * 0.06}>
                    <Link
                      href={`/modules/${slug}`}
                      className="group block bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-500"
                    >
                      <span className="text-body-lg text-white/70 group-hover:text-emerald-400 transition-colors">
                        {formatSlugToName(slug)}
                      </span>
                      <ArrowRight
                        size={14}
                        className="inline-block ml-2 text-white/25 group-hover:text-emerald-400 transition-all duration-300 group-hover:translate-x-1"
                      />
                    </Link>
                  </RevealSection>
                ))}
              </div>
            </RevealSection>
          )}

          {/* ─────────────────────────────────────────────────────────────
             10. CTA
          ───────────────────────────────────────────────────────────── */}
          <RevealSection className="mb-20 text-center py-16 border-t border-white/[0.04]">
            <h2 className="text-[clamp(1.25rem,3vw,1.75rem)] font-light text-white tracking-[-0.01em] mb-4">
              See if this module applies to you
            </h2>
            <p className="text-body-lg text-white/45 mb-8 max-w-[450px] mx-auto">
              Take the free compliance assessment to find out which modules are
              relevant to your operation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/assessment"
                className="group inline-flex items-center gap-3 px-7 py-3.5 bg-white text-black text-body-lg font-medium rounded-full hover:bg-white/90 transition-all duration-300 hover:scale-[1.02]"
              >
                <span>Start assessment</span>
                <ArrowRight
                  size={15}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-3 px-7 py-3.5 border border-white/[0.15] text-white/70 text-body-lg font-medium rounded-full hover:border-white/[0.3] hover:text-white transition-all duration-300"
              >
                Request a demo
              </Link>
            </div>
          </RevealSection>

          {/* ─────────────────────────────────────────────────────────────
             11. PREV / NEXT NAVIGATION
          ───────────────────────────────────────────────────────────── */}
          <section className="py-12 border-t border-white/[0.04]">
            <div className="flex items-center justify-between">
              {prevModule ? (
                <Link
                  href={`/modules/${prevModule.slug}`}
                  className="group flex items-center gap-3 text-body text-white/45 hover:text-white/70 transition-colors"
                >
                  <ArrowLeft
                    size={14}
                    className="transition-transform group-hover:-translate-x-1"
                  />
                  <div>
                    <span className="text-micro text-white/25 block">
                      Module {prevModule.id}
                    </span>
                    <span>{prevModule.name}</span>
                  </div>
                </Link>
              ) : (
                <div />
              )}

              {nextModule ? (
                <Link
                  href={`/modules/${nextModule.slug}`}
                  className="group flex items-center gap-3 text-body text-white/45 hover:text-white/70 transition-colors text-right"
                >
                  <div>
                    <span className="text-micro text-white/25 block">
                      Module {nextModule.id}
                    </span>
                    <span>{nextModule.name}</span>
                  </div>
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              ) : (
                <div />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

/** Converts a slug like "debris-mitigation" to "Debris Mitigation" */
function formatSlugToName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
