import { notFound } from "next/navigation";
import { Metadata } from "next";
import {
  MODULE_DETAILS,
  getModuleBySlug,
  getAllModuleSlugs,
} from "@/data/module-details";
import ModulePageClient from "./ModulePageClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllModuleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const moduleData = getModuleBySlug(slug);
  if (!moduleData) return { title: "Module Not Found" };

  return {
    title: `${moduleData.name} | Caelex Platform`,
    description: moduleData.description.slice(0, 160),
  };
}

export default async function ModulePage({ params }: Props) {
  const { slug } = await params;
  const moduleData = getModuleBySlug(slug);

  if (!moduleData) {
    notFound();
  }

  // Find prev/next modules for navigation
  const currentIndex = MODULE_DETAILS.findIndex((m) => m.slug === slug);
  const prevModule = currentIndex > 0 ? MODULE_DETAILS[currentIndex - 1] : null;
  const nextModule =
    currentIndex < MODULE_DETAILS.length - 1
      ? MODULE_DETAILS[currentIndex + 1]
      : null;

  return (
    <ModulePageClient
      module={moduleData}
      prevModule={prevModule}
      nextModule={nextModule}
    />
  );
}
