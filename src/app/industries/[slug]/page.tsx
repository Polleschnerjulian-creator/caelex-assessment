import { Metadata } from "next";
import { notFound } from "next/navigation";
import FooterPageTemplate from "@/components/landing/FooterPageTemplate";
import { industryPages } from "@/data/industries-pages";

export function generateStaticParams() {
  return industryPages.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = industryPages.find((p) => p.slug === slug);

  if (!page) {
    return {};
  }

  return {
    title: `${page.title} | Caelex`,
    description: page.tagline,
  };
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = industryPages.find((p) => p.slug === slug);

  if (!page) {
    notFound();
  }

  return <FooterPageTemplate page={page} category="Industries" />;
}
