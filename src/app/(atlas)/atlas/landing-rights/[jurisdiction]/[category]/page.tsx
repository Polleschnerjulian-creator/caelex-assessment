import { notFound } from "next/navigation";
import {
  ALL_DEEP_DIVES,
  getDeepDive,
  type JurisdictionCode,
  type LandingRightsCategory,
} from "@/data/landing-rights";
import { CategoryDeepDiveView } from "@/components/atlas/landing-rights/CategoryDeepDiveView";

export function generateStaticParams() {
  return ALL_DEEP_DIVES.map((d) => ({
    jurisdiction: d.jurisdiction.toLowerCase(),
    category: d.category.replace("_", "-"),
  }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ jurisdiction: string; category: string }>;
}) {
  const { jurisdiction, category } = await params;
  const code = jurisdiction.toUpperCase() as JurisdictionCode;
  const cat = category.replace("-", "_") as LandingRightsCategory;
  const entry = getDeepDive(code, cat);
  if (!entry) return notFound();
  return <CategoryDeepDiveView entry={entry} />;
}
