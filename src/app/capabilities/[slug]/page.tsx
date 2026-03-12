import { Metadata } from "next";
import { notFound } from "next/navigation";

import FooterPageTemplate from "@/components/landing/FooterPageTemplate";
import { capabilityPages } from "@/data/capabilities-pages";

export function generateStaticParams() {
  return capabilityPages.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = capabilityPages.find((p) => p.slug === slug);

  if (!page) {
    return {};
  }

  return {
    title: `${page.title} | Caelex`,
    description: page.tagline,
  };
}

export default async function CapabilityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = capabilityPages.find((p) => p.slug === slug);

  if (!page) {
    notFound();
  }

  return <FooterPageTemplate page={page} category="Capabilities" />;
}
