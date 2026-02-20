import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getUnifiedModule,
  getAdjacentModules,
  getAllModuleSlugs,
} from "@/data/module-page-data";
import { generateMetadata as generateSeoMetadata, siteConfig } from "@/lib/seo";
import { ProductJsonLd } from "@/components/seo/JsonLd";
import ModulePageClient from "./ModulePageClient";

// ============================================================================
// STATIC PARAMS — all 14 modules
// ============================================================================

export async function generateStaticParams() {
  return getAllModuleSlugs().map((slug) => ({ slug }));
}

// ============================================================================
// METADATA
// ============================================================================

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const mod = getUnifiedModule(slug);

  if (!mod) {
    return generateSeoMetadata({
      title: "Module Not Found",
      description: "The requested compliance module could not be found.",
      path: `/modules/${slug}`,
      noIndex: true,
    });
  }

  return generateSeoMetadata({
    title: mod.seo.title,
    description: mod.seo.description,
    path: `/modules/${mod.slug}`,
    keywords: mod.seo.keywords,
  });
}

// ============================================================================
// PAGE — slim server wrapper
// ============================================================================

export default async function ModulePage({ params }: PageProps) {
  const { slug } = await params;
  const mod = getUnifiedModule(slug);

  if (!mod) {
    notFound();
  }

  const { prev, next } = getAdjacentModules(slug);

  return (
    <>
      {/* JSON-LD (server-rendered) */}
      <ProductJsonLd
        name={mod.seo.title}
        description={mod.seo.description}
        url={`${siteConfig.url}/modules/${mod.slug}`}
        category="Space Compliance Module"
      />

      {/* Client component — full visual experience */}
      <ModulePageClient module={mod} prevModule={prev} nextModule={next} />
    </>
  );
}
