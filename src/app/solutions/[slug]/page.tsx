import { notFound } from "next/navigation";
import type { Metadata } from "next";
import FooterPageTemplate from "@/components/landing/FooterPageTemplate";
import { solutionPages } from "@/data/solutions-pages";

export function generateStaticParams() {
  return solutionPages.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = solutionPages.find((p) => p.slug === slug);

  if (!page) {
    return {};
  }

  return {
    title: `${page.title} | Caelex`,
    description: page.tagline,
  };
}

export default async function SolutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = solutionPages.find((p) => p.slug === slug);

  if (!page) {
    notFound();
  }

  return <FooterPageTemplate page={page} category="Solutions" />;
}
